import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SavedPostService } from './saved-post.service';
import { CreateSavedPostDto } from './dto/create-saved-post.dto';
import { UpdateSavedPostDto } from './dto/update-saved-post.dto';

@Controller('saved-post')
export class SavedPostController {
  constructor(private readonly savedPostService: SavedPostService) {}

  @Post()
  create(@Body() createSavedPostDto: CreateSavedPostDto) {
    return this.savedPostService.create(createSavedPostDto);
  }

  @Get()
  findAll() {
    return this.savedPostService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.savedPostService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSavedPostDto: UpdateSavedPostDto) {
    return this.savedPostService.update(id, updateSavedPostDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.savedPostService.remove(id);
  }
}
