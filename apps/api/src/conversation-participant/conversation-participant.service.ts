import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateConversationParticipantDto } from './dto/create-conversation-participant.dto';
import { UpdateConversationParticipantDto } from './dto/update-conversation-participant.dto';

@Injectable()
export class ConversationParticipantService {
  constructor(private readonly prisma: PrismaService) {}

  create(createConversationParticipantDto: CreateConversationParticipantDto) {
    return this.prisma.conversationParticipant.create({
      data: createConversationParticipantDto as any,
    });
  }

  findAll() {
    return this.prisma.conversationParticipant.findMany();
  }
  findOne(id: string) {
    return this.prisma.conversationParticipant.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateConversationParticipantDto: UpdateConversationParticipantDto) {
    return this.prisma.conversationParticipant.update({
      where: { id: BigInt(id) } as any,
      data: updateConversationParticipantDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.conversationParticipant.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
