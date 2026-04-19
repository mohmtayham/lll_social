import { Module } from '@nestjs/common';
import { HashtagService } from './hashtag.service';
import { HashtagController } from './hashtag.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [HashtagController],
  providers: [HashtagService, PrismaService],
})
export class HashtagModule {}
