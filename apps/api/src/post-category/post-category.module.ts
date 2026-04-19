import { Module } from '@nestjs/common';
import { PostCategoryService } from './post-category.service';
import { PostCategoryController } from './post-category.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PostCategoryController],
  providers: [PostCategoryService, PrismaService],
})
export class PostCategoryModule {}
