import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UpdateReactionDto } from './dto/update-reaction.dto';

@Controller('reaction')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Post()
  create(@Req() req, @Body() createReactionDto: CreateReactionDto) {
    return this.reactionService.create(createReactionDto, req.user.id);
  }


  @Get()
  findOne(@Req () req) {
    return this.reactionService.findOne(req.user.id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateReactionDto: UpdateReactionDto) {
  //   return this.reactionService.update(id, updateReactionDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.reactionService.remove(id);
  // }
}
