import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduledPostMediaDto } from './dto/create-scheduled-post-media.dto';
import { UpdateScheduledPostMediaDto } from './dto/update-scheduled-post-media.dto';

@Injectable()
export class ScheduledPostMediaService {
  constructor(private readonly prisma: PrismaService) {}

  private toBigInt(value: string | number | bigint): bigint {
    return typeof value === 'bigint' ? value : BigInt(value);
  }

  create(createScheduledPostMediaDto: CreateScheduledPostMediaDto) {
    const dto = createScheduledPostMediaDto as {
      postId?: string | number | bigint;
      scheduledPostId?: string | number | bigint;
      mediaId?: string | number | bigint;
    };

    return this.prisma.postMedia.create({
      data: {
        postId: this.toBigInt(dto.postId ?? dto.scheduledPostId ?? 0),
        mediaId: this.toBigInt(dto.mediaId ?? 0),
      },
    });
  }

  findAll() {
    return this.prisma.postMedia.findMany();
  }
  findOne(scheduledPostId: string, mediaId: string) {
    return this.prisma.postMedia.findUnique({
      where: {
        postId_mediaId: {
        postId: this.toBigInt(scheduledPostId),
        mediaId: this.toBigInt(mediaId),
        },
      },
    });
  }

  update(scheduledPostId: string, mediaId: string, updateScheduledPostMediaDto: UpdateScheduledPostMediaDto) {
    const dto = updateScheduledPostMediaDto as {
      mediaId?: string | number | bigint;
    };

    return this.prisma.postMedia.upsert({
      where: {
        postId_mediaId: {
        postId: this.toBigInt(scheduledPostId),
        mediaId: this.toBigInt(mediaId),
        },
      },
      update: {
        mediaId: this.toBigInt(dto.mediaId ?? mediaId),
      },
      create: {
        postId: this.toBigInt(scheduledPostId),
        mediaId: this.toBigInt(dto.mediaId ?? mediaId),
      },
    });
  }

  remove(scheduledPostId: string, mediaId: string) {
    return this.prisma.postMedia.delete({
      where: {
        postId_mediaId: {
        postId: this.toBigInt(scheduledPostId),
        mediaId: this.toBigInt(mediaId),
        },
      },
    });
  }
}
