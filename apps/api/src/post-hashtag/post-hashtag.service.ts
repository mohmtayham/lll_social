import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostHashtagDto } from './dto/create-post-hashtag.dto';
import { UpdatePostHashtagDto } from './dto/update-post-hashtag.dto';

@Injectable()
export class PostHashtagService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPostHashtagDto: CreatePostHashtagDto) {
    return this.prisma.postHashtag.create({
      data: createPostHashtagDto as any,
    });
  }

  findAll() {
    return this.prisma.postHashtag.findMany();
  }
  findOne(postId: string, hashtagId: string) {
    return this.prisma.postHashtag.findUnique({
      where: {
        postId_hashtagId: {
        postId: BigInt(postId),
        hashtagId: BigInt(hashtagId),
        },
      } as any,
    });
  }

  update(postId: string, hashtagId: string, updatePostHashtagDto: UpdatePostHashtagDto) {
    return this.prisma.postHashtag.update({
      where: {
        postId_hashtagId: {
        postId: BigInt(postId),
        hashtagId: BigInt(hashtagId),
        },
      } as any,
      data: updatePostHashtagDto as any,
    });
  }

  remove(postId: string, hashtagId: string) {
    return this.prisma.postHashtag.delete({
      where: {
        postId_hashtagId: {
        postId: BigInt(postId),
        hashtagId: BigInt(hashtagId),
        },
      } as any,
    });
  }
}
