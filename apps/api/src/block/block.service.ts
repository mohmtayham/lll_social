import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class BlockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
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

  async create(createBlockDto: CreateBlockDto, userId: number | string | bigint) {
    return this.toggleBlock(createBlockDto, userId);
  }

  findAll(userId: number|string|bigint) {
    return this.prisma.block.findMany({
      where: {
        OR: [
          { blockerId: this.toBigInt(userId) },
          { blockedId: this.toBigInt(userId) },
        ],
      },
    }); 

  }

  findOne(id: string) {
    return this.prisma.block.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }


  remove(id: string) {
    return this.prisma.block.delete({
      where: { id: this.toBigInt(id) },
    });
  }

  async toggleBlock(createBlockDto: CreateBlockDto, userId: number | string | bigint) {
    const exsitingBlock = await this.prisma.block.findFirst({
      where: {
        blockerId: this.toBigInt(userId),
        blockedId: this.toBigInt(createBlockDto.blockedId),
      },
    });

    if (exsitingBlock) {
      const deleted = await this.prisma.block.delete({
        where: {
          id: exsitingBlock.id,
        },
      });

      await this.invalidateVisibilityCache(userId, createBlockDto.blockedId);

      return deleted;
    }

    const created = await this.prisma.block.create({
      data: {
        blockerId: this.toBigInt(userId),
        blockedId: this.toBigInt(createBlockDto.blockedId),
      },
    });

    await this.invalidateVisibilityCache(userId, createBlockDto.blockedId);

    return created;
  }
}
