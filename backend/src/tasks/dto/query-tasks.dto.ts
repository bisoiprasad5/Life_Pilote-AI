import { IsOptional, IsEnum, IsInt, Min, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PriorityLevel, TaskCategoryType, TaskStatusType } from './create-task.dto';

export enum SortByOption {
  CREATED_AT = 'createdAt',
  DATE = 'date',
  DUE_DATE = 'dueDate',
  DEADLINE = 'deadline',
  PRIORITY = 'priority',
  TITLE = 'title',
  STATUS = 'status',
}

export enum SortOrderOption {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryTasksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(TaskStatusType)
  status?: TaskStatusType;

  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @IsOptional()
  @IsEnum(TaskCategoryType)
  category?: TaskCategoryType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SortByOption)
  sortBy?: SortByOption = SortByOption.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrderOption)
  sortOrder?: SortOrderOption = SortOrderOption.DESC;
}
