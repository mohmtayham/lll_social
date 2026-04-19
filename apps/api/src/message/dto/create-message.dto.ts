import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';
export class CreateMessageDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @IsOptional()
  @IsString()
  replyToId?: string;

  @IsOptional()
  @IsString()
  clientMessageId?: string;
}
