import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduledPostDto } from './dto/create-scheduled-post.dto';
import { UpdateScheduledPostDto } from './dto/update-scheduled-post.dto';

@Injectable()
export class ScheduledPostService {
  constructor(private readonly prisma: PrismaService) {}

  create(createScheduledPostDto: CreateScheduledPostDto) {
    return this.prisma.scheduledPost.create({
      data: createScheduledPostDto as any,
    });
  }

  findAll() {
    return this.prisma.scheduledPost.findMany();
  }
  findOne(id: string) {
    return this.prisma.scheduledPost.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateScheduledPostDto: UpdateScheduledPostDto) {
    return this.prisma.scheduledPost.update({
      where: { id: BigInt(id) } as any,
      data: updateScheduledPostDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.scheduledPost.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
