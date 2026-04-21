import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PostSchedulingProcessor } from './post-scheduling.processor';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'post-scheduling', // اسم الطابور
    }),
  ],
  controllers: [PostController],
  providers: [PostService, PostSchedulingProcessor, PrismaService],
})
export class PostModule {}
