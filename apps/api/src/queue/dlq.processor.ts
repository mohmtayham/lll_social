// src/queue/dlq.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('dlq')
export class DlqProcessor extends WorkerHost {
  private readonly logger = new Logger(DlqProcessor.name);

  async process(job: Job): Promise<void> {
    const payload = JSON.stringify(
      job.data.originalData,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    );

    this.logger.error(
      `📦 DLQ Job received: ${job.data.originalJobName} from ${job.data.originalQueue}\n` +
      `❌ Reason: ${job.data.failedReason}\n` +
      `📊 Attempts: ${job.data.attemptsMade}\n` +
      `📄 Data: ${payload}`,
    );

    // هنا يمكنك:
    // 1. حفظ الـ job في قاعدة بيانات للمراجعة
    // 2. إرسال تنبيه لـ Slack/Email
    // 3. إعادة إضافته للطابور الأصلي بعد إصلاح المشكلة يدويًا
  }
}