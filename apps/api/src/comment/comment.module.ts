import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScoreModule } from 'src/score/score.module';

@Module({
  imports: [ScoreModule],
  controllers: [CommentController],
  providers: [CommentService, PrismaService],
})
export class CommentModule {}
