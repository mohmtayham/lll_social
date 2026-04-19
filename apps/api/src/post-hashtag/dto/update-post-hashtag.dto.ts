import { PartialType } from '@nestjs/mapped-types';
import { CreatePostHashtagDto } from './create-post-hashtag.dto';

export class UpdatePostHashtagDto extends PartialType(CreatePostHashtagDto) {}
