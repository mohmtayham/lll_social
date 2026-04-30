import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PostController } from './post.controller';
import { PostService } from './post.service';

import { PostSchedulingProcessor } from './post-scheduling.processor';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'post-scheduling', // اسم الطابور
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'graph-sync',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [PostController],
  providers: [PostService, PostSchedulingProcessor, PrismaService],
})
export class PostModule {}
