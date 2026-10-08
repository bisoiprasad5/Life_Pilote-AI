import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import {
  NotificationCategory,
  NotificationTiming,
} from '../notifications.constants';

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(NotificationCategory)
  @IsNotEmpty()
  category: NotificationCategory;

  @IsOptional()
  @IsEnum(NotificationTiming)
  timing?: NotificationTiming;

  @IsOptional()
  @IsDateString()
  targetTime?: string;

  @IsOptional()
  @IsDateString()
  triggerTime?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  calendarEventId?: string;

  @IsOptional()
  @IsString()
  examId?: string;

  @IsOptional()
  @IsString()
  habitId?: string;

  @IsOptional()
  @IsString()
  goalId?: string;

  @IsOptional()
  @IsString()
  mealId?: string;

  @IsOptional()
  @IsString()
  studyPlanId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  repeatIntervalMinutes?: number;
}
