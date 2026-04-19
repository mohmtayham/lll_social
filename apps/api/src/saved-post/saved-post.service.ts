import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSavedPostDto } from './dto/create-saved-post.dto';
import { UpdateSavedPostDto } from './dto/update-saved-post.dto';

@Injectable()
export class SavedPostService {
  constructor(private readonly prisma: PrismaService) {}

  create(createSavedPostDto: CreateSavedPostDto) {
    return this.prisma.savedPost.create({
      data: createSavedPostDto as any,
    });
  }

  findAll() {
    return this.prisma.savedPost.findMany();
  }
  findOne(id: string) {
    return this.prisma.savedPost.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateSavedPostDto: UpdateSavedPostDto) {
    return this.prisma.savedPost.update({
      where: { id: BigInt(id) } as any,
      data: updateSavedPostDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.savedPost.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
