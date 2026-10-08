import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class ParseTaskRequestDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  referenceDate?: string;

  @IsOptional()
  @IsBoolean()
  autoCreate?: boolean = false;

  // Helper getter to normalize text / prompt
  getInputText(): string {
    const raw = this.text || this.prompt || '';
    return raw.trim();
  }
}
