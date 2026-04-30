import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserInteractionDto } from './dto/create-user-interaction.dto';
import { UpdateUserInteractionDto } from './dto/update-user-interaction.dto';

@Injectable()
export class UserInteractionService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
  ) {}

  async create(createUserInteractionDto: CreateUserInteractionDto) {
    const interaction = await this.prisma.userInteraction.create({
      data: createUserInteractionDto as any,
    });

    await this.graphQueue.add('sync-interaction', {
      userId: String(interaction.userId),
      postId: String(interaction.postId),
      interactionType: interaction.interactionType,
      watchTime: interaction.watchTime ?? undefined,
      updatedAt: interaction.createdAt.toISOString(),
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return interaction;
  }

  findAll() {
    return this.prisma.userInteraction.findMany();
  }
  findOne(id: string) {
    return this.prisma.userInteraction.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateUserInteractionDto: UpdateUserInteractionDto) {
    return this.prisma.userInteraction.update({
      where: { id: BigInt(id) } as any,
      data: updateUserInteractionDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.userInteraction.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
