import { Module } from '@nestjs/common';
import { UserFeedCacheService } from './user-feed-cache.service';
import { UserFeedCacheController } from './user-feed-cache.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [UserFeedCacheController],
  providers: [UserFeedCacheService, PrismaService],
})
export class UserFeedCacheModule {}
