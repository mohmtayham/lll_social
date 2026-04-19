import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PostVisibility, ScheduledPostStatus } from '@prisma/client';
export class CreateScheduledPostDto {
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

  @IsDateString()
  scheduledFor: string;

  @IsOptional()
  @IsEnum(ScheduledPostStatus)
  status?: ScheduledPostStatus;
}
