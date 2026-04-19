import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [BlockController],
  providers: [BlockService, PrismaService],
})
export class BlockModule {}
