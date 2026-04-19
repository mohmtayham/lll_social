import { Module } from '@nestjs/common';
import { TrendingScoreService } from './trending-score.service';
import { TrendingScoreController } from './trending-score.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [TrendingScoreController],
  providers: [TrendingScoreService, PrismaService],
})
export class TrendingScoreModule {}
