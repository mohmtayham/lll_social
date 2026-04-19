import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationType } from '@prisma/client';

export class CreateConversationDto {
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  avatarMediaId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => String)
  participantIds: string[];
}
