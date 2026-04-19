import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TrendingScoreService } from './trending-score.service';
import { CreateTrendingScoreDto } from './dto/create-trending-score.dto';
import { UpdateTrendingScoreDto } from './dto/update-trending-score.dto';

@Controller('trending-score')
export class TrendingScoreController {
  constructor(private readonly trendingScoreService: TrendingScoreService) {}

  @Post()
  create(@Body() createTrendingScoreDto: CreateTrendingScoreDto) {
    return this.trendingScoreService.create(createTrendingScoreDto);
  }

  @Get()
  findAll() {
    return this.trendingScoreService.findAll();
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trendingScoreService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTrendingScoreDto: UpdateTrendingScoreDto) {
    return this.trendingScoreService.update(id, updateTrendingScoreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trendingScoreService.remove(id);
  }
}
