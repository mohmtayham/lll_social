import { Module } from '@nestjs/common';
import { PostAllowedUserService } from './post-allowed-user.service';
import { PostAllowedUserController } from './post-allowed-user.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PostAllowedUserController],
  providers: [PostAllowedUserService, PrismaService],
})
export class PostAllowedUserModule {}
