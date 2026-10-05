import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { EventCategoryType } from './create-event.dto';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

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
