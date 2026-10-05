import { IsOptional, IsDateString, IsString } from 'class-validator';

export class QueryEventsDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
