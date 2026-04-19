import { IsString } from 'class-validator';
export class CreateSavedPostDto {
  @IsString()
  userId: string;

  @IsString()
  postId: string;
}
