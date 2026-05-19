import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { RedisService } from 'src/redis/redis.service';
import { Logger } from '@nestjs/common';
import { Neo4jService } from 'src/neo4j/neo4j.service';

@Injectable()
export class FriendshipService {
  // Safe user selection payload to prevent Data/PII leaks
  private readonly safeUserSelection = {
    id: true,
    username: true,
    name: true,
    avatarMediaId: true,
    isVerified: true,
    status: true,
  };
  // private readonly logger = new Logger(FriendshipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
    private readonly redisService: RedisService,
    private readonly neo4jService: Neo4jService,
  ) {}

private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
}

  private async invalidateVisibilityCache(...userIds: Array<string | number | bigint>) {
    await Promise.all(
      userIds.map((id) => this.redisService.del(`visibility:${this.toBigInt(id).toString()}`)),
    );
  }



async sentrequest(senderId:number,receiverId:number) {
const userId1 = this.toBigInt(senderId);
const userId2 = this.toBigInt(receiverId);
if(userId1 === userId2){
  throw new ForbiddenException('You cannot send a friend request to yourself');
}
const existingFriendship = await this.prisma.friendship.findFirst({
  where: {
    OR: [
      { userId1, userId2 },
      { userId1: userId2, userId2: userId1 },
    ],
  },
});

if (existingFriendship) {
  if (existingFriendship.status === 'PENDING') {
    throw new ForbiddenException('A friend request is already pending between these users');
  }
  if (existingFriendship.status === 'ACCEPTED') {
    throw new ForbiddenException('These users are already friends');
  }
}

const newFriendship = await this.prisma.friendship.create({
  data: {
    userId1,
    userId2,
    status: 'PENDING',
  },
});
await this.prisma.notification.create({
  data: {
    userId: userId2, // المستلم
    actorId: userId1, // المرسل
    type: 'FRIEND_REQUEST',
    data: {
      senderId: senderId,
    },
  },
});

// ============== إرسال الإشعار في الوقت الفعلي ==============
    this.notificationGateway.sendNotificationToUser(receiverId, {
      type: 'FRIEND_REQUEST',
      title: 'New Friend Request',
      body: 'Someone sent you a friend request!',
      data: {
        senderId: senderId.toString(),
        friendshipId: newFriendship.id.toString()
      }
    });

return newFriendship;
}

async approveFriendRequest(currentUserId: number,requesterId: number) {

const updatedFriendship = await this.prisma.$transaction(async(tx)=>{
const friend=await tx.friendship.findFirst({
where:{
  userId1: this.toBigInt(requesterId),
  userId2: this.toBigInt(currentUserId),
  status: 'PENDING',
}
})
if(!friend){
  throw new ForbiddenException('No pending friend request found');
}


//update friendship status
const updated = await tx.friendship.update({
  where: { id: friend.id },
  data: { status: 'ACCEPTED' },
});

const SCORE_BUMP=10;
//UPSert score:user1->user2
await tx.userRelationshipScore.upsert({
  where: {
    userId_targetUserId: {
      userId: friend.userId1,
      targetUserId: friend.userId2,
    },
  },
  update: {
    score: {
      increment: SCORE_BUMP,
    },
  },
  create: {
    userId: friend.userId1,
    targetUserId: friend.userId2,
    score: SCORE_BUMP,
  },
});

//UPSsert score:user2->user1
await tx.userRelationshipScore.upsert({
  where: {
    userId_targetUserId: {
      userId: friend.userId2,
      targetUserId: friend.userId1,
    },
  },
  update: {
    score: {
      increment: SCORE_BUMP,
    },
  },
  create: {
    userId: friend.userId2,
    targetUserId: friend.userId1,
    score: SCORE_BUMP,
  },
});

return updated;

});
try{
await this.graphQueue.add('sync-friendship', {
  userId1: updatedFriendship.userId1.toString(),
  userId2: updatedFriendship.userId2.toString(),
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,
});
}catch(error){
  // this.logger.error('Graph queue failed after friendship approval — needs manual reconciliation', error);
}

    await this.invalidateVisibilityCache(updatedFriendship.userId1, updatedFriendship.userId2);

return updatedFriendship;

}

  async allMyFriends(userId: number,take =20,skip=0) {
    const currentUserId = this.toBigInt(userId);
    const validatedTake =Math.min(Math.max(1, take), 100);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: currentUserId, status: 'ACCEPTED' },
          { userId2: currentUserId, status: 'ACCEPTED' },
        ],
      },
    
      take: validatedTake,
      skip,
      select: { userId1:true,
user1: { select: this.safeUserSelection },
user2: { select: this.safeUserSelection }
   },}
   );

   

    return friendships.map((friendship) => {
      if (friendship.userId1 === currentUserId) {
        return friendship.user2;
      }

      return friendship.user1;
    });
  }

  async isFriendWith(userId: number, otherUserId: number) {
    const currentUserId = this.toBigInt(userId);
    const otherUserIdBigInt = this.toBigInt(otherUserId);
    
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: currentUserId, userId2: otherUserIdBigInt, status: 'ACCEPTED' },
          { userId1: otherUserIdBigInt, userId2: currentUserId, status: 'ACCEPTED' },
        ],
      },
    });
    return !!friendship;
  }

  async suggestFriends(userId: number, limit = 10) {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 50)) : 10;
    const rows = await this.neo4jService.read<Record<string, any>>(
      `
      MATCH (me:User {id: $userId})-[:FRIENDS_WITH]-(friend:User)
                                   -[:FRIENDS_WITH]-(suggested:User)
      WHERE suggested.id <> $userId
        AND NOT (me)-[:FRIENDS_WITH]-(suggested)
      WITH suggested, count(DISTINCT friend) AS mutualFriends

      OPTIONAL MATCH (me)-[:INTERESTED_IN]->(i:Interest)
                                        <-[:INTERESTED_IN]-(suggested)
      WITH suggested, mutualFriends, count(DISTINCT i) AS sharedInterests

      RETURN toString(suggested.id) AS userId,
             mutualFriends,
             sharedInterests,
             (mutualFriends * 2 + sharedInterests * 1.5) AS score
      ORDER BY score DESC
      LIMIT toInteger($limit)
      `,
      {
        userId: this.toBigInt(userId).toString(),
        limit: normalizedLimit,
      },
    );

    return rows
      .map((row) => {
        if (!row.userId) return null;
        return {
          userId: String(row.userId),
          mutualFriends: Number(row.mutualFriends ?? 0),
          sharedInterests: Number(row.sharedInterests ?? 0),
          score: Number(row.score ?? 0),
        };
      })
      .filter(Boolean);
  }
  async rejectOrCancelRequest(userId: number, targetId: number) {
  const userBigInt = this.toBigInt(userId);
  const targetBigInt = this.toBigInt(targetId);

  const request = await this.prisma.friendship.findFirst({
    where: {
      OR: [
        { userId1: userBigInt, userId2: targetBigInt },
        { userId1: targetBigInt, userId2: userBigInt },
      ],
      status: 'PENDING',
    },
  });

  if (!request) throw new ForbiddenException('No pending friend request found');

  await this.prisma.friendship.delete({ where: { id: request.id } });
  return { message: 'Friend request removed' };
}

async unfriend(currentUserId: number, friendId: number) {
  const userBigInt = this.toBigInt(currentUserId);
  const friendBigInt = this.toBigInt(friendId);

  const friendship = await this.prisma.friendship.findFirst({
    where: {
      OR: [
        { userId1: userBigInt, userId2: friendBigInt },
        { userId1: friendBigInt, userId2: userBigInt },
      ],
      status: 'ACCEPTED',
    },
  });

  if (!friendship) throw new ForbiddenException('Friendship does not exist');

  await this.prisma.$transaction(async (tx) => {
    await tx.friendship.delete({ where: { id: friendship.id } });
    await tx.userRelationshipScore.updateMany({
      where: {
        OR: [
          { userId: friendship.userId1, targetUserId: friendship.userId2 },
          { userId: friendship.userId2, targetUserId: friendship.userId1 },
        ],
      },
      data: { score: { decrement: 10 } },
    });
  });

  await this.graphQueue.add(
    'remove-friendship',
    { userId1: friendship.userId1.toString(), userId2: friendship.userId2.toString() },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
  );

  await this.invalidateVisibilityCache(friendship.userId1, friendship.userId2);
  return { message: 'Unfriended successfully' };
}




}
