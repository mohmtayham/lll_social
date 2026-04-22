import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PostVisibility, WhoCanAddFriend, WhoCanMessage, WhoCanSeeStory, WhoCanTag } from '@prisma/client';
export class CreateUserPrivacyDto {
  @IsOptional()
  @IsString()
  userId?: string|bigint;

  
  @IsOptional()
  @IsEnum(WhoCanMessage)
  whoCanMessage?: WhoCanMessage;

  @IsOptional()
  @IsEnum(PostVisibility)
  whoCanSeePosts?: PostVisibility;

  @IsOptional()
  @IsEnum(WhoCanSeeStory)
  whoCanSeeStory?: WhoCanSeeStory;

  @IsOptional()
  @IsEnum(WhoCanAddFriend)
  whoCanAddFriend?: WhoCanAddFriend;

  @IsOptional()
  @IsEnum(WhoCanTag)
  whoCanTag?: WhoCanTag;
}
