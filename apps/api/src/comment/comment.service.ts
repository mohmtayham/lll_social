import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EngagementScoreService } from 'src/score/engagement-score.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementScoreService: EngagementScoreService,
  ) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  private extractHashtags(content: string): string[] {
    const matches = content.match(/#[\w\u0600-\u06FF]+/g);
    if (!matches) return [];

    return [
      ...new Set(
        matches
          .map((tag) => tag.slice(1).toLowerCase().trim())
          .filter((tag) => tag.length > 1 && tag.length < 50),
      ),
    ];
  }

  async create(createCommentDto: CreateCommentDto) {
    const postId = this.toBigInt(createCommentDto.postId);
    const userId = this.toBigInt(createCommentDto.userId);
    // In your CommentService:


    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, groupId: true ,userId: true},
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

  
    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId,
        parentId: createCommentDto.parentId
          ? this.toBigInt(createCommentDto.parentId)
          : null,
        content: createCommentDto.content,
        isEdited: createCommentDto.isEdited ?? false,
      },
    });
  //       await this.engagementScoreService.trackCommentCreated({
  //   userId: comment.userId,
  //   targetUserId: post.userId,       // ← post author (add this)
  //   postId: post.id,
  //   groupId: post.groupId,  //   hashtags: this.extractHashtags(comment.content),
  // });

    try {
      await this.engagementScoreService.trackCommentCreated({
        userId: comment.userId,
        targetUserId: post.userId,
        postId: comment.postId,
        groupId: post.groupId,
        hashtags: this.extractHashtags(comment.content),
      });
    } catch (error) {
      this.logger.warn(`Failed to queue comment engagement: ${String(error)}`);
    }

    return comment;
  }

  findAll(userId: number|string|bigint) {

    const currentUserId = this.toBigInt(userId);
    const comments = this.prisma.comment.findMany({
      where: {
        post: {
          deletedAt: null,
          OR: [
            { groupId: null },
            { group: { members: { some: { userId: currentUserId } } } }
          ]
        }
      }
    });
    return comments;
  }

  findOne(id: string) {
    return this.prisma.comment.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  async update(id: string, updateCommentDto: UpdateCommentDto) {
    const data: {
      postId?: bigint;
      userId?: bigint;
      parentId?: bigint | null;
      content?: string;
      isEdited?: boolean;
    } = {};

    if (updateCommentDto.postId) {
      data.postId = this.toBigInt(updateCommentDto.postId);
    }
    if (updateCommentDto.userId) {
      data.userId = this.toBigInt(updateCommentDto.userId);
    }
    if (updateCommentDto.parentId !== undefined) {
      data.parentId = updateCommentDto.parentId
        ? this.toBigInt(updateCommentDto.parentId)
        : null;
    }
    if (updateCommentDto.content !== undefined) {
      data.content = updateCommentDto.content;
      data.isEdited = true;
    }
    if (updateCommentDto.isEdited !== undefined) {
      data.isEdited = updateCommentDto.isEdited;
    }

    return this.prisma.comment.update({
      where: { id: this.toBigInt(id) },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.comment.delete({
      where: { id: this.toBigInt(id) },
    });
  }

}
