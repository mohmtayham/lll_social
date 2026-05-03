// src/queue/dlq-listener.ts
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents as BullQueueEvents } from 'bullmq';

@Injectable()
export class DlqListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DlqListener.name);
  private readonly queueEvents: BullQueueEvents[] = [];

  constructor(
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
    @InjectQueue('post-scheduling') private readonly scheduleQueue: Queue,
    @InjectQueue('score-decay') private readonly scoreQueue: Queue,
    @InjectQueue('engagement-score') private readonly engagementQueue: Queue,
    @InjectQueue('dlq') private readonly dlqQueue: Queue,
  ) {}

  async onModuleInit() {
    this.attachDlqLogic(this.graphQueue);
    this.attachDlqLogic(this.scheduleQueue);
    this.attachDlqLogic(this.scoreQueue);
    this.attachDlqLogic(this.engagementQueue);
  }

  async onModuleDestroy() {
    await Promise.all(this.queueEvents.map((events) => events.close()));
  }

  private attachDlqLogic(queue: Queue) {
    const connection =
      (queue.opts.connection as any) ||
      {
        host: process.env.LOCAL_REDIS_HOST || '127.0.0.1',
        port: parseInt(String(process.env.LOCAL_REDIS_PORT || 6379), 10),
      };

    const events = new BullQueueEvents(queue.name, { connection });
    this.queueEvents.push(events);

    events.on('failed', async ({ jobId, failedReason }) => {
      if (!jobId) return;
      const job = await queue.getJob(jobId);
      if (!job) return;

      const maxAttempts = job.opts.attempts ?? 3;
      if (job.attemptsMade >= maxAttempts) {
        this.logger.warn(
          `🚨 Job ${job.name} [${jobId}] exhausted ${maxAttempts} attempts. Moving to DLQ. Reason: ${failedReason}`,
        );

        await this.dlqQueue.add(`${queue.name}:dlq`, {
          originalQueue: queue.name,
          originalJobName: job.name,
          originalData: job.data,
          failedReason,
          attemptsMade: job.attemptsMade,
          failedAt: new Date().toISOString(),
        });

        await job.remove().catch(() => undefined);
      }
    });
  }
}