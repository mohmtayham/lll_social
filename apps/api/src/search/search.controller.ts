import { Controller, Get, Query, Req } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  async globalSearch(
    @Req() req: any,
    @Query('q') query: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    // We assume an auth guard is applied at the module or app level to set `req.user.id`.
    return this.searchService.globalSearch(req.user?.id, query, limit);
  }
}
