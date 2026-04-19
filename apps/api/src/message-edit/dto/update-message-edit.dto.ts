import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageEditDto } from './create-message-edit.dto';

export class UpdateMessageEditDto extends PartialType(CreateMessageEditDto) {}
