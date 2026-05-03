import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

type EngagementQueuePayload = {
  userId: string | number | bigint;
  groupId?: string | number | bigint | null;
  postId?: string | number | bigint | null;
  hashtags?: string[];
  reactionType?: string;
};

@Injectable()
export class EngagementScoreService {
  constructor(@InjectQueue('engagement-score') private readonly engagementQueue: Queue) {}

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

  trackGroupJoin(payload: EngagementQueuePayload) {
    return this.engagementQueue.add(
      'group-join',
      {
        userId: this.toStringValue(payload.userId),
        groupId: this.toStringValue(payload.groupId),
      },
      this.queueOptions(),
    );
  }

  trackGroupLeave(payload: EngagementQueuePayload) {
    return this.engagementQueue.add(
      'group-leave',
      {
        userId: this.toStringValue(payload.userId),
        groupId: this.toStringValue(payload.groupId),
      },
      this.queueOptions(),
    );
  }

  trackPostCreated(payload: EngagementQueuePayload) {
    return this.engagementQueue.add(
      'post-created',
      {
        userId: this.toStringValue(payload.userId),
        groupId: this.toStringValue(payload.groupId),
        postId: this.toStringValue(payload.postId),
        hashtags: payload.hashtags ?? [],
      },
      this.queueOptions(),
    );
  }

  trackCommentCreated(payload: EngagementQueuePayload) {
    return this.engagementQueue.add(
      'comment-created',
      {
        userId: this.toStringValue(payload.userId),
        groupId: this.toStringValue(payload.groupId),
        postId: this.toStringValue(payload.postId),
        hashtags: payload.hashtags ?? [],
      },
      this.queueOptions(),
    );
  }

  trackReactionCreated(payload: EngagementQueuePayload) {
    return this.engagementQueue.add(
      'reaction-created',
      {
        userId: this.toStringValue(payload.userId),
        groupId: this.toStringValue(payload.groupId),
        postId: this.toStringValue(payload.postId),
        reactionType: payload.reactionType ?? 'LIKE',
      },
      this.queueOptions(),
    );
  }
}