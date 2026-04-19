import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  create(createNotificationDto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: createNotificationDto as any,
    });
  }

  findAll() {
    return this.prisma.notification.findMany();
  }
  findOne(id: string) {
    return this.prisma.notification.findUnique({
      where: { id: BigInt(id) } as any,
    });
  }

  update(id: string, updateNotificationDto: UpdateNotificationDto) {
    return this.prisma.notification.update({
      where: { id: BigInt(id) } as any,
      data: updateNotificationDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.notification.delete({
      where: { id: BigInt(id) } as any,
    });
  }
}
