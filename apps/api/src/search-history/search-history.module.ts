import { Module } from '@nestjs/common';
import { SearchHistoryService } from './search-history.service';
import { SearchHistoryController } from './search-history.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SearchHistoryController],
  providers: [SearchHistoryService, PrismaService],
})
export class SearchHistoryModule {}
