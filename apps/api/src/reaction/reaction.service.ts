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

  async create(createDto: CreateReactionDto) {
    const userId = this.toBigInt(createDto.userId);
    return this.toggleReaction(userId, createDto);
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

  findAll() {
    return this.prisma.reaction.findMany();
  }

  findOne(id: string) {
    return this.prisma.reaction.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  update(id: string, updateReactionDto: UpdateReactionDto) {
    return this.prisma.reaction.update({
      where: { id: this.toBigInt(id) },
      data: {
        reactionType: updateReactionDto.reactionType,
      },
    });
  }

  remove(id: string) {
    return this.prisma.reaction.delete({
      where: { id: this.toBigInt(id) },
    });
  }
}
