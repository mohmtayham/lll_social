import Redis, { Cluster, ClusterNode, RedisOptions } from 'ioredis';

type RedisClient = Redis | Cluster;

const DEFAULT_HOST = process.env.REDIS_HOST || process.env.LOCAL_REDIS_HOST || '127.0.0.1';
const DEFAULT_PORT = parseInt(String(process.env.REDIS_PORT || process.env.LOCAL_REDIS_PORT || 6379), 10);
const DEFAULT_MAX_RETRIES = 3;

const parseClusterNodes = (raw?: string): ClusterNode[] => {
  if (!raw) return [];

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [host, portValue] = entry.split(':').map((part) => part.trim());
      const port = parseInt(String(portValue || ''), 10);
      if (!host || !Number.isFinite(port)) return null;
      return { host, port } as ClusterNode;
    })
    .filter((node): node is ClusterNode => Boolean(node));
};

const getClusterNodes = (): ClusterNode[] =>
  parseClusterNodes(process.env.REDIS_CLUSTER_NODES || process.env.LOCAL_REDIS_CLUSTER_NODES);

const getRedisPassword = (): string | undefined =>
  process.env.REDIS_PASSWORD || process.env.LOCAL_REDIS_PASSWORD || undefined;

const buildRedisOptions = (): RedisOptions => ({
  host: DEFAULT_HOST,
  port: DEFAULT_PORT,
  password: getRedisPassword(),
  enableAutoPipelining: true,
  maxRetriesPerRequest: DEFAULT_MAX_RETRIES,
});

export const createRedisClient = (): RedisClient => {
  const nodes = getClusterNodes();
  if (nodes.length) {
    return new Cluster(nodes, {
      enableAutoPipelining: false,
      scaleReads: (process.env.REDIS_CLUSTER_READS as 'master' | 'slave' | 'all') || 'master',
      clusterRetryStrategy: (times) => Math.min(times * 50, 2000),
      redisOptions: {
        password: getRedisPassword(),
        maxRetriesPerRequest: DEFAULT_MAX_RETRIES,
      },
    });
  }

  return new Redis(buildRedisOptions());
};

export const createBullMqConnection = (): RedisOptions | Cluster => {
  const nodes = getClusterNodes();
  if (nodes.length) {
    return new Cluster(nodes, {
      enableAutoPipelining: false,
      scaleReads: (process.env.REDIS_CLUSTER_READS as 'master' | 'slave' | 'all') || 'master',
      clusterRetryStrategy: (times) => Math.min(times * 50, 2000),
      redisOptions: {
        password: getRedisPassword(),
        maxRetriesPerRequest: null,
      },
    });
  }

  return {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    password: getRedisPassword(),
    enableAutoPipelining: true,
    maxRetriesPerRequest: null,
  };
};
