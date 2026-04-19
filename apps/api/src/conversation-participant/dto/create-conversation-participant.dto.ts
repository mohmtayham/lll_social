import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ConversationParticipantRole } from '@prisma/client';
export class CreateConversationParticipantDto {
  @IsString()
  conversationId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(ConversationParticipantRole)
  role?: ConversationParticipantRole;

  @IsOptional()
  @IsString()
  lastReadMessageId?: string;

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsDateString()
  leftAt?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
