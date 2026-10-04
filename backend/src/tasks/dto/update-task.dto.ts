import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PriorityLevel,
  TaskCategoryType,
  TaskStatusType,
  RecurringScheduleDto,
  ReminderDto,
} from './create-task.dto';
import { CreateSubTaskDto } from './subtask.dto';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Task title cannot be empty' })
  title?: string;

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
  priority?: PriorityLevel;

  @IsOptional()
  @IsEnum(TaskCategoryType, {
    message: 'Category must be one of: STUDY, WORK, PERSONAL, HEALTH, FITNESS, FINANCE, OTHER',
  })
  category?: TaskCategoryType;

  @IsOptional()
  @IsEnum(TaskStatusType, {
    message: 'Status must be one of: TODO, PENDING, IN_PROGRESS, COMPLETED, CANCELLED, ARCHIVED',
  })
  status?: TaskStatusType;

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
