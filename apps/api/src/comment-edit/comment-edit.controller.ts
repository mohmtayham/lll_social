import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CommentEditService } from './comment-edit.service';
import { CreateCommentEditDto } from './dto/create-comment-edit.dto';
import { UpdateCommentEditDto } from './dto/update-comment-edit.dto';

@Controller('comment-edit')
export class CommentEditController {
  constructor(private readonly commentEditService: CommentEditService) {}

  @Post()
  create(@Body() createCommentEditDto: CreateCommentEditDto) {
    return this.commentEditService.create(createCommentEditDto);
  }

  @Get()
  findAll() {
    return this.commentEditService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentEditService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCommentEditDto: UpdateCommentEditDto) {
    return this.commentEditService.update(id, updateCommentEditDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commentEditService.remove(id);
  }
}
