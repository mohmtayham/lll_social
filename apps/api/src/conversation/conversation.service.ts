import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationParticipantRole, ConversationType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AddConversationParticipantDto } from './dto/add-conversation-participant.dto';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  // All IDs in this project are persisted as BigInt in MySQL.
  // Normalize incoming values so service methods can accept string/number/bigint safely.
  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  // Prisma returns BigInt fields that cannot be sent to JSON directly.
  // Convert all bigint values recursively into strings for API responses.
  private serialize<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as T;
  }

  // Shared include object for conversation list screens.
  // We keep this in one place so all query shapes stay consistent.
  private conversationListInclude() {
    return {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarMediaId: true,
        },
      },
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
        orderBy: { joinedAt: 'asc' as const },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' as const },
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
    };
  }

  // Guard: user must be an active participant (leftAt = null).
  // Returns the participant row for callers that need role checks.
  private async ensureParticipant(conversationId: bigint, userId: bigint) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        leftAt: null,
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return participant;
  }

  // Guard: user must be an active participant AND have ADMIN role.
  private async ensureAdmin(conversationId: bigint, userId: bigint) {
    const participant = await this.ensureParticipant(conversationId, userId);

    if (participant.role !== ConversationParticipantRole.ADMIN) {
      throw new ForbiddenException('Only conversation admins can perform this action');
    }

    return participant;
  }

  // Lightweight membership check used by message service and gateway logic.
  async isUserParticipant(userIdRaw: string | number | bigint, conversationIdRaw: string | number | bigint) {
    const userId = this.toBigInt(userIdRaw);
    const conversationId = this.toBigInt(conversationIdRaw);

    const membership = await this.prisma.conversationParticipant.findFirst({
      where: { userId, conversationId, leftAt: null },
      select: { id: true },
    });

    return Boolean(membership);
  }

  // Resolve participant IDs for broadcasting updates to all active members.
  async getActiveParticipantIds(conversationIdRaw: string | number | bigint) {
    const conversationId = this.toBigInt(conversationIdRaw);
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        leftAt: null,
      },
      select: {
        userId: true,
      },
    });

    return participants.map((participant) => participant.userId.toString());
  }

  // Create a new conversation or return existing DIRECT conversation if same 2 users already have one.
  // This prevents duplicate direct chat threads between the same pair.
  async createForUser(userIdRaw: string | number | bigint, createConversationDto: CreateConversationDto) {
    const creatorId = this.toBigInt(userIdRaw);
    // Use set to remove duplicate IDs and always include creator.
    const participantIdSet = new Set(
      createConversationDto.participantIds.map((id) => this.toBigInt(id).toString()),
    );

    participantIdSet.add(creatorId.toString());
    const participantIds = [...participantIdSet].map((id) => this.toBigInt(id));

    // If caller does not force a type, infer from participant count.
    const inferredType = participantIds.length === 2 ? ConversationType.DIRECT : ConversationType.GROUP;
    const conversationType = createConversationDto.type ?? inferredType;

    if (conversationType === ConversationType.DIRECT && participantIds.length !== 2) {
      throw new ForbiddenException('Direct conversation must have exactly 2 participants');
    }

    if (conversationType === ConversationType.GROUP && participantIds.length < 2) {
      throw new ForbiddenException('Group conversation must have at least 2 participants');
    }

    if (conversationType === ConversationType.DIRECT) {
      // For DIRECT chats, reuse existing conversation with same participant pair.
      const myDirectConversations = await this.prisma.conversation.findMany({
        where: {
          type: ConversationType.DIRECT,
          participants: {
            some: {
              userId: creatorId,
              leftAt: null,
            },
          },
        },
        include: {
          participants: {
            where: { leftAt: null },
            select: { userId: true },
          },
        },
      });

      // Build deterministic participant signature to compare two-user sets.
      const targetKey = participantIds
        .map((id) => id.toString())
        .sort()
        .join(':');

      const existing = myDirectConversations.find((conversation) => {
        if (conversation.participants.length !== 2) return false;

        const key = conversation.participants
          .map((participant) => participant.userId.toString())
          .sort()
          .join(':');

        return key === targetKey;
      });

      if (existing) {
        return this.getByIdForUser(userIdRaw, existing.id.toString());
      }
    }

    // Create conversation and participant rows atomically via nested create.
    const createdConversation = await this.prisma.conversation.create({
      data: {
        type: conversationType,
        name: createConversationDto.name,
        description: createConversationDto.description,
        avatarMediaId: createConversationDto.avatarMediaId
          ? this.toBigInt(createConversationDto.avatarMediaId)
          : undefined,
        createdBy: creatorId,
        participants: {
          create: participantIds.map((participantId) => ({
            userId: participantId,
            role:
              participantId === creatorId
                ? ConversationParticipantRole.ADMIN
                : ConversationParticipantRole.MEMBER,
          })),
        },
      },
      include: this.conversationListInclude(),
    });

    return this.serialize(createdConversation);
  }

  // Return inbox-style list for current user with computed unreadCount.
  async listMine(userIdRaw: string | number | bigint) {
    const userId = this.toBigInt(userIdRaw);

    const memberships = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
        leftAt: null,
      },
      include: {
        conversation: {
          include: this.conversationListInclude(),
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Compute per-conversation derived fields not stored directly on conversation row.
    const data = await Promise.all(
      memberships.map(async (membership) => {
        const lastMessage = membership.conversation.messages[0] ?? null;

        // unreadCount uses lastReadMessageId pointer per participant.
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: membership.conversationId,
            deletedAt: null,
            senderId: {
              not: userId,
            },
            ...(membership.lastReadMessageId
              ? {
                  id: {
                    gt: membership.lastReadMessageId,
                  },
                }
              : {}),
          },
        });

        return {
          ...membership.conversation,
          lastMessage,
          unreadCount,
          myParticipantRole: membership.role,
          myIsMuted: membership.isMuted,
          myIsArchived: membership.isArchived,
        };
      }),
    );

    // Sort by latest activity to match common chat app behavior.
    data.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.updatedAt;
      const bTime = b.lastMessage?.createdAt ?? b.updatedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return this.serialize(data);
  }

  // Return one conversation with participants + recent message window.
  async getByIdForUser(userIdRaw: string | number | bigint, id: string) {
    const userId = this.toBigInt(userIdRaw);
    const conversationId = this.toBigInt(id);

    await this.ensureParticipant(conversationId, userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarMediaId: true,
          },
        },
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
          orderBy: {
            joinedAt: 'asc',
          },
        },
        messages: {
          take: 30,
          orderBy: {
            id: 'desc',
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

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // We query messages in desc for efficient take, then reverse for UI chronological order.
    const normalized = {
      ...conversation,
      messages: [...conversation.messages].reverse(),
    };

    return this.serialize(normalized);
  }

  // Update conversation metadata.
  // GROUP conversations require admin; DIRECT allows any active participant.
  async updateForUser(userIdRaw: string | number | bigint, id: string, updateConversationDto: UpdateConversationDto) {
    const userId = this.toBigInt(userIdRaw);
    const conversationId = this.toBigInt(id);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type === ConversationType.GROUP) {
      await this.ensureAdmin(conversationId, userId);
    } else {
      await this.ensureParticipant(conversationId, userId);
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        name: updateConversationDto.name,
        description: updateConversationDto.description,
        avatarMediaId: updateConversationDto.avatarMediaId
          ? this.toBigInt(updateConversationDto.avatarMediaId)
          : undefined,
      },
      include: this.conversationListInclude(),
    });

    return this.serialize(updated);
  }

  // Add/rejoin participant in GROUP conversations.
  // If user existed before, upsert re-activates membership and resets archive state.
  async addParticipant(
    actorIdRaw: string | number | bigint,
    conversationIdRaw: string,
    dto: AddConversationParticipantDto,
  ) {
    const actorId = this.toBigInt(actorIdRaw);
    const conversationId = this.toBigInt(conversationIdRaw);
    const targetUserId = this.toBigInt(dto.userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type === ConversationType.DIRECT) {
      throw new ForbiddenException('Cannot add participants to a direct conversation');
    }

    await this.ensureAdmin(conversationId, actorId);

    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
      update: {
        role: dto.role ?? ConversationParticipantRole.MEMBER,
        leftAt: null,
        isArchived: false,
      },
      create: {
        conversationId,
        userId: targetUserId,
        role: dto.role ?? ConversationParticipantRole.MEMBER,
      },
    });

    return this.getByIdForUser(actorIdRaw, conversationIdRaw);
  }

  // Remove another participant (admin-only).
  // We keep row and set leftAt instead of deleting for history/audit continuity.
  async removeParticipant(actorIdRaw: string | number | bigint, conversationIdRaw: string, targetUserIdRaw: string) {
    const actorId = this.toBigInt(actorIdRaw);
    const conversationId = this.toBigInt(conversationIdRaw);
    const targetUserId = this.toBigInt(targetUserIdRaw);

    if (actorId === targetUserId) {
      throw new ForbiddenException('Use leave endpoint to leave the conversation');
    }

    await this.ensureAdmin(conversationId, actorId);
    await this.ensureParticipant(conversationId, targetUserId);

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
      data: {
        leftAt: new Date(),
      },
    });

    return this.getByIdForUser(actorIdRaw, conversationIdRaw);
  }

  // Current user leaves conversation.
  // Marking archived improves UX if user later rejoins and we re-activate membership.
  async leaveConversation(userIdRaw: string | number | bigint, conversationIdRaw: string) {
    const userId = this.toBigInt(userIdRaw);
    const conversationId = this.toBigInt(conversationIdRaw);

    await this.ensureParticipant(conversationId, userId);

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        leftAt: new Date(),
        isArchived: true,
      },
    });

    return { success: true };
  }
}
