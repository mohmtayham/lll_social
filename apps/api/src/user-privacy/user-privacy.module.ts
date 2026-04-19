import { Module } from '@nestjs/common';
import { UserPrivacyService } from './user-privacy.service';
import { UserPrivacyController } from './user-privacy.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [UserPrivacyController],
  providers: [UserPrivacyService, PrismaService],
})
export class UserPrivacyModule {}
