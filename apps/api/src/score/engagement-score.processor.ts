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
  increment?: number;
};

@Processor('engagement-score')
export class EngagementScoreProcessor extends WorkerHost {
  private readonly logger = new Logger(EngagementScoreProcessor.name);
  private readonly maxGroupAffinity = 1000;
  private readonly maxInterestScore = 500;

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
        case 'reaction-removed':
  await this.handleReactionRemoved(job.data);
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
    await this.redisService.delByPattern(`feed:{user:${userId.toString()}}:*`);
  }

 
  private async addGroupAffinity(userId: bigint, groupId: bigint, increment: number) {
    const boundedIncrement = Math.max(0, increment);
    if (!boundedIncrement) return;

    await this.prisma.$executeRaw`
      INSERT INTO user_group_affinities (user_id, group_id, score, updated_at)
      VALUES (${userId}, ${groupId}, ${boundedIncrement}, NOW())
      ON DUPLICATE KEY UPDATE
        score = LEAST(score + ${boundedIncrement}, ${this.maxGroupAffinity}),
        updated_at = NOW()
    `;
  }

  private async addInterests(userId: bigint, hashtags: string[], increment: number) {
    const normalizedHashtags = [
      ...new Set(
        hashtags
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 1 && tag.length < 50),
      ),
    ];
    if (!normalizedHashtags.length) return;

    const boundedIncrement = Math.max(0, increment);
    if (!boundedIncrement) return;

    await Promise.all(
      normalizedHashtags.map((interest) =>
        this.prisma.$executeRaw`
          INSERT INTO user_interests (user_id, interest, score, updated_at)
          VALUES (${userId}, ${interest}, ${boundedIncrement}, NOW())
          ON DUPLICATE KEY UPDATE
            score = LEAST(score + ${boundedIncrement}, ${this.maxInterestScore}),
            updated_at = NOW()
        `,
      ),
    );
  }
private async handleReactionRemoved(data: EngagementJobData) {
  const userId = this.toBigInt(data.userId);
  if (!userId || !data.increment) return;
  // increment هنا سالب، نستخدمه مباشرة
  if (data.hashtags?.length) {
    await this.addInterests(userId, data.hashtags, Math.abs(Math.ceil(data.increment / 2)) * -1);
  }
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

    const reactionWeights: Record<string, number> = {
     LIKE: 5,
      LOVE: 9,
      CARE: 7,
      WOW: 6,
      ANGRY: 4,
      SAD: 6,
      HH: 12,
    };
    const increment = data.increment ?? reactionWeights[data.reactionType ?? 'LIKE'] ?? 5;

    if (groupId) {
      await this.addGroupAffinity(userId, groupId, increment);
    }
      // Add interest boost from post hashtags
  if (data.hashtags?.length) {
    await this.addInterests(userId, data.hashtags, Math.ceil(increment / 2));
  }

    await this.invalidateUserFeedCache(userId);
  }
}