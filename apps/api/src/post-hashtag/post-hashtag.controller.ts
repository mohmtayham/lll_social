import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PostHashtagService } from './post-hashtag.service';
import { CreatePostHashtagDto } from './dto/create-post-hashtag.dto';
import { UpdatePostHashtagDto } from './dto/update-post-hashtag.dto';

@Controller('post-hashtag')
export class PostHashtagController {
  constructor(private readonly postHashtagService: PostHashtagService) {}

  @Post()
  create(@Body() createPostHashtagDto: CreatePostHashtagDto) {
    return this.postHashtagService.create(createPostHashtagDto);
  }

  @Get()
  findAll() {
    return this.postHashtagService.findAll();
  }
  @Get(':postId/:hashtagId')
  findOne(@Param('postId') postId: string, @Param('hashtagId') hashtagId: string) {
    return this.postHashtagService.findOne(postId, hashtagId);
  }

  @Patch(':postId/:hashtagId')
  update(@Param('postId') postId: string, @Param('hashtagId') hashtagId: string, @Body() updatePostHashtagDto: UpdatePostHashtagDto) {
    return this.postHashtagService.update(postId, hashtagId, updatePostHashtagDto);
  }

  @Delete(':postId/:hashtagId')
  remove(@Param('postId') postId: string, @Param('hashtagId') hashtagId: string) {
    return this.postHashtagService.remove(postId, hashtagId);
  }
}
