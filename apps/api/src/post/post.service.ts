import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PostVisibility, Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { EngagementScoreService } from 'src/score/engagement-score.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { serializeMedia } from 'src/media/media-storage';

type FeedCandidate = {
  postId: bigint;
  score: number;
  source: string;
};

type ScoredPost = {
  postId: bigint;
  score: number;
};

type FeedVisibilityContext = {

  userId: bigint;
  friendIds: bigint[];
  blockedIds: bigint[];
};
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);
  private readonly feedRedisTtlSeconds = 6*90;
  private readonly visibilityCacheTtlSeconds = 15 * 60;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('post-scheduling') private readonly schedulingQueue: Queue,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
    private readonly redisService: RedisService,
    private readonly neo4jService: Neo4jService,
    private readonly engagementScoreService: EngagementScoreService,
  ) {}
  

  extractHashtags(content: string): string[] {
    const regex = /#[\w\u0600-\u06FF]+/g;
    const matches = content.match(regex);
    if (!matches) return [];

    return [
      ...new Set(
        matches
          .map((tag) => tag.slice(1).toLowerCase().trim())
          .filter((tag) => tag.length > 1 && tag.length < 50),
      ),
    ];
  }
  

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  private postIncludeWithMedia() {
    return {
      user: true,
      media: {
        include: {
          media: true,
        },
      },
      hashtags: {
        include: { hashtag: true },
      },
    };
  }

  private serializePost<T>(post: T, req?: Request): T {
    if (!post) return post;

    const serialized = JSON.parse(
      JSON.stringify(post, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as Record<string, any>;

    if (Array.isArray(serialized.media)) {
      serialized.media = serialized.media.map((relation) => {
        const media = serializeMedia(relation.media ?? relation, req);

        return {
          ...relation,
          ...media,
          media,
        };
      });
    }

    return serialized as T;
  }

  private serializePosts<T>(posts: T[], req?: Request): T[] {
    return posts.map((post) => this.serializePost(post, req));
  }

  private makeFeedRankKey(userId: string | number | bigint): string {
    return `feed:{user:${userId.toString()}}:rank`;
  }

  private makeVisibilityCacheKey(userId: bigint): string {
    return `visibility:${userId.toString()}`;
  }

  private queueOptions(delay?: number) {
    return {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
      ...(typeof delay === 'number' ? { delay } : {}),
    };
  }

  async invalidateUserFeedCache(userId: string | number | bigint): Promise<number> {
    const userIdBigInt = this.toBigInt(userId);
    const pattern = `feed:{user:${userIdBigInt.toString()}}:*`;
    const redisDeleted = await this.redisService.delByPattern(pattern);
    return redisDeleted;
  } 

  private normalizePage(page: number): number {
    if (!Number.isFinite(page) || page < 1) return 1;
    return Math.floor(page);
  }

  private normalizePageSize(pageSize: number): number {
    if (!Number.isFinite(pageSize) || pageSize < 1) return 20;
    return Math.min(Math.floor(pageSize), 50);
  }

  private collectInterestTokens(interests: string[]): string[] {
    const tokens = new Set<string>();
    const stopWords = new Set([
  'the','and','for','but','not','with','from',
  'this','that','these','those','have','has','had',
  'you','your','are','was','were',
]);
    for (const interest of interests) {
      const cleaned = interest.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ');
      for (const token of cleaned.split(/\s+/)) {
        if (token.length >= 3&& !stopWords.has(token)) {
          tokens.add(token);
        }
      }
    }

    return [...tokens];
  }

  private buildFullTextQuery(tokens: string[]): string | null {
    if (!tokens.length) return null;

    const terms = new Set<string>();
    for (const token of tokens) {
      terms.add(`${token}*`);
      if (token.length >= 5) {
        terms.add(`${token.slice(0, -1)}*`);
      }
    }

    return [...terms].join(' ');
  }

  private stableNoise(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
  }

  private scoreJitter(userId: bigint, postId: bigint, salt: string, scale: number): number {
    const key = `${userId.toString()}:${postId.toString()}:${salt}`;
    return this.stableNoise(key) * scale;
  }

  private decayByAge(updatedAt: Date, halfLifeHours = 240): number {
    const ageHours = Math.max(0, (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));
    return Math.exp(-ageHours / halfLifeHours);
  }

  private async updateHashtagRelations(hashtags: string[]): Promise<void> {
    const normalized = [
      ...new Set(
        hashtags
          .map((tag) => tag.trim().toLowerCase())
          .filter((tag) => tag.length > 1 && tag.length < 50),
      ),
    ];

    if (normalized.length < 2) return;

    const limited = normalized.slice(0, 8);

    try {
      const tagRows = await this.prisma.hashtag.findMany({
        where: {
          nameLower: {
            in: limited,
          },
        },
        select: {
          id: true,
          nameLower: true,
        },
      });

      if (tagRows.length < 2) return;

      const values: Prisma.Sql[] = [];
      for (let i = 0; i < tagRows.length; i += 1) {
        for (let j = 0; j < tagRows.length; j += 1) {
          if (i === j) continue;
          values.push(Prisma.sql`(${tagRows[i].id}, ${tagRows[j].id}, 1, NOW())`);
        }
      }

      if (!values.length) return;

      await this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO hashtag_relations (source_id, target_id, weight, updated_at)
          VALUES ${Prisma.join(values)}
          ON DUPLICATE KEY UPDATE
            weight = weight + VALUES(weight),
            updated_at = VALUES(updated_at)
        `,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to update hashtag relations: ${message}`);
    }
  }

  private async expandRelatedInterests(
    interests: Array<{ interest: string; score: number }>,
  ): Promise<Array<{ interest: string; score: number }>> {
    if (!interests.length) return interests;

    const baseScores = new Map<string, number>();
    for (const item of interests) {
      const key = item.interest.trim().toLowerCase();
      if (!key) continue;
      const current = baseScores.get(key) ?? 0;
      if (item.score > current) {
        baseScores.set(key, item.score);
      }
    }

    const topInterests = [...baseScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!topInterests.length) return interests;

    const tags = await this.prisma.hashtag.findMany({
      where: {
        nameLower: {
          in: topInterests.map(([name]) => name),
        },
      },
      select: {
        id: true,
        nameLower: true,
      },
    });

    if (!tags.length) return interests;

    const maxRelatedPerTag = 4;
    const relatedBoostFactor = 0.2;
    const relationWeightFactor = 0.05;

    const relatedLists = await Promise.all(
      tags.map((tag) =>
        this.prisma.hashtagRelation.findMany({
          where: { sourceId: tag.id },
          orderBy: { weight: 'desc' },
          take: maxRelatedPerTag,
          include: {
            target: {
              select: { nameLower: true },
            },
          },
        }),
      ),
    );

    const relatedScores = new Map<string, number>();

    tags.forEach((tag, index) => {
      const baseScore = baseScores.get(tag.nameLower) ?? 0;
      const relations = relatedLists[index];
      for (const relation of relations) {
        const targetName = relation.target?.nameLower;
        if (!targetName) continue;
        if (baseScores.has(targetName)) continue;
        const boost = Math.min(baseScore * relatedBoostFactor, relation.weight * relationWeightFactor);
        if (boost <= 0) continue;
        const current = relatedScores.get(targetName) ?? 0;
        if (boost > current) {
          relatedScores.set(targetName, boost);
        }
      }
    });

    if (!relatedScores.size) return interests;

    const merged = new Map<string, number>(baseScores);
    for (const [name, score] of relatedScores.entries()) {
      const current = merged.get(name) ?? 0;
      if (score > current) {
        merged.set(name, score);
      }
    }

    return [...merged.entries()].map(([interest, score]) => ({ interest, score }));
  }

  private async getFeedVisibilityContext(userId: bigint): Promise<FeedVisibilityContext> {
    const cacheKey = this.makeVisibilityCacheKey(userId);
    const cached = await this.redisService.get<{
      friendIds?: string[];
      blockedIds?: string[];
    }>(cacheKey);

    if (cached) {
      return {
        userId,
        friendIds: (cached.friendIds ?? []).map((id) => this.toBigInt(id)),
        blockedIds: (cached.blockedIds ?? []).map((id) => this.toBigInt(id)),
      };
    }


    const [friendRows, blockRows] = await Promise.all([
      this.prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ userId1: userId }, { userId2: userId }],
        },
        select: {
          userId1: true,
          userId2: true,
        },
      }),
      this.prisma.block.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
        select: {
          blockerId: true,
          blockedId: true,
        },
      }),
    ]);

    const friendIds = new Set<bigint>();
    for (const row of friendRows) {
      friendIds.add(row.userId1 === userId ? row.userId2 : row.userId1);
    }

    const blockedIds = new Set<bigint>();
    for (const row of blockRows) {
      blockedIds.add(row.blockerId === userId ? row.blockedId : row.blockerId);
    }

    const context: FeedVisibilityContext = {
      userId,
      friendIds: [...friendIds],
      blockedIds: [...blockedIds],
    };

    await this.redisService.set(
      cacheKey,
      {
        friendIds: context.friendIds.map((id) => id.toString()),
        blockedIds: context.blockedIds.map((id) => id.toString()),
      },
      this.visibilityCacheTtlSeconds,
    );

    return context;
  }

  private buildVisibilityWhere(context: FeedVisibilityContext): Prisma.PostWhereInput {
    const visibilityOr: Prisma.PostWhereInput[] = [
      { userId: context.userId },
      { visibility: PostVisibility.PUBLIC },
      {
        visibility: PostVisibility.CUSTOM,
        allowedUsers: {
          some: {
            userId: context.userId,
          },
        },
      },
    ];

    if (context.friendIds.length) {
      visibilityOr.push({
        visibility: PostVisibility.FRIENDS,
        userId: {
          in: context.friendIds,
        },
      });
    }

    const groupAccessConditions: Prisma.PostWhereInput[] = [
      { groupId: null },
      {
        AND: [
          { groupId: { not: null } },
          {
            OR: [
              { group: { privacy: 'PUBLIC' } },
              { group: { creatorId: context.userId } },
              {
                group: {
                  members: {
                    some: {
                      userId: context.userId,
                      status: 'APPROVED',
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ];

    const blockFilter = context.blockedIds.length
      ? {
          userId: {
            notIn: context.blockedIds,
          },
        }
      : {};

    return {
      AND: [
        { OR: visibilityOr },
        { OR: groupAccessConditions },
        blockFilter,
      ],
    };
  }

  private upsertCandidate(
    candidateMap: Map<string, FeedCandidate>,
    postId: bigint,
    score: number,
    source: string,
  ) {
    const key = postId.toString();
    const existing = candidateMap.get(key);
    if (!existing) {
      candidateMap.set(key, {
        postId,
        score,
        source,
      });
      return;
    }

    const combinedSource = existing.source === source ? existing.source : `${existing.source}+${source}`;
    candidateMap.set(key, {
      postId,
      score: existing.score + score,
      source: combinedSource,
    });
  }

  private buildFeedMix(pageSize: number, maturity: number) {
    const warmMix = {
      interest: Math.round(pageSize * 0.3),
      group: Math.round(pageSize * 0.4),
      social: Math.round(pageSize * 0.1),
      exploration: Math.round(pageSize * 0.2),
    };

    const coldMix = {
      interest: Math.max(2, Math.round(pageSize * 0.2)),
      group: 0,
      social: 0,
      exploration: Math.max(0, pageSize - Math.max(2, Math.round(pageSize * 0.2))),
    };

   
    const mix = {
      interest: Math.round(coldMix.interest + (warmMix.interest - coldMix.interest) * maturity),
      group: Math.round(coldMix.group + (warmMix.group - coldMix.group) * maturity),
      social: Math.round(coldMix.social + (warmMix.social - coldMix.social) * maturity),
      exploration: Math.round(coldMix.exploration + (warmMix.exploration - coldMix.exploration) * maturity),
    };

    const total = mix.interest + mix.group + mix.social + mix.exploration;
    if (total === pageSize) return mix;
    const maxKey = (['interest', 'group', 'social', 'exploration'] as const).toSorted((a, b) => mix[b] - mix[a])[0];
    mix[maxKey] = Math.max(0, mix[maxKey] + (pageSize - total));
    return mix;
  }

  private async getUserMaturityFactor(userId: bigint): Promise<number> {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [interestSummary, groupSummary] = await Promise.all([
      this.prisma.userInterest.aggregate({
        where: { userId, updatedAt: { gte: oneMonthAgo } },
        _sum: { score: true },
      }),
      this.prisma.userGroupAffinity.aggregate({
        where: { userId, updatedAt: { gte: oneMonthAgo } },
        _sum: { score: true },
      }),
    ]);

    const recentScores = (interestSummary._sum.score ?? 0) + (groupSummary._sum.score ?? 0);
    let maturityFactor = Math.max(0, Math.min(recentScores / 500, 1));

    const lastActivity = await this.prisma.userInteraction.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
      take: 1,
    });

    if (lastActivity) {
      const daysSinceActivity =
        (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 60) {
        maturityFactor *= Math.max(0.2, 1 - (daysSinceActivity - 60) / 240);
      }
    }

    return maturityFactor;
  }

  private async readGroupPosts(userId: bigint, limit: number): Promise<ScoredPost[]> {
    const groupAffinities = await this.prisma.userGroupAffinity.findMany({
      where: {
        userId,
        score: {
          gt: 0,
        },
      },
      orderBy: [
        { score: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: 20,
      select: {
        groupId: true,
        score: true,
        updatedAt: true,
      },
    });

    if (!groupAffinities.length) return [];

    const groupIds = groupAffinities.map((item) => item.groupId);
    const affinityByGroup = new Map(
      groupAffinities.map((item) => [item.groupId.toString(), item.score * this.decayByAge(item.updatedAt)]),
    );

    const posts = await this.prisma.post.findMany({
      where: {
        groupId: {
          in: groupIds,
        },
        status: { in: ['PUBLISHED', 'DIRECT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit * 3, 250),
      select: {
        id: true,
        groupId: true,
        createdAt: true,
        viewsCount: true,
      },
    });

    return posts
      .map((post) => {
        const groupId = post.groupId?.toString();
        if (!groupId) return null;

        const affinityScore = affinityByGroup.get(groupId) ?? 0;
        const hoursSincePublished = Math.max(0, (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60));
        const recencyScore = hoursSincePublished === 0 ? 1 : 1 / Math.log10(hoursSincePublished + 10);
        const interactionScore = Math.log10((post.viewsCount || 0) + 10) * 0.35;

        return {
          postId: post.id,
          score: affinityScore * 0.7 + recencyScore * 0.2 + interactionScore * 0.1,
        };
      })
      .filter((item): item is ScoredPost => Boolean(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async readGlobalTrends(
    limit: number,
    visibilityContext: FeedVisibilityContext,
  ): Promise<ScoredPost[]> {
    const visibilityWhere = this.buildVisibilityWhere(visibilityContext);

    const [trending, newest] = await Promise.all([
      this.prisma.trendingScore.findMany({
        where: {
          post: {
            status: { in: ['PUBLISHED', 'DIRECT'] },
            ...visibilityWhere,
          },
          
        },
        orderBy: { score: 'desc' },
        take: limit,
        select: {
          postId: true,
          score: true,
        },
      }),
      this.prisma.post.findMany({
        where: {
          status: { in: ['PUBLISHED', 'DIRECT'] },
          ...visibilityWhere,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
        },
      }),
    ]);

    const scored = new Map<string, number>();

    for (const item of trending) {
      scored.set(item.postId.toString(), (scored.get(item.postId.toString()) ?? 0) + item.score);
    }

    newest.forEach((post, index) => {
      const bonus = Math.max(0.2, 1.4 - index * 0.02);
      scored.set(post.id.toString(), (scored.get(post.id.toString()) ?? 0) + bonus);
    });

    return [...scored.entries()]
      .map(([postId, score]) => ({
        postId: this.toBigInt(postId),
        score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async getRedisRankedIds(userId: bigint, page: number, pageSize: number) {
    const rankKey = this.makeFeedRankKey(userId);
    const start = (page - 1) * pageSize;
    const stop = start + pageSize - 1;
    const members = await this.redisService.getFromSortedSet(rankKey, start, stop);

    if (!members.length) {
      return [];
    }

    return members.map((member) => this.toBigInt(member));
  }

  private async saveRedisFeedRank(userId: bigint, ranked: FeedCandidate[]) {
    const rankKey = this.makeFeedRankKey(userId);
    const entries = ranked.slice(0, 400).map((item) => ({
      member: item.postId.toString(),
      score: item.score,
    }));

    await this.redisService.replaceSortedSet(rankKey, entries, this.feedRedisTtlSeconds);
  }

  private async loadPostsByIds(postIds: bigint[], visibilityContext: FeedVisibilityContext, req?: Request) {
    if (!postIds.length) return [];
    const visibilityWhere = this.buildVisibilityWhere(visibilityContext);

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        status: { in: ['PUBLISHED', 'DIRECT'] },
        ...visibilityWhere,
      },
      include: this.postIncludeWithMedia(),
    });

    const byId = new Map(posts.map((post) => [post.id.toString(), post]));
    return postIds
      .map((postId) => byId.get(postId.toString()))
      .filter((post): post is (typeof posts)[number] => Boolean(post))
      .map((post) => this.serializePost(post, req));
  }

  private async readGraphFriendPosts(userId: bigint, limit: number): Promise<ScoredPost[]> {
    const rows = await this.neo4jService.read<Record<string, any>>(
      `
      MATCH (me:User {id: $userId})-[:FRIENDS_WITH]-(friend:User)-[:POSTED]->(post:Post)
     WHERE friend.id <> $userId AND post.status IN ['DIRECT', 'PUBLISHED']
     WITH post,
       duration.between(datetime(post.createdAt), datetime()).hours AS ageHours
     WITH post,
       (1.0 / log10(ageHours + 10)) AS recencyScore,
       (log10(coalesce(post.viewsCount, 0) + 10) * 0.3) AS popularityScore
     RETURN toString(post.id) AS postId,
         (recencyScore * 0.7 + popularityScore * 0.3 + 2.5) AS score
      ORDER BY score DESC
      LIMIT toInteger($limit)
      `,
      {
        userId: userId.toString(),
        limit,
      },
    );

    return rows
      .map((row) => {
        if (!row.postId) return null;
        const score = Number(row.score ?? 0);
        return {
          postId: this.toBigInt(String(row.postId)),
          score: Number.isFinite(score) ? score : 0,
        };
      })
      .filter((item): item is ScoredPost => Boolean(item));
  }

  private async readFriendOfFriendPosts(userId: bigint, limit: number): Promise<ScoredPost[]> {
    const rows = await this.neo4jService.read<Record<string, any>>(
      `
      MATCH (me:User {id: $userId})-[:FRIENDS_WITH]->(friend:User)
                                   -[:FRIENDS_WITH]->(fof:User)
                                   -[:POSTED]->(post:Post)
      WHERE fof.id <> $userId
        AND NOT (me)-[:FRIENDS_WITH]->(fof)
        AND post.status IN ['DIRECT', 'PUBLISHED']
      WITH post, count(DISTINCT friend) AS mutualFriends,
           duration.between(datetime(post.createdAt), datetime()).hours AS ageHours
      RETURN toString(post.id) AS postId,
             (mutualFriends * 0.4 + 1.0 / log10(ageHours + 10)) AS score
      ORDER BY score DESC
      LIMIT toInteger($limit)
      `,
      {
        userId: userId.toString(),
        limit,
      },
    );

    return rows
      .map((row) => {
        if (!row.postId) return null;
        const score = Number(row.score ?? 0);
        return {
          postId: this.toBigInt(String(row.postId)),
          score: Number.isFinite(score) ? score : 0,
        };
      })
      .filter((item): item is ScoredPost => Boolean(item));
  }

  private async readRelatedInterestPosts(userId: bigint, limit: number): Promise<ScoredPost[]> {
    const rows = await this.neo4jService.read<Record<string, any>>(
      `
      MATCH (me:User {id: $userId})-[ui:INTERESTED_IN]->(interest:Interest)
      WITH interest, coalesce(ui.score, 1) AS baseScore
      ORDER BY baseScore DESC
      LIMIT 10

      MATCH path = (interest)-[:RELATED_TO*1..3]->(related:Interest)
      WITH related, baseScore, length(path) AS hops
      WITH related, sum(baseScore / (hops * 2.0)) AS relatedScore

      MATCH (post:Post)-[:TAGGED_WITH]->(related)
      WHERE post.status IN ['DIRECT', 'PUBLISHED']
      WITH post, SUM(relatedScore) AS totalScore,
           duration.between(datetime(post.createdAt), datetime()).hours AS ageHours
      RETURN toString(post.id) AS postId,
             (totalScore * 0.6 + 1.0 / log10(ageHours + 10) * 0.4) AS score
      ORDER BY score DESC
      LIMIT toInteger($limit)
      `,
      {
        userId: userId.toString(),
        limit,
      },
    );

    return rows
      .map((row) => {
        if (!row.postId) return null;
        const score = Number(row.score ?? 0);
        return {
          postId: this.toBigInt(String(row.postId)),
          score: Number.isFinite(score) ? score : 0,
        };
      })
      .filter((item): item is ScoredPost => Boolean(item));
  }

  private async readGraphFriendSeenPosts(userId: bigint, limit: number): Promise<ScoredPost[]> {
    const rows = await this.neo4jService.read<Record<string, any>>(
`
    MATCH (me:User {id: $userId})-[:FRIENDS_WITH]->(friend:User)-[seen:INTERACTED_WITH]->(post:Post)
    WITH post, MAX(seen.updatedAt) AS lastSeenTime
    RETURN toString(post.id) AS postId, 2.2 AS score
    ORDER BY lastSeenTime DESC
    LIMIT toInteger($limit)
    `,
      {
        userId: userId.toString(),
        limit,
      },
    );

    return rows
      .map((row) => {
        if (!row.postId) return null;
        const score = Number(row.score ?? 0);
        return {
          postId: this.toBigInt(String(row.postId)),
          score: Number.isFinite(score) ? score : 0,
        };
      })
      .filter((item): item is ScoredPost => Boolean(item));
  }

  private async readInterestPosts(userId: bigint, limit: number): Promise<ScoredPost[]> {
    // let interests = await this.prisma.userInterest.findMany({
    //   where: { userId },
    //   orderBy: { score: 'desc' },
    //   take: 50,
    // });  

    // if (!interests.length) return [];

    // interests = await this.expandRelatedInterests(interests);
      const rawInterests = await this.prisma.userInterest.findMany({
    where: { userId },
    orderBy: { score: 'desc' },
    take: 50,
  });

  if (!rawInterests.length) return [];

  // ✅ Separate variable — no type conflict
  const interests = await this.expandRelatedInterests(
    rawInterests.map((i) => ({ interest: i.interest, score: i.score }))
  );

    const interestWords = interests.map((item) => item.interest);
    const interestWordsLower = interests.map((item) => item.interest.toLowerCase());

    const interestTokens = this.collectInterestTokens(interestWords);
    const fullTextQuery = this.buildFullTextQuery(interestTokens);
    const fullTextLimit = Math.min(limit * 3, 300);
    const status = ['PUBLISHED', 'DIRECT'];
    // const statusValues = ['DIRECT', 'published'];

    const fullTextRows = fullTextQuery
      ? await this.prisma.$queryRaw<Array<{ id: bigint; score: number | null }>>(
          Prisma.sql`
            SELECT id, MATCH(content) AGAINST (${fullTextQuery} IN BOOLEAN MODE) AS score
            FROM posts
            WHERE status IN (${Prisma.join(status)})
              AND content IS NOT NULL
              AND MATCH(content) AGAINST (${fullTextQuery} IN BOOLEAN MODE)
            ORDER BY score DESC, created_at DESC
            LIMIT ${fullTextLimit}
          `,
        )
      : [];

    const fullTextScoreById = new Map<string, number>();
    let maxFullTextScore = 0;
    for (const row of fullTextRows) {
      const score = Number(row.score ?? 0);
      if (!Number.isFinite(score) || score <= 0) continue;
      fullTextScoreById.set(row.id.toString(), score);
      if (score > maxFullTextScore) {
        maxFullTextScore = score;
      }
    }

    const hashtagRows = await this.prisma.post.findMany({
      where: {
        status: { in: ['PUBLISHED', 'DIRECT'] },
        hashtags: {
          some: {
            hashtag: {
              nameLower: {
                in: interestWordsLower,
              },
            },
          },
        },
      },
      take: Math.min(limit * 2, 200),
      select: {
        id: true,
      },
    });

    const candidateIds = new Set<string>();
    for (const row of fullTextRows) {
      candidateIds.add(row.id.toString());
    }
    for (const row of hashtagRows) {
      candidateIds.add(row.id.toString());
    }

    if (!candidateIds.size) return [];

    const posts = await this.prisma.post.findMany({
      where: {
        status: { in: ['PUBLISHED', 'DIRECT'] },
        id: {
          in: [...candidateIds].map((id) => this.toBigInt(id)),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        viewsCount: true,
        hashtags: {
          select: {
            hashtag: {
              select: {
                nameLower: true,
              },
            },
          },
        },
      },
    });

    const scoredPosts = posts.map((post) => {
      let interestScore = 0;
      const postContentLower = post.content?.toLowerCase() || '';
      const postHashtagNames = post.hashtags.map((h) => h.hashtag.nameLower);
      const fullTextScore = fullTextScoreById.get(post.id.toString()) ?? 0;
      const contentRelevance = maxFullTextScore > 0 ? fullTextScore / maxFullTextScore : 0;

      for (const interest of interests) {
        const interestWord = interest.interest.toLowerCase();
        let matchWeight = 0;

        // Hashtag match is strong
        if (postHashtagNames.includes(interestWord)) {
          matchWeight += 1.5;
        }

        // Content match (not just hashtags)
        if (postContentLower.includes(interestWord)) {
          matchWeight += 1.0;
        }

        if (matchWeight > 0) {
          interestScore += matchWeight * interest.score;
        }
      }

      interestScore += contentRelevance;

      // Recency score (newer posts get higher values, gradually decays over time)
      const hoursSincePublished = Math.max(0, (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60));
      const recencyScore = hoursSincePublished === 0 ? 1 : 1 / Math.log10(hoursSincePublished + 10);

      // Simple interaction score (based on views)
      const interactionScore = Math.log2((post.viewsCount || 0) + 10) * 0.5;

      // Proposed scoring formula: interestScore * 0.5 + recency * 0.2 + interaction * 0.3
      const finalScore = (interestScore * 0.5) + (recencyScore * 0.2) + (interactionScore * 0.3);

      return {
        postId: post.id,
        score: finalScore,
      };
    });

    return scoredPosts
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async readPopularPosts(limit: number): Promise<ScoredPost[]> {
    const trending = await this.prisma.trendingScore.findMany({
      orderBy: { score: 'desc' },
      take: limit,
      select: {
        postId: true,
        score: true,
      },
    });

    return trending.map((item) => ({
      postId: item.postId,
      score: item.score,
    }));
  }

  private async readNewestPosts(limit: number): Promise<ScoredPost[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        status: { in: ['PUBLISHED', 'DIRECT'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
      },
    });

    return posts.map((post, index) => ({
      postId: post.id,
      score: 1.6 - index * 0.01,
    }));
  }

  private async diversifyCandidates(ranked: FeedCandidate[]) {
    if (!ranked.length) {
      return ranked;
    }

    const seedPool = ranked.slice(0, 500);
    const authorRows = await this.prisma.post.findMany({
      where: {
        id: {
          in: seedPool.map((item) => item.postId),
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const authorByPost = new Map(
      authorRows.map((row) => [row.id.toString(), row.userId.toString()]),
    );

    const byAuthorCount = new Map<string, number>();
    const selected: FeedCandidate[] = [];
    const overflow: FeedCandidate[] = [];

    for (const item of ranked) {
      const authorId = authorByPost.get(item.postId.toString());
      if (!authorId) {
        selected.push(item);
        continue;
      }

      const currentCount = byAuthorCount.get(authorId) ?? 0;
      if (currentCount < 2) {
        byAuthorCount.set(authorId, currentCount + 1);
        selected.push(item);
      } else {
        overflow.push(item);
      }
    }

    return [...selected, ...overflow];
  }

  async schedulePost(userId: string, data: any) {
    const scheduledFor = new Date(data.scheduledAt ?? data.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('Invalid scheduledAt value');
    }

    const scheduledPost = await this.prisma.post.create({
      data: {
        userId: this.toBigInt(userId),
        content: data.content ?? null,
        visibility: data.visibility,
        feeling: data.feeling,
        location: data.location,
        status: 'PENDING',
      },
    });

    const delay = Math.max(scheduledFor.getTime() - Date.now(), 0);

    await this.schedulingQueue.add(
      'publish-post',
      { scheduledPostId: scheduledPost.id.toString() },
      this.queueOptions(delay),
    );

    await this.graphQueue.add(
      'sync-post',
      {
        postId: scheduledPost.id.toString(),
        authorId: scheduledPost.userId.toString(),
        hashtags: this.extractHashtags(data.content || ''),
        status: String(scheduledPost.status || 'PENDING'),
        createdAt: scheduledPost.createdAt.toISOString(),
        viewsCount: scheduledPost.viewsCount,
      },
      this.queueOptions(),
    );

    return scheduledPost;
  }

  async create(userId: string | number | bigint, createPostDto: CreatePostDto, req?: Request) {
    const hashtags = this.extractHashtags(createPostDto.content || '');
    const { mediaIds, ...rest } = createPostDto;

    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          userId: this.toBigInt(userId),
          content: rest.content,
          visibility: rest.visibility,
          feeling: rest.feeling,
          location: rest.location,
          isEdited: rest.isEdited ?? false,
        },
      });

      if (hashtags.length > 0) {
        for (const tag of hashtags) {
          const hashtagRecord = await tx.hashtag.upsert({
            where: { nameLower: tag },
            update: {},
            create: {
              name: tag,
              nameLower: tag,
            },
          });

          await tx.postHashtag.create({
            data: {
              postId: created.id,
              hashtagId: hashtagRecord.id,
            },
          });
        }
      }

      if (mediaIds?.length) {
        await tx.postMedia.createMany({
          data: mediaIds.map((mediaId) => ({
            postId: created.id,
            mediaId: this.toBigInt(mediaId),
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    await Promise.all([
      this.invalidateUserFeedCache(userId),
      this.graphQueue.add(
        'sync-post',
        {
          postId: post.id.toString(),
          authorId: post.userId.toString(),
          hashtags,
          status: String(post.status || 'DIRECT'),
          createdAt: post.createdAt.toISOString(),
          viewsCount: post.viewsCount,
        },
        this.queueOptions(),
      ),
    ]);

    await this.engagementScoreService.trackPostCreated({
      userId: post.userId,
      postId: post.id,
      hashtags,
    });

    return this.findOne(post.id.toString(), req);
  }
async getFeedForUser(userId: string | number | bigint, page = 1, pageSize = 20, req?: Request) {
  const normalizedPage = this.normalizePage(page);
  const normalizedPageSize = this.normalizePageSize(pageSize);
  const userIdBigInt = this.toBigInt(userId);
  const visibilityContext = await this.getFeedVisibilityContext(userIdBigInt);

  // ── Redis cache check ────────────────────────────────────────────
  const redisRankedIds = await this.getRedisRankedIds(
    userIdBigInt,
    normalizedPage,
    normalizedPageSize,
  );
  if (redisRankedIds.length) {
    const redisFeed = await this.loadPostsByIds(redisRankedIds, visibilityContext, req);
    if (redisFeed.length >= normalizedPageSize){
       const seenIds = await this.getSessionSeenIds(userIdBigInt);
         const filtered = redisFeed.filter(
      (post) => !seenIds.has(post.id.toString())
    );
    await this.markSessionSeen(userIdBigInt, filtered.map(p => p.id), seenIds); 
    
    // كتب في الدفتر
    // await this.markSessionSeen(userIdBigInt, filtered.map(p => p.id));
    
    return filtered;
  }
    // return redisFeed;
  }

  // ── Scoring pipeline ─────────────────────────────────────────────
  const maturity = await this.getUserMaturityFactor(userIdBigInt);
  const candidatePool = maturity > 0.7
    ? Math.max(normalizedPageSize * 5, 50)
    : Math.max(normalizedPageSize * 12, 120);
  const mix = this.buildFeedMix(normalizedPageSize, maturity);

  const sourceLabels = ['social', 'interest', 'group', 'exploration', 'fof', 'related'] as const;
  const results = await Promise.allSettled([
    this.readGraphFriendPosts(userIdBigInt, candidatePool),
    this.readInterestPosts(userIdBigInt, candidatePool),
    this.readGroupPosts(userIdBigInt, candidatePool),
    this.readGlobalTrends(candidatePool, visibilityContext),
    this.readFriendOfFriendPosts(userIdBigInt, candidatePool),
    this.readRelatedInterestPosts(userIdBigInt, candidatePool),
  ]);

  const extract = (index: number): ScoredPost[] => {
    const result = results[index];
    if (result.status === 'fulfilled') return result.value;
    this.logger.warn(`Feed source ${sourceLabels[index]} failed: ${result.reason?.message}`);
    return [];
  };

  const socialPosts   = extract(0);
  const interestPosts = extract(1);
  const groupPosts    = extract(2);
  const globalPosts   = extract(3);
  const fofPosts      = extract(4);
  const relatedPosts  = extract(5);

  const candidateMap = new Map<string, FeedCandidate>();
  const addSourceItems = (items: ScoredPost[], source: string, bonus: number, salt: string) => {
    for (const item of items) {
      this.upsertCandidate(
        candidateMap,
        item.postId,
        item.score + bonus + this.scoreJitter(userIdBigInt, item.postId, salt, bonus * 0.35),
        source,
      );
    }
  };

  const fofLimit = Math.round(mix.social * 0.5);
  const relatedLimit = Math.round(mix.interest * 0.4);

  addSourceItems(socialPosts.slice(0, mix.social),       'social',      1.4, 'social');
  addSourceItems(interestPosts.slice(0, mix.interest),   'interest',    1.8, 'interest');
  addSourceItems(fofPosts.slice(0, fofLimit),            'fof',         1.6, 'fof');
  addSourceItems(relatedPosts.slice(0, relatedLimit),    'related',     2.0, 'related');
  addSourceItems(groupPosts.slice(0, mix.group),         'group',       2.2, 'group');
  addSourceItems(globalPosts.slice(0, mix.exploration),  'exploration', 1.1, 'exploration');

  if (!candidateMap.size) {
    for (const item of globalPosts) {
      this.upsertCandidate(
        candidateMap,
        item.postId,
        item.score + this.scoreJitter(userIdBigInt, item.postId, 'fallback', 0.5),
        'exploration-fallback',
      );
    }
  }

  let ranked = [...candidateMap.values()]
    .map((item) => ({
      ...item,
      score: item.score + this.scoreJitter(userIdBigInt, item.postId, 'final', 1),
    }))
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    ranked = globalPosts.map((item) => ({
      postId: item.postId,
      score: item.score,
      source: 'exploration-fallback',
    }));
  }

  ranked = await this.diversifyCandidates(ranked);

  const start = (normalizedPage - 1) * normalizedPageSize;
  const selectedIds = ranked.slice(start, start + normalizedPageSize).map((item) => item.postId);

  let feed = await this.loadPostsByIds(selectedIds, visibilityContext, req);

  // ── Fill if short ────────────────────────────────────────────────
  if (feed.length < normalizedPageSize) {
    const existingIds = new Set(feed.map((item) => item.id.toString()));
    const fillIds: bigint[] = [];

    for (const item of ranked.slice(start + normalizedPageSize)) {
      if (existingIds.has(item.postId.toString())) continue;
      fillIds.push(item.postId);
      if (feed.length + fillIds.length >= normalizedPageSize) break;
    }

    if (fillIds.length) {
      const fillPosts = await this.loadPostsByIds(fillIds, visibilityContext, req);
      feed = [...feed, ...fillPosts];
      for (const post of fillPosts) existingIds.add(post.id.toString());
    }

    if (feed.length < normalizedPageSize) {
      const visibilityWhere = this.buildVisibilityWhere(visibilityContext);
      const fallbackPosts = await this.prisma.post.findMany({
        where: {
          status: { in: ['PUBLISHED', 'DIRECT'] },
          ...visibilityWhere,
          id: { notIn: [...existingIds].map((id) => this.toBigInt(id)) },
        },
        orderBy: { createdAt: 'desc' },
        take: normalizedPageSize - feed.length,
        include: this.postIncludeWithMedia(),
      });
      feed = [...feed, ...this.serializePosts(fallbackPosts, req)];
    }
  }

  // ── Session deduplication ← ✅ AFTER feed is defined ─────────────
  const seenIds = await this.getSessionSeenIds(userIdBigInt);
  feed = feed.filter((post) => !seenIds.has(post.id.toString()));
  await this.markSessionSeen(userIdBigInt, feed.map((p) => p.id));

  // ── Save rank cache ──────────────────────────────────────────────
  await this.saveRedisFeedRank(userIdBigInt, ranked);

  return feed;
}
//   async getFeedForUser(userId: string | number | bigint, page = 1, pageSize = 20) {
//     const normalizedPage = this.normalizePage(page);
//     const normalizedPageSize = this.normalizePageSize(pageSize);
//     const userIdBigInt = this.toBigInt(userId);
//     const visibilityContext = await this.getFeedVisibilityContext(userIdBigInt);
    
// // In getFeedForUser(), after loading posts:
//       const seenIds = await this.getSessionSeenIds(userIdBigInt);
//       feed = feed.filter(post => !seenIds.has(post.id.toString()));
//       await this.markSessionSeen(userIdBigInt, feed.map(p => p.id));
//        const redisRankedIds = await this.getRedisRankedIds(
//       userIdBigInt,
//       normalizedPage,
//       normalizedPageSize,
//     );
//     if (redisRankedIds.length) {
//       const redisFeed = await this.loadPostsByIds(redisRankedIds, visibilityContext);
//       if (redisFeed.length >= normalizedPageSize) {
//         return redisFeed;
//       }
//     }

//     const maturity = await this.getUserMaturityFactor(userIdBigInt);
//     const candidatePool =
//       maturity > 0.7
//         ? Math.max(normalizedPageSize * 5, 50)
//         : Math.max(normalizedPageSize * 12, 120);
//          const mix = this.buildFeedMix(normalizedPageSize, maturity);

//     const sourceLabels = ['social', 'interest', 'group', 'exploration'] as const;

//     const results = await Promise.allSettled([
//       this.readGraphFriendPosts(userIdBigInt, candidatePool),
//       this.readInterestPosts(userIdBigInt, candidatePool),
//       this.readGroupPosts(userIdBigInt, candidatePool),
//       this.readGlobalTrends(candidatePool, visibilityContext),
//     ]);

//     const extract = (index: number): ScoredPost[] => {
//       const result = results[index];
//       if (result.status === 'fulfilled') {
//         return result.value;
//       }
//       this.logger.warn(
//         `Feed source ${sourceLabels[index]} failed: ${result.reason?.message || 'unknown error'}`,
//       );
//       return [];
//     };

//     const socialPosts = extract(0);
//     const interestPosts = extract(1);
//     const groupPosts = extract(2);
//     const globalPosts = extract(3);

//     const candidateMap = new Map<string, FeedCandidate>();
//     const addSourceItems = (items: ScoredPost[], source: string, bonus: number, jitterSalt: string) => {
//       for (const item of items) {
//         this.upsertCandidate(
//           candidateMap,
//           item.postId,
//           item.score + bonus + this.scoreJitter(userIdBigInt, item.postId, jitterSalt, bonus * 0.35),
//           source,
//         );
//       }
//     };

//     addSourceItems(socialPosts.slice(0, mix.social), 'social', 1.4, 'social');
//     addSourceItems(interestPosts.slice(0, mix.interest), 'interest', 1.8, 'interest');
//     addSourceItems(groupPosts.slice(0, mix.group), 'group', 2.2, 'group');
//     addSourceItems(globalPosts.slice(0, mix.exploration), 'exploration', 1.1, 'exploration');

//     if (!candidateMap.size) {
//       for (const item of globalPosts) {
//         this.upsertCandidate(
//           candidateMap,
//           item.postId,
//           item.score + this.scoreJitter(userIdBigInt, item.postId, 'fallback', 0.5),
//           'exploration-fallback',
//         );
//       }
//     }

//     let ranked = [...candidateMap.values()]
//       .map((item) => ({
//         ...item,
//         score: item.score + this.scoreJitter(userIdBigInt, item.postId, 'final', 1),
//       }))
//       .sort((a, b) => b.score - a.score);

//     if (!ranked.length) {
//       ranked = globalPosts.map((item) => ({
//         postId: item.postId,
//         score: item.score,
//         source: 'exploration-fallback',
//       }));
//     }

//     ranked = await this.diversifyCandidates(ranked);

//     const start = (normalizedPage - 1) * normalizedPageSize;
//     const selectedIds = ranked
//       .slice(start, start + normalizedPageSize)
//       .map((item) => item.postId);

//     let feed = await this.loadPostsByIds(selectedIds, visibilityContext);

//     if (feed.length < normalizedPageSize) {
//       const existingIds = new Set(feed.map((item) => item.id.toString()));
//       const fillIds: bigint[] = [];

//       for (const item of ranked.slice(start + normalizedPageSize)) {
//         const key = item.postId.toString();
//         if (existingIds.has(key)) continue;
//         fillIds.push(item.postId);
//         if (feed.length + fillIds.length >= normalizedPageSize) break;
//       }

//       if (fillIds.length) {
//         const fillPosts = await this.loadPostsByIds(fillIds, visibilityContext);
//         if (fillPosts.length) {
//           feed = [...feed, ...fillPosts];
//           for (const post of fillPosts) {
//             existingIds.add(post.id.toString());
//           }
//         }
//       }

//       if (feed.length < normalizedPageSize) {
//         const visibilityWhere = this.buildVisibilityWhere(visibilityContext);
//         const fallbackPosts = await this.prisma.post.findMany({
//           where: {
//             status: { in: ['PUBLISHED', 'DIRECT'] },
//             ...visibilityWhere,
//             id: {
//               notIn: [...existingIds].map((id) => this.toBigInt(id)),
//             },
//           },
//           orderBy: { createdAt: 'desc' },
//           take: normalizedPageSize - feed.length,
//           include: {
//             user: true,
//             media: true,
//             hashtags: {
//               include: { hashtag: true },
//             },
//           },
//         });

//         feed = [...feed, ...fallbackPosts];
//       }
//     }

//     await this.saveRedisFeedRank(userIdBigInt, ranked);

//     return feed;
//   }

  async findAll(req?: Request) {
    const posts = await this.prisma.post.findMany({
      include: this.postIncludeWithMedia(),
    });

    return this.serializePosts(posts, req);
  }

  async findOne(id: string, req?: Request) {
    const post = await this.prisma.post.findUnique({
      where: { id: this.toBigInt(id) },
      include: this.postIncludeWithMedia(),
    });

    return this.serializePost(post, req);
  }


  async update(id: string, updatePostDto: UpdatePostDto, userId: bigint, req?: Request) {
    userId = this.toBigInt(userId);
      const user= await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('there is no user with this id');

    const { mediaIds, ...rest } = updatePostDto as UpdatePostDto & {
      mediaIds?: Array<string | number | bigint>;
    };
    const postId = this.toBigInt(id);
    const post1=await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });
    if (!post1) throw new NotFoundException('there is no post with this id');  
       if (post1.userId !== userId && user.role !== 'ADMIN') {
        throw new NotFoundException('you don`t have  permission to edit this post');
      }


    const post = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.post.update({
        where: { id: postId },
        data: {
          ...rest,
          isEdited: true,
        } as any,
      });
     

      if (mediaIds) {
        await tx.postMedia.deleteMany({ where: { postId } });

        if (mediaIds.length) {
          await tx.postMedia.createMany({
            data: mediaIds.map((mediaId) => ({
              postId,
              mediaId: this.toBigInt(mediaId),
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    await Promise.all([
      this.invalidateUserFeedCache(post.userId),
      this.graphQueue.add(
        'sync-post',
        {
          postId: post.id.toString(),
          authorId: post.userId.toString(),
          hashtags: this.extractHashtags(post.content || ''),
          status: String(post.status || 'DIRECT'),
          createdAt: post.createdAt.toISOString(),
          viewsCount: post.viewsCount,
        },
        this.queueOptions(),
      ),
    ]);

    await this.engagementScoreService.trackPostCreated({
      userId: post.userId,
      postId: post.id,
      hashtags: this.extractHashtags(post.content || ''),
    });

    return this.findOne(post.id.toString(), req);
  }

  async remove(id: string, userId: bigint) {
    const user= await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('there is no user with this id');
    const Post=await this.prisma.post.findUnique({
      where: { id: this.toBigInt(id) },
      select: { id: true, userId: true },
    });
    if (!Post) throw new NotFoundException('there is no post with this id');
        if (Post.userId !== userId && user.role !== 'ADMIN') {
      throw new NotFoundException('you don`t have  permission to delete this post');
    }
    const deletedPost = await this.prisma.post.delete({
      where: { id: this.toBigInt(id) },
    });


    await Promise.all([
      this.invalidateUserFeedCache(deletedPost.userId),
      this.graphQueue.add(
        'remove-post',
        {
          postId: deletedPost.id.toString(),
        },
        this.queueOptions(),
      ),
    ]);

    return deletedPost;
  }

  async sharePost(userId: number, originalPostId: string, quoteContent?: string) {
    const targetPostId = this.toBigInt(originalPostId);

    const originalPost = await this.prisma.post.findUnique({
      where: { id: targetPostId },
    });

    if (!originalPost) throw new NotFoundException('Post not found');

    const post = await this.prisma.post.create({
      data: {
        userId: this.toBigInt(userId),
        content: quoteContent || null,
        sharedPostId: targetPostId,
      },
    });

    await Promise.all([
      this.invalidateUserFeedCache(post.userId),
      this.graphQueue.add(
        'sync-post',
        {
          postId: post.id.toString(),
          authorId: post.userId.toString(),
          hashtags: this.extractHashtags(post.content || ''),
          status: String(post.status || 'DIRECT'),
          createdAt: post.createdAt.toISOString(),
          viewsCount: post.viewsCount,
        },
        this.queueOptions(),
      ),
    ]);

    return post;
  }

  async savePost(postId: bigint, userId: bigint) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        content: true,
        status: true,
        hashtags: {
          select: {
            hashtag: {
              select: { name: true },
            },
          },
        },
        categoryMap: {
          select: {
            category: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!post) throw new NotFoundException('Post not found');

    const alreadySaved = await this.prisma.savedPost.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (alreadySaved) {
      throw new ConflictException('Post already saved');
    }

    const savedPost = await this.prisma.savedPost.create({
      data: { postId, userId },
    });

    const interestsToUpdate: string[] = [];
    for (const item of post.hashtags) {
      if (item.hashtag.name) interestsToUpdate.push(item.hashtag.name);
    }
    for (const item of post.categoryMap) {
      interestsToUpdate.push(`category_${item.category.name}`);
    }

    if (interestsToUpdate.length > 0) {
      await Promise.all(
        interestsToUpdate.map((name) =>
          this.prisma.userInterest.upsert({
            where: { userId_interest: { userId, interest: name } },
            update: { score: { increment: 50.0 } },
            create: { userId, interest: name, score: 50.0 },
          }),
        ),
      );
    }

    await this.invalidateUserFeedCache(userId);

    this.graphQueue.add(
      'sync-saved-post',
      {
        postId: postId.toString(),
        userId: userId.toString(),
        content: post.content,
        interests: interestsToUpdate,
      },
      this.queueOptions(),
    );

    return savedPost;
  }

  async postInGroup(userId: number, groupId: string, content: string) {
    const userBigInt = this.toBigInt(userId);
    const groupBigInt = this.toBigInt(groupId);
    const group = await this.prisma.group.findFirst({
      where: { id: groupBigInt, deletedAt: null },
      select: {
        id: true,
        postsNeedApproval: true,
        creatorId: true,
        members: {
          where: { userId: userBigInt, status: 'APPROVED' },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isCreator = group.creatorId === userBigInt;
    const isMember = group.members.length > 0;
    if (!isCreator && !isMember) {
      throw new ConflictException('You must join the group before posting');
    }

    const hashtags = this.extractHashtags(content || '');
    const status = group.postsNeedApproval ? 'PENDING' : 'DIRECT';
    const post = await this.prisma.post.create({
      data: {
        userId: userBigInt,
        groupId: group.id,
        content,
        visibility: PostVisibility.PUBLIC,
        status,
      },
    });

    await Promise.all([
      this.invalidateUserFeedCache(post.userId),
      this.updateHashtagRelations(hashtags),
      this.graphQueue.add(
        'sync-post',
        {
          postId: post.id.toString(),
          authorId: post.userId.toString(),
          hashtags,
          status: String(post.status || 'DIRECT'),
          createdAt: post.createdAt.toISOString(),
          viewsCount: post.viewsCount,
        },
        this.queueOptions(),
      ),
    ]);

    await this.engagementScoreService.trackPostCreated({
      userId: post.userId,
      postId: post.id,
      groupId: post.groupId,
      hashtags,
    });

    return post;
  }
  async approvePostInGroup(adminId: string | number | bigint, postId: string) {
    const adminBigInt = this.toBigInt(adminId);
    const targetPost = await this.prisma.post.findUnique({
      where: { id: this.toBigInt(postId) },
      select: {
        id: true,
        groupId: true,
      },
    });

    if (!targetPost || !targetPost.groupId) {
      throw new NotFoundException('Post not found');
    }

    await this.ensureGroupAdmin(adminBigInt, targetPost.groupId);

    return this.prisma.post.update({
      where: { id: targetPost.id },
      data: { status: 'PUBLISHED' as any },
    });
  }

  async approveMemberInGroup(
    adminId: string | number | bigint,
    groupId: string,
    memberId: string | number | bigint,
  ) {
    await this.ensureGroupAdmin(this.toBigInt(adminId), this.toBigInt(groupId));

    return this.prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId: this.toBigInt(groupId),
          userId: this.toBigInt(memberId),
        },
      },
      data: { status: 'APPROVED' as any },
    });
  }

  async removeMemberFromGroup(
    adminId: string | number | bigint,
    groupId: string,
    memberId: string | number | bigint,
  ) {
    await this.ensureGroupAdmin(this.toBigInt(adminId), this.toBigInt(groupId));

    return this.prisma.groupMember.deleteMany({
      where: {
        groupId: this.toBigInt(groupId),
        userId: this.toBigInt(memberId),
      },
    });
  }

  async rejectPostInGroup(adminId: string | number | bigint, postId: string) {
    const adminBigInt = this.toBigInt(adminId);
    const targetPost = await this.prisma.post.findUnique({
      where: { id: this.toBigInt(postId) },
      select: {
        id: true,
        groupId: true,
      },
    });

    if (!targetPost || !targetPost.groupId) {
      throw new NotFoundException('Post not found');
    }

    await this.ensureGroupAdmin(adminBigInt, targetPost.groupId);

    return this.prisma.post.update({
      where: { id: targetPost.id },
      data: { status: 'CANCELLED' as any },
    });
  }

  async leaveGroup(userId: string | number | bigint, groupId: string) {
    await this.prisma.groupMember.deleteMany({
      where: {
        groupId: this.toBigInt(groupId),
        userId: this.toBigInt(userId),
      },
    });

    await this.engagementScoreService.trackGroupLeave({
      userId,
      groupId,
    });

    return { message: 'Left group successfully' };
  }

  async hidePost(userId: number, postId: string) {
    return this.prisma.post.update({
      where: { id: this.toBigInt(postId) },
      data: { deletedAt: new Date() },
    });
  }
async hidePostForUser(userId: bigint, postId: bigint) {
  return this.prisma.hiddenPost.upsert({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },

    update: {},

    create: {
      userId,
      postId,
    },
  });
}
  async deleteGroup(adminId: string | number | bigint, groupId: string) {
    await this.ensureGroupAdmin(this.toBigInt(adminId), this.toBigInt(groupId));

    return this.prisma.group.update({
      where: { id: this.toBigInt(groupId) },
      data: { deletedAt: new Date() },
    });
  }

  async updateGroupPrivacy(
    adminId: string | number | bigint,
    groupId: string,
    privacy: 'PUBLIC' | 'PRIVATE',
  ) {
    await this.ensureGroupAdmin(this.toBigInt(adminId), this.toBigInt(groupId));

    return this.prisma.group.update({
      where: { id: this.toBigInt(groupId) },
      data: { privacy: privacy as any },
    });
  }

  async updatePostPrivacy(userId: string | number | bigint, postId: string, visibility: PostVisibility) {
    const userBigInt = this.toBigInt(userId);
    const postBigInt = this.toBigInt(postId);

      const post = await this.prisma.post.findUnique({
      where: { id: postBigInt },
      select: { id: true, userId: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    const isOwner = post.userId === userBigInt;
    if (!isOwner) {
      throw new NotFoundException('You do not have permission to change this post');
    }
    return this.prisma.post.update({
      where: { id: postBigInt },
      data: { visibility: visibility },
  
    });
  }

  private async ensureGroupAdmin(adminId: bigint, groupId: bigint) {
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: adminId,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (membership?.status === 'APPROVED' && (membership.role === 'ADMIN' || membership.role === 'MODERATOR')) {
      return;
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { creatorId: true },
    });

    if (group?.creatorId === adminId) {
      return;
    }

    throw new ConflictException('Admin access required');
  }
  // Add to PostService
private makeSessionSeenKey(userId: bigint): string {
  return `session:seen:${userId}`;
}

private async getSessionSeenIds(userId: bigint): Promise<Set<string>> {
  const data = await this.redisService.get<string[]>(this.makeSessionSeenKey(userId));
  return new Set(data ?? []);
}

private async markSessionSeen(userId: bigint, postIds: bigint[],existingIds?: Set<string> // ✅ optional param
  ) {
  const key = this.makeSessionSeenKey(userId);
  const existing = await this.getSessionSeenIds(userId);
  const merged = [...existing, ...postIds.map(id => id.toString())].slice(-1000);
  await this.redisService.set(key, merged, 3600); // 1-hour session window
}
 async findPostsByUsername(username1: string, req?: Request) {

  const posts = await this.prisma.post.findMany({
    where: {
      user: {
         username: username1,
      },
    },
    include: this.postIncludeWithMedia(),
  });

  return this.serializePosts(posts, req);
}

}
