import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SearchType } from '@prisma/client';
export class CreateSearchHistoryDto {
  @IsString()
  userId: string;

  @IsString()
  query: string;

  @IsOptional()
  @IsEnum(SearchType)
  searchType?: SearchType;
}
