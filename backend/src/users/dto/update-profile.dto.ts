import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  energyLevel?: number;

  @IsOptional()
  @IsBoolean()
  morningBriefingEnabled?: boolean;

  @IsOptional()
  @IsString()
  morningBriefingTime?: string;

  @IsOptional()
  @IsBoolean()
  nightReviewEnabled?: boolean;

  @IsOptional()
  @IsString()
  nightReviewTime?: string;

  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(10000)
  dailyWaterTargetMl?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  defaultPomodoroLength?: number;
}
