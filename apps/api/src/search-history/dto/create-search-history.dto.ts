// apps/api/src/search-history/dto/create-search-history.dto.ts

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SearchType } from '@prisma/client';

export class CreateSearchHistoryDto {

  @ApiPropertyOptional({
    example: 'أحمد',
    type: String,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    enum: Object.values(SearchType),   // ← Object.values هنا أيضاً ✅
    enumName: 'SearchType',
    example: 'POSTS',
  })
  @IsOptional()
  @IsEnum(SearchType)
  searchType?: SearchType;
}