import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateHashtagDto } from './dto/create-hashtag.dto';
import { UpdateHashtagDto } from './dto/update-hashtag.dto';

@Injectable()
export class HashtagService {
  constructor(private readonly prisma: PrismaService) {}

  create(createHashtagDto: CreateHashtagDto) {
    return this.prisma.hashtag.create({
      data: createHashtagDto as any,
    });
  }

  findAll() {
    return this.prisma.hashtag.findMany();
  }
  findOne(id: string) {
    return this.prisma.hashtag.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateHashtagDto: UpdateHashtagDto) {
    return this.prisma.hashtag.update({
      where: { id: BigInt(id) } as any,
      data: updateHashtagDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.hashtag.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
