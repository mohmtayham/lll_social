import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserInteractionDto } from './dto/create-user-interaction.dto';
import { UpdateUserInteractionDto } from './dto/update-user-interaction.dto';

@Injectable()
export class UserInteractionService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUserInteractionDto: CreateUserInteractionDto) {
    return this.prisma.userInteraction.create({
      data: createUserInteractionDto as any,
    });
  }

  findAll() {
    return this.prisma.userInteraction.findMany();
  }
  findOne(id: string) {
    return this.prisma.userInteraction.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateUserInteractionDto: UpdateUserInteractionDto) {
    return this.prisma.userInteraction.update({
      where: { id: BigInt(id) } as any,
      data: updateUserInteractionDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.userInteraction.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
