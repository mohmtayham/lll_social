import { Module } from '@nestjs/common';
import { ScheduledPostService } from './scheduled-post.service';
import { ScheduledPostController } from './scheduled-post.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ScheduledPostController],
  providers: [ScheduledPostService, PrismaService],
})
export class ScheduledPostModule {}
