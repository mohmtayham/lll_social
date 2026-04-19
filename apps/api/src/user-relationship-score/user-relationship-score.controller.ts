import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRelationshipScoreService } from './user-relationship-score.service';
import { CreateUserRelationshipScoreDto } from './dto/create-user-relationship-score.dto';
import { UpdateUserRelationshipScoreDto } from './dto/update-user-relationship-score.dto';

@Controller('user-relationship-score')
export class UserRelationshipScoreController {
  constructor(private readonly userRelationshipScoreService: UserRelationshipScoreService) {}

  @Post()
  create(@Body() createUserRelationshipScoreDto: CreateUserRelationshipScoreDto) {
    return this.userRelationshipScoreService.create(createUserRelationshipScoreDto);
  }

  @Get()
  findAll() {
    return this.userRelationshipScoreService.findAll();
  }
  @Get(':userId/:targetUserId')
  findOne(@Param('userId') userId: string, @Param('targetUserId') targetUserId: string) {
    return this.userRelationshipScoreService.findOne(userId, targetUserId);
  }

  @Patch(':userId/:targetUserId')
  update(@Param('userId') userId: string, @Param('targetUserId') targetUserId: string, @Body() updateUserRelationshipScoreDto: UpdateUserRelationshipScoreDto) {
    return this.userRelationshipScoreService.update(userId, targetUserId, updateUserRelationshipScoreDto);
  }

  @Delete(':userId/:targetUserId')
  remove(@Param('userId') userId: string, @Param('targetUserId') targetUserId: string) {
    return this.userRelationshipScoreService.remove(userId, targetUserId);
  }
}
