import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMentionDto } from './dto/create-mention.dto';
import { UpdateMentionDto } from './dto/update-mention.dto';

@Injectable()
export class MentionService {
  constructor(private readonly prisma: PrismaService) {}

  create(createMentionDto: CreateMentionDto) {
    return this.prisma.mention.create({
      data: createMentionDto as any,
    });
  }

  findAll() {
    return this.prisma.mention.findMany();
  }
  findOne(id: string) {
    return this.prisma.mention.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateMentionDto: UpdateMentionDto) {
    return this.prisma.mention.update({
      where: { id: BigInt(id) } as any,
      data: updateMentionDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.mention.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
