import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsQueueService } from './services/notifications-queue.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsQueueService,
    NotificationsGateway,
  ],
  exports: [
    NotificationsService,
    NotificationsQueueService,
    NotificationsGateway,
  ],
})
export class NotificationsModule {}
