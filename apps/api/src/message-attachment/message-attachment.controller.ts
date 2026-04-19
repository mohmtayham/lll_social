import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MessageAttachmentService } from './message-attachment.service';
import { CreateMessageAttachmentDto } from './dto/create-message-attachment.dto';
import { UpdateMessageAttachmentDto } from './dto/update-message-attachment.dto';

@Controller('message-attachment')
export class MessageAttachmentController {
  constructor(private readonly messageAttachmentService: MessageAttachmentService) {}

  @Post()
  create(@Body() createMessageAttachmentDto: CreateMessageAttachmentDto) {
    return this.messageAttachmentService.create(createMessageAttachmentDto);
  }

  @Get()
  findAll() {
    return this.messageAttachmentService.findAll();
  }
  @Get(':messageId/:mediaId')
  findOne(@Param('messageId') messageId: string, @Param('mediaId') mediaId: string) {
    return this.messageAttachmentService.findOne(messageId, mediaId);
  }

  @Patch(':messageId/:mediaId')
  update(@Param('messageId') messageId: string, @Param('mediaId') mediaId: string, @Body() updateMessageAttachmentDto: UpdateMessageAttachmentDto) {
    return this.messageAttachmentService.update(messageId, mediaId, updateMessageAttachmentDto);
  }

  @Delete(':messageId/:mediaId')
  remove(@Param('messageId') messageId: string, @Param('mediaId') mediaId: string) {
    return this.messageAttachmentService.remove(messageId, mediaId);
  }
}
