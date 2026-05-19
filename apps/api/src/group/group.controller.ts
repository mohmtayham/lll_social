import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PostService } from '../post/post.service';

@Controller('group')
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly postService: PostService,
  ) {}

  private requireUserId(req: Request): string | number {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return userId;
  }

  @Post()
  create(@Req() req: Request, @Body() createGroupDto: CreateGroupDto) {
    const userId = this.requireUserId(req);
    return this.groupService.create({
      ...createGroupDto,
      creatorId: userId,
    });
  }

  @Get()
  findAll() {
    return this.groupService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(id);
  }

  @Post(':id/join')
  joinGroup(@Req() req: Request, @Param('id') id: string) {
    const userId = this.requireUserId(req);
    return this.groupService.joinGroup(userId, id);
  }

  @Post(':id/leave')
  leaveGroup(@Req() req: Request, @Param('id') id: string) {
    const userId = this.requireUserId(req);
    return this.groupService.leaveGroup(userId, id);
  }

  @Post(':id/posts/:postId/approve')
  approvePost(@Req() req: Request, @Param('postId') postId: string) {
    const adminId = this.requireUserId(req);
    return this.postService.approvePostInGroup(adminId, postId);
  }

  @Post(':id/posts/:postId/reject')
  rejectPost(@Req() req: Request, @Param('postId') postId: string) {
    const adminId = this.requireUserId(req);
    return this.postService.rejectPostInGroup(adminId, postId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupService.update(id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupService.remove(id);
  }
}
