import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostCategoryDto } from './dto/create-post-category.dto';
import { UpdatePostCategoryDto } from './dto/update-post-category.dto';

@Injectable()
export class PostCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPostCategoryDto: CreatePostCategoryDto) {
    return this.prisma.postCategory.create({
      data: createPostCategoryDto as any,
    });
  }

  findAll() {
    return this.prisma.postCategory.findMany();
  }
  findOne(id: string) {
    return this.prisma.postCategory.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updatePostCategoryDto: UpdatePostCategoryDto) {
    return this.prisma.postCategory.update({
      where: { id: BigInt(id) } as any,
      data: updatePostCategoryDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.postCategory.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
