import { IsDateString, IsNumber, IsString } from 'class-validator';
export class CreateTrendingScoreDto {
  @IsString()
  postId: string;

  @IsNumber()
  score: number;

  @IsString()
  region: string;

  @IsDateString()
  calculatedAt: string;
}
