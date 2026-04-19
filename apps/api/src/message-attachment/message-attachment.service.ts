import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageAttachmentDto } from './dto/create-message-attachment.dto';
import { UpdateMessageAttachmentDto } from './dto/update-message-attachment.dto';

@Injectable()
export class MessageAttachmentService {
  constructor(private readonly prisma: PrismaService) {}

  create(createMessageAttachmentDto: CreateMessageAttachmentDto) {
    return this.prisma.messageAttachment.create({
      data: createMessageAttachmentDto as any,
    });
  }

  findAll() {
    return this.prisma.messageAttachment.findMany();
  }
  findOne(messageId: string, mediaId: string) {
    return this.prisma.messageAttachment.findUnique({
      where: {
        messageId_mediaId: {
        messageId: BigInt(messageId),
        mediaId: BigInt(mediaId),
        },
      } as any,
    });
  }

  update(messageId: string, mediaId: string, updateMessageAttachmentDto: UpdateMessageAttachmentDto) {
    return this.prisma.messageAttachment.update({
      where: {
        messageId_mediaId: {
        messageId: BigInt(messageId),
        mediaId: BigInt(mediaId),
        },
      } as any,
      data: updateMessageAttachmentDto as any,
    });
  }

  remove(messageId: string, mediaId: string) {
    return this.prisma.messageAttachment.delete({
      where: {
        messageId_mediaId: {
        messageId: BigInt(messageId),
        mediaId: BigInt(mediaId),
        },
      } as any,
    });
  }
}
