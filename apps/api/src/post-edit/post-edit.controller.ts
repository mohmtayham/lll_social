import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PostEditService } from './post-edit.service';
import { CreatePostEditDto } from './dto/create-post-edit.dto';
import { UpdatePostEditDto } from './dto/update-post-edit.dto';

@Controller('post-edit')
export class PostEditController {
  constructor(private readonly postEditService: PostEditService) {}

  @Post()
  create(@Body() createPostEditDto: CreatePostEditDto) {
    return this.postEditService.create(createPostEditDto);
  }

  @Get()
  findAll() {
    return this.postEditService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postEditService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostEditDto: UpdatePostEditDto) {
    return this.postEditService.update(id, updatePostEditDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postEditService.remove(id);
  }
}
