import { Module } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { ReactionController } from './reaction.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScoreModule } from 'src/score/score.module';

@Module({
  imports: [ScoreModule],
  controllers: [ReactionController],
  providers: [ReactionService, PrismaService],
})
export class ReactionModule {}
