import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Neo4jService } from 'src/neo4j/neo4j.service';

type GraphSyncJob =
  | { userId1: string; userId2: string }
  | {
      postId: string;
      authorId: string;
      hashtags?: string[];
      status?: string;
      createdAt?: string;
      viewsCount?: number;
    }
  | { userId: string; interest: string; score?: number }
  | {
      userId: string;
      postId: string;
      interactionType: string;
      watchTime?: number;
      updatedAt?: string;
    }
  | { userId: string; groupId: string }
  | { userId: string; postId: string }; // For saved-post

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
        // ✅ Add to GraphSyncProcessor switch:
      case 'group-join':
        await this.syncGroupJoin(job.data as any);
        return;
      case 'group-leave':
        await this.removeGroupJoin(job.data as any);
        return;
      case 'sync-saved-post':
        await this.syncSavedPost(job.data as any); 
        return;
      case 'remove-friendship':
        await this.removeFriendship(job.data as any);
        return;
      default:
        this.logger.warn(`Unknown graph-sync job: ${job.name}`);
    }
  }

// ✅ Add these methods to GraphSyncProcessor:
private async syncSavedPost(data: { userId: string; postId: string; interests?: string[] }) {
  await this.neo4jService.write(
    `
    MERGE (u:User {id: $userId})
    MERGE (p:Post {id: $postId})
    MERGE (u)-[r:SAVED]->(p)                                                                                                                      
    SET r.updatedAt = datetime()
    `,
    data,
  );

  if (data.interests && data.interests.length > 0) {
    await this.neo4jService.write(
      `
      MATCH (u:User {id: $userId})
      UNWIND $interests AS interestName
      WITH u, toLower(interestName) AS iName
      WHERE iName <> ''
      MERGE (interest:Interest {name: iName})
      MERGE (u)-[r:INTERESTED_IN]->(interest)
      SET r.score = coalesce(r.score, 0) + 50
      `,
      { userId: data.userId, interests: data.interests },
    );
  }
}

private async removeFriendship(data: { userId1: string; userId2: string }) {
  await this.neo4jService.write(
    `
    MATCH (u1:User {id: $userId1})-[r:FRIENDS_WITH]-(u2:User {id: $userId2})
    DELETE r
    `,
    data,
  );
}

private async syncGroupJoin(data: { userId: string; groupId: string }) {
  await this.neo4jService.write(
    `
    MERGE (user:User {id: $userId})
    MERGE (group:Group {id: $groupId})
    MERGE (user)-[:MEMBER_OF]->(group)
    `,
    data,
  );
}

private async removeGroupJoin(data: { userId: string; groupId: string }) {
  await this.neo4jService.write(
    `
    MATCH (user:User {id: $userId})-[r:MEMBER_OF]->(group:Group {id: $groupId})
    DELETE r
    `,
    data,
  );
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
    const now = new Date().toISOString();
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
        createdAt: data.createdAt || now,
        status: data.status || 'DIRECT',
        viewsCount: data.viewsCount ?? 0,
      },
    );

    if (data.hashtags) {
      // const queryCheck = await this.neo4jService.write(
      //   `
      //   MATCH (post:Post {id: $postId})
      //   OPTIONAL MATCH (post)-[r:TAGGED_WITH]->(:Interest)
      //   WITH post, collect(r) as existingTags
      //   DELETE existingTags
      //   `,
      //   { postId: data.postId },
  const queryCheck=await this.neo4jService.write(
  `
  MATCH (post:Post {id: $postId})-[r:TAGGED_WITH]->(:Interest)
  DELETE r
  `,
  { postId: data.postId },
);
      // );

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

    if (data.hashtags && data.hashtags.length >= 2) {
      await this.buildInterestRelations({ postId: data.postId, now });
    }
  }
 
  private async buildInterestRelations(data: { postId: string; now: string }) {
    await this.neo4jService.write(
      `
      MATCH (post:Post {id: $postId})-[:TAGGED_WITH]->(i1:Interest)
      MATCH (post)-[:TAGGED_WITH]->(i2:Interest)
      WHERE id(i1) < id(i2)
  
      MERGE (i1)-[r:RELATED_TO]->(i2)  // ✅ أضف الاتجاه
      ON CREATE SET r.weight = 1, r.updatedAt = $now
       MATCH SET r.weight = r.weight + 1, r.updatedAt = $now  // ✅ أضف التحديث
      `,
      data,
    );
  }
    // MERGE (i1)-[r:RELATED_TO]-(i2)
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
  
      SET r.score = coalesce(r.score, 0) + $score
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
      MERGE (user)-[r:INTERACTED_WITH {type: $interactionType}]->(post)
      SET r.watchTime = coalesce($watchTime, r.watchTime),
          r.updatedAt = $updatedAt
      `,
      {
        ...data,
        updatedAt: data.updatedAt || new Date().toISOString(),
      },
    );
  }
}
