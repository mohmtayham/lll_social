import { Module } from '@nestjs/common';
import { MessageAttachmentService } from './message-attachment.service';
import { MessageAttachmentController } from './message-attachment.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MessageAttachmentController],
  providers: [MessageAttachmentService, PrismaService],
})
export class MessageAttachmentModule {}
