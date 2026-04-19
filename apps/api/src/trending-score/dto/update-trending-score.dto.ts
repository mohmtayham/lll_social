import { PartialType } from '@nestjs/mapped-types';
import { CreateTrendingScoreDto } from './create-trending-score.dto';

export class UpdateTrendingScoreDto extends PartialType(CreateTrendingScoreDto) {}
