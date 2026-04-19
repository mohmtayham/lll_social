import { Module } from '@nestjs/common';
import { ConversationParticipantService } from './conversation-participant.service';
import { ConversationParticipantController } from './conversation-participant.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ConversationParticipantController],
  providers: [ConversationParticipantService, PrismaService],
})
export class ConversationParticipantModule {}
