
import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class WhatToDoNowRequestDto {
  @IsOptional()
  @IsString()
  currentTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  customAvailableMinutes?: number;

  @IsOptional()
  @IsArray()
  tasks?: any[];

  @IsOptional()
  @IsArray()
  schedule?: any[];

  @IsOptional()
  @IsArray()
  habits?: any[];

  @IsOptional()
  @IsArray()
  studyGoals?: any[];
}

export interface RecommendedTaskDto {
  id?: string | null;
  title: string;
  reason: string;
  estimatedDuration: string;
  priority: string;
  category: string;
  description?: string | null;
  subtasks?: string[];
}

export interface NextTaskDto {
  title: string;
  estimatedDuration: string;
  reason: string;
}

export interface ScheduleConflictDto {
  type: string;
  description: string;
  severity: string;
}

export interface WhatToDoNowResponseDto {
  success: boolean;
  availableTimeMinutes: number;
  availableTimeFormatted: string;
  recommendedTask: RecommendedTaskDto;
  reason: string;
  estimatedDuration: string;
  priority: string;
  nextTask: NextTaskDto;
  conflicts: ScheduleConflictDto[];
  summaryText: string;
  providerUsed: string;
  autoMutated: boolean; // Confirms safety rule: no automatic mutation without explicit user confirmation
}
