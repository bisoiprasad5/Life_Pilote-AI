import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidatedTaskDto } from './dto/validated-task.dto';
import {
  CreateTaskDto,
  PriorityLevel,
  TaskCategoryType,
  RecurrenceIntervalType,
} from '../tasks/dto/create-task.dto';

@Injectable()
export class AiSanitizerService {
  private readonly logger = new Logger(AiSanitizerService.name);

  /**
   * Strictly validates and sanitizes raw AI microservice output.
   * Guarantees that unvalidated, rogue, or malicious LLM output NEVER touches the database.
   */
  async validateAndSanitize(rawAiOutput: any): Promise<ValidatedTaskDto> {
    if (!rawAiOutput || typeof rawAiOutput !== 'object') {
      throw new BadRequestException('Invalid AI response: Expected a structured JSON object');
    }

    const rawTask = rawAiOutput.task || rawAiOutput;
    if (!rawTask || typeof rawTask !== 'object') {
      throw new BadRequestException('Invalid AI response: Missing task payload');
    }

    // 1. Sanitize Title (strip script tags, HTML tags, limit length, fallback if empty)
    let sanitizedTitle = typeof rawTask.title === 'string' ? rawTask.title : '';
    sanitizedTitle = sanitizedTitle
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/[\r\n\t]+/g, ' ') // Strip newlines and tabs
      .trim();

    if (!sanitizedTitle) {
      sanitizedTitle = 'New Parsed Task';
    }
    if (sanitizedTitle.length > 300) {
      sanitizedTitle = sanitizedTitle.substring(0, 300).trim();
    }

    // 2. Validate and Normalize Category
    let category = TaskCategoryType.OTHER;
    if (rawTask.category && typeof rawTask.category === 'string') {
      const catUpper = rawTask.category.toUpperCase().trim();
      if (Object.values(TaskCategoryType).includes(catUpper as TaskCategoryType)) {
        category = catUpper as TaskCategoryType;
      }
    }

    // 3. Validate and Normalize Priority
    let priority = PriorityLevel.MEDIUM;
    if (rawTask.priority && typeof rawTask.priority === 'string') {
      const prioUpper = rawTask.priority.toUpperCase().trim();
      if (Object.values(PriorityLevel).includes(prioUpper as PriorityLevel)) {
        priority = prioUpper as PriorityLevel;
      }
    }

    // 4. Validate and Normalize Date (YYYY-MM-DD or valid date string)
    let sanitizedDate: string | null = null;
    const rawDate = rawTask.date || rawTask.dueDate;
    if (rawDate && typeof rawDate === 'string') {
      const dateParsed = new Date(rawDate);
      if (!isNaN(dateParsed.getTime())) {
        // Output YYYY-MM-DD
        sanitizedDate = dateParsed.toISOString().split('T')[0];
      }
    }

    // 5. Validate and Normalize Time (HH:MM)
    let sanitizedTime: string | null = null;
    const rawTime = rawTask.time || rawTask.startTime;
    if (rawTime && typeof rawTime === 'string') {
      const timeMatch = rawTime.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2], 10);
        sanitizedTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }
    }

    // 6. Validate and Normalize Duration
    let sanitizedDuration: number | null = null;
    if (rawTask.duration !== undefined && rawTask.duration !== null) {
      const parsedDuration = parseInt(String(rawTask.duration), 10);
      if (!isNaN(parsedDuration) && parsedDuration > 0) {
        // Clamp to 24 hours maximum (1440 minutes)
        sanitizedDuration = Math.min(Math.max(parsedDuration, 1), 1440);
      }
    }

    // 7. Calculate or Validate End Time
    let sanitizedEndTime: string | null = null;
    if (rawTask.endTime && typeof rawTask.endTime === 'string') {
      const endMatch = rawTask.endTime.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (endMatch) {
        sanitizedEndTime = rawTask.endTime.trim();
      }
    } else if (sanitizedTime && sanitizedDuration) {
      const [h, m] = sanitizedTime.split(':').map(Number);
      const totalMinutes = h * 60 + m + sanitizedDuration;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      sanitizedEndTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }

    // 8. Validate Recurrence
    let isRecurring = Boolean(rawTask.isRecurring);
    let recurrenceInterval: RecurrenceIntervalType | null = null;
    if (rawTask.recurrenceInterval && typeof rawTask.recurrenceInterval === 'string') {
      const intUpper = rawTask.recurrenceInterval.toUpperCase().trim();
      if (Object.values(RecurrenceIntervalType).includes(intUpper as RecurrenceIntervalType)) {
        recurrenceInterval = intUpper as RecurrenceIntervalType;
        if (recurrenceInterval !== RecurrenceIntervalType.NONE) {
          isRecurring = true;
        }
      }
    }

    // 9. Validate Deadline
    let sanitizedDeadline: string | null = null;
    if (rawTask.deadline && typeof rawTask.deadline === 'string') {
      const dlParsed = new Date(rawTask.deadline);
      if (!isNaN(dlParsed.getTime())) {
        sanitizedDeadline = dlParsed.toISOString();
      }
    }

    // 10. Validate Notes
    let sanitizedNotes: string | null = null;
    if (rawTask.notes && typeof rawTask.notes === 'string') {
      sanitizedNotes = rawTask.notes.replace(/<[^>]*>/g, '').trim().substring(0, 2000);
    }

    // 11. Validate Tags
    let sanitizedTags: string[] = [];
    if (Array.isArray(rawTask.tags)) {
      sanitizedTags = rawTask.tags
        .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '').substring(0, 30))
        .filter((t: string) => t.length > 0)
        .slice(0, 10);
    }

    // Assemble candidate object
    const candidateData: ValidatedTaskDto = {
      title: sanitizedTitle,
      date: sanitizedDate,
      time: sanitizedTime,
      startTime: sanitizedTime,
      endTime: sanitizedEndTime,
      duration: sanitizedDuration,
      category,
      priority,
      isRecurring,
      recurrenceInterval,
      recurrenceRule: typeof rawTask.recurrenceRule === 'string' ? rawTask.recurrenceRule.substring(0, 100) : null,
      deadline: sanitizedDeadline,
      dueDate: sanitizedDate,
      notes: sanitizedNotes,
      tags: sanitizedTags,
    };

    // Instantiate class-validator DTO and enforce strict schema
    const instance = plainToInstance(ValidatedTaskDto, candidateData);
    const errors: ValidationError[] = await validate(instance);

    if (errors.length > 0) {
      this.logger.warn(`Task validation issues detected from AI output: ${JSON.stringify(errors)}`);
      // Clean any fields that failed validation
      for (const err of errors) {
        if (err.property === 'duration') instance.duration = null;
        if (err.property === 'category') instance.category = TaskCategoryType.OTHER;
        if (err.property === 'priority') instance.priority = PriorityLevel.MEDIUM;
      }
    }

    return instance;
  }

  /**
   * Safely transforms a validated task DTO into CreateTaskDto ready for database persistence.
   */
  toCreateTaskDto(validated: ValidatedTaskDto): CreateTaskDto {
    const dto = new CreateTaskDto();
    dto.title = validated.title;
    dto.description = validated.notes || undefined;
    dto.category = validated.category;
    dto.priority = validated.priority;
    dto.status = undefined; // defaults to TODO
    dto.date = validated.date ? new Date(validated.date).toISOString() : undefined;
    dto.dueDate = validated.dueDate ? new Date(validated.dueDate).toISOString() : undefined;
    dto.startTime = validated.startTime || undefined;
    dto.endTime = validated.endTime || undefined;
    dto.estimatedDuration = validated.duration || undefined;
    dto.estimatedMinutes = validated.duration || undefined;
    dto.deadline = validated.deadline || undefined;
    dto.tags = validated.tags;

    if (validated.isRecurring && validated.recurrenceInterval) {
      dto.recurringSchedule = {
        isRecurring: true,
        interval: validated.recurrenceInterval,
        rule: validated.recurrenceRule || undefined,
      };
    }

    return dto;
  }
}
