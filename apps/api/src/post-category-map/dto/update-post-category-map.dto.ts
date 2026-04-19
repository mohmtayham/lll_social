import { PartialType } from '@nestjs/mapped-types';
import { CreatePostCategoryMapDto } from './create-post-category-map.dto';

export class UpdatePostCategoryMapDto extends PartialType(CreatePostCategoryMapDto) {}
