import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePostEditDto } from './dto/create-post-edit.dto';
import { UpdatePostEditDto } from './dto/update-post-edit.dto';

@Injectable()
export class PostEditService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPostEditDto: CreatePostEditDto) {
    return this.prisma.postEdit.create({
      data: createPostEditDto as any,
    });
  }

  findAll() {
    return this.prisma.postEdit.findMany();
  }
  findOne(id: string) {
    return this.prisma.postEdit.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updatePostEditDto: UpdatePostEditDto) {
    return this.prisma.postEdit.update({
      where: { id: BigInt(id) } as any,
      data: updatePostEditDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.postEdit.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
