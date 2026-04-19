import { Module } from '@nestjs/common';
import { SavedPostService } from './saved-post.service';
import { SavedPostController } from './saved-post.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [SavedPostController],
  providers: [SavedPostService, PrismaService],
})
export class SavedPostModule {}
