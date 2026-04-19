import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateScheduledPostMediaDto } from './dto/create-scheduled-post-media.dto';
import { UpdateScheduledPostMediaDto } from './dto/update-scheduled-post-media.dto';

@Injectable()
export class ScheduledPostMediaService {
  constructor(private readonly prisma: PrismaService) {}

  create(createScheduledPostMediaDto: CreateScheduledPostMediaDto) {
    return this.prisma.scheduledPostMedia.create({
      data: createScheduledPostMediaDto as any,
    });
  }

  findAll() {
    return this.prisma.scheduledPostMedia.findMany();
  }
  findOne(scheduledPostId: string, mediaId: string) {
    return this.prisma.scheduledPostMedia.findUnique({
      where: {
        scheduledPostId_mediaId: {
        scheduledPostId: BigInt(scheduledPostId),
        mediaId: BigInt(mediaId),
        },
      } as any,
    });
  }

  update(scheduledPostId: string, mediaId: string, updateScheduledPostMediaDto: UpdateScheduledPostMediaDto) {
    return this.prisma.scheduledPostMedia.update({
      where: {
        scheduledPostId_mediaId: {
        scheduledPostId: BigInt(scheduledPostId),
        mediaId: BigInt(mediaId),
        },
      } as any,
      data: updateScheduledPostMediaDto as any,
    });
  }

  remove(scheduledPostId: string, mediaId: string) {
    return this.prisma.scheduledPostMedia.delete({
      where: {
        scheduledPostId_mediaId: {
        scheduledPostId: BigInt(scheduledPostId),
        mediaId: BigInt(mediaId),
        },
      } as any,
    });
  }
}
