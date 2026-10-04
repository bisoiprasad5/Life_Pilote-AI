import { IsOptional, IsBoolean } from 'class-validator';

export class CompleteTaskDto {
  @IsOptional()
  @IsBoolean()
  completed?: boolean = true;
}
