import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);

  // حقن الطابور الخاص بـ Redis
  constructor(@InjectQueue('score-decay') private readonly scoreQueue: Queue) {}

  @Cron(CronExpression.EVERY_WEEK)
  async scheduleDecayJob() {
    this.logger.log('Cron triggered: Adding score decay job to Redis queue...');
    await this.scoreQueue.add(
      'decay-scores-task',
      {},
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async enqueueDecayJob() {
    this.logger.log('Manual trigger: Adding score decay job to Redis queue...');
    return this.scoreQueue.add(
      'decay-scores-task',
      {},
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}