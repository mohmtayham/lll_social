import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PostVisibility } from '@prisma/client';
export class CreatePostDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @IsOptional()
  @IsString()
  feeling?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;
    @IsOptional()
  @IsArray()
  mediaIds?: bigint[];
}
