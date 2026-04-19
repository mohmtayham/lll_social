import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserPrivacyDto } from './dto/create-user-privacy.dto';
import { UpdateUserPrivacyDto } from './dto/update-user-privacy.dto';

@Injectable()
export class UserPrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserPrivacyDto: CreateUserPrivacyDto) {
    return this.prisma.userPrivacy.create({
      data: createUserPrivacyDto as any,
    });
  }

  findAll() {
    return this.prisma.userPrivacy.findMany();
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

  remove(id: string) {
    return this.prisma.userPrivacy.delete({
      where: { userId: BigInt(id) } as any,
    });
  }
}
