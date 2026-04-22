import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('post-scheduling')
export class PostSchedulingProcessor extends WorkerHost {
  private readonly logger = new Logger(PostSchedulingProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ scheduledPostId: string }>): Promise<void> {
    const scheduledPostIdRaw = job.data?.scheduledPostId;
    if (!scheduledPostIdRaw) {
      this.logger.warn(`Job ${job.id} is missing scheduledPostId.`);
      return;
    }

    const scheduledPostId = BigInt(scheduledPostIdRaw);
    const scheduledPost = await this.prisma.post.findUnique({
      where: { id: scheduledPostId },
      include: { media: true },
    });

    if (!scheduledPost) {
      this.logger.warn(`Scheduled post ${scheduledPostIdRaw} not found.`);
      return;
    }

    if (scheduledPost.status !== 'PENDING') {
      this.logger.log(
        `Scheduled post ${scheduledPostIdRaw} already processed with status ${scheduledPost.status}.`,
      );
      return;
    }

    await this.prisma.post.update({
      where: { id: scheduledPostId },
      data: { status: 'PUBLISHED' },
    });

    this.logger.log(`Scheduled post ${scheduledPostIdRaw} has been published.`);
  }
}