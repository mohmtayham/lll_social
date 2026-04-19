import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // HTTP fallback for sending messages (used if socket is unavailable).
  @Post()
  create(@Req() req, @Body() createMessageDto: CreateMessageDto) {
    return this.messageService.sendMessage(req.user.id, createMessageDto);
  }

  // Paginated conversation history endpoint.
  @Get('conversation/:conversationId')
  findConversationMessages(
    @Req() req,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('beforeId') beforeId?: string,
  ) {
    return this.messageService.listConversationMessages(req.user.id, conversationId, limit, beforeId);
  }

  // Read one message with membership guard.
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.messageService.findOneForUser(req.user.id, id);
  }

  // Edit own message.
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateMessageDto: UpdateMessageDto) {
    return this.messageService.updateForUser(req.user.id, id, updateMessageDto);
  }

  // Mark conversation read up to a specific message pointer.
  @Post('conversation/:conversationId/read/:messageId')
  markRead(@Req() req, @Param('conversationId') conversationId: string, @Param('messageId') messageId: string) {
    return this.messageService.markRead(req.user.id, conversationId, messageId);
  }

  // Soft-delete own message.
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.messageService.removeForUser(req.user.id, id);
  }
}
