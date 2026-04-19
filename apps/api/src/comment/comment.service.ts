import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCommentDto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: createCommentDto as any,
    });
  }

  findAll() {
    return this.prisma.comment.findMany();
  }
  findOne(id: string) {
    return this.prisma.comment.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateCommentDto: UpdateCommentDto) {
    return this.prisma.comment.update({
      where: { id: BigInt(id) } as any,
      data: updateCommentDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.comment.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
