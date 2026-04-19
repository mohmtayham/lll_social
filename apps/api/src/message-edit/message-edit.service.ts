import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageEditDto } from './dto/create-message-edit.dto';
import { UpdateMessageEditDto } from './dto/update-message-edit.dto';

@Injectable()
export class MessageEditService {
  constructor(private readonly prisma: PrismaService) {}

  create(createMessageEditDto: CreateMessageEditDto) {
    return this.prisma.messageEdit.create({
      data: createMessageEditDto as any,
    });
  }

  findAll() {
    return this.prisma.messageEdit.findMany();
  }
  findOne(id: string) {
    return this.prisma.messageEdit.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateMessageEditDto: UpdateMessageEditDto) {
    return this.prisma.messageEdit.update({
      where: { id: BigInt(id) } as any,
      data: updateMessageEditDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.messageEdit.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
