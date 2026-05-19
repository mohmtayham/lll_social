import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { BlockService } from './block.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';

@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post()
  create(@Req() req, @Body() createBlockDto: CreateBlockDto) {
    return this.blockService.create(createBlockDto, req.user.id);
  }

  @Get()
  findAll(@Req() req) {
    return this.blockService.findAll(req.user.id);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blockService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blockService.remove(id);
  }
}
