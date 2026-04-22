import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { SearchHistoryService } from './search-history.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { SearchType } from '@prisma/client';

@Controller('search-history')
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  @Post()
  create(@Req() req, @Body() createSearchHistoryDto: CreateSearchHistoryDto) {
    return this.searchHistoryService.saveSearch(
      req.user.id,
      createSearchHistoryDto.query,
      createSearchHistoryDto.searchType ?? SearchType.POSTS,
    );
  }

  @Get('recent')
  findRecent(@Req() req, @Query('searchType') searchType?: SearchType) {
    return this.searchHistoryService.getRecentSearches(req.user.id, searchType);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.searchHistoryService.removeSearch(id, req.user.id);
  }

  @Delete('clear/all')
  clear(@Req() req) {
    return this.searchHistoryService.clearHistory(req.user.id);
  }
}
