import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PostMediaService } from './post-media.service';
import { CreatePostMediaDto } from './dto/create-post-media.dto';
import { UpdatePostMediaDto } from './dto/update-post-media.dto';

@Controller('post-media')
export class PostMediaController {
  constructor(private readonly postMediaService: PostMediaService) {}

  @Post()
  create(@Body() createPostMediaDto: CreatePostMediaDto) {
    return this.postMediaService.create(createPostMediaDto);
  }

  @Get()
  findAll() {
    return this.postMediaService.findAll();
  }
  @Get(':postId/:mediaId')
  findOne(@Param('postId') postId: string, @Param('mediaId') mediaId: string) {
    return this.postMediaService.findOne(postId, mediaId);
  }

  @Patch(':postId/:mediaId')
  update(@Param('postId') postId: string, @Param('mediaId') mediaId: string, @Body() updatePostMediaDto: UpdatePostMediaDto) {
    return this.postMediaService.update(postId, mediaId, updatePostMediaDto);
  }

  @Delete(':postId/:mediaId')
  remove(@Param('postId') postId: string, @Param('mediaId') mediaId: string) {
    return this.postMediaService.remove(postId, mediaId);
  }
}
