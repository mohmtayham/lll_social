import { IsNumber } from 'class-validator';
export class CreateUserFeedCacheDto {
  @IsNumber()
  score: number;
}
