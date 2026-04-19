import { PartialType } from '@nestjs/mapped-types';
import { CreatePostEditDto } from './create-post-edit.dto';

export class UpdatePostEditDto extends PartialType(CreatePostEditDto) {}
