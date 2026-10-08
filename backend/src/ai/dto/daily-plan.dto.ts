import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DailyPlanSlotDto {
  @IsString()
  id: string;

  @IsString()
  slotType: string; // TASK, CALENDAR_EVENT, HABIT, STUDY_SESSION, BREAK, LUNCH_BREAK, REVIEW

  @IsOptional()
  @IsString()
  taskId?: string | null;

  @IsString()
  title: string;

  @IsString()
  startTime: string; // HH:MM

  @IsString()
  endTime: string; // HH:MM

  @IsNumber()
  durationMinutes: number;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isFixed?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  deadline?: string | null;

  @IsOptional()
  @IsString()
  status?: string;
}

export class TaskChangeDto {
  @IsString()
  taskId: string;

  @IsString()
  taskTitle: string;

  @IsString()
  changeType: string; // SCHEDULED, RESCHEDULED, DURATION_ADJUSTED, UNCHANGED, POSTPONED

  @IsOptional()
  @IsString()
  previousStartTime?: string | null;

  @IsOptional()
  @IsString()
  newStartTime?: string | null;

  @IsOptional()
  @IsString()
  previousEndTime?: string | null;

  @IsOptional()
  @IsString()
  newEndTime?: string | null;

  @IsOptional()
  @IsString()
  deadline?: string | null; // Strictly preserved

  @IsString()
  reason: string;
}

export class GenerateDailyPlanDto {
  @IsOptional()
  @IsString()
  targetDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  currentTime?: string; // ISO

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  tasks?: any[];

  @IsOptional()
  @IsArray()
  missedTasks?: any[];

  @IsOptional()
  @IsArray()
  calendarEvents?: any[];

  @IsOptional()
  @IsArray()
  habits?: any[];

  @IsOptional()
  @IsArray()
  studyGoals?: any[];

  @IsOptional()
  @IsObject()
  userPreferences?: any;

  @IsOptional()
  @IsObject()
  previousProductivity?: any;
}

export class ApplyDailyPlanDto {
  @IsString()
  targetDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DailyPlanSlotDto)
  slots: DailyPlanSlotDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskChangeDto)
  changes?: TaskChangeDto[];
}

export interface DailyPlanResponseDto {
  success: boolean;
  date: string;
  totalAvailableMinutes: number;
  scheduledTaskMinutes: number;
  breakMinutes: number;
  fixedEventMinutes: number;
  productivityScoreExpected: number;
  slots: DailyPlanSlotDto[];
  changes: TaskChangeDto[];
  warnings: string[];
  summary: string;
  deadlinesPreserved: boolean;
  providerUsed: string;
}
