import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { UserInteractionType } from '@prisma/client';
export class CreateUserInteractionDto {
  @IsString()
  userId: string;

  @IsString()
  postId: string;

  @IsEnum(UserInteractionType)
  interactionType: UserInteractionType;

  @IsOptional()
  @IsNumber()
  watchTime?: number;
}
