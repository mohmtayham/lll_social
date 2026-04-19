import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ScheduledPostService } from './scheduled-post.service';
import { CreateScheduledPostDto } from './dto/create-scheduled-post.dto';
import { UpdateScheduledPostDto } from './dto/update-scheduled-post.dto';

@Controller('scheduled-post')
export class ScheduledPostController {
  constructor(private readonly scheduledPostService: ScheduledPostService) {}

  @Post()
  create(@Body() createScheduledPostDto: CreateScheduledPostDto) {
    return this.scheduledPostService.create(createScheduledPostDto);
  }

  @Get()
  findAll() {
    return this.scheduledPostService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scheduledPostService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateScheduledPostDto: UpdateScheduledPostDto) {
    return this.scheduledPostService.update(id, updateScheduledPostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduledPostService.remove(id);
  }
}
