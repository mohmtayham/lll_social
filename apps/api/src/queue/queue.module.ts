import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DlqListener } from './dlq-listener';
import { DlqProcessor } from './dlq.processor';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      {
        name: 'graph-sync',
        prefix: 'bull:{graph-sync}',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'post-scheduling',
        prefix: 'bull:{post-scheduling}',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'score-decay',
        prefix: 'bull:{score-decay}',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'engagement-score',
        prefix: 'bull:{engagement-score}',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'dlq',
        prefix: 'bull:{dlq}',
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ),
  ],
  providers: [DlqListener, DlqProcessor],
  exports: [BullModule],
})
export class QueueModule {}
