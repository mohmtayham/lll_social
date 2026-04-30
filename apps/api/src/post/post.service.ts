import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PostVisibility, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

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
  private readonly feedRedisTtlSeconds = 90;
  private readonly feedSqlTtlMs = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('post-scheduling') private readonly schedulingQueue: Queue,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
    private readonly redisService: RedisService,
    private readonly neo4jService: Neo4jService,
  ) {}

  extractHashtags(content: string): string[] {
    const regex = /#[\w\u0600-\u06FF]+/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
  }

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  private makeFeedRankKey(userId: string | number | bigint): string {
    return `feed:user:${userId.toString()}:rank`;
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
    const pattern = `feed:user:${userIdBigInt.toString()}:*`;
    const [deleted] = await Promise.all([
      this.redisService.delByPattern(pattern),
      this.prisma.userFeedCache.deleteMany({
        where: { userId: userIdBigInt },
      }),
    ]);

    return deleted;
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

  private async getFeedVisibilityContext(userId: bigint): Promise<FeedVisibilityContext> {
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

    return {
      userId,
      friendIds: [...friendIds],
      blockedIds: [...blockedIds],
    };
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

    return {
      OR: visibilityOr,
      ...(context.blockedIds.length
        ? {
            userId: {
              notIn: context.blockedIds,
            },
          }
        : {}),
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

  private async getSqlFeedCache(
    userId: bigint,
    page: number,
    pageSize: number,
    visibilityContext: FeedVisibilityContext,
  ) {
    const freshnessCutoff = new Date(Date.now() - this.feedSqlTtlMs);
    const visibilityWhere = this.buildVisibilityWhere(visibilityContext);

    const rows = await this.prisma.userFeedCache.findMany({
      where: {
        userId,
        createdAt: {
          gte: freshnessCutoff,
        },
        post: {
          status: { in: ['PUBLISHED', 'DIRECT'] },
          ...visibilityWhere,
        },
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        post: {
          include: {
            user: true,
            media: true,
            hashtags: {
              include: { hashtag: true },
            },
          },
        },
      },
    });

    if (!rows.length) return null;

    const posts = rows
      .map((row) => row.post)
      .filter((post) => post.status === 'PUBLISHED' || post.status === 'DIRECT');

    return posts.length ? posts : null;
  }

  private async saveSqlFeedCache(userId: bigint, ranked: FeedCandidate[]) {
    const topCandidates = ranked.slice(0, 200);

    await this.prisma.userFeedCache.deleteMany({ where: { userId } });

    if (!topCandidates.length) {
      return;
    }

    await this.prisma.userFeedCache.createMany({
      data: topCandidates.map((item) => ({
        userId,
        postId: item.postId,
        score: item.score,
      })),
      skipDuplicates: true,
    });
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

  private async loadPostsByIds(postIds: bigint[], visibilityContext: FeedVisibilityContext) {
    if (!postIds.length) return [];
    const visibilityWhere = this.buildVisibilityWhere(visibilityContext);

    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        status: { in: ['PUBLISHED', 'DIRECT'] },
        ...visibilityWhere,
      },
      include: {
        user: true,
        media: true,
        hashtags: {
          include: { hashtag: true },
        },
      },
    });

    const byId = new Map(posts.map((post) => [post.id.toString(), post]));
    return postIds
      .map((postId) => byId.get(postId.toString()))
      .filter((post): post is (typeof posts)[number] => Boolean(post));
  }

  private async readGraphFriendPosts(userId: bigint, limit: number): Promise<ScoredPost[]> {
    const rows = await this.neo4jService.read<Record<string, any>>(
      `
      MATCH path = (me:User {id: $userId})-[:FRIENDS_WITH*1..2]-(friend:User)-[:POSTED]->(post:Post)
      WITH post, min(length(path)) AS distance
      RETURN toString(post.id) AS postId, (4.0 - toFloat(distance)) AS score
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
    const interests = await this.prisma.userInterest.findMany({
      where: { userId },
      orderBy: { score: 'desc' },
      take: 50,
    });  

    if (!interests.length) return [];

    const interestWords = interests.map((item) => item.interest);
    const interestWordsLower = interests.map((item) => item.interest.toLowerCase());

    const interestTokens = this.collectInterestTokens(interestWords);
    const fullTextQuery = this.buildFullTextQuery(interestTokens);
    const fullTextLimit = Math.min(limit * 3, 300);
    const statusValues = ['DIRECT', 'published'];

    const fullTextRows = fullTextQuery
      ? await this.prisma.$queryRaw<Array<{ id: bigint; score: number | null }>>(
          Prisma.sql`
            SELECT id, MATCH(content) AGAINST (${fullTextQuery} IN BOOLEAN MODE) AS score
            FROM posts
            WHERE status IN (${Prisma.join(statusValues)})
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
      const interactionScore = Math.log10((post.viewsCount || 0) + 10) * 0.5;

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

  async create(userId: string | number | bigint, createPostDto: CreatePostDto) {
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

    return post;
  }

  async getFeedForUser(userId: string | number | bigint, page = 1, pageSize = 20) {
    const normalizedPage = this.normalizePage(page);
    const normalizedPageSize = this.normalizePageSize(pageSize);
    const userIdBigInt = this.toBigInt(userId);
    const visibilityContext = await this.getFeedVisibilityContext(userIdBigInt);

    const redisRankedIds = await this.getRedisRankedIds(
      userIdBigInt,
      normalizedPage,
      normalizedPageSize,
    );
    if (redisRankedIds.length) {
      const redisFeed = await this.loadPostsByIds(redisRankedIds, visibilityContext);
      if (redisFeed.length >= normalizedPageSize) {
        return redisFeed;
      }
    }

    const sqlCachedFeed = await this.getSqlFeedCache(
      userIdBigInt,
      normalizedPage,
      normalizedPageSize,
      visibilityContext,
    );
    if (sqlCachedFeed && sqlCachedFeed.length >= normalizedPageSize) {
      await this.saveRedisFeedRank(
        userIdBigInt,
        sqlCachedFeed.map((post, index) => ({
          postId: post.id,
          score: normalizedPageSize - index * 0.01,
          source: 'sql-cache',
        })),
      );
      return sqlCachedFeed;
    }

    const candidatePool = Math.max(normalizedPageSize * 8, 80);
    const sourceLabels = [
      'graph-friends',
      'graph-friends-seen',
      'interest',
      'popular',
      'newest',
    ] as const;

    const results = await Promise.allSettled([
      this.readGraphFriendPosts(userIdBigInt, candidatePool),
      this.readGraphFriendSeenPosts(userIdBigInt, candidatePool),
      this.readInterestPosts(userIdBigInt, candidatePool),
      this.readPopularPosts(candidatePool),
      this.readNewestPosts(candidatePool),
    ]);

    const extract = (index: number): ScoredPost[] => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        return result.value;
      }
      this.logger.warn(
        `Feed source ${sourceLabels[index]} failed: ${result.reason?.message || 'unknown error'}`,
      );
      return [];
    };

    const friendPosts = extract(0);
    const friendSeenPosts = extract(1);
    const interestPosts = extract(2);
    const popularPosts = extract(3);
    const newestPosts = extract(4);

    const candidateMap = new Map<string, FeedCandidate>();

    for (const item of friendPosts) {
      this.upsertCandidate(
        candidateMap,
        item.postId,
        item.score + this.scoreJitter(userIdBigInt, item.postId, 'friends-of-friends', 0.7),
        'friends-of-friends',
      );
    }

    for (const item of friendSeenPosts) {
      this.upsertCandidate(
        candidateMap,
        item.postId,
        item.score + this.scoreJitter(userIdBigInt, item.postId, 'friends-seen', 0.6),
        'friends-seen',
      );
    }

    for (const item of interestPosts) {
      this.upsertCandidate(
        candidateMap,
        item.postId,
        item.score + this.scoreJitter(userIdBigInt, item.postId, 'interest', 0.6),
        'interest',
      );
    }

    for (const item of popularPosts) {
      this.upsertCandidate(
        candidateMap,
        item.postId,
        item.score + 1.8 + this.scoreJitter(userIdBigInt, item.postId, 'popular', 0.8),
        'popular',
      );
    }

    for (const item of newestPosts) {
      this.upsertCandidate(
        candidateMap,
        item.postId,
        item.score + 1.2 + this.scoreJitter(userIdBigInt, item.postId, 'newest', 0.8),
        'newest',
      );
    }

    let ranked = [...candidateMap.values()]
      .map((item) => ({
        ...item,
        score: item.score + this.scoreJitter(userIdBigInt, item.postId, 'final', 1),
      }))
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) {
      ranked = newestPosts.map((item) => ({
        postId: item.postId,
        score: item.score,
        source: 'newest-fallback',
      }));
    }

    ranked = await this.diversifyCandidates(ranked);

    const start = (normalizedPage - 1) * normalizedPageSize;
    const selectedIds = ranked
      .slice(start, start + normalizedPageSize)
      .map((item) => item.postId);

    let feed = await this.loadPostsByIds(selectedIds, visibilityContext);

    if (feed.length < normalizedPageSize) {
      const existingIds = new Set(feed.map((item) => item.id.toString()));
      const fillIds: bigint[] = [];

      for (const item of ranked.slice(start + normalizedPageSize)) {
        const key = item.postId.toString();
        if (existingIds.has(key)) continue;
        fillIds.push(item.postId);
        if (feed.length + fillIds.length >= normalizedPageSize) break;
      }

      if (fillIds.length) {
        const fillPosts = await this.loadPostsByIds(fillIds, visibilityContext);
        if (fillPosts.length) {
          feed = [...feed, ...fillPosts];
          for (const post of fillPosts) {
            existingIds.add(post.id.toString());
          }
        }
      }

      if (feed.length < normalizedPageSize) {
        const visibilityWhere = this.buildVisibilityWhere(visibilityContext);
        const fallbackPosts = await this.prisma.post.findMany({
          where: {
            status: { in: ['PUBLISHED', 'DIRECT'] },
            ...visibilityWhere,
            id: {
              notIn: [...existingIds].map((id) => this.toBigInt(id)),
            },
          },
          orderBy: { createdAt: 'desc' },
          take: normalizedPageSize - feed.length,
          include: {
            user: true,
            media: true,
            hashtags: {
              include: { hashtag: true },
            },
          },
        });

        feed = [...feed, ...fallbackPosts];
      }
    }

    await Promise.all([
      this.saveSqlFeedCache(userIdBigInt, ranked),
      this.saveRedisFeedRank(userIdBigInt, ranked),
    ]);

    return feed;
  }

  findAll() {
    return this.prisma.post.findMany();
  }

  findOne(id: string) {
    return this.prisma.post.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const { mediaIds, ...rest } = updatePostDto as UpdatePostDto & {
      mediaIds?: Array<string | number | bigint>;
    };
    const postId = this.toBigInt(id);

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

    return post;
  }

  async remove(id: string) {
    const deleted = await this.prisma.post.delete({
      where: { id: this.toBigInt(id) },
    });

    await Promise.all([
      this.invalidateUserFeedCache(deleted.userId),
      this.graphQueue.add(
        'remove-post',
        {
          postId: deleted.id.toString(),
        },
        this.queueOptions(),
      ),
    ]);

    return deleted;
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
  // 1. جلب البيانات الأساسية
  const post = await this.prisma.post.findUnique({
    where: { id: postId },
    select: { 
      id: true,
      content: true,
      categoryId: true,
      hashtags: { select: { hashtag: { select: { name: true } } } }
    },
  });

  if (!post) throw new NotFoundException('Post not found');

  // 2. [هام] التحقق أولاً قبل أي عملية إنشاء
  const alreadySaved = await this.prisma.savedPost.findUnique({
    where: {
      userId_postId: { userId, postId } // تأكد أن لديك Unique Index بهذا الاسم في Prisma
    },
  });

  if (alreadySaved) {
    throw new ConflictException('Post already saved');
  }

  // 3. إنشاء سجل الحفظ
  const savedPost = await this.prisma.savedPost.create({
    data: { postId, userId },
  });

  // 4. تجميع الإشارات (Signals) لتحديث الاهتمامات
  const interestsToUpdate: string[] = [];
  if (post.categoryId) interestsToUpdate.push(`category_${post.categoryId}`);
  // الحل: أضف شرطاً للتأكد أن الاسم موجود
post.hashtags.forEach(h => {
  if (h.hashtag.name) interestsToUpdate.push(h.hashtag.name);
});
  post.hashtags.forEach(h => {
    if (h.hashtag.name) interestsToUpdate.push(h.hashtag.name);
  });

  // 5. [تحسين الأداء] تحديث الاهتمامات بالتوازي أو عبر العامل الخلفي
  // بدلاً من await داخل for، نستخدم Promise.all لتنفيذهم معاً
  if (interestsToUpdate.length > 0) {
    await Promise.all(
      interestsToUpdate.map(name => 
        this.prisma.userInterest.upsert({
          where: { userId_interest: { userId, interest: name } },
          update: { score: { increment: 5.0 } },
          create: { userId, interest: name, score: 5.0 }
        })
      )
    );
  }

  // 6. العمليات الخلفية (خارج الحلقة تماماً)
  await this.invalidateUserFeedCache(userId);

  this.graphQueue.add(
    'sync-saved-post',
    {
      postId: postId.toString(),
      userId: userId.toString(),
      // نرسل المحتوى هنا ليقوم الـ Worker بتحليله (NLP) بدلاً من تعطيل المستخدم
      content: post.content, 
      interests: interestsToUpdate
    },
    this.queueOptions()
  );

  return savedPost;
}

}
