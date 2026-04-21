import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UpdateReactionDto } from './dto/update-reaction.dto';

@Injectable()
export class ReactionService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  create(createReactionDto: CreateReactionDto) {
    return this.toggleReaction(createReactionDto.userId, createReactionDto);
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
    const existingReaction = await this.prisma.reaction.findUnique({
      where: {
        userId_reactableId_reactableType: {
          userId: this.toBigInt(userId),
          reactableId: this.toBigInt(createDto.reactableId),
          reactableType: createDto.reactableType,
        },
      },
    });

    if (existingReaction && existingReaction.reactionType === createDto.reactionType) {
      return this.prisma.reaction.delete({
        where: { id: existingReaction.id },
      });
    }

    if (existingReaction && existingReaction.reactionType !== createDto.reactionType) {
      return this.prisma.reaction.update({
        where: { id: existingReaction.id },
        data: { reactionType: createDto.reactionType },
      });
    }

    return this.prisma.reaction.create({
      data: {
        userId: this.toBigInt(userId),
        reactableId: this.toBigInt(createDto.reactableId),
        reactableType: createDto.reactableType,
        reactionType: createDto.reactionType ?? 'LIKE',
      },
    });
  }
}
