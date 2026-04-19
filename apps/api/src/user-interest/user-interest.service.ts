import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserInterestDto } from './dto/create-user-interest.dto';
import { UpdateUserInterestDto } from './dto/update-user-interest.dto';

@Injectable()
export class UserInterestService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserInterestDto: CreateUserInterestDto) {
    return this.prisma.userInterest.create({
      data: createUserInterestDto as any,
    });
  }

  findAll() {
    return this.prisma.userInterest.findMany();
  }
  findOne(id: string) {
    return this.prisma.userInterest.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateUserInterestDto: UpdateUserInterestDto) {
    return this.prisma.userInterest.update({
      where: { id: BigInt(id) } as any,
      data: updateUserInterestDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.userInterest.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
