import { Module } from '@nestjs/common';
import { UserInterestService } from './user-interest.service';
import { UserInterestController } from './user-interest.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [UserInterestController],
  providers: [UserInterestService, PrismaService],
})
export class UserInterestModule {}
