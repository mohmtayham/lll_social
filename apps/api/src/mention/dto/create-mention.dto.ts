import { IsString } from 'class-validator';
export class CreateMentionDto {
  @IsString()
  userId: string;

  @IsString()
  mentionedInType: string;

  @IsString()
  mentionedInId: string;
}
