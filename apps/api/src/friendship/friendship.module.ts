import { Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationModule } from 'src/notification/notification.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    NotificationModule,
    BullModule.registerQueue({
      name: 'graph-sync',
      prefix: 'bull:{graph-sync}',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [FriendshipController],
  providers: [FriendshipService, PrismaService],
})
export class FriendshipModule {}
