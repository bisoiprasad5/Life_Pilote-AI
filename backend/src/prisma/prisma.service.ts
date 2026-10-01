import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Lazy connect on startup or when queries occur
    try {
      await this.$connect();
      console.log('✅ PostgreSQL Database connected successfully via Prisma');
    } catch (error) {
      console.warn('⚠️ PostgreSQL connection deferred (database offline or starting up)');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
