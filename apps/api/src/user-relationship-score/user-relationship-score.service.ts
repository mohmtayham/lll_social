import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserRelationshipScoreDto } from './dto/create-user-relationship-score.dto';
import { UpdateUserRelationshipScoreDto } from './dto/update-user-relationship-score.dto';

@Injectable()
export class UserRelationshipScoreService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserRelationshipScoreDto: CreateUserRelationshipScoreDto) {
    return this.prisma.userRelationshipScore.create({
      data: createUserRelationshipScoreDto as any,
    });
  }

  findAll() {
    return this.prisma.userRelationshipScore.findMany();
  }
  findOne(userId: string, targetUserId: string) {
    return this.prisma.userRelationshipScore.findUnique({
      where: {
        userId_targetUserId: {
        userId: BigInt(userId),
        targetUserId: BigInt(targetUserId),
        },
      } as any,
    });
  }

  update(userId: string, targetUserId: string, updateUserRelationshipScoreDto: UpdateUserRelationshipScoreDto) {
    return this.prisma.userRelationshipScore.update({
      where: {
        userId_targetUserId: {
        userId: BigInt(userId),
        targetUserId: BigInt(targetUserId),
        },
      } as any,
      data: updateUserRelationshipScoreDto as any,
    });
  }

  remove(userId: string, targetUserId: string) {
    return this.prisma.userRelationshipScore.delete({
      where: {
        userId_targetUserId: {
        userId: BigInt(userId),
        targetUserId: BigInt(targetUserId),
        },
      } as any,
    });
  }
}
