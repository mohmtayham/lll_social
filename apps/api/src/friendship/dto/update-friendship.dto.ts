import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateFriendshipDto } from './create-friendship.dto';

export class UpdateFriendshipDto extends PartialType(
   
      OmitType(CreateFriendshipDto, ['userId1','userId2'] as const), // استبدل 'userId' بأي حقل تريد منعه من التحديث
    ) {}



