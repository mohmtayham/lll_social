import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
// import { inspect } from 'util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static instance: PrismaService;
  private static isConnected = false;

  constructor() {
    if (PrismaService.instance) {
      return PrismaService.instance;
    }

    super();
    PrismaService.instance = this;
  }

  async onModuleInit() {
    if (!PrismaService.isConnected) {
      await this.$connect();
      PrismaService.isConnected = true;
    }
  }

  async onModuleDestroy() {
    if (PrismaService.isConnected) {
      await this.$disconnect();
      PrismaService.isConnected = false;
    }
  }

  // [inspect.custom](): string {
  //   return 'PrismaService';
  // }

  // toJSON(): string {
  //   return 'PrismaService';
  // }
}