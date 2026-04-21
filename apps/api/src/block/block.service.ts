import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  async create(createBlockDto: CreateBlockDto) {
    return this.toggleBlock(createBlockDto);
  }

  findAll() {
    return this.prisma.block.findMany();
  }

  findOne(id: string) {
    return this.prisma.block.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  update(id: string, updateBlockDto: UpdateBlockDto) {
    return this.prisma.block.update({
      where: { id: this.toBigInt(id) },
      data: {
        ...(updateBlockDto.blockerId
          ? { blockerId: this.toBigInt(updateBlockDto.blockerId) }
          : {}),
        ...(updateBlockDto.blockedId
          ? { blockedId: this.toBigInt(updateBlockDto.blockedId) }
          : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.block.delete({
      where: { id: this.toBigInt(id) },
    });
  }

  async toggleBlock(createBlockDto: CreateBlockDto) {
    const exsitingBlock = await this.prisma.block.findFirst({
      where: {
        blockerId: this.toBigInt(createBlockDto.blockerId),
        blockedId: this.toBigInt(createBlockDto.blockedId),
      },
    });

    if (exsitingBlock) {
      return this.prisma.block.delete({
        where: {
          id: exsitingBlock.id,
        },
      });
    }

    return this.prisma.block.create({
      data: {
        blockerId: this.toBigInt(createBlockDto.blockerId),
        blockedId: this.toBigInt(createBlockDto.blockedId),
      },
    });
  }
}
