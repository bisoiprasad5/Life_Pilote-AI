import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import * as crypto from 'crypto';

export interface CalendarEventEntity {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: string; // ISO
  endTime: string; // ISO
  isAllDay: boolean;
  isAiGenerated: boolean;
  color?: string | null;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedScheduleItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  type: 'EVENT' | 'TASK' | 'STUDY' | 'MEAL' | 'HABIT' | 'DEADLINE';
  startTime: string; // ISO
  endTime: string; // ISO
  isAllDay: boolean;
  color?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status?: string;
  location?: string | null;
  hasConflict?: boolean;
  conflictDetails?: string[];
  referenceId?: string; // Original taskId or eventId
  deadline?: string | null;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  // In-memory fallback for offline/development environments
  private memoryEvents = new Map<string, CalendarEventEntity>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
  ) {}

  // 1. CREATE EVENT
  async create(userId: string, dto: CreateEventDto): Promise<CalendarEventEntity> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (this.prisma.isConnected) {
      try {
        const created = await this.prisma.calendarEvent.create({
          data: {
            userId,
            title: dto.title,
            description: dto.description || null,
            location: dto.location || null,
            startTime: start,
            endTime: end,
            isAllDay: !!dto.isAllDay,
            isAiGenerated: false,
            color: dto.color || '#3b82f6',
          },
        });

        return {
          id: created.id,
          userId: created.userId,
          title: created.title,
          description: created.description,
          location: created.location,
          startTime: created.startTime.toISOString(),
          endTime: created.endTime.toISOString(),
          isAllDay: created.isAllDay,
          isAiGenerated: created.isAiGenerated,
          color: created.color,
          category: dto.category || 'EVENT',
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        };
      } catch (err: any) {
        this.logger.warn(`Prisma create calendar event failed, falling back to memory: ${err.message}`);
      }
    }

    // Memory fallback
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const event: CalendarEventEntity = {
      id,
      userId,
      title: dto.title,
      description: dto.description || null,
      location: dto.location || null,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      isAllDay: !!dto.isAllDay,
      isAiGenerated: false,
      color: dto.color || '#3b82f6',
      category: dto.category || 'EVENT',
      createdAt: now,
      updatedAt: now,
    };
    this.memoryEvents.set(id, event);
    return event;
  }

  // 2. FIND ALL EVENTS
  async findAll(userId: string, query: QueryEventsDto): Promise<CalendarEventEntity[]> {
    if (this.prisma.isConnected) {
      try {
        const where: any = { userId };
        if (query.startDate) {
          where.endTime = { gte: new Date(query.startDate) };
        }
        if (query.endDate) {
          where.startTime = { lte: new Date(query.endDate) };
        }

        const events = await this.prisma.calendarEvent.findMany({
          where,
          orderBy: { startTime: 'asc' },
        });

        return events.map((e) => ({
          id: e.id,
          userId: e.userId,
          title: e.title,
          description: e.description,
          location: e.location,
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          isAllDay: e.isAllDay,
          isAiGenerated: e.isAiGenerated,
          color: e.color,
          category: 'EVENT',
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        }));
      } catch (err: any) {
        this.logger.warn(`Prisma findAll calendar events error: ${err.message}`);
      }
    }

    // Memory fallback
    let list = Array.from(this.memoryEvents.values()).filter((e) => e.userId === userId);
    if (query.startDate) {
      const startMs = new Date(query.startDate).getTime();
      list = list.filter((e) => new Date(e.endTime).getTime() >= startMs);
    }
    if (query.endDate) {
      const endMs = new Date(query.endDate).getTime();
      list = list.filter((e) => new Date(e.startTime).getTime() <= endMs);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)),
      );
    }

    return list.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  // 3. FIND BY ID
  async findById(userId: string, id: string): Promise<CalendarEventEntity> {
    if (this.prisma.isConnected) {
      try {
        const e = await this.prisma.calendarEvent.findUnique({ where: { id } });
        if (e) {
          if (e.userId !== userId) throw new ForbiddenException('Access denied');
          return {
            id: e.id,
            userId: e.userId,
            title: e.title,
            description: e.description,
            location: e.location,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime.toISOString(),
            isAllDay: e.isAllDay,
            isAiGenerated: e.isAiGenerated,
            color: e.color,
            category: 'EVENT',
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
          };
        }
      } catch (err: any) {
        if (err instanceof ForbiddenException) throw err;
      }
    }

    const event = this.memoryEvents.get(id);
    if (!event) throw new NotFoundException('Calendar event not found');
    if (event.userId !== userId) throw new ForbiddenException('Access denied');
    return event;
  }

  // 4. UPDATE EVENT
  async update(userId: string, id: string, dto: UpdateEventDto): Promise<CalendarEventEntity> {
    const existing = await this.findById(userId, id);

    const startTime = dto.startTime ? new Date(dto.startTime) : new Date(existing.startTime);
    const endTime = dto.endTime ? new Date(dto.endTime) : new Date(existing.endTime);

    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.calendarEvent.update({
          where: { id },
          data: {
            title: dto.title ?? existing.title,
            description: dto.description !== undefined ? dto.description : existing.description,
            location: dto.location !== undefined ? dto.location : existing.location,
            startTime,
            endTime,
            isAllDay: dto.isAllDay !== undefined ? dto.isAllDay : existing.isAllDay,
            color: dto.color ?? existing.color,
          },
        });

        return {
          id: updated.id,
          userId: updated.userId,
          title: updated.title,
          description: updated.description,
          location: updated.location,
          startTime: updated.startTime.toISOString(),
          endTime: updated.endTime.toISOString(),
          isAllDay: updated.isAllDay,
          isAiGenerated: updated.isAiGenerated,
          color: updated.color,
          category: dto.category || existing.category || 'EVENT',
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch (err: any) {
        this.logger.warn(`Prisma update calendar event error: ${err.message}`);
      }
    }

    // Memory fallback
    const updated: CalendarEventEntity = {
      ...existing,
      title: dto.title ?? existing.title,
      description: dto.description !== undefined ? dto.description : existing.description,
      location: dto.location !== undefined ? dto.location : existing.location,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isAllDay: dto.isAllDay !== undefined ? dto.isAllDay : existing.isAllDay,
      color: dto.color ?? existing.color,
      category: dto.category ?? existing.category,
      updatedAt: new Date().toISOString(),
    };

    this.memoryEvents.set(id, updated);
    return updated;
  }

  // 5. DELETE EVENT
  async delete(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.findById(userId, id);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.calendarEvent.delete({ where: { id } });
        return { success: true, message: 'Calendar event deleted successfully' };
      } catch (err: any) {
        this.logger.warn(`Prisma delete calendar event error: ${err.message}`);
      }
    }

    this.memoryEvents.delete(id);
    return { success: true, message: 'Calendar event deleted successfully' };
  }

  // 6. CONFLICT DETECTION
  async checkConflicts(
    userId: string,
    startTime: string,
    endTime: string,
    excludeEventId?: string,
  ): Promise<{ hasConflict: boolean; conflicts: { id: string; title: string; startTime: string; endTime: string }[] }> {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    const events = await this.findAll(userId, {
      startDate: new Date(startMs - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(endMs + 24 * 60 * 60 * 1000).toISOString(),
    });

    const conflicts: { id: string; title: string; startTime: string; endTime: string }[] = [];

    for (const e of events) {
      if (e.id === excludeEventId || e.isAllDay) continue;
      const eStart = new Date(e.startTime).getTime();
      const eEnd = new Date(e.endTime).getTime();

      // Check overlap: start < otherEnd && end > otherStart
      if (startMs < eEnd && endMs > eStart) {
        conflicts.push({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  // 7. UNIFIED SCHEDULE
  async getUnifiedSchedule(
    userId: string,
    query: QueryEventsDto,
  ): Promise<{ items: UnifiedScheduleItem[]; conflictsCount: number }> {
    const items: UnifiedScheduleItem[] = [];

    // A. Calendar Events
    const events = await this.findAll(userId, query);
    for (const e of events) {
      items.push({
        id: e.id,
        userId: e.userId,
        title: e.title,
        description: e.description,
        type: (e.category as any) || 'EVENT',
        startTime: e.startTime,
        endTime: e.endTime,
        isAllDay: e.isAllDay,
        color: e.color || '#3b82f6',
        location: e.location,
        referenceId: e.id,
      });
    }

    // B. Real Tasks from TasksService
    try {
      const taskResults = await this.tasksService.findAll(userId, { limit: 100 });
      const tasks = taskResults.data || [];

      for (const t of tasks) {
        const taskDate = t.date ? t.date.split('T')[0] : (t.dueDate ? t.dueDate.split('T')[0] : null);

        if (taskDate) {
          // Construct start and end time
          let startIso: string;
          let endIso: string;

          if (t.startTime) {
            // Convert "10:00 AM" or "10:00" to ISO timestamp on taskDate
            startIso = this.parseTimeStringToIso(taskDate, t.startTime);
            const durationMins = t.estimatedDuration || t.estimatedMinutes || 60;
            const endMs = new Date(startIso).getTime() + durationMins * 60 * 1000;
            endIso = new Date(endMs).toISOString();
          } else {
            // All day task
            startIso = `${taskDate}T09:00:00.000Z`;
            endIso = `${taskDate}T10:00:00.000Z`;
          }

          const isStudy = t.category === 'STUDY';
          const isFitness = t.category === 'FITNESS' || t.category === 'HEALTH';

          items.push({
            id: `task-${t.id}`,
            userId: t.userId,
            title: t.title,
            description: t.description,
            type: isStudy ? 'STUDY' : isFitness ? 'HABIT' : 'TASK',
            startTime: startIso,
            endTime: endIso,
            isAllDay: t.isAllDay,
            priority: t.priority,
            status: t.status,
            color: isStudy ? '#a855f7' : t.priority === 'CRITICAL' ? '#ef4444' : '#3b82f6',
            referenceId: t.id,
            deadline: t.deadline || null,
          });

          // Also highlight Deadlines if task has an impending deadline
          if (t.deadline) {
            items.push({
              id: `deadline-${t.id}`,
              userId: t.userId,
              title: `DEADLINE: ${t.title}`,
              description: `Due: ${new Date(t.deadline).toLocaleTimeString()}`,
              type: 'DEADLINE',
              startTime: new Date(t.deadline).toISOString(),
              endTime: new Date(new Date(t.deadline).getTime() + 30 * 60 * 1000).toISOString(),
              isAllDay: false,
              priority: 'CRITICAL',
              status: t.status,
              color: '#f43f5e',
              referenceId: t.id,
              deadline: t.deadline,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Error integrating tasks into calendar: ${err.message}`);
    }

    // C. Detect Conflicts across all timed items
    let conflictsCount = 0;
    const sorted = [...items].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      if (cur.isAllDay || cur.type === 'DEADLINE') continue;

      const curStart = new Date(cur.startTime).getTime();
      const curEnd = new Date(cur.endTime).getTime();

      for (let j = i + 1; j < sorted.length; j++) {
        const next = sorted[j];
        if (next.isAllDay || next.type === 'DEADLINE') continue;

        const nextStart = new Date(next.startTime).getTime();
        const nextEnd = new Date(next.endTime).getTime();

        // If next starts after current ends, since list is sorted, no more overlaps for cur
        if (nextStart >= curEnd) break;

        // Overlap detected!
        cur.hasConflict = true;
        next.hasConflict = true;
        cur.conflictDetails = cur.conflictDetails || [];
        next.conflictDetails = next.conflictDetails || [];
        cur.conflictDetails.push(`Overlaps with "${next.title}"`);
        next.conflictDetails.push(`Overlaps with "${cur.title}"`);
        conflictsCount++;
      }
    }

    return {
      items: sorted,
      conflictsCount,
    };
  }

  private parseTimeStringToIso(dateStr: string, timeStr: string): string {
    try {
      // Check if timeStr is 12-hour format "10:00 AM" or "02:30 PM"
      const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match12) {
        let hour = parseInt(match12[1], 10);
        const min = parseInt(match12[2], 10);
        const meridiem = match12[3]?.toUpperCase();

        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;

        const hStr = hour.toString().padStart(2, '0');
        const mStr = min.toString().padStart(2, '0');
        return `${dateStr}T${hStr}:${mStr}:00.000Z`;
      }

      // Check if timeStr is 24-hour "14:30"
      const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        const hStr = match24[1].padStart(2, '0');
        const mStr = match24[2].padStart(2, '0');
        return `${dateStr}T${hStr}:${mStr}:00.000Z`;
      }
    } catch {}

    return `${dateStr}T09:00:00.000Z`;
  }
}
