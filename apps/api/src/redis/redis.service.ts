import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cluster, Redis as RedisClient } from 'ioredis';
import { createRedisClient } from './redis.config';

type SortedSetEntry = {
  member: string;
  score: number;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Cluster | RedisClient;
  constructor() {
    this.client = createRedisClient();

    this.client.on('error', (error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client is reconnecting...');
    });
  }
  async zrevrangeWithScores(
  key: string,
  start: number,
  stop: number,
): Promise<Array<{ member: string; score: number }>> {
  // ZREVRANGEBYSCORE مع WITHSCORES
  const raw = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
  
  const result: Array<{ member: string; score: number }> = [];
  // النتيجة تأتي: [member1, score1, member2, score2, ...]
  for (let i = 0; i < raw.length; i += 2) {
    result.push({
      member: raw[i],
      score: Number(raw[i + 1]),
    });
  }
  return result;
}

  getClient(): RedisClient | Cluster {
    return this.client;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<'OK' | null> {
    const stringified = this.serialize(value);
    if (ttlSeconds) {
      return this.client.set(key, stringified, 'EX', ttlSeconds);
    }
    return this.client.set(key, stringified);
  }

  async addToSortedSet(
    key: string,
    score: number,
    member: string | number | bigint,
  ): Promise<number> {
    return this.client.zadd(key, score, String(member));
  }

  async getFromSortedSet(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

   async replaceSortedSet(
    key: string,
    entries: SortedSetEntry[],
    ttlSeconds?: number,
  ): Promise<void> {
    if (entries.length === 0) return;
    const pipeline = this.client.pipeline();
    pipeline.del(key);

    const flatArgs: Array<string | number> = [];
    for (const entry of entries) {
      flatArgs.push(entry.score, entry.member);
    }

    pipeline.zadd(key, ...flatArgs);

    if (ttlSeconds) {
      pipeline.expire(key, ttlSeconds);
    }

    await pipeline.exec();
  }
  async zincrby(key: string, increment: number, member: string): Promise<void> {
  await this.client.zincrby(key, increment, member);
}
  // دالة بسيطة لحفظ المصفوفة كـ JSON
async setFeedCache(key: string, postIds: string[], ttl: number): Promise<void> {
  await this.client.set(key, JSON.stringify(postIds), 'EX', ttl);
}

// دالة لجلب الصفحة المطلوبة فقط من المصفوفة المخزنة
async getFeedPage(key: string, page: number, pageSize: number): Promise<string[] | null> {
  const data = await this.client.get(key);
  if (!data) return null;

  const allIds: string[] = JSON.parse(data);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return allIds.slice(start, end);
}

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<number> {
    let deleted = 0;

    if (this.client instanceof Cluster) {
      const nodes = this.client.nodes('master'); // Only scan master nodes
      for (const node of nodes) {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await node.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
          cursor = nextCursor;

          if (keys.length > 0) {
            // Pipeline single deletions to avoid CROSSSLOT errors
            const pipeline = node.pipeline();
            keys.forEach((key) => pipeline.del(key));
            await pipeline.exec();
            deleted += keys.length;
          }
        } while (cursor !== '0');
      }
    } else {
      // Fallback for standalone Redis
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await this.client.del(...keys);
        }
      } while (cursor !== '0');
    }

    return deleted;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  private serialize(value: any): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value !== 'object' || value === null) {
      return String(value);
    }

    return JSON.stringify(value, (_key, current) =>
      typeof current === 'bigint' ? current.toString() : current,
    );
  }
  
}
