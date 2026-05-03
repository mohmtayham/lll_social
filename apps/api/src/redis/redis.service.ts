import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
// import Redis, { Redis as RedisClient } from 'ioredis';
import Redis, { Cluster, Redis as RedisClient } from 'ioredis';

type SortedSetEntry = {
  member: string;
  score: number;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  // private readonly client: RedisClient;
private readonly client: Cluster | RedisClient;
  constructor() {
  
    // تحديث المحرك ليعمل بنظام Cluster
    this.client = new Redis.Cluster([
      { host: '127.0.0.1', port: 7000 },
      { host: '127.0.0.1', port: 7001 },
      { host: '127.0.0.1', port: 7002 },
    ], {
      enableAutoPipelining: true,
       scaleReads: 'slave', // اختياري: لتوزيع القراءة على العقد الأخرى
          clusterRetryStrategy: (times) => Math.min(times * 50, 2000),
    
      redisOptions: {
        password: process.env.LOCAL_REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
    
}, // لاحظ تغيير الاسم هنا للـ Cluster
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis client is reconnecting...');
    });
  }

  getClient(): RedisClient|Cluster {
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

  async set(key: string, value: any, ttlSeconds?: number): Promise<string> {
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
    return this.client.zrevrange(key, start, stop);
  }

  async replaceSortedSet(
    key: string,
    entries: SortedSetEntry[],
    ttlSeconds?: number,
  ): Promise<void> {
    const pipeline = this.client.pipeline();
    pipeline.del(key);

    for (const entry of entries) {
      pipeline.zadd(key, entry.score, entry.member);
    }

    if (ttlSeconds) {
      pipeline.expire(key, ttlSeconds);
    }

    await pipeline.exec();
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await this.client.del(...keys);
      }
    } while (cursor !== '0');

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
