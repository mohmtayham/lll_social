import { IsDateString, IsOptional, IsString } from 'class-validator';
export class CreateMessageEditDto {
  @IsString()
  messageId: string;

  @IsString()
  oldContent: string;

  @IsOptional()
  @IsDateString()
  editedAt?: string;
}
