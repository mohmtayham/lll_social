import { PartialType } from '@nestjs/mapped-types';
import { CreateConversationParticipantDto } from './create-conversation-participant.dto';

export class UpdateConversationParticipantDto extends PartialType(CreateConversationParticipantDto) {}
