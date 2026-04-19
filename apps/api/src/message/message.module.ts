import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationModule } from 'src/conversation/conversation.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [ConversationModule, JwtModule.register({}), ConfigModule],
  controllers: [MessageController],
  providers: [MessageService, PrismaService, ChatGateway],
  exports: [MessageService],
})
export class MessageModule {}
