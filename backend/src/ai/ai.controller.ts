import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiPlannerService } from './ai-planner.service';
import { ParseTaskRequestDto } from './dto/parse-task-request.dto';
import { WhatToDoNowRequestDto } from './dto/what-to-do-now.dto';
import { GenerateDailyPlanDto, ApplyDailyPlanDto } from './dto/daily-plan.dto';
import { Public } from '../auth/decorators/public.decorator';
import { UserService } from '../users/user.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiPlannerService: AiPlannerService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  /**
   * POST /api/ai/task-parser or POST /api/v1/ai/task-parser
   *
   * Parses natural language user input into structured task information.
   * Extracts:
   * - Dates & Times
   * - Duration
   * - Category (STUDY, WORK, PERSONAL, HEALTH, FITNESS, FINANCE, OTHER)
   * - Priority (LOW, MEDIUM, HIGH, CRITICAL)
   * - Recurrence (DAILY, WEEKLY, etc.)
   * - Deadlines
   *
   * Validates AI output before returning or performing any database mutations.
   * If autoCreate=true, creates task in the user's database record.
   */
  @Post('task-parser')
  @Public() // Allows parsing preview while gracefully extracting authenticated user if session exists
  @HttpCode(HttpStatus.OK)
  async parseTask(@Req() req: Request, @Body() dto: ParseTaskRequestDto) {
    const userId = await this.resolveUserId(req);

    if (dto.autoCreate && !userId) {
      throw new UnauthorizedException(
        'Authentication required to automatically save parsed tasks to your account',
      );
    }

    const result = await this.aiService.parseTask(userId || '', dto);
    return {
      success: true,
      intent: result.intent,
      task: result.task,
      autoCreated: result.autoCreated,
      createdTask: result.createdTask,
      providerUsed: result.providerUsed,
      confidence: result.confidence,
    };
  }

  /**
   * POST /api/ai/what-to-do-now or POST /api/v1/ai/what-to-do-now
   *
   * STEP 12: "What should I do now?"
   * Synthesizes user time, today's schedule, pending tasks, deadlines, priorities,
   * available free time, habits/study goals, and conflicts to deliver an AI recommendation.
   *
   * Crucial safety constraint:
   * Does NOT create or modify tasks automatically without user confirmation.
   */
  @Post('what-to-do-now')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getWhatToDoNowPost(@Req() req: Request, @Body() dto: WhatToDoNowRequestDto) {
    const userId = await this.resolveUserId(req);
    return await this.aiPlannerService.planNextAction(userId, dto || {});
  }

  /**
   * GET /api/ai/what-to-do-now or GET /api/v1/ai/what-to-do-now
   */
  @Get('what-to-do-now')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getWhatToDoNowGet(@Req() req: Request, @Query() query: any) {
    const userId = await this.resolveUserId(req);
    const dto: WhatToDoNowRequestDto = {
      currentTime: query?.currentTime,
      timezone: query?.timezone,
      customAvailableMinutes: query?.availableMinutes
        ? parseInt(query.availableMinutes, 10)
        : undefined,
    };
    return await this.aiPlannerService.planNextAction(userId, dto);
  }

  /**
   * POST /api/ai/daily-plan/generate or POST /api/v1/ai/daily-plan/generate
   *
   * STEP 13: AI Daily Planner
   * Synthesizes 10 factors:
   * - Tasks
   * - Deadlines
   * - Priorities
   * - Available time
   * - Calendar
   * - Habits
   * - Study goals
   * - User preferences
   * - Previous productivity
   * - Missed tasks
   *
   * Generates an optimized, collision-free schedule with breaks and deadline preservation.
   */
  @Post('daily-plan/generate')
  @Public()
  @HttpCode(HttpStatus.OK)
  async generateDailyPlan(@Req() req: Request, @Body() dto: GenerateDailyPlanDto) {
    const userId = await this.resolveUserId(req);
    return await this.aiPlannerService.generateDailyPlan(userId, dto || {});
  }

  @Post('daily-plan')
  @Public()
  @HttpCode(HttpStatus.OK)
  async generateDailyPlanAlias(@Req() req: Request, @Body() dto: GenerateDailyPlanDto) {
    const userId = await this.resolveUserId(req);
    return await this.aiPlannerService.generateDailyPlan(userId, dto || {});
  }

  /**
   * POST /api/ai/daily-plan/apply or POST /api/v1/ai/daily-plan/apply
   *
   * Applies the approved schedule to tasks.
   * Safety Guarantee: Never silently modifies important deadlines!
   */
  @Post('daily-plan/apply')
  @Public()
  @HttpCode(HttpStatus.OK)
  async applyDailyPlan(@Req() req: Request, @Body() dto: ApplyDailyPlanDto) {
    const userId = await this.resolveUserId(req);
    return await this.aiPlannerService.applyDailyPlan(userId, dto);
  }

  /**
   * GET /api/ai/providers
   * Returns active and configured AI providers.
   */
  @Get('providers')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getProviders() {
    return await this.aiService.getProviders();
  }

  /**
   * Helper to extract userId from cookies or Authorization Bearer header if available.
   */
  private async resolveUserId(req: Request): Promise<string | null> {
    if ((req as any).user?.id) {
      return (req as any).user.id;
    }

    let token: string | null = null;
    if ((req as any).cookies?.lifepilot_session) {
      token = (req as any).cookies.lifepilot_session;
    } else if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7).trim();
    }

    if (!token) return null;

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') || 'super_secret_jwt_key_lifepilot_2026';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      if (payload?.sub) {
        const user = await this.userService.findById(payload.sub);
        return user ? user.id : null;
      }
    } catch {
      // Ignore token verification errors during optional resolution
    }
    return null;
  }
}
