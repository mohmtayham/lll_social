import { Module } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { ReactionController } from './reaction.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ReactionController],
  providers: [ReactionService, PrismaService],
})
export class ReactionModule {}
