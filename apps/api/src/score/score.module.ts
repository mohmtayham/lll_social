import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScoreService } from './score.service';
import { ScoreController } from './score.controller';
import { ScoreProcessor } from './score.processor';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'score-decay', // اسم الطابور في Redis
    }),
    PrismaModule,
  ],
  controllers: [ScoreController],
  providers: [ScoreService, ScoreProcessor],
})
export class ScoreModule {}
