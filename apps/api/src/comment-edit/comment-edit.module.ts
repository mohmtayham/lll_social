import { Module } from '@nestjs/common';
import { CommentEditService } from './comment-edit.service';
import { CommentEditController } from './comment-edit.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CommentEditController],
  providers: [CommentEditService, PrismaService],
})
export class CommentEditModule {}
