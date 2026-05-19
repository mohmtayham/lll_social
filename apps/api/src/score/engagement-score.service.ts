import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { hash } from 'crypto';

type EngagementQueuePayload = {
  userId: string | number | bigint;
  groupId?: string | number | bigint | null;
  postId?: string | number | bigint | null;
  targetUserId?: string | number | bigint | null;  // ← post author
  hashtags?: string[];
  reactionType?: string;
  increment?: number;
};

@Injectable()
export class EngagementScoreService {
  private readonly logger = new Logger(EngagementScoreService.name);

  constructor(
    @InjectQueue('engagement-score') private readonly engagementQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  private queueOptions() {
    return {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    };
  }

  private toStringValue(value: string | number | bigint | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    return value.toString();
  }

  private async queueEventWithFallback(jobName: string, jobData: Record<string, any>) {
    try {
      return await this.engagementQueue.add(jobName, jobData, this.queueOptions());
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue engagement event: ${jobName}`, reason);

      try {
        await this.prisma.deadLetterQueue.create({
          data: {
            sourceQueue: 'engagement-score',
            jobName,
            jobData,
            failureReason: reason,
            failureCount: 0,
          },
        });
      } catch (dbError) {
        const dbReason = dbError instanceof Error ? dbError.message : String(dbError);
        this.logger.error(`Failed to persist engagement DLQ record: ${jobName}`, dbReason);
      }

      return null;
    }
  }

  trackGroupJoin(payload: EngagementQueuePayload) {
    return this.queueEventWithFallback('group-join', {
      userId: this.toStringValue(payload.userId),
      groupId: this.toStringValue(payload.groupId),
    });
  }

  trackGroupLeave(payload: EngagementQueuePayload) {
    return this.queueEventWithFallback('group-leave', {
      userId: this.toStringValue(payload.userId),
      groupId: this.toStringValue(payload.groupId),
    });
  }

  trackPostCreated(payload: EngagementQueuePayload) {
    return this.queueEventWithFallback('post-created', {
      userId: this.toStringValue(payload.userId),
      groupId: this.toStringValue(payload.groupId),
      postId: this.toStringValue(payload.postId),
      hashtags: payload.hashtags ?? [],
    });
  }

  trackCommentCreated(payload: EngagementQueuePayload) {
    return this.queueEventWithFallback('comment-created', {
      userId: this.toStringValue(payload.userId),
      groupId: this.toStringValue(payload.groupId),
      postId: this.toStringValue(payload.postId),
      hashtags: payload.hashtags ?? [],
    });
  }
  // ADD THIS NEW METHOD:
trackReactionRemoved(payload: EngagementQueuePayload) {
  const reactionWeights: Record<string, number> = { LIKE: 5, LOVE: 9, CARE: 7, WOW: 6, ANGRY: 4, SAD: 6, HH: 12 };
  const reactionType = payload.reactionType ?? 'LIKE';
  const decrement = reactionWeights[reactionType] ?? 5;

  return this.queueEventWithFallback('reaction-removed', {
    userId: this.toStringValue(payload.userId),
    targetUserId: this.toStringValue(payload.targetUserId),
    groupId: this.toStringValue(payload.groupId),
    postId: this.toStringValue(payload.postId),
    hashtags: payload.hashtags ?? [],
    reactionType,
    increment: -decrement, // negative to reverse
  });
}

  trackReactionCreated(payload: EngagementQueuePayload) {
    
    const reactionWeights: Record<string, number> = {
      LIKE: 5,
      LOVE: 9,
      CARE: 7,
      WOW: 6,
      ANGRY: 4,
      SAD: 6,
      HH: 12,
    };

    const reactionType = payload.reactionType ?? 'LIKE';
    const increment = payload.increment ?? reactionWeights[reactionType] ?? 5;

    return this.queueEventWithFallback('reaction-created', {
      userId: this.toStringValue(payload.userId),
      groupId: this.toStringValue(payload.groupId),
      postId: this.toStringValue(payload.postId),
      reactionType,
      increment,
      hashtags: payload.hashtags ?? [],
    });
  }
}