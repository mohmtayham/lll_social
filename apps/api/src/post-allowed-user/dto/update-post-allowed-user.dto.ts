import { PartialType } from '@nestjs/mapped-types';
import { CreatePostAllowedUserDto } from './create-post-allowed-user.dto';

export class UpdatePostAllowedUserDto extends PartialType(CreatePostAllowedUserDto) {}
