import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserPrivacyDto } from './dto/create-user-privacy.dto';
import { UpdateUserPrivacyDto } from './dto/update-user-privacy.dto';

@Injectable()
export class UserPrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserPrivacyDto: CreateUserPrivacyDto,postId: string) {
    const privacy = this.prisma.userPrivacy.create({
      where:

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
