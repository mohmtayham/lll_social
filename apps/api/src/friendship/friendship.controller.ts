import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { CreateFriendshipDto } from './dto/create-friendship.dto';
import { UpdateFriendshipDto } from './dto/update-friendship.dto';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Get('suggestions')
  getSuggestions(@Req() req, @Query('limit') limit = '10') {
    const parsedLimit = Number(limit);
    return this.friendshipService.suggestFriends(
      req.user.id,
      Number.isFinite(parsedLimit) ? parsedLimit : 10,
    );
  }

}
