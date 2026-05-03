import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { ScoreModule } from '../score/score.module';

@Module({
  imports: [ScoreModule],
  controllers: [GroupController],
  providers: [GroupService],
})
export class GroupModule {}
