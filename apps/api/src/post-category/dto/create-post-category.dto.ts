import { IsString } from 'class-validator';
export class CreatePostCategoryDto {
  @IsString()
  name: string;
}
