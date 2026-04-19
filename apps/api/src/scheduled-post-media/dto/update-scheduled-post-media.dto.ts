import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduledPostMediaDto } from './create-scheduled-post-media.dto';

export class UpdateScheduledPostMediaDto extends PartialType(CreateScheduledPostMediaDto) {}
