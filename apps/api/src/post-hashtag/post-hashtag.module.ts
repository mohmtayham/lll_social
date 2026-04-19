import { Module } from '@nestjs/common';
import { PostHashtagService } from './post-hashtag.service';
import { PostHashtagController } from './post-hashtag.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PostHashtagController],
  providers: [PostHashtagService, PrismaService],
})
export class PostHashtagModule {}
