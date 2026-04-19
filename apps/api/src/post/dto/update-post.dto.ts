import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

// نقوم أولاً بحذف الحقول التي لا نريد تعديلها باستخدام OmitType
// ثم نجعل بقية الحقول اختيارية باستخدام PartialType
export class UpdatePostDto extends PartialType(
  OmitType(CreatePostDto, ['userId'] as const), // استبدل 'userId' بأي حقل تريد منعه من التحديث
) {}