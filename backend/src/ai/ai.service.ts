import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParseTaskRequestDto } from './dto/parse-task-request.dto';
import { ValidatedTaskDto } from './dto/validated-task.dto';
import { AiSanitizerService } from './ai-sanitizer.service';
import { TasksService } from '../tasks/tasks.service';

export interface TaskParserResult {
  success: boolean;
  intent: string;
  task: ValidatedTaskDto;
  autoCreated: boolean;
  createdTask?: any;
  providerUsed: string;
  rawInput: string;
  confidence?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly sanitizerService: AiSanitizerService,
    private readonly tasksService: TasksService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      process.env.AI_SERVICE_URL ||
      'http://localhost:8000';
  }

  /**
   * Main entry point for parsing natural language tasks.
   * Invokes Python FastAPI microservice, validates structured output,
   * and optionally saves to database via TasksService.
   */
  async parseTask(userId: string, dto: ParseTaskRequestDto): Promise<TaskParserResult> {
    const rawText = dto.getInputText();
    if (!rawText) {
      throw new BadRequestException('Task input text cannot be empty');
    }

    const payload = {
      text: rawText,
      timezone: dto.timezone || 'UTC',
      referenceDate: dto.referenceDate || new Date().toISOString(),
    };

    let rawAiResponse: any;

    try {
      this.logger.log(`Forwarding parse task request to AI microservice at ${this.aiServiceUrl}`);
      const response = await fetch(`${this.aiServiceUrl}/api/v1/parse-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`AI Microservice returned error ${response.status}: ${errorText}`);
        throw new Error(`AI Service HTTP error ${response.status}: ${errorText}`);
      }

      rawAiResponse = await response.json();
    } catch (err: any) {
      this.logger.error(`Failed to connect to AI microservice: ${err.message}`);
      throw new InternalServerErrorException(
        `AI task parsing service is currently unavailable. Please verify the AI microservice is running. (${err.message})`,
      );
    }

    // MANDATORY BACKEND VALIDATION:
    // Strictly validate and sanitize AI output before returning or persisting
    const validatedTask: ValidatedTaskDto = await this.sanitizerService.validateAndSanitize(
      rawAiResponse,
    );

    let createdTask = null;
    let autoCreated = false;

    // If autoCreate is requested and user is authenticated, create task in DB
    if (dto.autoCreate && userId) {
      this.logger.log(`Auto-creating task in database for user ${userId}: "${validatedTask.title}"`);
      const createTaskDto = this.sanitizerService.toCreateTaskDto(validatedTask);
      createdTask = await this.tasksService.create(userId, createTaskDto);
      autoCreated = true;
    }

    return {
      success: true,
      intent: rawAiResponse.intent || 'CREATE_TASK',
      task: validatedTask,
      autoCreated,
      createdTask,
      providerUsed: rawAiResponse.providerUsed || 'ai_service',
      rawInput: rawText,
      confidence: rawAiResponse.confidence ?? 0.95,
    };
  }

  /**
   * Health and provider discovery from AI microservice
   */
  async getProviders(): Promise<any> {
    try {
      const resp = await fetch(`${this.aiServiceUrl}/api/v1/providers`);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (err: any) {
      this.logger.warn(`Could not fetch providers from AI service: ${err.message}`);
    }
    return {
      status: 'offline',
      serviceUrl: this.aiServiceUrl,
    };
  }
}
