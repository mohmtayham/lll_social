import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReactableType, ReactionType } from '@prisma/client';
export class CreateReactionDto {
  @IsString()
  userId: string;

  @IsString()
  reactableId: string;

  @IsEnum(ReactableType)
  reactableType: ReactableType;

  @IsOptional()
  @IsEnum(ReactionType)
  reactionType?: ReactionType;
}
