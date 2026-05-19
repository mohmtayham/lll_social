import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { ScoreModule } from '../score/score.module';
import { QueueModule } from '../queue/queue.module';
import { PostModule } from '../post/post.module';

@Module({
  imports: [ScoreModule, QueueModule, PostModule],
  controllers: [GroupController],
  providers: [GroupService],
})
export class GroupModule {}
