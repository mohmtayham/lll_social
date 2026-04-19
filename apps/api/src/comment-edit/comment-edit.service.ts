import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentEditDto } from './dto/create-comment-edit.dto';
import { UpdateCommentEditDto } from './dto/update-comment-edit.dto';

@Injectable()
export class CommentEditService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCommentEditDto: CreateCommentEditDto) {
    return this.prisma.commentEdit.create({
      data: createCommentEditDto as any,
    });
  }

  findAll() {
    return this.prisma.commentEdit.findMany();
  }
  findOne(id: string) {
    return this.prisma.commentEdit.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateCommentEditDto: UpdateCommentEditDto) {
    return this.prisma.commentEdit.update({
      where: { id: BigInt(id) } as any,
      data: updateCommentEditDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.commentEdit.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
