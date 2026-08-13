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
import { serializeMedia } from 'src/media/media-storage';

// نوع مخصص للسوكِت بعد المصادقة: نخزن userId داخل data لاستخدامه في كل Event لاحقا.
type AuthedSocket = Socket & { data: { userId?: string } };

// الحمولة المطلوبة عند الانضمام/المغادرة من غرفة محادثة.
type ConversationRoomPayload = {
  conversationId: string;
};

// حمولة تعديل رسالة.
type EditMessagePayload = {
  messageId: string;
  content: string;
};

// حمولة حذف رسالة.
type DeleteMessagePayload = {
  messageId: string;
};

// حمولة تحديث حالة القراءة.
type MarkReadPayload = {
  conversationId: string;
  messageId: string;
};

@WebSocketGateway({
  // نستخدم Namespace مستقل حتى لا تختلط أحداث الدردشة مع أي Socket Features أخرى.
  namespace: '/chat',
  cors: {
    // السماح بـ Origin ديناميكي أثناء التطوير.
    origin: true,
    // مهم عند استخدام Cookies أو أي Credentials مع الـ Socket.
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // كائن السيرفر الذي سنستخدمه للبث إلى الغرف.
  @WebSocketServer()
  server: Server;

  // Logger للتتبع والتشخيص أثناء التطوير والإنتاج.
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // تحويل أي ID قادم (string/number/bigint) إلى BigInt متوافق مع Prisma/MySQL.
  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  // تحويل حقول bigint إلى string قبل الإرسال كـ JSON لتفادي أخطاء serialization.
  private serialize<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as T;
  }

  // اسم غرفة خاصة بالمستخدم (جميع أجهزته/تبويباته).
  // نستخدمها لإرسال تحديثات inbox/قراءة خاصة بهذا المستخدم.
  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  // اسم غرفة المحادثة المشتركة بين المشاركين.
  // أي رسالة جديدة/تعديل/حذف يتم بثها هنا.
  private conversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  // قراءة userId من socket.data بعد نجاح المصادقة.
  private getUserId(client: AuthedSocket) {
    return client.data.userId ?? null;
  }

  // استخراج التوكن من handshake.auth أو من Authorization header.
  // هذا يعطي مرونة للعميل (web/mobile/اختبارات).
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

  // دورة الاتصال عند فتح Socket:
  // 1) استخراج التوكن
  // 2) التحقق من JWT
  // 3) التأكد أن المستخدم موجود في DB
  // 4) حفظ userId داخل socket.data
  // 5) إدخال المستخدم إلى غرفته الخاصة user:<id>
  async handleConnection(client: AuthedSocket) {
    try {
      // الخطوة 1: استخراج التوكن.
      const token = this.extractToken(client);

      if (!token) {
        // لا يوجد توكن = اتصال غير مصرح.
        client.emit('chat:error', { message: 'Missing access token' });
        client.disconnect(true);
        return;
      }

      // الخطوة 2: التحقق من صحة التوكن.
      const payload = await this.jwtService.verifyAsync<AuthJwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // الخطوة 3: التأكد أن المستخدم ما زال موجودا.
      const user = await this.prisma.user.findUnique({
        where: {
          id: this.toBigInt(payload.sub),
        },
        select: {
          id: true,
        },
      });

      if (!user) {
        // توكن صالح شكليا لكن المستخدم غير موجود في قاعدة البيانات.
        client.emit('chat:error', { message: 'User not found' });
        client.disconnect(true);
        return;
      }

      // الخطوة 4: ربط هوية المستخدم بجلسة السوكِت الحالية.
      const userId = user.id.toString();
      client.data.userId = userId;

      // الخطوة 5: انضمام لغرفة المستخدم الخاصة.
      client.join(this.userRoom(userId));
      this.logger.log(`Socket connected: ${client.id} (user ${userId})`);
    } catch (error) {
      // أي فشل في التحقق يعتبر Unauthorized.
      this.logger.warn(`Socket auth failed for ${client.id}: ${error instanceof Error ? error.message : 'unknown error'}`);
      client.emit('chat:error', { message: 'Unauthorized socket connection' });
      client.disconnect(true);
    }
  }

  // تسجيل لحظة الإغلاق مفيد لتتبع مشاكل الشبكة وإعادة الاتصال.
  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  // حدث: الانضمام لغرفة محادثة معينة.
  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: ConversationRoomPayload,
  ) {
    // 1) قراءة هوية المستخدم من socket.data.
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    // 2) تحقق صلاحية الانضمام من السيرفر مباشرة (ليس من الواجهة).
    // هذا يمنع المستخدم من الاشتراك في غرفة لا تخصه عبر تزوير payload.
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

    // 3) انضمام فعلي إلى غرفة المحادثة.
    client.join(this.conversationRoom(payload.conversationId));
    return { ok: true, conversationId: payload.conversationId };
  }

  // حدث: مغادرة غرفة محادثة.
  @SubscribeMessage('conversation:leave')
  async leaveConversation(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() payload: ConversationRoomPayload,
  ) {
    // مغادرة الغرفة توقف استقبال أحداث هذه المحادثة لهذا السوكِت.
    client.leave(this.conversationRoom(payload.conversationId));
    return { ok: true, conversationId: payload.conversationId };
  }

  // حدث: إرسال رسالة جديدة.
  @SubscribeMessage('message:send')
  async sendMessage(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: CreateMessageDto) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      // 1) نحفظ الرسالة في DB أولا (مصدر الحقيقة).
      const message = await this.messageService.sendMessage(userId, payload);

      // 2) نبث الرسالة الجديدة لكل من هو داخل غرفة المحادثة.
      this.server.to(this.conversationRoom(payload.conversationId)).emit('message:new', message);

      // 3) تحديث الـ sidebar/inbox للمشاركين (آخر رسالة/ترتيب/غير مقروء).
      await this.emitConversationUpdated(payload.conversationId);
      return { ok: true, data: message };
    } catch (error) {
      // أي خطأ عمل (صلاحيات/تحقق/DB) يرجع للعميل عبر chat:error.
      const message = error instanceof Error ? error.message : 'Failed to send message';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  // حدث: تعديل رسالة موجودة.
  @SubscribeMessage('message:edit')
  async editMessage(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: EditMessagePayload) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      // تحويل payload إلى DTO الخدمة.
      const dto: UpdateMessageDto = { content: payload.content };

      // التحقق من الملكية والتعديل داخل MessageService.
      const message = await this.messageService.updateForUser(userId, payload.messageId, dto);

      // استخراج conversationId للبث الصحيح.
      const conversationId = String((message as { conversationId: string | bigint }).conversationId);

      // بث التعديل في غرفة المحادثة.
      this.server.to(this.conversationRoom(conversationId)).emit('message:updated', message);

      // تحديث بيانات الـ inbox.
      await this.emitConversationUpdated(conversationId);
      return { ok: true, data: message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to edit message';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  // حدث: حذف رسالة (Soft delete).
  @SubscribeMessage('message:delete')
  async deleteMessage(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: DeleteMessagePayload) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      // الحذف الفعلي يتم في الخدمة مع تحقق الملكية.
      const message = await this.messageService.removeForUser(userId, payload.messageId);
      const conversationId = String((message as { conversationId: string | bigint }).conversationId);

      // بث حدث الحذف لكل المشاركين.
      this.server.to(this.conversationRoom(conversationId)).emit('message:deleted', message);

      // تحديث قائمة المحادثات.
      await this.emitConversationUpdated(conversationId);
      return { ok: true, data: message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete message';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  // حدث: تعليم الرسائل كمقروءة حتى messageId محدد.
  @SubscribeMessage('message:read')
  async markRead(@ConnectedSocket() client: AuthedSocket, @MessageBody() payload: MarkReadPayload) {
    const userId = this.getUserId(client);

    if (!userId) {
      return { ok: false, error: 'unauthorized' };
    }

    try {
      // تحديث مؤشر القراءة للمشارك في DB.
      await this.messageService.markRead(userId, payload.conversationId, payload.messageId);

      // بث لنفس غرفة المستخدم حتى تتزامن كل تبويباته/أجهزته.
      this.server.to(this.userRoom(userId)).emit('conversation:read', payload);

      // تحديث الـ inbox للمشاركين.
      await this.emitConversationUpdated(payload.conversationId);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark messages as read';
      client.emit('chat:error', { message });
      return { ok: false, error: message };
    }
  }

  // دالة مساعدة لإعادة بناء حالة المحادثة المختصرة وإرسالها لكل المشاركين.
  private async emitConversationUpdated(conversationIdRaw: string) {
    const conversationId = this.toBigInt(conversationIdRaw);

    // نقرأ أحدث حالة مطلوبة للـ sidebar:
    // - المشاركون النشطون
    // - آخر رسالة
    // - بيانات المرسل
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
            attachments: {
              include: {
                media: true,
              },
            },
          },
        },
      },
    });

    // إذا المحادثة غير موجودة لا نرسل شيئا.
    if (!conversation) return;

    // تجهيز payload قابل للإرسال JSON.
    const payload = this.serialize({
      ...conversation,
      lastMessage: conversation.messages[0] ?? null,
    }) as Record<string, any>;

    if (payload.lastMessage?.attachments) {
      payload.lastMessage.attachments = payload.lastMessage.attachments.map((attachment) => {
        const media = serializeMedia(attachment.media);

        return {
          ...attachment,
          ...media,
          media,
        };
      });
    }

    // إرسال التحديث لكل مشارك داخل غرفته الخاصة.
    for (const participant of conversation.participants) {
      const participantId = participant.userId.toString();
      this.server.to(this.userRoom(participantId)).emit('conversation:updated', payload);
    }
  }
}
