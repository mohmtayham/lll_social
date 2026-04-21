import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';

@Processor('score-decay') // يجب أن يطابق اسم الطابور
export class ScoreProcessor extends WorkerHost {
  private readonly logger = new Logger(ScoreProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Worker started processing job ${job.id} from Redis...`);
    
    const decayFactor = 0.991; // ملاحظة: 0.9 تعني تقليل 10٪ (انظر الملاحظة بالأسفل)
    
    try {
      const result = await this.prisma.userRelationshipScore.updateMany({
        data: {
          score: {
            multiply: decayFactor,
          },
        },
      });
      this.logger.log(`Worker completed job ${job.id}. Updated ${result.count} records.`);
    } catch (error) {
      this.logger.error(`Worker failed on job ${job.id}:`, error);
      throw error; // رمي الخطأ مهم جداً لكي يعرف Redis أن المهمة فشلت ويمكنه إعادة المحاولة
    }
  }
}