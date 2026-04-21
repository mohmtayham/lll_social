import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateHashtagDto } from './dto/create-hashtag.dto';
import { UpdateHashtagDto } from './dto/update-hashtag.dto';

@Injectable()
export class HashtagService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  create(createHashtagDto: CreateHashtagDto) {
    const normalized = (
      createHashtagDto.nameLower ?? createHashtagDto.name ?? ''
    )
      .trim()
      .toLowerCase();

    if (!normalized) {
      throw new BadRequestException('Hashtag name is required');
    }

    return this.prisma.hashtag.upsert({
      where: { nameLower: normalized },
      update: {
        name: createHashtagDto.name ?? normalized,
      },
      create: {
        name: createHashtagDto.name ?? normalized,
        nameLower: normalized,
      },
    });
  }

  findAll() {
    return this.prisma.hashtag.findMany();
  }

  findOne(id: string) {
    return this.prisma.hashtag.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  async update(id: string, updateHashtagDto: UpdateHashtagDto) {
    const data: {
      name?: string | null;
      nameLower?: string;
    } = {};

    if (updateHashtagDto.name !== undefined) {
      data.name = updateHashtagDto.name;
    }
    if (updateHashtagDto.nameLower !== undefined) {
      data.nameLower = updateHashtagDto.nameLower.trim().toLowerCase();
    }

    return this.prisma.hashtag.update({
      where: { id: this.toBigInt(id) },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.hashtag.delete({
      where: { id: this.toBigInt(id) },
    });
  }

}
