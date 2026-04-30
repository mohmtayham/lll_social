import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ScheduledPostStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('post-scheduling')
export class PostSchedulingProcessor extends WorkerHost {
  private readonly logger = new Logger(PostSchedulingProcessor.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('graph-sync') private readonly graphQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ scheduledPostId: string }>): Promise<void> {
    const scheduledPostIdRaw = job.data?.scheduledPostId;
    if (!scheduledPostIdRaw) {
      this.logger.warn(`Job ${job.id} is missing scheduledPostId.`);
      return;
    }

    const scheduledPostId = BigInt(scheduledPostIdRaw);
    // const scheduledPost = await this.prisma.post.findUnique({
    //   where: { id: scheduledPostId },
    //   include: { media: true },
    // });
    const scheduledPost = (await this.prisma.post.findUnique({
      where: { id: scheduledPostId },
      include: { media: true },
    })) as any;

    if (!scheduledPost) {
      this.logger.warn(`Scheduled post ${scheduledPostIdRaw} not found.`);
      return;
    }

    if (scheduledPost.status !== ScheduledPostStatus.PENDING) {
      this.logger.log(
        `Scheduled post ${scheduledPostIdRaw} already processed with status ${scheduledPost.status}.`,
      );
      return;
    }

    const publishedPost = await this.prisma.post.update({
      where: { id: scheduledPostId },
      data: { status: ScheduledPostStatus.PUBLISHED },
    });

    await this.graphQueue.add('sync-post', {
      postId: publishedPost.id.toString(),
      authorId: publishedPost.userId.toString(),
      status: String(publishedPost.status || ScheduledPostStatus.PUBLISHED),
      createdAt: publishedPost.createdAt.toISOString(),
      viewsCount: publishedPost.viewsCount,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Scheduled post ${scheduledPostIdRaw} has been published.`);
  }
}