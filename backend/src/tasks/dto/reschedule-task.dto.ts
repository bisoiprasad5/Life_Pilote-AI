import { IsOptional, IsString, IsDateString } from 'class-validator';

export class RescheduleTaskDto {
  @IsOptional()
  @IsDateString({}, { message: 'date must be a valid ISO date string' })
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsDateString({}, { message: 'deadline must be a valid ISO date string' })
  deadline?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dueDate must be a valid ISO date string' })
  dueDate?: string;
}
