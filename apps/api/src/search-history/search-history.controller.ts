import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchCategory, SearchHistoryService } from './search-history.service';
import { CreateSearchHistoryDto } from './dto/create-search-history.dto';
import { SearchType } from '@prisma/client';

@ApiTags('Search History')
@ApiBearerAuth('access-token')
@Controller('search-history')
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}
@Get()
async search(
  @Req() req: any,
  @Query('q') q: string,
  @Query('category') categorytype: string = 'all',
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '20',
){

if(!q?.trim()){
  throw new BadRequestException('Search query cannot be empty');

}
const validTypes = ['all', 'users', 'posts', 'groups'];
const safeCategory = validTypes.includes(categorytype) ? (categorytype as SearchCategory) : 'all';
return this.searchHistoryService.search(
  BigInt(req.user.id),
  q,
  safeCategory,
  parseInt(page, 10),
  parseInt(limit, 10),

);
  }
  @Post()
  create(@Req() req, @Body() createSearchHistoryDto: CreateSearchHistoryDto) {
    return this.searchHistoryService.saveSearch(
      req.user.id,
      createSearchHistoryDto.query??'',
      createSearchHistoryDto.searchType ?? SearchType.POSTS,
    );
  }

  @Get('recent')
  @ApiQuery({
    name: 'searchType',
    enum: Object.values(SearchType), 
    enumName: 'SearchType',
    required: false,
  })
  findRecent(
    @Req() req,
    @Query('searchType') searchType?: string,  // ✅ string مش SearchType
  ) {
    return this.searchHistoryService.getRecentSearches(
      req.user.id,
      searchType as SearchType,
    );
  }
  // ─────────────────────────────────────────────────────────────
  // GET /search/history
  // ─────────────────────────────────────────────────────────────
  @Get('history')
  async getHistory(@Req() req: any) {
    return this.searchHistoryService.getHistory(BigInt(req.user.id));
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE /search/history — clears all history for the user
  // ─────────────────────────────────────────────────────────────
  @Delete('history')
  async clearHistory(@Req() req: any) {
    return this.searchHistoryService.clearHistory(
      BigInt(req.user.id)
    );
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE /search/history/:id — removes a single history item
  // ─────────────────────────────────────────────────────────────
  @Delete('history/:id')
  async deleteHistoryItem(@Req() req: any, @Param('id') id: string) {
    return this.searchHistoryService.deleteHistoryItem(BigInt(req.user.id), BigInt(id));
  }
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.searchHistoryService.removeSearch(id, req.user.id);
  }

  @Delete('clear/all')
  clear(@Req() req) {
    return this.searchHistoryService.clearHistory(BigInt(req.user.id));
  }
}