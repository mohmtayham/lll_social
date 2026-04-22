import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduledPostDto } from './dto/create-scheduled-post.dto';
import { UpdateScheduledPostDto } from './dto/update-scheduled-post.dto';

@Injectable()
export class ScheduledPostService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    return typeof value === 'bigint' ? value : BigInt(value);
  }


  
  create(createScheduledPostDto: CreateScheduledPostDto) {
    const { userId, scheduledFor, status, ...rest } = createScheduledPostDto;

    return this.prisma.post.create({
      data: {
        userId: this.toBigInt(userId),
        status: status ?? 'PENDING',
        ...rest,
      },
    });
  }

  findAll() {
    return this.prisma.post.findMany({ where: { status: 'PENDING' } });
  }
  findOne(id: string) {
    return this.prisma.post.findFirst({
      where: {
        id: this.toBigInt(id),
        status: 'PENDING',
      },
    });
  }

  update(id: string, updateScheduledPostDto: UpdateScheduledPostDto) {
    const { userId, scheduledFor, ...rest } = updateScheduledPostDto;

    return this.prisma.post.update({
      where: { id: this.toBigInt(id) },
      data: {
        ...(userId ? { userId: this.toBigInt(userId) } : {}),
        ...rest,
      },
    });
  }

  remove(id: string) {
    return this.prisma.post.delete({
      where: { id: this.toBigInt(id) },
    });
  }
}
