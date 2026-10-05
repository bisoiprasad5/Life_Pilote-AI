import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';

export enum EventCategoryType {
  EVENT = 'EVENT',
  WORK = 'WORK',
  STUDY = 'STUDY',
  MEAL = 'MEAL',
  HABIT = 'HABIT',
  DEADLINE = 'DEADLINE',
  OTHER = 'OTHER',
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string; // ISO 8601 string

  @IsDateString()
  @IsNotEmpty()
  endTime: string; // ISO 8601 string

  @IsBoolean()
  @IsOptional()
  isAllDay?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsEnum(EventCategoryType)
  @IsOptional()
  category?: EventCategoryType;
}
