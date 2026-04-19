import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ConversationService } from 'src/conversation/conversation.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
  ) {}

  // Normalize incoming IDs before interacting with Prisma BigInt columns.
  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  // Convert BigInt fields in nested payloads into string-safe JSON.
  private serialize<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as T;
  }

  // Shared permission guard used by read/write operations.
  private async ensureParticipant(conversationId: bigint, userId: bigint) {
    const isParticipant = await this.conversationService.isUserParticipant(userId, conversationId);

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }
  }

  // Create message flow:
  // 1) validate sender membership
  // 2) validate payload/reply target
  // 3) persist message
  // 4) update conversation last activity pointers
  async sendMessage(userIdRaw: string | number | bigint, createMessageDto: CreateMessageDto) {
    const senderId = this.toBigInt(userIdRaw);
    const conversationId = this.toBigInt(createMessageDto.conversationId);

    await this.ensureParticipant(conversationId, senderId);

    // At least one meaningful field should be present.
    if (!createMessageDto.content && !createMessageDto.replyToId && !createMessageDto.clientMessageId) {
      throw new ForbiddenException('Message payload is empty');
    }

    if (createMessageDto.replyToId) {
      // Reply target must exist and belong to same conversation.
      const repliedMessage = await this.prisma.message.findUnique({
        where: {
          id: this.toBigInt(createMessageDto.replyToId),
        },
        select: {
          conversationId: true,
        },
      });

      if (!repliedMessage || repliedMessage.conversationId !== conversationId) {
        throw new ForbiddenException('Reply target is invalid for this conversation');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: createMessageDto.content,
        messageType: createMessageDto.messageType ?? MessageType.TEXT,
        replyToId: createMessageDto.replyToId
          ? this.toBigInt(createMessageDto.replyToId)
          : undefined,
        clientMessageId: createMessageDto.clientMessageId,
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
    });

    // Keep conversation row denormalized with latest message meta for fast inbox queries.
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      },
    });

    return this.serialize(message);
  }

  // Conversation history endpoint with optional cursor-style pagination.
  async listConversationMessages(
    userIdRaw: string | number | bigint,
    conversationIdRaw: string,
    limitRaw?: string,
    beforeIdRaw?: string,
  ) {
    const userId = this.toBigInt(userIdRaw);
    const conversationId = this.toBigInt(conversationIdRaw);
    // Hard clamp to avoid accidental heavy queries.
    const limit = Math.min(Math.max(Number(limitRaw ?? '30') || 30, 1), 100);

    await this.ensureParticipant(conversationId, userId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(beforeIdRaw
          ? {
              id: {
                lt: this.toBigInt(beforeIdRaw),
              },
            }
          : {}),
      },
      orderBy: {
        id: 'desc',
      },
      take: limit,
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
    });

    // Query desc for efficient take, then reverse so UI gets oldest->newest order.
    return this.serialize([...messages].reverse());
  }

  // Fetch one message if requester still belongs to the conversation.
  async findOneForUser(userIdRaw: string | number | bigint, idRaw: string) {
    const userId = this.toBigInt(userIdRaw);
    const id = this.toBigInt(idRaw);

    const message = await this.prisma.message.findUnique({
      where: { id },
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
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureParticipant(message.conversationId, userId);

    return this.serialize(message);
  }

  // Edit message with ownership check and edit history snapshot.
  async updateForUser(userIdRaw: string | number | bigint, idRaw: string, updateMessageDto: UpdateMessageDto) {
    const userId = this.toBigInt(userIdRaw);
    const id = this.toBigInt(idRaw);

    const existingMessage = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      throw new NotFoundException('Message not found');
    }

    if (existingMessage.senderId !== userId) {
      throw new ForbiddenException('You can edit only your own message');
    }

    // No-op updates return current message to keep operation idempotent.
    if (!updateMessageDto.content || updateMessageDto.content === existingMessage.content) {
      return this.serialize(existingMessage);
    }

    // Keep previous text in messageEdit for audit/history needs.
    if (existingMessage.content) {
      await this.prisma.messageEdit.create({
        data: {
          messageId: existingMessage.id,
          oldContent: existingMessage.content,
        },
      });
    }

    const updated = await this.prisma.message.update({
      where: { id },
      data: {
        content: updateMessageDto.content,
        isEdited: true,
        editedAt: new Date(),
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
    });

    return this.serialize(updated);
  }

  // Soft-delete message content globally while preserving row identity and timeline integrity.
  async removeForUser(userIdRaw: string | number | bigint, idRaw: string) {
    const userId = this.toBigInt(userIdRaw);
    const id = this.toBigInt(idRaw);

    const existingMessage = await this.prisma.message.findUnique({
      where: { id },
    });

    if (!existingMessage) {
      throw new NotFoundException('Message not found');
    }

    if (existingMessage.senderId !== userId) {
      throw new ForbiddenException('You can delete only your own message');
    }

    const removed = await this.prisma.message.update({
      where: { id },
      data: {
        content: null,
        isDeletedForEveryone: true,
        deletedAt: new Date(),
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
    });

    return this.serialize(removed);
  }

  // Store participant read pointer; unread counts are derived against this pointer.
  async markRead(
    userIdRaw: string | number | bigint,
    conversationIdRaw: string,
    messageIdRaw: string,
  ) {
    const userId = this.toBigInt(userIdRaw);
    const conversationId = this.toBigInt(conversationIdRaw);
    const messageId = this.toBigInt(messageIdRaw);

    await this.ensureParticipant(conversationId, userId);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Message not found in this conversation');
    }

    const updatedParticipant = await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: messageId,
      },
    });

    return this.serialize(updatedParticipant);
  }
}
