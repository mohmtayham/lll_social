import { Module } from '@nestjs/common';
import { MentionService } from './mention.service';
import { MentionController } from './mention.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MentionController],
  providers: [MentionService, PrismaService],
})
export class MentionModule {}
