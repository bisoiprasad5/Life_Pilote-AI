import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSubTaskDto } from './subtask.dto';

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskCategoryType {
  STUDY = 'STUDY',
  WORK = 'WORK',
  PERSONAL = 'PERSONAL',
  HEALTH = 'HEALTH',
  FITNESS = 'FITNESS',
  FINANCE = 'FINANCE',
  OTHER = 'OTHER',
}

export enum TaskStatusType {
  TODO = 'TODO',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum RecurrenceIntervalType {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export class RecurringScheduleDto {
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(RecurrenceIntervalType)
  interval?: RecurrenceIntervalType;

  @IsOptional()
  @IsString()
  rule?: string;
}

export class ReminderDto {
  @IsOptional()
  @IsDateString()
  triggerTime?: string;

  @IsOptional()
  @IsString()
  channel?: 'IN_APP' | 'PUSH' | 'EMAIL';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Task title is required' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(PriorityLevel, {
    message: 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL',
  })
  priority?: PriorityLevel = PriorityLevel.MEDIUM;

  @IsOptional()
  @IsEnum(TaskCategoryType, {
    message: 'Category must be one of: STUDY, WORK, PERSONAL, HEALTH, FITNESS, FINANCE, OTHER',
  })
  category?: TaskCategoryType = TaskCategoryType.OTHER;

  @IsOptional()
  @IsEnum(TaskStatusType, {
    message: 'Status must be one of: TODO, PENDING, IN_PROGRESS, COMPLETED, CANCELLED, ARCHIVED',
  })
  status?: TaskStatusType = TaskStatusType.TODO;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Estimated duration must be a positive integer in minutes' })
  estimatedDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedMinutes?: number;

  @IsOptional()
  recurringSchedule?: RecurringScheduleDto | string;

  @IsOptional()
  reminder?: ReminderDto | string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubTaskDto)
  subtasks?: CreateSubTaskDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
