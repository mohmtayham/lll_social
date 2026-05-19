import { Module } from '@nestjs/common';
import { UserInterestService } from './user-interest.service';
import { UserInterestController } from './user-interest.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'graph-sync',
      prefix: 'bull:{graph-sync}',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [UserInterestController],
  providers: [UserInterestService, PrismaService],
})
export class UserInterestModule {}
