import { Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [FriendshipController],
  providers: [FriendshipService, PrismaService],
})
export class FriendshipModule {}
