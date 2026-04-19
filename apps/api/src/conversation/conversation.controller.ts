import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AddConversationParticipantDto } from './dto/add-conversation-participant.dto';

@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  // Create a new conversation from the authenticated user's perspective.
  // The service decides whether the conversation is DIRECT/GROUP and applies rules.
  @Post()
  create(@Req() req, @Body() createConversationDto: CreateConversationDto) {
    return this.conversationService.createForUser(req.user.id, createConversationDto);
  }

  // Return all active conversations for the authenticated user with unread metadata.
  @Get('mine')
  findMine(@Req() req) {
    return this.conversationService.listMine(req.user.id);
  }

  // Return full details for one conversation only if user is still a participant.
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.conversationService.getByIdForUser(req.user.id, id);
  }

  // Update conversation profile fields (name/description/avatar) with role checks.
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateConversationDto: UpdateConversationDto) {
    return this.conversationService.updateForUser(req.user.id, id, updateConversationDto);
  }

  // Add or re-activate a participant in a GROUP conversation.
  @Post(':id/participants')
  addParticipant(
    @Req() req,
    @Param('id') id: string,
    @Body() addConversationParticipantDto: AddConversationParticipantDto,
  ) {
    return this.conversationService.addParticipant(req.user.id, id, addConversationParticipantDto);
  }

  // Remove another participant from a GROUP conversation (admin action).
  @Delete(':id/participants/:userId')
  removeParticipant(@Req() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.conversationService.removeParticipant(req.user.id, id, userId);
  }

  // Mark current user as left; conversation stays available to others.
  @Post(':id/leave')
  leave(@Req() req, @Param('id') id: string) {
    return this.conversationService.leaveConversation(req.user.id, id);
  }
}
