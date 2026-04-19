import { Module } from '@nestjs/common';
import { PostMediaService } from './post-media.service';
import { PostMediaController } from './post-media.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PostMediaController],
  providers: [PostMediaService, PrismaService],
})
export class PostMediaModule {}
