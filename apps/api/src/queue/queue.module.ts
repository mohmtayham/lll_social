import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DlqListener } from './dlq-listener';
import { DlqProcessor } from './dlq.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: 'graph-sync',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'post-scheduling',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'score-decay',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'engagement-score',
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'dlq',
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
