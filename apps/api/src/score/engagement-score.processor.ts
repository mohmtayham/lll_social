import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

type EngagementJobData = {
  userId?: string;
  groupId?: string | null;
  postId?: string | null;
  hashtags?: string[];
  reactionType?: string;
};

@Processor('engagement-score')
export class EngagementScoreProcessor extends WorkerHost {
  private readonly logger = new Logger(EngagementScoreProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async process(job: Job<EngagementJobData, any, string>): Promise<any> {
    switch (job.name) {
      case 'group-join':
        await this.handleGroupJoin(job.data);
        break;
      case 'group-leave':
        await this.handleGroupLeave(job.data);
        break;
      case 'post-created':
        await this.handlePostCreated(job.data);
        break;
      case 'comment-created':
        await this.handleCommentCreated(job.data);
        break;
      case 'reaction-created':
        await this.handleReactionCreated(job.data);
        break;
      default:
        this.logger.warn(`Unknown engagement job: ${job.name}`);
    }
  }

  private toBigInt(value: string | undefined | null): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    return BigInt(value);
  }

  private async invalidateUserFeedCache(userId: bigint) {
    await Promise.all([
      this.prisma.userFeedCache.deleteMany({ where: { userId } }),
      this.redisService.delByPattern(`feed:user:${userId.toString()}:*`),
    ]);
  }

  private async addGroupAffinity(userId: bigint, groupId: bigint, increment: number) {
    await this.prisma.userGroupAffinity.upsert({
      where: {
        userId_groupId: {
          userId,
          groupId,
        },
      },
      update: {
        score: { increment },
      },
      create: {
        userId,
        groupId,
        score: increment,
      },
    });
  }

  private async addInterests(userId: bigint, hashtags: string[], increment: number) {
    const normalizedHashtags = [...new Set(hashtags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
    if (!normalizedHashtags.length) return;

    await Promise.all(
      normalizedHashtags.map((interest) =>
        this.prisma.userInterest.upsert({
          where: { userId_interest: { userId, interest } },
          update: {
            score: { increment },
          },
          create: {
            userId,
            interest,
            score: increment,
          },
        }),
      ),
    );
  }

  private async handleGroupJoin(data: EngagementJobData) {
    const userId = this.toBigInt(data.userId);
    const groupId = this.toBigInt(data.groupId);
    if (!userId || !groupId) return;

    await this.addGroupAffinity(userId, groupId, 100);
    await this.invalidateUserFeedCache(userId);
  }

  private async handleGroupLeave(data: EngagementJobData) {
    const userId = this.toBigInt(data.userId);
    const groupId = this.toBigInt(data.groupId);
    if (!userId || !groupId) return;

    await this.prisma.userGroupAffinity.deleteMany({
      where: { userId, groupId },
    });
    await this.invalidateUserFeedCache(userId);
  }

  private async handlePostCreated(data: EngagementJobData) {
    const userId = this.toBigInt(data.userId);
    const groupId = this.toBigInt(data.groupId);
    if (!userId) return;

    if (groupId) {
      await this.addGroupAffinity(userId, groupId, 20);
    }

    await this.addInterests(userId, data.hashtags ?? [], 10);
    await this.invalidateUserFeedCache(userId);
  }

  private async handleCommentCreated(data: EngagementJobData) {
    const userId = this.toBigInt(data.userId);
    const groupId = this.toBigInt(data.groupId);
    if (!userId) return;

    if (groupId) {
      await this.addGroupAffinity(userId, groupId, 15);
    }

    await this.addInterests(userId, data.hashtags ?? [], 10);
    await this.invalidateUserFeedCache(userId);
  }

  private async handleReactionCreated(data: EngagementJobData) {
    const userId = this.toBigInt(data.userId);
    const groupId = this.toBigInt(data.groupId);
    if (!userId) return;

    if (groupId) {
      await this.addGroupAffinity(userId, groupId, 5);
    }

    await this.invalidateUserFeedCache(userId);
  }
}