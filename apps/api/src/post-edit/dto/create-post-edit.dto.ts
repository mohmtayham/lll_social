import { IsDateString, IsOptional, IsString } from 'class-validator';
export class CreatePostEditDto {
  @IsString()
  postId: string;

  @IsString()
  oldContent: string;

  @IsOptional()
  @IsDateString()
  editedAt?: string;
}
