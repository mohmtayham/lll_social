import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ScheduledPostMediaService } from './scheduled-post-media.service';
import { CreateScheduledPostMediaDto } from './dto/create-scheduled-post-media.dto';
import { UpdateScheduledPostMediaDto } from './dto/update-scheduled-post-media.dto';

@Controller('scheduled-post-media')
export class ScheduledPostMediaController {
  constructor(private readonly scheduledPostMediaService: ScheduledPostMediaService) {}

  @Post()
  create(@Body() createScheduledPostMediaDto: CreateScheduledPostMediaDto) {
    return this.scheduledPostMediaService.create(createScheduledPostMediaDto);
  }

  @Get()
  findAll() {
    return this.scheduledPostMediaService.findAll();
  }
  @Get(':scheduledPostId/:mediaId')
  findOne(@Param('scheduledPostId') scheduledPostId: string, @Param('mediaId') mediaId: string) {
    return this.scheduledPostMediaService.findOne(scheduledPostId, mediaId);
  }

  @Patch(':scheduledPostId/:mediaId')
  update(@Param('scheduledPostId') scheduledPostId: string, @Param('mediaId') mediaId: string, @Body() updateScheduledPostMediaDto: UpdateScheduledPostMediaDto) {
    return this.scheduledPostMediaService.update(scheduledPostId, mediaId, updateScheduledPostMediaDto);
  }

  @Delete(':scheduledPostId/:mediaId')
  remove(@Param('scheduledPostId') scheduledPostId: string, @Param('mediaId') mediaId: string) {
    return this.scheduledPostMediaService.remove(scheduledPostId, mediaId);
  }
}
