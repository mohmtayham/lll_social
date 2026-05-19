import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EngagementScoreService } from 'src/score/engagement-score.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UpdateReactionDto } from './dto/update-reaction.dto';

@Injectable()
export class ReactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementScoreService: EngagementScoreService,
  ) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  create(createReactionDto: CreateReactionDto) {
    return this.toggleReaction(createReactionDto.userId, createReactionDto);
  }

  private async resolveEngagementContext(reactableId: bigint, reactableType: CreateReactionDto['reactableType']) {
    if (reactableType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: reactableId },
        select: { id: true, groupId: true ,userId: true, hashtags: { select: { hashtag: { select: { nameLower: true } } } } },
      });

      return {
        postId: post?.id ?? reactableId,
        groupId: post?.groupId ?? null,
        userId: post?.userId ?? null,
        hashtags: post?.hashtags ?? [],
      };
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: reactableId },
      select: {
        postId: true,
        post: {
          select: { groupId: true, userId: true, hashtags: { select: { hashtag: { select: { nameLower: true } } } } },
        },
      },
    });

    return {
      postId: comment?.postId ?? reactableId,
      groupId: comment?.post?.groupId ?? null,
      userId: comment?.post?.userId ?? null,
      hashtags: comment?.post?.hashtags ?? [],
    };
  }


  
  findAll() {
    return this.prisma.reaction.findMany();
  }

  findOne(id: string) {
    return this.prisma.reaction.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  async update(id: string, updateReactionDto: UpdateReactionDto) {
    const data: {
      userId?: bigint;
      reactableId?: bigint;
      reactableType?: UpdateReactionDto['reactableType'];
      reactionType?: UpdateReactionDto['reactionType'];
    } = {};

    if (updateReactionDto.userId) {
      data.userId = this.toBigInt(updateReactionDto.userId);
    }
    if (updateReactionDto.reactableId) {
      data.reactableId = this.toBigInt(updateReactionDto.reactableId);
    }
    if (updateReactionDto.reactableType !== undefined) {
      data.reactableType = updateReactionDto.reactableType;
    }
    if (updateReactionDto.reactionType !== undefined) {
      data.reactionType = updateReactionDto.reactionType;
    }

    return this.prisma.reaction.update({
      where: { id: this.toBigInt(id) },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.reaction.delete({
      where: { id: this.toBigInt(id) },
    });
  }


  async toggleReaction(userId: string | number | bigint, createDto: CreateReactionDto) {
    const effectiveReactionType = createDto.reactionType ?? 'LIKE';
    const engagementReactions = new Set(['LIKE', 'LOVE', 'CARE', 'WOW', 'ANGRY', 'SAD', 'HH']);
    const shouldTrackEngagement = engagementReactions.has(effectiveReactionType);
    const userBigInt = this.toBigInt(userId);
    const reactableId = this.toBigInt(createDto.reactableId);
    
    const existingReaction = await this.prisma.reaction.findUnique({
      where: {
        userId_reactableId_reactableType: {
          userId: userBigInt,
          reactableId,
          reactableType: createDto.reactableType,
        },
      },
    });

    if (existingReaction && existingReaction.reactionType === effectiveReactionType) {
      return this.prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    }

    const engagementContext = await this.resolveEngagementContext(reactableId, createDto.reactableType);

    if (existingReaction) {
      const updated = await this.prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { reactionType: effectiveReactionType },
      });

      if (shouldTrackEngagement) {
        await this.engagementScoreService.trackReactionCreated({
          userId,
          postId: engagementContext.postId,
          groupId: engagementContext.groupId,
          reactionType: effectiveReactionType,
        });
      }

      return updated;
    }

    const created = await this.prisma.reaction.create({
      data: {
        userId: userBigInt,
        reactableId,
        reactableType: createDto.reactableType,
        reactionType: effectiveReactionType,
      },
    });
// await this.engagementScoreService.trackReactionCreated({
//   userId: reactingUserId,          // who reacted
//   targetUserId: post.userId,       // ← post author (add this)
//   postId: post.id,
//   groupId: post.groupId,
//   hashtags: post.hashtags.map(h => h.hashtag.nameLower),
//   reactionType: reactionType,
// });
    if (shouldTrackEngagement) {
      await this.engagementScoreService.trackReactionCreated({
       userId: userBigInt, 
         targetUserId: engagementContext.userId,
        postId: engagementContext.postId,
        groupId: engagementContext.groupId,
          hashtags: engagementContext.hashtags?.map(h => h.hashtag.nameLower),
        reactionType: effectiveReactionType,
      });
    }

    return created;
  }
}
