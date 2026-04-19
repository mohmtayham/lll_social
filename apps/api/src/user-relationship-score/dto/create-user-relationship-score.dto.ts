import { IsNumber } from 'class-validator';
export class CreateUserRelationshipScoreDto {
  @IsNumber()
  score: number;
}
