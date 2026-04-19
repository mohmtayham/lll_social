import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PostAllowedUserService } from './post-allowed-user.service';
import { CreatePostAllowedUserDto } from './dto/create-post-allowed-user.dto';
import { UpdatePostAllowedUserDto } from './dto/update-post-allowed-user.dto';

@Controller('post-allowed-user')
export class PostAllowedUserController {
  constructor(private readonly postAllowedUserService: PostAllowedUserService) {}

  @Post()
  create(@Body() createPostAllowedUserDto: CreatePostAllowedUserDto) {
    return this.postAllowedUserService.create(createPostAllowedUserDto);
  }

  @Get()
  findAll() {
    return this.postAllowedUserService.findAll();
  }
  @Get(':postId/:userId')
  findOne(@Param('postId') postId: string, @Param('userId') userId: string) {
    return this.postAllowedUserService.findOne(postId, userId);
  }

  @Patch(':postId/:userId')
  update(@Param('postId') postId: string, @Param('userId') userId: string, @Body() updatePostAllowedUserDto: UpdatePostAllowedUserDto) {
    return this.postAllowedUserService.update(postId, userId, updatePostAllowedUserDto);
  }

  @Delete(':postId/:userId')
  remove(@Param('postId') postId: string, @Param('userId') userId: string) {
    return this.postAllowedUserService.remove(postId, userId);
  }
}
