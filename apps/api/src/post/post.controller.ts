import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(@Req() req, @Body() createPostDto: CreatePostDto) {
    return this.postService.create(req.user.id, createPostDto);
  }

  @Get('feed')
  getFeed(
    @Req() req,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.postService.getFeedForUser(req.user.id, Number(page), Number(pageSize));
  }

  @Get()
  findAll() {
    return this.postService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(id, updatePostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postService.remove(id);
  }
}
