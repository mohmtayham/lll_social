import { IsDateString, IsOptional, IsString } from 'class-validator';
export class CreateCommentEditDto {
  @IsString()
  commentId: string;

  @IsString()
  oldContent: string;

  @IsOptional()
  @IsDateString()
  editedAt?: string;
}
