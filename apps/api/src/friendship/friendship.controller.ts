import { Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { FriendshipService } from './friendship.service';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  // 1. Send Friend Request
  @Post('request/:receiverId')
  sendRequest(@Req() req, @Param('receiverId') receiverId: number) {
    // Uses the authenticated user's ID
    return this.friendshipService.sentrequest(req.user.id, receiverId);
  }

  // 2. Approve a Friend Request
  @Patch('request/:requesterId/approve')
  approveRequest(@Req() req, @Param('requesterId') requesterId: number) {
    return this.friendshipService.approveFriendRequest(req.user.id, requesterId);
  }

  // // Reject or Cancel a Friend Request
  // @Delete('request/:targetId/reject')
  // rejectOrCancelRequest(@Req() req, @Param('targetId') targetId: number) {
  //   return this.friendshipService.rejectOrCancelRequest(req.user.id, targetId);
  // }


  // 3. Get all your friends
  @Get('my-friends')
  getMyFriends(@Req() req, @Query('take') take = '20', @Query('skip') skip = '0') {
    return this.friendshipService.allMyFriends(req.user.id, Number(take), Number(skip));
  }

  // 4. Friend suggestions (You already had this one)
  @Get('suggestions')
  getSuggestions(@Req() req, @Query('limit') limit = '10') {
    const parsedLimit = Number(limit);
    return this.friendshipService.suggestFriends(
      req.user.id,
      Number.isFinite(parsedLimit) ? parsedLimit : 10,
    );
  }
  
  // Remove a Friend
  @Delete('remove/:friendId')
  unfriend(@Req() req, @Param('friendId') friendId: number) {
    return this.friendshipService.unfriend(req.user.id, friendId);
  }
}