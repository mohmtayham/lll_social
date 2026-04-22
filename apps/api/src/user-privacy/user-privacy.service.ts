import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserPrivacyDto } from './dto/create-user-privacy.dto';
import { UpdateUserPrivacyDto } from './dto/update-user-privacy.dto';

@Injectable()
export class UserPrivacyService {
  constructor(private readonly prisma: PrismaService) {}


  private toBigInt(value: string | number | bigint|undefined): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if(typeof value ==='undefined') throw new Error('Value is undefined'); // أو تعامل معها كخطأ
    return BigInt(value);
  }

//  return this.prisma.mention.create({
//       data: {
//         userId: this.toBigInt(createMentionDto.userId),
//         mentionedInType: createMentionDto.mentionedInType,
//         mentionedInId: this.toBigInt(createMentionDto.mentionedInId),
//       },

  create(createUserPrivacyDto: CreateUserPrivacyDto) {
    // 1. التحقق من وجود الـ userId أولاً
  if (!createUserPrivacyDto.userId) {
    throw new Error('UserId is required'); 
  }

const existingPrivacy = this.prisma.userPrivacy.findUnique({
  
  where: { userId: this.toBigInt(createUserPrivacyDto.userId)}, 
});

    const privacy = this.prisma.userPrivacy.create({
 
    data: createUserPrivacyDto as any,
  
   });
   return privacy;
  }
async updateOrCreatePrivacy(createUserPrivacyDto: CreateUserPrivacyDto) {
  const userId = this.toBigInt(createUserPrivacyDto.userId);

  return await this.prisma.userPrivacy.upsert({
    where: { 
      userId: userId 
    },
    // في حال وجد السجل (تحديث)
    update: {
      ...createUserPrivacyDto,
      userId: userId, // للتأكد من ثبات المعرف
    },
    // في حال لم يجد السجل (إنشاء جديد)
    create: {
      ...createUserPrivacyDto,
      userId: userId,
    },
  });
}


  findOne(id: string) {
    return this.prisma.userPrivacy.findUnique({
      where: { userId: BigInt(id) } as any,
    });
  }

  update(id: string, updateUserPrivacyDto: UpdateUserPrivacyDto) {
    return this.prisma.userPrivacy.update({
      where: { userId: BigInt(id) } as any,
      data: updateUserPrivacyDto as any,
    });
  }

}
