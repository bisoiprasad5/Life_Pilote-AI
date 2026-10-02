import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isConnected = false;

  async onModuleInit() {
    // Lazy connect on startup or when queries occur
    try {
      await this.$connect();
      this.isConnected = true;
      console.log('✅ PostgreSQL Database connected successfully via Prisma');
    } catch (error) {
      this.isConnected = false;
      console.warn('⚠️ PostgreSQL connection deferred (database offline or starting up)');
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
