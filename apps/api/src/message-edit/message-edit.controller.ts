import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MessageEditService } from './message-edit.service';
import { CreateMessageEditDto } from './dto/create-message-edit.dto';
import { UpdateMessageEditDto } from './dto/update-message-edit.dto';

@Controller('message-edit')
export class MessageEditController {
  constructor(private readonly messageEditService: MessageEditService) {}

  @Post()
  create(@Body() createMessageEditDto: CreateMessageEditDto) {
    return this.messageEditService.create(createMessageEditDto);
  }

  @Get()
  findAll() {
    return this.messageEditService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.messageEditService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMessageEditDto: UpdateMessageEditDto) {
    return this.messageEditService.update(id, updateMessageEditDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.messageEditService.remove(id);
  }
}
