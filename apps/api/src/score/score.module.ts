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
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    PrismaModule,
  ],
  controllers: [ScoreController],
  providers: [ScoreService, ScoreProcessor],
})
export class ScoreModule {}
