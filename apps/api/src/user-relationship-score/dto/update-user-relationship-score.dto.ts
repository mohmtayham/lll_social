import { PartialType } from '@nestjs/mapped-types';
import { CreateUserRelationshipScoreDto } from './create-user-relationship-score.dto';

export class UpdateUserRelationshipScoreDto extends PartialType(CreateUserRelationshipScoreDto) {}
