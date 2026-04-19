import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FriendshipStatus } from '@prisma/client';
export class CreateFriendshipDto {
  @IsString()
  userId1: string;

  @IsString()
  userId2: string;

  @IsOptional()
  @IsEnum(FriendshipStatus)
  status?: FriendshipStatus;
}
