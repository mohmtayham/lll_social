import { Module } from '@nestjs/common';
import { ScheduledPostMediaService } from './scheduled-post-media.service';
import { ScheduledPostMediaController } from './scheduled-post-media.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ScheduledPostMediaController],
  providers: [ScheduledPostMediaService, PrismaService],
})
export class ScheduledPostMediaModule {}
