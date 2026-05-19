// src/queue/dlq.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('dlq')
export class DlqProcessor extends WorkerHost {
  private readonly logger = new Logger(DlqProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    const sourceQueue = job.data?.originalQueue ?? job.name ?? 'unknown';
    const jobName = job.data?.originalJobName ?? job.name ?? 'unknown';
    const jobData = job.data?.originalData ?? job.data ?? {};
    const failureReason = job.data?.failedReason ?? 'unknown';
    const failureCount = Number(job.data?.attemptsMade ?? 0);

    const payload = JSON.stringify(
      jobData,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    );

    this.logger.error(
      `📦 DLQ Job received: ${jobName} from ${sourceQueue}\n` +
      `❌ Reason: ${failureReason}\n` +
      `📊 Attempts: ${failureCount}\n` +
      `📄 Data: ${payload}`,
    );
 try {
    await this.prisma.deadLetterQueue.create({
      data: {
        sourceQueue,
        jobName,
        jobData: JSON.parse(
      JSON.stringify(jobData, (_k, v) => typeof v === 'bigint' ? v.toString() : v)
    ),
        failureReason,
        failureCount,
      },
    });
    this.logger.error(`DLQ saved: ${jobName}`);
  } catch (dbError) {
    // Log but don't rethrow — prevents infinite DLQ loop
    this.logger.error(`Failed to persist DLQ record for ${jobName}`, dbError);
  }
}
 

    // هنا يمكنك:
    // 1. حفظ الـ job في قاعدة بيانات للمراجعة
    // 2. إرسال تنبيه لـ Slack/Email
    // 3. إعادة إضافته للطابور الأصلي بعد إصلاح المشكلة يدويًا
  }
