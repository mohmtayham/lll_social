import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ConversationParticipantService } from './conversation-participant.service';
import { CreateConversationParticipantDto } from './dto/create-conversation-participant.dto';
import { UpdateConversationParticipantDto } from './dto/update-conversation-participant.dto';

@Controller('conversation-participant')
export class ConversationParticipantController {
  constructor(private readonly conversationParticipantService: ConversationParticipantService) {}

  @Post()
  create(@Body() createConversationParticipantDto: CreateConversationParticipantDto) {
    return this.conversationParticipantService.create(createConversationParticipantDto);
  }

  @Get()
  findAll() {
    return this.conversationParticipantService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conversationParticipantService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateConversationParticipantDto: UpdateConversationParticipantDto) {
    return this.conversationParticipantService.update(id, updateConversationParticipantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conversationParticipantService.remove(id);
  }
}
