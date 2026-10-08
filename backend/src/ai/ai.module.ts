import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiSanitizerService } from './ai-sanitizer.service';
import { AiPlannerService } from './ai-planner.service';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { CalendarModule } from '../calendar/calendar.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    TasksModule,
    UsersModule,
    CalendarModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_lifepilot_2026',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiSanitizerService, AiPlannerService],
  exports: [AiService, AiSanitizerService, AiPlannerService],
})
export class AiModule {}
