import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  create(createCommentDto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        postId: this.toBigInt(createCommentDto.postId),
        userId: this.toBigInt(createCommentDto.userId),
        parentId: createCommentDto.parentId
          ? this.toBigInt(createCommentDto.parentId)
          : null,
        content: createCommentDto.content,
        isEdited: createCommentDto.isEdited ?? false,
      },
    });
  }

  findAll() {
    return this.prisma.comment.findMany();
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
