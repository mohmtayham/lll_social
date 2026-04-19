import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserFeedCacheDto } from './dto/create-user-feed-cache.dto';
import { UpdateUserFeedCacheDto } from './dto/update-user-feed-cache.dto';

@Injectable()
export class UserFeedCacheService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserFeedCacheDto: CreateUserFeedCacheDto) {
    return this.prisma.userFeedCache.create({
      data: createUserFeedCacheDto as any,
    });
  }

  findAll() {
    return this.prisma.userFeedCache.findMany();
  }
  findOne(userId: string, postId: string) {
    return this.prisma.userFeedCache.findUnique({
      where: {
        userId_postId: {
        userId: BigInt(userId),
        postId: BigInt(postId),
        },
      } as any,
    });
  }

  update(userId: string, postId: string, updateUserFeedCacheDto: UpdateUserFeedCacheDto) {
    return this.prisma.userFeedCache.update({
      where: {
        userId_postId: {
        userId: BigInt(userId),
        postId: BigInt(postId),
        },
      } as any,
      data: updateUserFeedCacheDto as any,
    });
  }

  remove(userId: string, postId: string) {
    return this.prisma.userFeedCache.delete({
      where: {
        userId_postId: {
        userId: BigInt(userId),
        postId: BigInt(postId),
        },
      } as any,
    });
  }
}
