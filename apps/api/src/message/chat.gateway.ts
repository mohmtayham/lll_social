import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessageService } from './message.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { AuthJwtPayload } from 'src/auth/types/auth-jwtPayload';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

type AuthedSocket = Socket & { data: { userId?: string } };

type ConversationRoomPayload = {
  conversationId: string;
};

type EditMessagePayload = {
  messageId: string;
  content: string;
};

type DeleteMessagePayload = {
  messageId: string;
};

type MarkReadPayload = {
  conversationId: string;
  messageId: string;
};

@WebSocketGateway({
  // Use dedicated namespace so chat events are isolated from other socket features.
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Convert dynamic ID inputs to BigInt for Prisma compatibility.
  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  // Safely serialize payloads that may contain BigInt DB fields.
  private serialize<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as T;
  }

  // Private room for a single user (notifications, unread refresh, read sync).
  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  // Shared room for one conversation where message events are broadcast.
  private conversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  private getUserId(client: AuthedSocket) {
    return client.data.userId ?? null;
  }

  // Support token either from handshake auth payload or Authorization header.
  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token ?? client.handshake.auth?.accessToken;

    if (typeof authToken === 'string' && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const authorizationHeader = client.handshake.headers.authorization;

    if (typeof authorizationHeader === 'string' && authorizationHeader.toLowerCase().startsWith('bearer ')) {
      return authorizationHeader.slice(7).trim();
    }

    return null;
  }

  // Socket handshake auth flow:
  // 1) extract token
  // 2) verify JWT
  // 3) validate user exists
  // 4) bind userId to socket context and join user room
  async handleConnection(client: AuthedSocket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.emit('chat:error', { message: 'Missing access token' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: {
          id: this.toBigInt(payload.sub),
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        client.emit('chat:error', { message: 'User not found' });
        client.disconnect(true);
        return;
      }

      const userId = user.id.toString();
      client.data.userId = userId;
      client.join(this.userRoom(userId));
      this.logger.log(`Socket connected: ${client.id} (user ${userId})`);
    } catch (error) {
      this.logger.warn(`Socket auth failed for ${client.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      client.emit('chat:error', { message: 'Unauthorized socket connection' });
      client.disconnect(true);
    }
  }

  // Useful trace when debugging reconnect/network churn.
  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: ConversationRoomPayload,
  ) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    // Server-side membership check prevents clients from joining unauthorized rooms.
    const membership = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId: this.toBigInt(payload.conversationId),
        userId: this.toBigInt(userId),
        leftAt: null,
      },
      select: { id: true },
    });

    if (!membership) {
      return { ok: false, error: 'not-participant' };
    }

    client.join(this.conversationRoom(payload.conversationId));
    return { ok: true, conversationId: payload.conversationId };
  }

  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: ConversationRoomPayload,
  ) {
    client.leave(this.conversationRoom(payload.conversationId));
    return { ok: true, conversationId: payload.conversationId };
  }

  @SubscribeMessage('message:send')
  async sendMessage(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: CreateMessageDto) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      // Persist first, then broadcast committed data.
      const message = await this.messageService.sendMessage(userId, payload);
      this.server.to(this.conversationRoom(payload.conversationId)).emit('message:new', message);
      // Push inbox updates to all participants.
      await this.emitConversationUpdated(payload.conversationId);
      return { ok: true, data: message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  @SubscribeMessage('message:edit')
  async editMessage(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: EditMessagePayload) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      const dto: UpdateMessageDto = { content: payload.content };
      const message = await this.messageService.updateForUser(userId, payload.messageId, dto);
      const conversationId = String((message as { conversationId: string | bigint }).conversationId);
      this.server.to(this.conversationRoom(conversationId)).emit('message:updated', message);
      await this.emitConversationUpdated(conversationId);
      return { ok: true, data: message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to edit message';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  @SubscribeMessage('message:delete')
  async deleteMessage(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: DeleteMessagePayload) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      const message = await this.messageService.removeForUser(userId, payload.messageId);
      const conversationId = String((message as { conversationId: string | bigint }).conversationId);
      this.server.to(this.conversationRoom(conversationId)).emit('message:deleted', message);
      await this.emitConversationUpdated(conversationId);
      return { ok: true, data: message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete message';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  @SubscribeMessage('message:read')
  async markRead(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: MarkReadPayload) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      await this.messageService.markRead(userId, payload.conversationId, payload.messageId);
      // Emit to the same user room so other devices/tabs of this user can sync read state.
      this.server.to(this.userRoom(userId)).emit('conversation:read', payload);
      await this.emitConversationUpdated(payload.conversationId);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark messages as read';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  private async emitConversationUpdated(conversationIdRaw: string) {
    const conversationId = this.toBigInt(conversationIdRaw);

    // Build one lightweight conversation payload containing latest message and participant list.
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarMediaId: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarMediaId: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) return;

    const payload = this.serialize({
      ...conversation,
      lastMessage: conversation.messages[0] ?? null,
    });

    // Notify each active participant in their personal room.
    for (const participant of conversation.participants) {
      const participantId = participant.userId.toString();
      this.server.to(this.userRoom(participantId)).emit('conversation:updated', payload);
    }
  }
}
