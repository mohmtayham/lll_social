import { PartialType } from '@nestjs/mapped-types';
import { CreatePostCategoryDto } from './create-post-category.dto';

export class UpdatePostCategoryDto extends PartialType(CreatePostCategoryDto) {}
