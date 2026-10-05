import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // 1. GET /api/v1/calendar/events - List user calendar events
  @Get('events')
  @HttpCode(HttpStatus.OK)
  async getEvents(
    @CurrentUser('id') userId: string,
    @Query() query: QueryEventsDto,
  ) {
    const events = await this.calendarService.findAll(userId, query);
    return {
      success: true,
      data: events,
    };
  }

  // 2. POST /api/v1/calendar/events - Create new event
  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEventDto,
  ) {
    const event = await this.calendarService.create(userId, dto);
    return {
      success: true,
      message: 'Event created successfully',
      data: event,
    };
  }

  // 3. GET /api/v1/calendar/events/:id - Get single event
  @Get('events/:id')
  @HttpCode(HttpStatus.OK)
  async getEvent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const event = await this.calendarService.findById(userId, id);
    return {
      success: true,
      data: event,
    };
  }

  // 4. PUT /api/v1/calendar/events/:id - Update event
  @Put('events/:id')
  @HttpCode(HttpStatus.OK)
  async updateEvent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    const updated = await this.calendarService.update(userId, id, dto);
    return {
      success: true,
      message: 'Event updated successfully',
      data: updated,
    };
  }

  // 5. DELETE /api/v1/calendar/events/:id - Delete event
  @Delete('events/:id')
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const res = await this.calendarService.delete(userId, id);
    return {
      success: true,
      message: res.message,
    };
  }

  // 6. GET /api/v1/calendar/schedule - Unified schedule (Events, Tasks, Deadlines, Study, Meals, Habits)
  @Get('schedule')
  @HttpCode(HttpStatus.OK)
  async getSchedule(
    @CurrentUser('id') userId: string,
    @Query() query: QueryEventsDto,
  ) {
    const schedule = await this.calendarService.getUnifiedSchedule(userId, query);
    return {
      success: true,
      data: schedule.items,
      conflictsCount: schedule.conflictsCount,
    };
  }

  // 7. POST /api/v1/calendar/check-conflicts - Check if proposed timeslot conflicts with existing schedule
  @Post('check-conflicts')
  @HttpCode(HttpStatus.OK)
  async checkConflicts(
    @CurrentUser('id') userId: string,
    @Body() body: { startTime: string; endTime: string; excludeEventId?: string },
  ) {
    const res = await this.calendarService.checkConflicts(
      userId,
      body.startTime,
      body.endTime,
      body.excludeEventId,
    );
    return {
      success: true,
      ...res,
    };
  }
}
