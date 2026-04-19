import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  create(createBlockDto: CreateBlockDto) {
    return this.prisma.block.create({
      data: createBlockDto as any,
    });
  }

  findAll() {
    return this.prisma.block.findMany();
  }
  findOne(id: string) {
    return this.prisma.block.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateBlockDto: UpdateBlockDto) {
    return this.prisma.block.update({
      where: { id: BigInt(id) } as any,
      data: updateBlockDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.block.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
