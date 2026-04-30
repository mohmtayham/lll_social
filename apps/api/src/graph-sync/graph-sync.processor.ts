import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Neo4jService } from 'src/neo4j/neo4j.service';

type GraphSyncJob =
  | {
      userId1: string;
      userId2: string;
    }
  | {
      postId: string;
      authorId: string;
      hashtags?: string[];
      status?: string;
      createdAt?: string;
      viewsCount?: number;
    }
  | {
      userId: string;
      interest: string;
      score?: number;
    }
  | {
      userId: string;
      postId: string;
      interactionType: string;
      watchTime?: number;
      updatedAt?: string;
    };

@Processor('graph-sync')
export class GraphSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GraphSyncProcessor.name);

  constructor(private readonly neo4jService: Neo4jService) {
    super();
  }

  async process(job: Job<GraphSyncJob>): Promise<void> {
    switch (job.name) {
      case 'sync-friendship':
        await this.syncFriendship(job.data as any);
        return;
      case 'sync-post':
        await this.syncPost(job.data as any);
        return;
      case 'remove-post':
        await this.removePost(job.data as any);
        return;
      case 'sync-interest':
        await this.syncInterest(job.data as any);
        return;
      case 'remove-interest':
        await this.removeInterest(job.data as any);
        return;
      case 'sync-interaction':
        await this.syncInteraction(job.data as any);
        return;
      default:
        this.logger.warn(`Unknown graph-sync job: ${job.name}`);
    }
  }

  private async syncFriendship(data: { userId1: string; userId2: string }) {
    await this.neo4jService.write(
      `
      MERGE (u1:User {id: $userId1})
      MERGE (u2:User {id: $userId2})
      MERGE (u1)-[:FRIENDS_WITH]->(u2)
      MERGE (u2)-[:FRIENDS_WITH]->(u1)
      `,
      data,
    );
  }

  private async syncPost(data: {
    postId: string;
    authorId: string;
    hashtags?: string[];
    status?: string;
    createdAt?: string;
    viewsCount?: number;
  }) {
    await this.neo4jService.write(
      `
      MERGE (author:User {id: $authorId})
      MERGE (post:Post {id: $postId})
      SET post.createdAt = $createdAt,
          post.status = $status,
          post.viewsCount = $viewsCount
      MERGE (author)-[:POSTED]->(post)
      `,
      {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        status: data.status || 'DIRECT',
        viewsCount: data.viewsCount ?? 0,
      },
    );

    if (data.hashtags) {
      await this.neo4jService.write(
        `
        MATCH (post:Post {id: $postId})-[r:TAGGED_WITH]->(:Interest)
        DELETE r
        `,
        { postId: data.postId },
      );

      if (data.hashtags.length > 0) {
        await this.neo4jService.write(
          `
          MATCH (post:Post {id: $postId})
          UNWIND $hashtags AS tag
          WITH post, toLower(tag) AS tagLower
          WHERE tagLower <> ''
          MERGE (interest:Interest {name: tagLower})
          MERGE (post)-[:TAGGED_WITH]->(interest)
          `,
          { postId: data.postId, hashtags: data.hashtags },
        );
      }
    }
  }

  private async removePost(data: { postId: string }) {
    await this.neo4jService.write(
      `
      MATCH (post:Post {id: $postId})
      DETACH DELETE post
      `,
      data,
    );
  }

  private async syncInterest(data: { userId: string; interest: string; score?: number }) {
    await this.neo4jService.write(
      `
      MERGE (user:User {id: $userId})
      MERGE (interest:Interest {name: toLower($interest)})
      MERGE (user)-[r:INTERESTED_IN]->(interest)
      SET r.score = $score
      `,
      {
        ...data,
        score: data.score ?? 1,
      },
    );
  }

  private async removeInterest(data: { userId: string; interest: string }) {
    await this.neo4jService.write(
      `
      MATCH (user:User {id: $userId})-[r:INTERESTED_IN]->(interest:Interest {name: toLower($interest)})
      DELETE r
      `,
      data,
    );
  }

  private async syncInteraction(data: {
    userId: string;
    postId: string;
    interactionType: string;
    watchTime?: number;
    updatedAt?: string;
  }) {
    await this.neo4jService.write(
      `
      MERGE (user:User {id: $userId})
      MERGE (post:Post {id: $postId})
      MERGE (user)-[r:INTERACTED_WITH]->(post)
      SET r.type = $interactionType,
          r.watchTime = coalesce($watchTime, r.watchTime),
          r.updatedAt = $updatedAt
      `,
      {
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString(),
      },
    );
  }
}
