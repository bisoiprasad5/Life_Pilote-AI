import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';
import { PriorityLevel, TaskCategoryType, RecurrenceIntervalType } from '../../tasks/dto/create-task.dto';

export class ValidatedTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Task title cannot be empty' })
  @MaxLength(300, { message: 'Task title cannot exceed 300 characters' })
  title: string;

  @IsOptional()
  @IsString()
  date?: string | null;

  @IsOptional()
  @IsString()
  time?: string | null;

  @IsOptional()
  @IsString()
  startTime?: string | null;

  @IsOptional()
  @IsString()
  endTime?: string | null;

  @IsOptional()
  @IsInt({ message: 'Duration must be an integer number of minutes' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(1440, { message: 'Duration cannot exceed 1440 minutes (24 hours)' })
  duration?: number | null;

  @IsEnum(TaskCategoryType, {
    message: 'Category must be one of: STUDY, WORK, PERSONAL, HEALTH, FITNESS, FINANCE, OTHER',
  })
  category: TaskCategoryType = TaskCategoryType.OTHER;

  @IsEnum(PriorityLevel, {
    message: 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL',
  })
  priority: PriorityLevel = PriorityLevel.MEDIUM;

  @IsOptional()
  @IsBoolean()
  isRecurring: boolean = false;

  @IsOptional()
  @IsEnum(RecurrenceIntervalType)
  recurrenceInterval?: RecurrenceIntervalType | null;

  @IsOptional()
  @IsString()
  recurrenceRule?: string | null;

  @IsOptional()
  @IsString()
  deadline?: string | null;

  @IsOptional()
  @IsString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];
}
