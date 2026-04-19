import { IsNumber, IsString } from 'class-validator';
export class CreateUserInterestDto {
  @IsString()
  userId: string;

  @IsString()
  interest: string;

  @IsNumber()
  score: number;
}
