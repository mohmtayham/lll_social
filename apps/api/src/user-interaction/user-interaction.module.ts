import { Module } from '@nestjs/common';
import { UserInteractionService } from './user-interaction.service';
import { UserInteractionController } from './user-interaction.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'graph-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [UserInteractionController],
  providers: [UserInteractionService, PrismaService],
})
export class UserInteractionModule {}
