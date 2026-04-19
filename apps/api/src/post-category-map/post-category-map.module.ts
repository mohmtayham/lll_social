import { Module } from '@nestjs/common';
import { PostCategoryMapService } from './post-category-map.service';
import { PostCategoryMapController } from './post-category-map.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PostCategoryMapController],
  providers: [PostCategoryMapService, PrismaService],
})
export class PostCategoryMapModule {}
