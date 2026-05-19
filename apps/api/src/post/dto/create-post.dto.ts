import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostVisibility } from '@prisma/client';

export class CreatePostDto {
  
  @ApiPropertyOptional({
    description: 'محتوى البوست النصي',
    example: 'اليوم كان يوم رائع! 🌟',
    type: String,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'مستوى خصوصية البوست',
    enum: Object.values(PostVisibility),  // ← الحل الصحيح ✅
    enumName: 'PostVisibility',
    example: 'PUBLIC',
  })
  @IsOptional()
  @IsEnum(PostVisibility)
  visibility?: PostVisibility;

  @ApiPropertyOptional({
    description: 'الحالة المزاجية عند نشر البوست',
    example: 'سعيد 😊',
    type: String,
  })
  @IsOptional()
  @IsString()
  feeling?: string;

  @ApiPropertyOptional({
    description: 'الموقع الجغرافي للبوست',
    example: 'القاهرة، مصر',
    type: String,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'هل البوست تم تعديله مسبقاً؟',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;

  @ApiPropertyOptional({
    description: 'قائمة IDs الميديا المرتبطة بالبوست',
    example: ['9007199254740991', '9007199254740992'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  mediaIds?: bigint[];
}