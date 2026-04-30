import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserInterestDto } from './dto/create-user-interest.dto';
import { UpdateUserInterestDto } from './dto/update-user-interest.dto';

@Injectable()
export class UserInterestService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
  ) {}

  async create(createUserInterestDto: CreateUserInterestDto) {
    const interest = await this.prisma.userInterest.create({
      data: createUserInterestDto as any,
    });

    await this.graphQueue.add('sync-interest', {
      userId: String(interest.userId),
      interest: interest.interest,
      score: interest.score,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return interest;
  }

  findAll() {
    return this.prisma.userInterest.findMany();
  }
  findOne(id: string) {
    return this.prisma.userInterest.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  async update(id: string, updateUserInterestDto: UpdateUserInterestDto) {
    const interest = await this.prisma.userInterest.update({
      where: { id: BigInt(id) } as any,
      data: updateUserInterestDto as any,
    });

    await this.graphQueue.add('sync-interest', {
      userId: String(interest.userId),
      interest: interest.interest,
      score: interest.score,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return interest;
  }

  async remove(id: string) {
    const existing = await this.prisma.userInterest.findUnique({
      where: { id: BigInt(id) } as any,
    });

    const deleted = await this.prisma.userInterest.delete({
      where: { id: BigInt(id) } as any,
    });

    if (existing) {
      await this.graphQueue.add('remove-interest', {
        userId: String(existing.userId),
        interest: existing.interest,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    return deleted;
  }
}
