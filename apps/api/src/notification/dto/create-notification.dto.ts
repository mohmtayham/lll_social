import { IsBoolean, IsDateString, IsObject, IsOptional, IsString } from 'class-validator';
export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  uniqueKey?: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsDateString()
  readAt?: string;
}
