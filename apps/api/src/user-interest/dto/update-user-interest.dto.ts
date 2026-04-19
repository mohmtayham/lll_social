import { PartialType } from '@nestjs/mapped-types';
import { CreateUserInterestDto } from './create-user-interest.dto';

export class UpdateUserInterestDto extends PartialType(CreateUserInterestDto) {}
