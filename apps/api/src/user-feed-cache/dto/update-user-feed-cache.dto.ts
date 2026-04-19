import { PartialType } from '@nestjs/mapped-types';
import { CreateUserFeedCacheDto } from './create-user-feed-cache.dto';

export class UpdateUserFeedCacheDto extends PartialType(CreateUserFeedCacheDto) {}
