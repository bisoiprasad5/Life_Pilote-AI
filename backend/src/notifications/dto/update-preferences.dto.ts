import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { NotificationTiming } from '../notifications.constants';

export class UpdateNotificationPreferencesDto {
  // Channels
  @IsOptional()
  @IsBoolean()
  browserEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  // Notification categories
  @IsOptional()
  @IsBoolean()
  upcomingTask?: boolean;

  @IsOptional()
  @IsBoolean()
  taskStarting?: boolean;

  @IsOptional()
  @IsBoolean()
  overdueTask?: boolean;

  @IsOptional()
  @IsBoolean()
  deadlineApproaching?: boolean;

  @IsOptional()
  @IsBoolean()
  habitReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  waterReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  mealReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  studyReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  examReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  goalReminder?: boolean;

  // Timing defaults
  @IsOptional()
  @IsEnum(NotificationTiming)
  defaultTiming?: NotificationTiming;

  // Quiet hours
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursStart must be in HH:mm format (e.g. "22:00")',
  })
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'quietHoursEnd must be in HH:mm format (e.g. "07:00")',
  })
  quietHoursEnd?: string;
}
