import { Module } from '@nestjs/common';
import { SearchHistoryController } from './search-history.controller';
import { SearchHistoryService } from './search-history.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
	controllers: [SearchHistoryController],
	providers: [SearchHistoryService, PrismaService],
})
export class SearchHistoryModule {}


