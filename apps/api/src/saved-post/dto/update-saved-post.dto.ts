import { PartialType } from '@nestjs/mapped-types';
import { CreateSavedPostDto } from './create-saved-post.dto';

export class UpdateSavedPostDto extends PartialType(CreateSavedPostDto) {}
