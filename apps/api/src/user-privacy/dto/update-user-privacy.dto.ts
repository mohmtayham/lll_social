import { PartialType } from '@nestjs/mapped-types';
import { CreateUserPrivacyDto } from './create-user-privacy.dto';

export class UpdateUserPrivacyDto extends PartialType(CreateUserPrivacyDto) {}
