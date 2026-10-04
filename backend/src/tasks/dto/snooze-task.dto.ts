import { IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class SnoozeTaskDto {
  @IsOptional()
  @IsInt({ message: 'Snooze minutes must be an integer' })
  @Min(1, { message: 'Snooze minutes must be at least 1' })
  minutes?: number;

  @IsOptional()
  @IsDateString({}, { message: 'until must be a valid ISO 8601 date string' })
  until?: string;
}
