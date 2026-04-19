import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class CreateCommentDto {
  @IsString()
  postId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;
}
