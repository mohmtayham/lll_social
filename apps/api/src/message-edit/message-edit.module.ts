import { Module } from '@nestjs/common';
import { MessageEditService } from './message-edit.service';
import { MessageEditController } from './message-edit.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MessageEditController],
  providers: [MessageEditService, PrismaService],
})
export class MessageEditModule {}
