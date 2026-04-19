import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserFeedCacheService } from './user-feed-cache.service';
import { CreateUserFeedCacheDto } from './dto/create-user-feed-cache.dto';
import { UpdateUserFeedCacheDto } from './dto/update-user-feed-cache.dto';

@Controller('user-feed-cache')
export class UserFeedCacheController {
  constructor(private readonly userFeedCacheService: UserFeedCacheService) {}

  @Post()
  create(@Body() createUserFeedCacheDto: CreateUserFeedCacheDto) {
    return this.userFeedCacheService.create(createUserFeedCacheDto);
  }

  @Get()
  findAll() {
    return this.userFeedCacheService.findAll();
  }
  @Get(':userId/:postId')
  findOne(@Param('userId') userId: string, @Param('postId') postId: string) {
    return this.userFeedCacheService.findOne(userId, postId);
  }

  @Patch(':userId/:postId')
  update(@Param('userId') userId: string, @Param('postId') postId: string, @Body() updateUserFeedCacheDto: UpdateUserFeedCacheDto) {
    return this.userFeedCacheService.update(userId, postId, updateUserFeedCacheDto);
  }

  @Delete(':userId/:postId')
  remove(@Param('userId') userId: string, @Param('postId') postId: string) {
    return this.userFeedCacheService.remove(userId, postId);
  }
}
