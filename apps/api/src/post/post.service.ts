import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('post-scheduling') private readonly schedulingQueue: Queue,
  ) {}

  extractHashtags(content: string): string[] {
    const regex = /#[\w\u0600-\u06FF]+/g;
    const matches = content.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))];
  }

  private toBigInt(value: string | number | bigint): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    return BigInt(value);
  }

  async schedulePost(userId: string, data: any) {
    const scheduledFor = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException('Invalid scheduledAt value');
    }

    const scheduledPost = await this.prisma.scheduledPost.create({
      data: {
        userId: this.toBigInt(userId),
        content: data.content ?? null,
        visibility: data.visibility,
        feeling: data.feeling,
        location: data.location,
        scheduledFor,
      },
    });

    const delay = Math.max(scheduledFor.getTime() - Date.now(), 0);

    await this.schedulingQueue.add(
      'publish-post',
      { scheduledPostId: scheduledPost.id.toString() },
      { delay },
    );

    return scheduledPost;
  }

  async create(createPostDto: CreatePostDto) {
    const hashtags = this.extractHashtags(createPostDto.content || '');
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

      // Process hashtags
      if (hashtags.length > 0) {
        for (const tag of hashtags) {
          const hashtagRecord = await tx.hashtag.upsert({
            where: { nameLower: tag },
            update: {},
            create: {
              name: tag,
              nameLower: tag,
            },
          });

          await tx.postHashtag.create({
            data: {
              postId: post.id,
              hashtagId: hashtagRecord.id,
            },
          });
        }
      }

      // Process media
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

  async sharePost(userId: number, originalPostId: string, quoteContent?: string) {
    const targetPostId = this.toBigInt(originalPostId);

    // 1. التأكد أن المنشور الأصلي موجود
    const originalPost = await this.prisma.post.findUnique({
      where: { id: targetPostId },
    });

    if (!originalPost) throw new NotFoundException('Post not found');

    // 2. إنشاء المنشور كـ "مشاركة"
    return this.prisma.post.create({
      data: {
        userId: this.toBigInt(userId),
        content: quoteContent || null,
        sharedPostId: targetPostId,
      },
    });
  }
}
