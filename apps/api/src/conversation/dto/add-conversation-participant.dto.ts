import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ConversationParticipantRole } from '@prisma/client';

export class AddConversationParticipantDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsEnum(ConversationParticipantRole)
  role?: ConversationParticipantRole;
}
