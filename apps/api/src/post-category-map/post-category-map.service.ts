import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostCategoryMapDto } from './dto/create-post-category-map.dto';
import { UpdatePostCategoryMapDto } from './dto/update-post-category-map.dto';

@Injectable()
export class PostCategoryMapService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPostCategoryMapDto: CreatePostCategoryMapDto) {
    return this.prisma.postCategoryMap.create({
      data: createPostCategoryMapDto as any,
    });
  }

  findAll() {
    return this.prisma.postCategoryMap.findMany();
  }
  findOne(postId: string, categoryId: string) {
    return this.prisma.postCategoryMap.findUnique({
      where: {
        postId_categoryId: {
        postId: BigInt(postId),
        categoryId: BigInt(categoryId),
        },
      } as any,
    });
  }

  update(postId: string, categoryId: string, updatePostCategoryMapDto: UpdatePostCategoryMapDto) {
    return this.prisma.postCategoryMap.update({
      where: {
        postId_categoryId: {
        postId: BigInt(postId),
        categoryId: BigInt(categoryId),
        },
      } as any,
      data: updatePostCategoryMapDto as any,
    });
  }

  remove(postId: string, categoryId: string) {
    return this.prisma.postCategoryMap.delete({
      where: {
        postId_categoryId: {
        postId: BigInt(postId),
        categoryId: BigInt(categoryId),
        },
      } as any,
    });
  }
}
