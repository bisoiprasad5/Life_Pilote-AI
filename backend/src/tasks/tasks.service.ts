import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, PriorityLevel, TaskCategoryType, TaskStatusType } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTasksDto, SortByOption, SortOrderOption } from './dto/query-tasks.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { SnoozeTaskDto } from './dto/snooze-task.dto';
import { RescheduleTaskDto } from './dto/reschedule-task.dto';
import { CreateSubTaskDto, UpdateSubTaskDto } from './dto/subtask.dto';
import { TaskEntity, SubTaskEntity } from './entities/task.entity';
import * as crypto from 'crypto';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  // In-memory fallback stores for offline/local development resilience
  private memoryTasks = new Map<string, TaskEntity>();

  constructor(private readonly prisma: PrismaService) {}

  // Helper: Normalize any task object into consistent TaskEntity format
  private formatTask(raw: any): TaskEntity {
    // Format subtasks
    const rawSubtasks = raw.subTasks || raw.subtasks || [];
    const subtasks: SubTaskEntity[] = rawSubtasks
      .map((s: any) => ({
        id: s.id,
        taskId: s.taskId || raw.id,
        title: s.title,
        isCompleted: !!s.isCompleted,
        order: s.order ?? 0,
        completedAt: s.completedAt ? new Date(s.completedAt).toISOString() : null,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : new Date().toISOString(),
      }))
      .sort((a: SubTaskEntity, b: SubTaskEntity) => a.order - b.order);

    // Normalize category
    let category: TaskEntity['category'] = 'OTHER';
    const rawCat = raw.taskCategory || raw.category;
    if (typeof rawCat === 'string' && ['STUDY', 'WORK', 'PERSONAL', 'HEALTH', 'FITNESS', 'FINANCE', 'OTHER'].includes(rawCat.toUpperCase())) {
      category = rawCat.toUpperCase() as TaskEntity['category'];
    } else if (raw.category && typeof raw.category === 'object' && raw.category.name) {
      const nameUpper = raw.category.name.toUpperCase();
      if (['STUDY', 'WORK', 'PERSONAL', 'HEALTH', 'FITNESS', 'FINANCE', 'OTHER'].includes(nameUpper)) {
        category = nameUpper as TaskEntity['category'];
      }
    }

    // Normalize priority
    let priority: TaskEntity['priority'] = 'MEDIUM';
    const rawPrio = raw.priority;
    if (rawPrio === 'URGENT') {
      priority = 'CRITICAL';
    } else if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(rawPrio)) {
      priority = rawPrio as TaskEntity['priority'];
    }

    // Normalize status
    let status: TaskEntity['status'] = 'TODO';
    const rawStatus = raw.status;
    if (rawStatus === 'PENDING') {
      status = 'TODO';
    } else if (['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(rawStatus)) {
      status = rawStatus as TaskEntity['status'];
    }

    // Normalize recurringSchedule
    let recurringSchedule = null;
    if (raw.isRecurring || raw.recurringSchedule) {
      if (typeof raw.recurringSchedule === 'object' && raw.recurringSchedule !== null) {
        recurringSchedule = raw.recurringSchedule;
      } else {
        recurringSchedule = {
          isRecurring: !!raw.isRecurring,
          interval: raw.recurrenceInterval || 'NONE',
          rule: raw.recurrenceRule || null,
        };
      }
    }

    // Normalize reminder
    let reminder = null;
    if (raw.reminderTime || raw.reminder) {
      if (typeof raw.reminder === 'object' && raw.reminder !== null) {
        reminder = raw.reminder;
      } else {
        const triggerTime = raw.reminderTime
          ? new Date(raw.reminderTime).toISOString()
          : typeof raw.reminder === 'string'
            ? raw.reminder
            : null;
        reminder = triggerTime ? { triggerTime, channel: 'IN_APP' } : null;
      }
    }

    const estimated = raw.estimatedDuration ?? raw.estimatedMinutes ?? null;

    return {
      id: raw.id,
      userId: raw.userId,
      categoryId: raw.categoryId || null,
      category,
      title: raw.title,
      description: raw.description || null,
      date: raw.date ? new Date(raw.date).toISOString() : (raw.dueDate ? new Date(raw.dueDate).toISOString() : null),
      startTime: raw.startTime || null,
      endTime: raw.endTime || null,
      deadline: raw.deadline ? new Date(raw.deadline).toISOString() : null,
      dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : (raw.date ? new Date(raw.date).toISOString() : null),
      dueTime: raw.dueTime || null,
      priority,
      status,
      estimatedDuration: estimated,
      estimatedMinutes: estimated,
      actualMinutes: raw.actualMinutes ?? null,
      isAllDay: !!raw.isAllDay,
      isRecurring: !!raw.isRecurring,
      recurringSchedule,
      reminder,
      reminderTime: raw.reminderTime ? new Date(raw.reminderTime).toISOString() : null,
      notes: raw.notes || null,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      subtasks,
      completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : null,
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  // 1. CREATE TASK
  async create(userId: string, dto: CreateTaskDto): Promise<TaskEntity> {
    const reminderDate = dto.reminder
      ? typeof dto.reminder === 'object' && dto.reminder.triggerTime
        ? new Date(dto.reminder.triggerTime)
        : typeof dto.reminder === 'string'
          ? new Date(dto.reminder)
          : null
      : null;

    const isRecur = typeof dto.recurringSchedule === 'object'
      ? !!dto.recurringSchedule.isRecurring
      : typeof dto.recurringSchedule === 'string' && dto.recurringSchedule !== 'NONE';

    const recurInterval = typeof dto.recurringSchedule === 'object' && dto.recurringSchedule.interval && dto.recurringSchedule.interval !== 'NONE'
      ? (dto.recurringSchedule.interval as any)
      : null;

    const recurRule = typeof dto.recurringSchedule === 'object' ? dto.recurringSchedule.rule : null;

    if (this.prisma.isConnected) {
      try {
        const created = await this.prisma.task.create({
          data: {
            userId,
            title: dto.title,
            description: dto.description || null,
            notes: dto.notes || null,
            taskCategory: (dto.category as any) || 'OTHER',
            priority: (dto.priority as any) || 'MEDIUM',
            status: (dto.status as any) === 'PENDING' ? 'TODO' : ((dto.status as any) || 'TODO'),
            date: dto.date ? new Date(dto.date) : (dto.dueDate ? new Date(dto.dueDate) : null),
            dueDate: dto.dueDate ? new Date(dto.dueDate) : (dto.date ? new Date(dto.date) : null),
            deadline: dto.deadline ? new Date(dto.deadline) : null,
            startTime: dto.startTime || null,
            endTime: dto.endTime || null,
            estimatedMinutes: dto.estimatedDuration ?? dto.estimatedMinutes ?? null,
            tags: dto.tags || [],
            isRecurring: isRecur,
            recurrenceInterval: recurInterval,
            recurrenceRule: recurRule,
            reminderTime: reminderDate,
            subTasks: dto.subtasks && dto.subtasks.length > 0 ? {
              create: dto.subtasks.map((s, idx) => ({
                title: s.title,
                isCompleted: !!s.isCompleted,
                order: s.order ?? idx,
              })),
            } : undefined,
          },
          include: {
            subTasks: true,
            category: true,
          },
        });
        return this.formatTask(created);
      } catch (err: any) {
        this.logger.warn(`Prisma task create failed, falling back to memory: ${err.message}`);
      }
    }

    // In-memory fallback
    const id = crypto.randomUUID();
    const now = new Date();
    const subtasks: SubTaskEntity[] = (dto.subtasks || []).map((s, idx) => ({
      id: s.id || crypto.randomUUID(),
      taskId: id,
      title: s.title,
      isCompleted: !!s.isCompleted,
      order: s.order ?? idx,
      completedAt: s.isCompleted ? now.toISOString() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }));

    const task: TaskEntity = {
      id,
      userId,
      categoryId: null,
      category: dto.category || 'OTHER',
      title: dto.title,
      description: dto.description || null,
      date: dto.date || dto.dueDate || null,
      startTime: dto.startTime || null,
      endTime: dto.endTime || null,
      deadline: dto.deadline || null,
      dueDate: dto.dueDate || dto.date || null,
      dueTime: null,
      priority: dto.priority || 'MEDIUM',
      status: ((dto.status as any) === 'PENDING' ? 'TODO' : (dto.status || 'TODO')) as TaskEntity['status'],
      estimatedDuration: dto.estimatedDuration ?? dto.estimatedMinutes ?? null,
      estimatedMinutes: dto.estimatedDuration ?? dto.estimatedMinutes ?? null,
      actualMinutes: null,
      isAllDay: false,
      isRecurring: isRecur,
      recurringSchedule: typeof dto.recurringSchedule === 'object'
        ? dto.recurringSchedule
        : { isRecurring: isRecur, interval: dto.recurringSchedule || 'NONE' },
      reminder: typeof dto.reminder === 'object'
        ? dto.reminder
        : dto.reminder ? { triggerTime: dto.reminder, channel: 'IN_APP' } : null,
      reminderTime: reminderDate ? reminderDate.toISOString() : null,
      notes: dto.notes || null,
      tags: dto.tags || [],
      subtasks,
      completedAt: dto.status === TaskStatusType.COMPLETED ? now.toISOString() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.memoryTasks.set(id, task);
    return task;
  }

  // 2. READ TASKS (LIST WITH FILTERING, SORTING, SEARCH, PAGINATION)
  async findAll(
    userId: string,
    query: QueryTasksDto,
  ): Promise<{ data: TaskEntity[]; meta: PaginationMeta }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    if (this.prisma.isConnected) {
      try {
        const where: any = { userId };

        if (query.status) {
          where.status = query.status === TaskStatusType.PENDING ? 'TODO' : query.status;
        }

        if (query.priority) {
          where.priority = query.priority;
        }

        if (query.category) {
          where.taskCategory = query.category;
        }

        if (query.search && query.search.trim() !== '') {
          const s = query.search.trim();
          where.OR = [
            { title: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
            { notes: { contains: s, mode: 'insensitive' } },
          ];
        }

        if (query.date) {
          const target = new Date(query.date);
          const start = new Date(target);
          start.setUTCHours(0, 0, 0, 0);
          const end = new Date(target);
          end.setUTCHours(23, 59, 59, 999);
          where.OR = [
            { date: { gte: start, lte: end } },
            { dueDate: { gte: start, lte: end } },
            { deadline: { gte: start, lte: end } },
          ];
        } else if (query.startDate || query.endDate) {
          const dateFilter: any = {};
          if (query.startDate) dateFilter.gte = new Date(query.startDate);
          if (query.endDate) dateFilter.lte = new Date(query.endDate);
          where.OR = [
            { date: dateFilter },
            { dueDate: dateFilter },
            { deadline: dateFilter },
          ];
        }

        const sortBy = query.sortBy || SortByOption.CREATED_AT;
        const sortOrder = (query.sortOrder || SortOrderOption.DESC).toLowerCase() as 'asc' | 'desc';

        const orderBy: any = {};
        if (sortBy === SortByOption.PRIORITY) {
          orderBy.priority = sortOrder;
        } else if (sortBy === SortByOption.TITLE) {
          orderBy.title = sortOrder;
        } else if (sortBy === SortByOption.STATUS) {
          orderBy.status = sortOrder;
        } else if (sortBy === SortByOption.DEADLINE) {
          orderBy.deadline = sortOrder;
        } else if (sortBy === SortByOption.DATE || sortBy === SortByOption.DUE_DATE) {
          orderBy.dueDate = sortOrder;
        } else {
          orderBy.createdAt = sortOrder;
        }

        const [tasks, total] = await Promise.all([
          this.prisma.task.findMany({
            where,
            include: { subTasks: true, category: true },
            orderBy,
            skip,
            take: limit,
          }),
          this.prisma.task.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit) || 1;
        return {
          data: tasks.map((t) => this.formatTask(t)),
          meta: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        };
      } catch (err: any) {
        this.logger.warn(`Prisma findAll error, using memory fallback: ${err.message}`);
      }
    }

    // In-memory fallback
    let userTasks = Array.from(this.memoryTasks.values()).filter((t) => t.userId === userId);

    // Filtering
    if (query.status) {
      const matchStatus = query.status === TaskStatusType.PENDING ? 'TODO' : query.status;
      userTasks = userTasks.filter((t) => t.status === matchStatus);
    }

    if (query.priority) {
      userTasks = userTasks.filter((t) => t.priority === query.priority);
    }

    if (query.category) {
      userTasks = userTasks.filter((t) => t.category === query.category);
    }

    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim().toLowerCase();
      userTasks = userTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          (t.description && t.description.toLowerCase().includes(s)) ||
          (t.notes && t.notes.toLowerCase().includes(s)),
      );
    }

    if (query.date) {
      const dStr = query.date.split('T')[0];
      userTasks = userTasks.filter((t) => {
        const tDate = t.date ? t.date.split('T')[0] : null;
        const tDue = t.dueDate ? t.dueDate.split('T')[0] : null;
        const tDead = t.deadline ? t.deadline.split('T')[0] : null;
        return tDate === dStr || tDue === dStr || tDead === dStr;
      });
    } else if (query.startDate || query.endDate) {
      const startMs = query.startDate ? new Date(query.startDate).getTime() : -Infinity;
      const endMs = query.endDate ? new Date(query.endDate).getTime() : Infinity;
      userTasks = userTasks.filter((t) => {
        const ms = t.date ? new Date(t.date).getTime() : (t.dueDate ? new Date(t.dueDate).getTime() : null);
        return ms !== null && ms >= startMs && ms <= endMs;
      });
    }

    // Sorting
    const sortBy = query.sortBy || SortByOption.CREATED_AT;
    const sortOrder = (query.sortOrder || SortOrderOption.DESC).toLowerCase();
    const isAsc = sortOrder === 'asc';

    const priorityWeights: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    userTasks.sort((a, b) => {
      let cmp = 0;
      if (sortBy === SortByOption.PRIORITY) {
        cmp = (priorityWeights[a.priority] || 0) - (priorityWeights[b.priority] || 0);
      } else if (sortBy === SortByOption.TITLE) {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === SortByOption.STATUS) {
        cmp = a.status.localeCompare(b.status);
      } else if (sortBy === SortByOption.DEADLINE) {
        const da = a.deadline ? new Date(a.deadline).getTime() : 0;
        const db = b.deadline ? new Date(b.deadline).getTime() : 0;
        cmp = da - db;
      } else if (sortBy === SortByOption.DATE || sortBy === SortByOption.DUE_DATE) {
        const da = a.date ? new Date(a.date).getTime() : (a.dueDate ? new Date(a.dueDate).getTime() : 0);
        const db = b.date ? new Date(b.date).getTime() : (b.dueDate ? new Date(b.dueDate).getTime() : 0);
        cmp = da - db;
      } else {
        // Created at
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        cmp = da - db;
      }
      return isAsc ? cmp : -cmp;
    });

    const total = userTasks.length;
    const paginated = userTasks.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // 3. READ SINGLE TASK (WITH STRICT OWNERSHIP VERIFICATION)
  async findById(userId: string, id: string): Promise<TaskEntity> {
    if (this.prisma.isConnected) {
      try {
        const task = await this.prisma.task.findUnique({
          where: { id },
          include: { subTasks: true, category: true },
        });

        if (!task) {
          throw new NotFoundException(`Task with ID ${id} not found`);
        }

        if (task.userId !== userId) {
          throw new ForbiddenException('You do not have access to this task');
        }

        return this.formatTask(task);
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) {
          throw err;
        }
        this.logger.warn(`Prisma findById error: ${err.message}`);
      }
    }

    const task = this.memoryTasks.get(id);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (task.userId !== userId) {
      throw new ForbiddenException('You do not have access to this task');
    }

    return task;
  }

  // 4. UPDATE TASK
  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<TaskEntity> {
    // Verify ownership first
    const existing = await this.findById(userId, id);

    const reminderDate = dto.reminder !== undefined
      ? dto.reminder
        ? typeof dto.reminder === 'object' && dto.reminder.triggerTime
          ? new Date(dto.reminder.triggerTime)
          : typeof dto.reminder === 'string'
            ? new Date(dto.reminder)
            : null
        : null
      : undefined;

    const isRecur = dto.recurringSchedule !== undefined
      ? typeof dto.recurringSchedule === 'object'
        ? !!dto.recurringSchedule.isRecurring
        : typeof dto.recurringSchedule === 'string' && dto.recurringSchedule !== 'NONE'
      : undefined;

    const recurInterval = dto.recurringSchedule !== undefined
      ? typeof dto.recurringSchedule === 'object' && dto.recurringSchedule.interval && dto.recurringSchedule.interval !== 'NONE'
        ? (dto.recurringSchedule.interval as any)
        : null
      : undefined;

    const recurRule = dto.recurringSchedule !== undefined
      ? typeof dto.recurringSchedule === 'object' ? dto.recurringSchedule.rule : null
      : undefined;

    const normalizedStatus = dto.status !== undefined
      ? dto.status === TaskStatusType.PENDING ? 'TODO' : dto.status
      : undefined;

    if (this.prisma.isConnected) {
      try {
        // If subtasks are provided in update, delete and recreate or replace
        if (dto.subtasks) {
          await this.prisma.subTask.deleteMany({ where: { taskId: id } });
        }

        const updated = await this.prisma.task.update({
          where: { id },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.description !== undefined ? { description: dto.description } : {}),
            ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
            ...(dto.category !== undefined ? { taskCategory: dto.category as any } : {}),
            ...(dto.priority !== undefined ? { priority: dto.priority as any } : {}),
            ...(normalizedStatus !== undefined ? { status: normalizedStatus as any } : {}),
            ...(dto.date !== undefined ? { date: dto.date ? new Date(dto.date) : null } : {}),
            ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
            ...(dto.deadline !== undefined ? { deadline: dto.deadline ? new Date(dto.deadline) : null } : {}),
            ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
            ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
            ...(dto.estimatedDuration !== undefined || dto.estimatedMinutes !== undefined
              ? { estimatedMinutes: dto.estimatedDuration ?? dto.estimatedMinutes }
              : {}),
            ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
            ...(isRecur !== undefined ? { isRecurring: isRecur } : {}),
            ...(recurInterval !== undefined ? { recurrenceInterval: recurInterval } : {}),
            ...(recurRule !== undefined ? { recurrenceRule: recurRule } : {}),
            ...(reminderDate !== undefined ? { reminderTime: reminderDate } : {}),
            ...(dto.subtasks ? {
              subTasks: {
                create: dto.subtasks.map((s, idx) => ({
                  title: s.title,
                  isCompleted: !!s.isCompleted,
                  order: s.order ?? idx,
                })),
              },
            } : {}),
          },
          include: { subTasks: true, category: true },
        });

        return this.formatTask(updated);
      } catch (err: any) {
        this.logger.warn(`Prisma update error: ${err.message}`);
      }
    }

    // In-memory update
    const now = new Date().toISOString();
    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.notes !== undefined) existing.notes = dto.notes;
    if (dto.category !== undefined) existing.category = dto.category;
    if (dto.priority !== undefined) existing.priority = dto.priority;
    if (dto.status !== undefined) {
      existing.status = dto.status === TaskStatusType.PENDING ? 'TODO' : dto.status;
      if (existing.status === 'COMPLETED' && !existing.completedAt) {
        existing.completedAt = now;
      } else if (existing.status !== 'COMPLETED') {
        existing.completedAt = null;
      }
    }
    if (dto.date !== undefined) existing.date = dto.date;
    if (dto.dueDate !== undefined) existing.dueDate = dto.dueDate;
    if (dto.deadline !== undefined) existing.deadline = dto.deadline;
    if (dto.startTime !== undefined) existing.startTime = dto.startTime;
    if (dto.endTime !== undefined) existing.endTime = dto.endTime;
    if (dto.estimatedDuration !== undefined || dto.estimatedMinutes !== undefined) {
      const est = dto.estimatedDuration ?? dto.estimatedMinutes ?? null;
      existing.estimatedDuration = est;
      existing.estimatedMinutes = est;
    }
    if (dto.tags !== undefined) existing.tags = dto.tags;
    if (dto.recurringSchedule !== undefined) {
      existing.isRecurring = !!isRecur;
      existing.recurringSchedule = typeof dto.recurringSchedule === 'object'
        ? dto.recurringSchedule
        : { isRecurring: !!isRecur, interval: dto.recurringSchedule || 'NONE' };
    }
    if (dto.reminder !== undefined) {
      existing.reminder = typeof dto.reminder === 'object'
        ? dto.reminder
        : dto.reminder ? { triggerTime: dto.reminder, channel: 'IN_APP' } : null;
      existing.reminderTime = reminderDate ? reminderDate.toISOString() : null;
    }
    if (dto.subtasks !== undefined) {
      existing.subtasks = dto.subtasks.map((s, idx) => ({
        id: s.id || crypto.randomUUID(),
        taskId: id,
        title: s.title,
        isCompleted: !!s.isCompleted,
        order: s.order ?? idx,
        completedAt: s.isCompleted ? now : null,
        createdAt: now,
        updatedAt: now,
      }));
    }

    existing.updatedAt = now;
    this.memoryTasks.set(id, existing);
    return existing;
  }

  // 5. DELETE TASK
  async delete(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    // Verify ownership
    await this.findById(userId, id);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.task.delete({ where: { id } });
        return { success: true, message: 'Task deleted successfully' };
      } catch (err: any) {
        this.logger.warn(`Prisma delete error: ${err.message}`);
      }
    }

    this.memoryTasks.delete(id);
    return { success: true, message: 'Task deleted successfully' };
  }

  // 6. COMPLETE TASK (PATCH /api/tasks/:id/complete)
  async complete(userId: string, id: string, dto?: CompleteTaskDto): Promise<TaskEntity> {
    const isCompleted = dto?.completed !== undefined ? dto.completed : true;
    const now = new Date();

    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.task.update({
          where: { id },
          data: {
            status: isCompleted ? 'COMPLETED' : 'TODO',
            completedAt: isCompleted ? now : null,
            ...(isCompleted ? {
              subTasks: {
                updateMany: {
                  where: { taskId: id },
                  data: { isCompleted: true, completedAt: now },
                },
              },
            } : {}),
          },
          include: { subTasks: true, category: true },
        });
        return this.formatTask(updated);
      } catch (err: any) {
        this.logger.warn(`Prisma complete error: ${err.message}`);
      }
    }

    const task = await this.findById(userId, id);
    task.status = isCompleted ? 'COMPLETED' : 'TODO';
    task.completedAt = isCompleted ? now.toISOString() : null;
    task.updatedAt = now.toISOString();

    if (isCompleted && task.subtasks) {
      task.subtasks.forEach((s) => {
        s.isCompleted = true;
        s.completedAt = now.toISOString();
        s.updatedAt = now.toISOString();
      });
    }

    this.memoryTasks.set(id, task);
    return task;
  }

  // 7. SNOOZE TASK (PATCH /api/tasks/:id/snooze)
  async snooze(userId: string, id: string, dto: SnoozeTaskDto): Promise<TaskEntity> {
    const task = await this.findById(userId, id);
    const minutes = dto.minutes || 60;
    const nowMs = Date.now();

    let newDeadline: Date;
    if (dto.until) {
      newDeadline = new Date(dto.until);
    } else {
      const baseMs = task.deadline
        ? new Date(task.deadline).getTime()
        : task.date
          ? new Date(task.date).getTime()
          : nowMs;
      // Add snooze minutes (or if baseMs is in the past, add from now)
      const startMs = Math.max(baseMs, nowMs);
      newDeadline = new Date(startMs + minutes * 60 * 1000);
    }

    const newIso = newDeadline.toISOString();

    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.task.update({
          where: { id },
          data: {
            deadline: newDeadline,
            dueDate: newDeadline,
            date: newDeadline,
            reminderTime: newDeadline,
          },
          include: { subTasks: true, category: true },
        });
        return this.formatTask(updated);
      } catch (err: any) {
        this.logger.warn(`Prisma snooze error: ${err.message}`);
      }
    }

    task.deadline = newIso;
    task.dueDate = newIso;
    task.date = newIso;
    task.reminderTime = newIso;
    if (task.reminder) {
      task.reminder.triggerTime = newIso;
    }
    task.updatedAt = new Date().toISOString();
    this.memoryTasks.set(id, task);
    return task;
  }

  // 8. RESCHEDULE TASK (PATCH /api/tasks/:id/reschedule)
  async reschedule(userId: string, id: string, dto: RescheduleTaskDto): Promise<TaskEntity> {
    const task = await this.findById(userId, id);

    const newDate = dto.date ? new Date(dto.date) : (dto.dueDate ? new Date(dto.dueDate) : undefined);
    const newDueDate = dto.dueDate ? new Date(dto.dueDate) : (dto.date ? new Date(dto.date) : undefined);
    const newDeadline = dto.deadline ? new Date(dto.deadline) : undefined;

    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.task.update({
          where: { id },
          data: {
            ...(newDate !== undefined ? { date: newDate } : {}),
            ...(newDueDate !== undefined ? { dueDate: newDueDate } : {}),
            ...(newDeadline !== undefined ? { deadline: newDeadline } : {}),
            ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
            ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
          },
          include: { subTasks: true, category: true },
        });
        return this.formatTask(updated);
      } catch (err: any) {
        this.logger.warn(`Prisma reschedule error: ${err.message}`);
      }
    }

    if (dto.date !== undefined) task.date = dto.date;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate;
    if (dto.deadline !== undefined) task.deadline = dto.deadline;
    if (dto.startTime !== undefined) task.startTime = dto.startTime;
    if (dto.endTime !== undefined) task.endTime = dto.endTime;
    task.updatedAt = new Date().toISOString();

    this.memoryTasks.set(id, task);
    return task;
  }

  // 9. DUPLICATE TASK (POST /api/tasks/:id/duplicate)
  async duplicate(userId: string, id: string): Promise<TaskEntity> {
    const original = await this.findById(userId, id);

    const dupDto: CreateTaskDto = {
      title: `${original.title} (Copy)`,
      description: original.description || undefined,
      category: original.category as TaskCategoryType,
      priority: original.priority as PriorityLevel,
      status: TaskStatusType.TODO,
      estimatedDuration: original.estimatedDuration ?? undefined,
      date: original.date || undefined,
      startTime: original.startTime || undefined,
      endTime: original.endTime || undefined,
      deadline: original.deadline || undefined,
      dueDate: original.dueDate || undefined,
      notes: original.notes || undefined,
      tags: [...original.tags],
      recurringSchedule: (original.recurringSchedule as any) || undefined,
      reminder: (original.reminder as any) || undefined,
      subtasks: original.subtasks.map((s) => ({
        title: s.title,
        isCompleted: false,
        order: s.order,
      })),
    };

    return this.create(userId, dupDto);
  }

  // 10. SUBTASKS MANAGEMENT
  async addSubtask(userId: string, taskId: string, dto: CreateSubTaskDto): Promise<SubTaskEntity> {
    // Verify parent task ownership
    await this.findById(userId, taskId);

    const now = new Date();
    if (this.prisma.isConnected) {
      try {
        const created = await this.prisma.subTask.create({
          data: {
            taskId,
            title: dto.title,
            isCompleted: !!dto.isCompleted,
            order: dto.order ?? 0,
            completedAt: dto.isCompleted ? now : null,
          },
        });
        return {
          id: created.id,
          taskId: created.taskId,
          title: created.title,
          isCompleted: created.isCompleted,
          order: created.order,
          completedAt: created.completedAt ? created.completedAt.toISOString() : null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        };
      } catch (err: any) {
        this.logger.warn(`Prisma addSubtask error: ${err.message}`);
      }
    }

    const task = this.memoryTasks.get(taskId)!;
    const subtask: SubTaskEntity = {
      id: dto.id || crypto.randomUUID(),
      taskId,
      title: dto.title,
      isCompleted: !!dto.isCompleted,
      order: dto.order ?? (task.subtasks.length > 0 ? Math.max(...task.subtasks.map((s) => s.order)) + 1 : 0),
      completedAt: dto.isCompleted ? now.toISOString() : null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    task.subtasks.push(subtask);
    task.updatedAt = now.toISOString();
    this.memoryTasks.set(taskId, task);
    return subtask;
  }

  async updateSubtask(
    userId: string,
    taskId: string,
    subtaskId: string,
    dto: UpdateSubTaskDto,
  ): Promise<SubTaskEntity> {
    // Verify parent task ownership
    await this.findById(userId, taskId);

    const now = new Date();
    if (this.prisma.isConnected) {
      try {
        const existing = await this.prisma.subTask.findUnique({
          where: { id: subtaskId },
        });
        if (!existing || existing.taskId !== taskId) {
          throw new NotFoundException(`Subtask with ID ${subtaskId} not found`);
        }

        const isCompleted = dto.isCompleted !== undefined ? dto.isCompleted : existing.isCompleted;
        const updated = await this.prisma.subTask.update({
          where: { id: subtaskId },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.isCompleted !== undefined ? { isCompleted } : {}),
            ...(dto.order !== undefined ? { order: dto.order } : {}),
            completedAt: isCompleted ? (existing.completedAt || now) : null,
          },
        });

        return {
          id: updated.id,
          taskId: updated.taskId,
          title: updated.title,
          isCompleted: updated.isCompleted,
          order: updated.order,
          completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        };
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err;
        this.logger.warn(`Prisma updateSubtask error: ${err.message}`);
      }
    }

    const task = this.memoryTasks.get(taskId)!;
    const subtask = task.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) {
      throw new NotFoundException(`Subtask with ID ${subtaskId} not found`);
    }

    if (dto.title !== undefined) subtask.title = dto.title;
    if (dto.isCompleted !== undefined) {
      subtask.isCompleted = dto.isCompleted;
      subtask.completedAt = dto.isCompleted ? now.toISOString() : null;
    }
    if (dto.order !== undefined) subtask.order = dto.order;
    subtask.updatedAt = now.toISOString();
    task.updatedAt = now.toISOString();

    this.memoryTasks.set(taskId, task);
    return subtask;
  }

  async deleteSubtask(
    userId: string,
    taskId: string,
    subtaskId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Verify parent task ownership
    await this.findById(userId, taskId);

    if (this.prisma.isConnected) {
      try {
        const existing = await this.prisma.subTask.findUnique({
          where: { id: subtaskId },
        });
        if (!existing || existing.taskId !== taskId) {
          throw new NotFoundException(`Subtask with ID ${subtaskId} not found`);
        }

        await this.prisma.subTask.delete({ where: { id: subtaskId } });
        return { success: true, message: 'Subtask deleted successfully' };
      } catch (err: any) {
        if (err instanceof NotFoundException) throw err;
        this.logger.warn(`Prisma deleteSubtask error: ${err.message}`);
      }
    }

    const task = this.memoryTasks.get(taskId)!;
    const index = task.subtasks.findIndex((s) => s.id === subtaskId);
    if (index === -1) {
      throw new NotFoundException(`Subtask with ID ${subtaskId} not found`);
    }

    task.subtasks.splice(index, 1);
    task.updatedAt = new Date().toISOString();
    this.memoryTasks.set(taskId, task);
    return { success: true, message: 'Subtask deleted successfully' };
  }
}
