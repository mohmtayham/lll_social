import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostMediaDto } from './dto/create-post-media.dto';
import { UpdatePostMediaDto } from './dto/update-post-media.dto';

@Injectable()
export class PostMediaService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPostMediaDto: CreatePostMediaDto) {
    return this.prisma.postMedia.create({
      data: createPostMediaDto as any,
    });
  }

  findAll() {
    return this.prisma.postMedia.findMany();
  }
  findOne(postId: string, mediaId: string) {
    return this.prisma.postMedia.findUnique({
      where: {
        postId_mediaId: {
        postId: BigInt(postId),
        mediaId: BigInt(mediaId),
        },
      } as any,
    });
  }

  update(postId: string, mediaId: string, updatePostMediaDto: UpdatePostMediaDto) {
    return this.prisma.postMedia.update({
      where: {
        postId_mediaId: {
        postId: BigInt(postId),
        mediaId: BigInt(mediaId),
        },
      } as any,
      data: updatePostMediaDto as any,
    });
  }

  remove(postId: string, mediaId: string) {
    return this.prisma.postMedia.delete({
      where: {
        postId_mediaId: {
        postId: BigInt(postId),
        mediaId: BigInt(mediaId),
        },
      } as any,
    });
  }
}
