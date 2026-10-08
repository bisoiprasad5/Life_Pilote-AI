import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsQueueService, NotificationJobData } from './services/notifications-queue.service';
import {
  NotificationCategory,
  NotificationTiming,
  NotificationJobType,
  TIMING_OFFSETS_MS,
} from './notifications.constants';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preferences.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { CreateRecurringReminderDto } from './dto/recurring-reminder.dto';
import * as crypto from 'crypto';

export interface NotificationPreferenceEntity {
  id: string;
  userId: string;
  browserEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  upcomingTask: boolean;
  taskStarting: boolean;
  overdueTask: boolean;
  deadlineApproaching: boolean;
  habitReminder: boolean;
  waterReminder: boolean;
  mealReminder: boolean;
  studyReminder: boolean;
  examReminder: boolean;
  goalReminder: boolean;
  defaultTiming: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderEntity {
  id: string;
  userId: string;
  title: string;
  category: NotificationCategory;
  timing?: string;
  triggerTime: Date;
  targetTime?: Date;
  isSent: boolean;
  sentAt?: Date | null;
  taskId?: string | null;
  calendarEventId?: string | null;
  examId?: string | null;
  habitId?: string | null;
  isRecurring?: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  // In-memory fallback stores for offline/test resilience
  private memoryPreferences = new Map<string, NotificationPreferenceEntity>();
  private memoryNotifications = new Map<string, any>();
  private memoryReminders = new Map<string, ReminderEntity>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: NotificationsQueueService,
  ) {}

  async onModuleInit() {
    this.queueService.setProcessorCallback((data, attempt) =>
      this.handleProcessJob(data, attempt),
    );
  }

  // ==========================================================================
  // 1. NOTIFICATION PREFERENCES
  // ==========================================================================

  private getDefaultPreferences(userId: string): NotificationPreferenceEntity {
    return {
      id: crypto.randomUUID(),
      userId,
      browserEnabled: true,
      inAppEnabled: true,
      emailEnabled: false,
      upcomingTask: true,
      taskStarting: true,
      overdueTask: true,
      deadlineApproaching: true,
      habitReminder: true,
      waterReminder: true,
      mealReminder: true,
      studyReminder: true,
      examReminder: true,
      goalReminder: true,
      defaultTiming: NotificationTiming.FIFTEEN_MINUTES,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceEntity> {
    if (this.prisma.isConnected) {
      try {
        let pref = await this.prisma.notificationPreference.findUnique({
          where: { userId },
        });

        if (!pref) {
          pref = await this.prisma.notificationPreference.create({
            data: this.getDefaultPreferences(userId),
          });
        }
        return pref as NotificationPreferenceEntity;
      } catch (err) {
        this.logger.warn(`Prisma error fetching preferences: ${err}. Using memory store.`);
      }
    }

    if (!this.memoryPreferences.has(userId)) {
      this.memoryPreferences.set(userId, this.getDefaultPreferences(userId));
    }
    return this.memoryPreferences.get(userId)!;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceEntity> {
    if (this.prisma.isConnected) {
      try {
        const existing = await this.prisma.notificationPreference.findUnique({
          where: { userId },
        });

        let updated;
        if (!existing) {
          updated = await this.prisma.notificationPreference.create({
            data: {
              ...this.getDefaultPreferences(userId),
              ...dto,
            },
          });
        } else {
          updated = await this.prisma.notificationPreference.update({
            where: { userId },
            data: {
              ...dto,
              updatedAt: new Date(),
            },
          });
        }
        return updated as NotificationPreferenceEntity;
      } catch (err) {
        this.logger.warn(`Prisma error updating preferences: ${err}. Falling back to memory.`);
      }
    }

    const current = this.memoryPreferences.get(userId) || this.getDefaultPreferences(userId);
    const merged: NotificationPreferenceEntity = {
      ...current,
      ...dto,
      updatedAt: new Date(),
    };
    this.memoryPreferences.set(userId, merged);
    return merged;
  }

  async resetPreferences(userId: string): Promise<NotificationPreferenceEntity> {
    const defaults = this.getDefaultPreferences(userId);

    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.notificationPreference.upsert({
          where: { userId },
          create: defaults,
          update: {
            ...defaults,
            updatedAt: new Date(),
          },
        });
        return updated as NotificationPreferenceEntity;
      } catch (err) {
        this.logger.warn(`Prisma error resetting preferences: ${err}`);
      }
    }

    this.memoryPreferences.set(userId, defaults);
    return defaults;
  }

  // ==========================================================================
  // 2. USER NOTIFICATIONS (IN-APP & HISTORY)
  // ==========================================================================

  async getUserNotifications(userId: string, query: QueryNotificationsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    if (this.prisma.isConnected) {
      try {
        const where: any = { userId };
        if (query.unreadOnly) {
          where.isRead = false;
        }

        const [notifications, total] = await Promise.all([
          this.prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          this.prisma.notification.count({ where }),
        ]);

        return {
          notifications,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        };
      } catch (err) {
        this.logger.warn(`Prisma error fetching notifications: ${err}. Using memory.`);
      }
    }

    // In-memory fallback
    let all = Array.from(this.memoryNotifications.values()).filter((n) => n.userId === userId);
    if (query.unreadOnly) {
      all = all.filter((n) => !n.isRead);
    }
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = all.length;
    const paged = all.slice(skip, skip + limit);

    return {
      notifications: paged,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    if (this.prisma.isConnected) {
      try {
        const count = await this.prisma.notification.count({
          where: { userId, isRead: false },
        });
        return { unreadCount: count };
      } catch {
        // Fallback
      }
    }

    const count = Array.from(this.memoryNotifications.values()).filter(
      (n) => n.userId === userId && !n.isRead,
    ).length;
    return { unreadCount: count };
  }

  async markAsRead(userId: string, notificationId: string) {
    if (this.prisma.isConnected) {
      try {
        const notification = await this.prisma.notification.findUnique({
          where: { id: notificationId },
        });
        if (!notification) throw new NotFoundException('Notification not found');
        if (notification.userId !== userId) throw new ForbiddenException();

        return await this.prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true, readAt: new Date() },
        });
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      }
    }

    const n = this.memoryNotifications.get(notificationId);
    if (!n) throw new NotFoundException('Notification not found');
    if (n.userId !== userId) throw new ForbiddenException();

    n.isRead = true;
    n.readAt = new Date();
    this.memoryNotifications.set(notificationId, n);
    return n;
  }

  async markAllAsRead(userId: string) {
    if (this.prisma.isConnected) {
      try {
        await this.prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
        return { success: true };
      } catch {
        // Fallback
      }
    }

    for (const [id, n] of this.memoryNotifications.entries()) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        n.readAt = new Date();
        this.memoryNotifications.set(id, n);
      }
    }
    return { success: true };
  }

  async deleteNotification(userId: string, notificationId: string) {
    if (this.prisma.isConnected) {
      try {
        const n = await this.prisma.notification.findUnique({ where: { id: notificationId } });
        if (!n) throw new NotFoundException('Notification not found');
        if (n.userId !== userId) throw new ForbiddenException();

        await this.prisma.notification.delete({ where: { id: notificationId } });
        return { success: true };
      } catch (err: any) {
        if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      }
    }

    const n = this.memoryNotifications.get(notificationId);
    if (!n) throw new NotFoundException('Notification not found');
    if (n.userId !== userId) throw new ForbiddenException();

    this.memoryNotifications.delete(notificationId);
    return { success: true };
  }

  async clearAllRead(userId: string) {
    if (this.prisma.isConnected) {
      try {
        await this.prisma.notification.deleteMany({
          where: { userId, isRead: true },
        });
        return { success: true };
      } catch {
        // Fallback
      }
    }

    for (const [id, n] of this.memoryNotifications.entries()) {
      if (n.userId === userId && n.isRead) {
        this.memoryNotifications.delete(id);
      }
    }
    return { success: true };
  }

  // ==========================================================================
  // 3. SMART REMINDER SCHEDULING (BULLMQ JOBS)
  // ==========================================================================

  /**
   * Schedule a reminder using exact delay calculations
   */
  async scheduleReminder(userId: string, dto: CreateReminderDto) {
    const reminderId = crypto.randomUUID();

    // Determine target and trigger times
    let targetTime = dto.targetTime ? new Date(dto.targetTime) : new Date();
    let triggerTime: Date;

    if (dto.triggerTime) {
      triggerTime = new Date(dto.triggerTime);
    } else if (dto.timing && TIMING_OFFSETS_MS[dto.timing]) {
      const offset = TIMING_OFFSETS_MS[dto.timing];
      triggerTime = new Date(targetTime.getTime() - offset);
    } else {
      // Default to 15 minutes before target time
      triggerTime = new Date(targetTime.getTime() - TIMING_OFFSETS_MS[NotificationTiming.FIFTEEN_MINUTES]);
    }

    const now = Date.now();
    const delayMs = Math.max(0, triggerTime.getTime() - now);

    const reminderRecord: ReminderEntity = {
      id: reminderId,
      userId,
      title: dto.title,
      category: dto.category,
      timing: dto.timing,
      triggerTime,
      targetTime,
      isSent: false,
      taskId: dto.taskId,
      calendarEventId: dto.calendarEventId,
      examId: dto.examId,
      habitId: dto.habitId,
      isRecurring: dto.isRecurring || false,
      createdAt: new Date(),
    };

    // Save reminder entity
    if (this.prisma.isConnected) {
      try {
        await this.prisma.reminder.create({
          data: {
            id: reminderId,
            userId,
            title: dto.title,
            triggerTime,
            taskId: dto.taskId || null,
            calendarEventId: dto.calendarEventId || null,
            examId: dto.examId || null,
            habitId: dto.habitId || null,
            isSent: false,
          },
        });
      } catch (err) {
        this.logger.warn(`Could not persist reminder in Prisma: ${err}. Using memory.`);
      }
    }
    this.memoryReminders.set(reminderId, reminderRecord);

    // Schedule background job via BullMQ / Scheduler
    const jobData: NotificationJobData = {
      jobId: `rem_${reminderId}`,
      jobType: NotificationJobType.PROCESS_REMINDER,
      userId,
      category: dto.category,
      title: dto.title,
      message: dto.description || `Reminder for ${dto.category.toLowerCase().replace(/_/g, ' ')}`,
      reminderId,
      entityId: dto.taskId || dto.examId || dto.habitId || dto.calendarEventId,
      entityType: dto.category,
    };

    const scheduledJob = await this.queueService.scheduleDelayedJob(
      `rem_${reminderId}`,
      jobData,
      delayMs,
    );

    return {
      reminder: reminderRecord,
      job: scheduledJob,
    };
  }

  /**
   * Schedule recurring reminders (e.g., Water reminder every N minutes, Habit daily)
   */
  async scheduleRecurringReminder(userId: string, dto: CreateRecurringReminderDto) {
    const recurringId = crypto.randomUUID();
    const intervalMs = (dto.intervalMinutes || 120) * 60 * 1000;

    const jobData: NotificationJobData = {
      jobId: `recurring_${recurringId}`,
      jobType: NotificationJobType.RECURRING_REMINDER,
      userId,
      category: dto.category,
      title: dto.title,
      message: dto.message || `Time for your scheduled ${dto.category.toLowerCase().replace(/_/g, ' ')}!`,
      entityId: dto.entityId,
      entityType: dto.category,
      isRecurring: true,
      intervalMs,
    };

    const result = await this.queueService.scheduleRecurringJob(
      `recurring_${recurringId}`,
      jobData,
      intervalMs,
    );

    return {
      recurringId,
      category: dto.category,
      intervalMinutes: dto.intervalMinutes || 120,
      nextTriggerInMs: intervalMs,
      job: result,
    };
  }

  async getUserReminders(userId: string) {
    if (this.prisma.isConnected) {
      try {
        const reminders = await this.prisma.reminder.findMany({
          where: { userId },
          orderBy: { triggerTime: 'asc' },
        });
        return reminders;
      } catch {
        // Fallback
      }
    }

    return Array.from(this.memoryReminders.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => a.triggerTime.getTime() - b.triggerTime.getTime());
  }

  async cancelReminder(userId: string, reminderId: string) {
    const reminder = this.memoryReminders.get(reminderId);
    if (reminder && reminder.userId !== userId) throw new ForbiddenException();

    await this.queueService.cancelJob(`rem_${reminderId}`);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.reminder.delete({ where: { id: reminderId } });
      } catch {
        // Fallback
      }
    }

    this.memoryReminders.delete(reminderId);
    return { success: true };
  }

  /**
   * Handle job processing with user preferences check, storage, and websocket dispatch
   */
  async handleProcessJob(data: NotificationJobData, attemptNumber: number = 1): Promise<any> {
    this.logger.log(
      `Executing notification job: [${data.category}] "${data.title}" for user ${data.userId} (Attempt #${attemptNumber})`,
    );

    // 1. Check simulated failure hook for testing retry behavior
    if (data.simulateFailure) {
      const remaining = data.failTimesRemaining ?? 1;
      if (remaining > 0) {
        data.failTimesRemaining = remaining - 1;
        throw new Error(
          `Simulated job execution error on purpose (Failures remaining: ${data.failTimesRemaining})`,
        );
      }
      this.logger.log(
        `Simulated failure exhausted. Job is now succeeding on retry attempt #${attemptNumber}`,
      );
    }

    // 2. Fetch User Notification Preferences
    const pref = await this.getPreferences(data.userId);
    const categoryKeyMap: Record<NotificationCategory, keyof NotificationPreferenceEntity> = {
      [NotificationCategory.UPCOMING_TASK]: 'upcomingTask',
      [NotificationCategory.TASK_STARTING]: 'taskStarting',
      [NotificationCategory.OVERDUE_TASK]: 'overdueTask',
      [NotificationCategory.DEADLINE_APPROACHING]: 'deadlineApproaching',
      [NotificationCategory.HABIT_REMINDER]: 'habitReminder',
      [NotificationCategory.WATER_REMINDER]: 'waterReminder',
      [NotificationCategory.MEAL_REMINDER]: 'mealReminder',
      [NotificationCategory.STUDY_REMINDER]: 'studyReminder',
      [NotificationCategory.EXAM_REMINDER]: 'examReminder',
      [NotificationCategory.GOAL_REMINDER]: 'goalReminder',
    };

    const prefKey = categoryKeyMap[data.category];
    if (prefKey && pref[prefKey] === false) {
      this.logger.log(
        `[Preference Filter] Notification category "${data.category}" is disabled by user ${data.userId}. Suppressed.`,
      );
      return { status: 'suppressed', reason: 'CATEGORY_DISABLED' };
    }

    // 3. Create Notification entity in memory and DB
    const notifId = crypto.randomUUID();
    const notificationPayload = {
      id: notifId,
      userId: data.userId,
      type: 'REMINDER' as const,
      title: data.title,
      message: data.message,
      data: {
        category: data.category,
        reminderId: data.reminderId,
        entityId: data.entityId,
        entityType: data.entityType,
        jobType: data.jobType,
        metadata: data.data,
      },
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    };

    // Store in memoryNotifications map
    this.memoryNotifications.set(notifId, notificationPayload);

    if (this.prisma.isConnected) {
      try {
        await this.prisma.notification.create({
          data: {
            id: notificationPayload.id,
            userId: notificationPayload.userId,
            title: notificationPayload.title,
            message: notificationPayload.message,
            data: notificationPayload.data,
            isRead: false,
          },
        });
      } catch (err) {
        this.logger.warn(`Prisma create notification error: ${err}`);
      }
    }

    // 4. Update reminder if exists
    if (data.reminderId) {
      const rem = this.memoryReminders.get(data.reminderId);
      if (rem) {
        rem.isSent = true;
        rem.sentAt = new Date();
      }
      if (this.prisma.isConnected) {
        try {
          await this.prisma.reminder.update({
            where: { id: data.reminderId },
            data: { isSent: true, sentAt: new Date() },
          });
        } catch {}
      }
    }

    // 5. Broadcast to connected browser clients via WebSocket Gateway
    const gateway = (this.queueService as any).gateway;
    if (gateway) {
      gateway.sendNotificationToUser(data.userId, notificationPayload);
    }

    return {
      status: 'delivered',
      notification: notificationPayload,
    };
  }

  /**
   * Immediately trigger a reminder for testing or immediate execution
   */
  async triggerReminderImmediately(userId: string, reminderId: string) {
    const reminder = this.memoryReminders.get(reminderId);
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.userId !== userId) throw new ForbiddenException();

    const jobData: NotificationJobData = {
      jobId: `immediate_${reminderId}_${Date.now()}`,
      jobType: NotificationJobType.PROCESS_REMINDER,
      userId,
      category: reminder.category,
      title: reminder.title,
      message: `[Test Trigger] ${reminder.title}`,
      reminderId,
    };

    return await this.queueService.processJob(jobData, 1);
  }

  /**
   * Hook for testing failed jobs and retry behavior with BullMQ / Scheduler
   */
  async testJobFailureAndRetry(userId: string, failTimes: number = 2) {
    const testJobId = `test_retry_${crypto.randomUUID()}`;

    const jobData: NotificationJobData = {
      jobId: testJobId,
      jobType: NotificationJobType.TEST_RETRY_JOB,
      userId,
      category: NotificationCategory.UPCOMING_TASK,
      title: 'Test Resilience Job',
      message: 'Testing automatic exponential backoff retry and failure handling',
      simulateFailure: true,
      failTimesRemaining: failTimes,
      totalAttemptsMade: 0,
    };

    // Schedule job to execute immediately so retries begin right away
    const job = await this.queueService.scheduleDelayedJob(testJobId, jobData, 0);

    return {
      message: `Simulated job failure test queued with ${failTimes} deliberate failures before succeeding`,
      jobId: testJobId,
      job,
    };
  }

  async getQueueStats() {
    return await this.queueService.getQueueStats();
  }

  async getFailedJobs() {
    return await this.queueService.getFailedJobs();
  }

  async retryFailedJob(jobId: string) {
    const success = await this.queueService.retryFailedJob(jobId);
    return { success, jobId };
  }

  async retryAllFailedJobs() {
    const count = await this.queueService.retryAllFailedJobs();
    return { retriedCount: count };
  }
}
