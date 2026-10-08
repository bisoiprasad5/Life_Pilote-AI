import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { NotificationCategory } from '../notifications.constants';

export class CreateRecurringReminderDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(NotificationCategory)
  @IsNotEmpty()
  category: NotificationCategory; // HABIT_REMINDER, WATER_REMINDER, MEAL_REMINDER, etc.

  @IsOptional()
  @IsInt()
  @Min(1)
  intervalMinutes?: number = 120; // e.g. every 2 hours for water

  @IsOptional()
  @IsString()
  cronExpression?: string; // e.g. "0 9 * * *" for 9:00 AM daily

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  entityId?: string;
}
