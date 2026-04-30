import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationGateway } from 'src/notification/notification.gateway';

@Injectable()
export class FriendshipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
  ) {}

private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
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
   
const friend=await this.prisma.friendship.findFirst({
where:{
  userId1: this.toBigInt(requesterId),
  userId2: this.toBigInt(currentUserId),
  status: 'PENDING',
}
})
if(!friend){
  throw new ForbiddenException('No pending friend request found');
}
const updatedFriendship = await this.prisma.$transaction(async(tx)=>{

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

await this.graphQueue.add('sync-friendship', {
  userId1: friend.userId1.toString(),
  userId2: friend.userId2.toString(),
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: true,
  removeOnFail: false,
});

return updatedFriendship;

}

  async allMyFriends(userId: number) {
    const currentUserId = this.toBigInt(userId);
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: currentUserId, status: 'ACCEPTED' },
          { userId2: currentUserId, status: 'ACCEPTED' },
        ],
      },
      include: {
        user1: true,
        user2: true,
      },
    });

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




}
