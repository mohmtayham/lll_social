import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostAllowedUserDto } from './dto/create-post-allowed-user.dto';
import { UpdatePostAllowedUserDto } from './dto/update-post-allowed-user.dto';

@Injectable()
export class PostAllowedUserService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPostAllowedUserDto: CreatePostAllowedUserDto) {
    return this.prisma.postAllowedUser.create({
      data: createPostAllowedUserDto as any,
    });
  }

  findAll() {
    return this.prisma.postAllowedUser.findMany();
  }
  findOne(postId: string, userId: string) {
    return this.prisma.postAllowedUser.findUnique({
      where: {
        postId_userId: {
        postId: BigInt(postId),
        userId: BigInt(userId),
        },
      } as any,
    });
  }

  update(postId: string, userId: string, updatePostAllowedUserDto: UpdatePostAllowedUserDto) {
    return this.prisma.postAllowedUser.update({
      where: {
        postId_userId: {
        postId: BigInt(postId),
        userId: BigInt(userId),
        },
      } as any,
      data: updatePostAllowedUserDto as any,
    });
  }

  remove(postId: string, userId: string) {
    return this.prisma.postAllowedUser.delete({
      where: {
        postId_userId: {
        postId: BigInt(postId),
        userId: BigInt(userId),
        },
      } as any,
    });
  }
}
