# Smart Feed Guide (Redis + BullMQ + Neo4j)

## 1) What this architecture does

This API now builds feed results from multiple sources, then mixes them with randomization:

- Friends + friends-of-friends posts (Neo4j graph traversal)
- Posts friends interacted with (Neo4j interaction graph)
- Interest-matching posts (MySQL/Prisma)
- Most popular posts (MySQL/TrendingScore)
- Newest posts (MySQL)

Then it caches the mixed result in:

- Redis ZSET (fast ranked post IDs, short TTL)

## 2) Data flow

### Write side (sync to graph)

MySQL remains source of truth.

Events are sent to BullMQ queue graph-sync and processed asynchronously:

- Friendship accepted -> sync-friendship
- Post create/update/scheduled publish/share -> sync-post
- Post delete -> remove-post
- User interest create/update -> sync-interest
- User interest delete -> remove-interest
- User interaction create -> sync-interaction

### Read side (smart feed)

When calling GET /post/feed:

1. Check Redis key first
2. If miss, compute candidates from graph + SQL sources
3. Mix and randomize scores
4. Load rich post data from MySQL
5. Save ranked post IDs in Redis ZSET

## 3) Required environment variables

Add these in apps/api/.env (do not hardcode secrets in code):

- LOCAL_REDIS_HOST=127.0.0.1
- LOCAL_REDIS_PORT=6379
- LOCAL_REDIS_PASSWORD=

- NEO4J_URI=neo4j+s://YOUR_INSTANCE.databases.neo4j.io
- NEO4J_USERNAME=YOUR_USERNAME
- NEO4J_PASSWORD=YOUR_PASSWORD
- NEO4J_DATABASE=YOUR_DATABASE

## 4) Run dependencies

### Redis

Run local Redis (Docker):

- docker run --name lll-redis -p 6379:6379 -d redis:7

### API

From repo root:

- pnpm --filter api dev

## 5) Main smart feed endpoint

- GET /post/feed?page=1&pageSize=20

Behavior notes:

- Not strictly sorted by time (intentionally mixed + randomized)
- Includes social graph relevance, interests, popularity, and freshness
- Redis stores post IDs and ranking scores (not full post payloads)

## 6) Queue and worker components

### Queue names

- post-scheduling
- score-decay
- graph-sync

### Processors

- PostSchedulingProcessor -> publishes pending scheduled posts and syncs graph
- ScoreProcessor -> weekly/triggered score decay
- GraphSyncProcessor -> syncs graph nodes/edges for friendships/posts/interests/interactions

## 7) Cron for score jobs

Existing weekly cron enqueues score-decay.
Manual endpoint is also available:

- POST /score/decay

Use this endpoint for testing worker behavior instantly.

## 8) Important code locations

- src/post/post.service.ts
- src/post/post.controller.ts
- src/post/post-scheduling.processor.ts
- src/graph-sync/graph-sync.processor.ts
- src/neo4j/neo4j.service.ts
- src/redis/redis.service.ts
- src/friendship/friendship.service.ts
- src/user-interest/user-interest.service.ts
- src/user-interaction/user-interaction.service.ts

## 9) Operational tips

- Keep Redis TTL short for feed results (already configured in service)
- Keep graph-sync async to avoid API latency spikes
- If Neo4j is unavailable, feed still works from SQL sources
- Rotate Neo4j password immediately if it was exposed anywhere publicly

## 10) Next optimization ideas

- Add follow/block filters into candidate generation
- Persist per-source contribution stats for explainable feed ranking
- Add diversity constraints (author repetition cap per page)
- Add A/B testing weights for source blend
