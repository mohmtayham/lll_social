import { Module } from '@nestjs/common';
import { PostEditService } from './post-edit.service';
import { PostEditController } from './post-edit.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PostEditController],
  providers: [PostEditService, PrismaService],
})
export class PostEditModule {}
