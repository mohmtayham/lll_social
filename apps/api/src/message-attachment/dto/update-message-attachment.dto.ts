import { PartialType } from '@nestjs/mapped-types';
import { CreateMessageAttachmentDto } from './create-message-attachment.dto';

export class UpdateMessageAttachmentDto extends PartialType(CreateMessageAttachmentDto) {}
