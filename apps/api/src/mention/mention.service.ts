import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMentionDto } from './dto/create-mention.dto';
import { UpdateMentionDto } from './dto/update-mention.dto';

@Injectable()
export class MentionService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  extractMentions(content: string): string[] {
    const regex = /@([a-zA-Z0-9_]+)/g;
    const matches = content.match(regex);
    return matches ? [...new Set(matches.map((match) => match.slice(1)))] : [];
  }

  create(createMentionDto: CreateMentionDto) {
    return this.prisma.mention.create({
      data: {
        userId: this.toBigInt(createMentionDto.userId),
        mentionedInType: createMentionDto.mentionedInType,
        mentionedInId: this.toBigInt(createMentionDto.mentionedInId),
      },
    });
  }

  findAll() {
    return this.prisma.mention.findMany();
  }

  findOne(id: string) {
    return this.prisma.mention.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  async update(id: string, updateMentionDto: UpdateMentionDto) {
    const data: {
      userId?: bigint;
      mentionedInType?: string;
      mentionedInId?: bigint;
    } = {};

    if (updateMentionDto.userId) {
      data.userId = this.toBigInt(updateMentionDto.userId);
    }
    if (updateMentionDto.mentionedInType !== undefined) {
      data.mentionedInType = updateMentionDto.mentionedInType;
    }
    if (updateMentionDto.mentionedInId) {
      data.mentionedInId = this.toBigInt(updateMentionDto.mentionedInId);
    }

    return this.prisma.mention.update({
      where: { id: this.toBigInt(id) },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.mention.delete({
      where: { id: this.toBigInt(id) },
    });
  }
}
