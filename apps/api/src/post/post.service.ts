import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  async create(createPostDto: CreatePostDto) {
    const { mediaIds, ...rest } = createPostDto;
    const userId = this.toBigInt(createPostDto.userId);

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          userId,
          content: rest.content,
          visibility: rest.visibility,
          feeling: rest.feeling,
          location: rest.location,
          isEdited: rest.isEdited ?? false,
        },
      });

      if (mediaIds?.length) {
        await tx.postMedia.createMany({
          data: mediaIds.map((mediaId) => ({
            postId: post.id,
            mediaId: this.toBigInt(mediaId),
          })),
          skipDuplicates: true,
        });
      }

      return post;
    });
  }

  findAll() {
    return this.prisma.post.findMany();
  }

  findOne(id: string) {
    return this.prisma.post.findUnique({
      where: { id: this.toBigInt(id) },
    });
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const { mediaIds, ...rest } = updatePostDto as UpdatePostDto & {
      mediaIds?: Array<string | number | bigint>;
    };
    const postId = this.toBigInt(id);

    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.update({
        where: { id: postId },
        data: {
          ...rest,
          isEdited: true,
        } as any,
      });

      if (mediaIds) {
        await tx.postMedia.deleteMany({ where: { postId } });

        if (mediaIds.length) {
          await tx.postMedia.createMany({
            data: mediaIds.map((mediaId) => ({
              postId,
              mediaId: this.toBigInt(mediaId),
            })),
            skipDuplicates: true,
          });
        }
      }

      return post;
    });
  }

  remove(id: string) {
  return this.prisma.post.delete({
      where: { id: this.toBigInt(id) },
    });
  }

}
