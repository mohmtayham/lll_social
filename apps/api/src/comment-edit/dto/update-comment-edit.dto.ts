import { PartialType } from '@nestjs/mapped-types';
import { CreateCommentEditDto } from './create-comment-edit.dto';

export class UpdateCommentEditDto extends PartialType(CreateCommentEditDto) {}
