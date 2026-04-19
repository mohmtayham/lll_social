import { Module } from '@nestjs/common';
import { UserRelationshipScoreService } from './user-relationship-score.service';
import { UserRelationshipScoreController } from './user-relationship-score.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [UserRelationshipScoreController],
  providers: [UserRelationshipScoreService, PrismaService],
})
export class UserRelationshipScoreModule {}
