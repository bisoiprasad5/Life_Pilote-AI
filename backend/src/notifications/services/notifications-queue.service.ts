import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  NotificationCategory,
  NotificationJobType,
  NOTIFICATION_QUEUE_NAME,
} from '../notifications.constants';
import { NotificationsGateway } from '../notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export interface NotificationJobData {
  jobId?: string;
  jobType: NotificationJobType;
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  data?: any;
  reminderId?: string;
  entityId?: string;
  entityType?: string;
  // Testing hooks for failure & retry validation
  simulateFailure?: boolean;
  failTimesRemaining?: number;
  totalAttemptsMade?: number;
  // Recurring metadata
  isRecurring?: boolean;
  intervalMs?: number;
}

export interface InMemJobRecord {
  id: string;
  name: string;
  data: NotificationJobData;
  delayMs: number;
  scheduledTime: number;
  timerRef?: NodeJS.Timeout;
  repeatTimerRef?: NodeJS.Timeout;
  status: 'waiting' | 'delayed' | 'active' | 'completed' | 'failed';
  attemptsMade: number;
  maxAttempts: number;
  failedReason?: string;
  createdAt: number;
  completedAt?: number;
  failedAt?: number;
}

@Injectable()
export class NotificationsQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsQueueService.name);

  // BullMQ instances (when Redis is available)
  private redisClient: Redis | null = null;
  private bullQueue: Queue | null = null;
  private bullWorker: Worker | null = null;
  private isRedisActive = false;

  // Fallback In-Memory Job Engine (active when Redis is unavailable or for testing)
  private memoryJobs = new Map<string, InMemJobRecord>();
  private completedJobs: InMemJobRecord[] = [];
  private failedJobs: InMemJobRecord[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    public readonly gateway: NotificationsGateway,
  ) {}

  async onModuleInit() {
    await this.initializeQueue();
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  private async initializeQueue() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = Number(this.configService.get<number>('REDIS_PORT', 6379));

    try {
      this.redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        retryStrategy: () => null, // Do not infinite retry in local dev if not present
        lazyConnect: true,
      });

      this.redisClient.on('error', () => {
        // Suppress noisy unhandled error event when Redis is offline
      });

      await this.redisClient.connect();
      const ping = await this.redisClient.ping();

      if (ping === 'PONG') {
        this.isRedisActive = true;
        this.logger.log(`✅ Redis connected at ${redisHost}:${redisPort}. Initializing BullMQ...`);

        // Initialize BullMQ Queue
        this.bullQueue = new Queue(NOTIFICATION_QUEUE_NAME, {
          connection: this.redisClient,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
            removeOnComplete: { count: 200 },
            removeOnFail: { count: 500 },
          },
        });

        // Initialize BullMQ Worker
        this.bullWorker = new Worker(
          NOTIFICATION_QUEUE_NAME,
          async (job: Job) => {
            return await this.processJob(job.data, job.attemptsMade);
          },
          {
            connection: this.redisClient,
            concurrency: 5,
          },
        );

        this.bullWorker.on('completed', (job: Job) => {
          this.logger.log(`[BullMQ] Job ${job.id} (${job.name}) completed successfully`);
        });

        this.bullWorker.on('failed', (job: Job | undefined, err: Error) => {
          this.logger.warn(
            `[BullMQ] Job ${job?.id} failed on attempt ${job?.attemptsMade}: ${err.message}`,
          );
        });

        this.logger.log('🚀 BullMQ Smart Notification Queue & Worker ready');
      }
    } catch (err: any) {
      this.isRedisActive = false;
      this.logger.warn(
        `⚠️ Redis offline (${err.message}). Activating In-Memory Background Job Scheduler with exact delay dispatching & retry engine.`,
      );
    }
  }

  private async shutdown() {
    // Clear in-memory timers
    for (const job of this.memoryJobs.values()) {
      if (job.timerRef) clearTimeout(job.timerRef);
      if (job.repeatTimerRef) clearInterval(job.repeatTimerRef);
    }
    this.memoryJobs.clear();

    if (this.bullWorker) {
      await this.bullWorker.close();
    }
    if (this.bullQueue) {
      await this.bullQueue.close();
    }
    if (this.redisClient && this.isRedisActive) {
      try {
        await this.redisClient.quit();
      } catch {}
    }
  }

  private processorCallback?: (data: NotificationJobData, attemptNumber: number) => Promise<any>;

  public setProcessorCallback(fn: (data: NotificationJobData, attemptNumber: number) => Promise<any>) {
    this.processorCallback = fn;
  }

  public getRedisStatus(): boolean {
    return this.isRedisActive;
  }

  /**
   * Schedule a delayed reminder job
   * Uses exact delay (triggerTime - Date.now()). No inefficient constant polling!
   */
  async scheduleDelayedJob(
    jobId: string,
    data: NotificationJobData,
    delayMs: number,
  ): Promise<{ id: string; scheduledAt: string; delayMs: number }> {
    const effectiveDelay = Math.max(0, delayMs);
    const scheduledTime = Date.now() + effectiveDelay;
    data.jobId = jobId;

    if (this.isRedisActive && this.bullQueue) {
      const job = await this.bullQueue.add(data.jobType, data, {
        jobId,
        delay: effectiveDelay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      this.logger.log(
        `[BullMQ] Scheduled delayed job ${job.id} for ${data.category} in ${effectiveDelay}ms`,
      );
      return {
        id: job.id || jobId,
        scheduledAt: new Date(scheduledTime).toISOString(),
        delayMs: effectiveDelay,
      };
    }

    // In-Memory Exact Delay Scheduling
    if (this.memoryJobs.has(jobId)) {
      this.cancelJob(jobId);
    }

    const jobRecord: InMemJobRecord = {
      id: jobId,
      name: data.jobType,
      data,
      delayMs: effectiveDelay,
      scheduledTime,
      status: effectiveDelay > 0 ? 'delayed' : 'waiting',
      attemptsMade: 0,
      maxAttempts: 3,
      createdAt: Date.now(),
    };

    const MAX_NODE_DELAY = 2147483647; // ~24.8 days max setTimeout
    const effectiveTimerDelay = Math.min(MAX_NODE_DELAY, effectiveDelay);

    if (effectiveDelay <= 0) {
      // Execute immediately on next tick
      setImmediate(() => this.executeMemoryJob(jobRecord));
    } else {
      jobRecord.timerRef = setTimeout(() => {
        const remaining = jobRecord.scheduledTime - Date.now();
        if (remaining > 1000) {
          jobRecord.delayMs = remaining;
          jobRecord.timerRef = setTimeout(
            () => this.executeMemoryJob(jobRecord),
            Math.min(MAX_NODE_DELAY, remaining),
          );
        } else {
          this.executeMemoryJob(jobRecord);
        }
      }, effectiveTimerDelay);
    }

    this.memoryJobs.set(jobId, jobRecord);
    this.logger.log(
      `[JobEngine] Scheduled delayed job ${jobId} for ${data.category} in ${effectiveDelay}ms (at ${new Date(
        scheduledTime,
      ).toISOString()})`,
    );

    return {
      id: jobId,
      scheduledAt: new Date(scheduledTime).toISOString(),
      delayMs: effectiveDelay,
    };
  }

  /**
   * Schedule a recurring reminder job (e.g., Water reminder every N minutes, Habit reminder)
   */
  async scheduleRecurringJob(
    jobId: string,
    data: NotificationJobData,
    intervalMs: number,
  ): Promise<{ id: string; intervalMs: number }> {
    data.jobId = jobId;
    data.isRecurring = true;
    data.intervalMs = intervalMs;

    if (this.isRedisActive && this.bullQueue) {
      await this.bullQueue.add(data.jobType, data, {
        jobId,
        repeat: {
          every: intervalMs,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
      this.logger.log(`[BullMQ] Registered recurring job ${jobId} every ${intervalMs}ms`);
      return { id: jobId, intervalMs };
    }

    // In-memory recurring job
    if (this.memoryJobs.has(jobId)) {
      this.cancelJob(jobId);
    }

    const jobRecord: InMemJobRecord = {
      id: jobId,
      name: data.jobType,
      data,
      delayMs: intervalMs,
      scheduledTime: Date.now() + intervalMs,
      status: 'waiting',
      attemptsMade: 0,
      maxAttempts: 3,
      createdAt: Date.now(),
    };

    jobRecord.repeatTimerRef = setInterval(async () => {
      this.logger.log(`[JobEngine] Recurring job ${jobId} triggered`);
      await this.processJob(data, 1);
    }, intervalMs);

    this.memoryJobs.set(jobId, jobRecord);
    this.logger.log(`[JobEngine] Registered recurring job ${jobId} every ${intervalMs}ms`);
    return { id: jobId, intervalMs };
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (this.isRedisActive && this.bullQueue) {
      const job = await this.bullQueue.getJob(jobId);
      if (job) {
        await job.remove();
        return true;
      }
    }

    const memoryJob = this.memoryJobs.get(jobId);
    if (memoryJob) {
      if (memoryJob.timerRef) clearTimeout(memoryJob.timerRef);
      if (memoryJob.repeatTimerRef) clearInterval(memoryJob.repeatTimerRef);
      this.memoryJobs.delete(jobId);
      return true;
    }

    return false;
  }

  /**
   * Execute an in-memory job with full attempt and retry backoff semantics
   */
  private async executeMemoryJob(job: InMemJobRecord) {
    job.status = 'active';
    job.attemptsMade++;

    try {
      await this.processJob(job.data, job.attemptsMade);
      job.status = 'completed';
      job.completedAt = Date.now();
      this.completedJobs.push(job);
      if (this.completedJobs.length > 200) this.completedJobs.shift();
      if (!job.data.isRecurring) {
        this.memoryJobs.delete(job.id);
      }
      this.logger.log(`[JobEngine] Job ${job.id} completed successfully`);
    } catch (err: any) {
      job.failedReason = err.message;
      this.logger.warn(
        `[JobEngine] Job ${job.id} failed on attempt ${job.attemptsMade}/${job.maxAttempts}: ${err.message}`,
      );

      if (job.attemptsMade < job.maxAttempts) {
        // Exponential backoff: 1000ms * 2^(attemptsMade - 1)
        const backoffDelay = 1000 * Math.pow(2, job.attemptsMade - 1);
        job.status = 'delayed';
        this.logger.log(
          `[JobEngine] Retrying job ${job.id} in ${backoffDelay}ms (attempt ${
            job.attemptsMade + 1
          })`,
        );

        job.timerRef = setTimeout(() => {
          this.executeMemoryJob(job);
        }, backoffDelay);
      } else {
        // Exceeded max attempts: mark as failed / dead letter
        job.status = 'failed';
        job.failedAt = Date.now();
        this.failedJobs.push(job);
        if (this.failedJobs.length > 200) this.failedJobs.shift();
        this.memoryJobs.delete(job.id);
        this.logger.error(`[JobEngine] Job ${job.id} permanently failed after ${job.attemptsMade} attempts`);
      }
    }
  }

  /**
   * Core Job Processing Logic:
   * 1. Simulated failure check (for retry & dead-letter tests)
   * 2. Category Preferences verification (suppress if disabled)
   * 3. Quiet Hours evaluation
   * 4. Persist Notification to DB / fallback
   * 5. Dispatch real-time WebSocket alert
   * 6. Mark Reminder as sent
   */
  async processJob(data: NotificationJobData, attemptNumber: number = 1): Promise<any> {
    if (this.processorCallback) {
      return await this.processorCallback(data, attemptNumber);
    }

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
      // If remaining reached 0, proceed to succeed on this retry!
      this.logger.log(`Simulated failure exhausted. Job is now succeeding on retry attempt #${attemptNumber}`);
    }

    // 2. Fetch User Notification Preferences to determine if category is enabled
    const categoryEnabled = await this.isCategoryEnabledForUser(data.userId, data.category);
    if (!categoryEnabled) {
      this.logger.log(
        `[Preference Filter] Notification category "${data.category}" is disabled by user ${data.userId}. Suppressed.`,
      );
      return { status: 'suppressed', reason: 'CATEGORY_DISABLED' };
    }

    // 3. Quiet hours check
    const isQuiet = await this.isQuietHourActiveForUser(data.userId);
    if (isQuiet) {
      this.logger.log(
        `[Quiet Hours] Notification suppressed or muted due to active quiet hours for user ${data.userId}`,
      );
    }

    // 4. Create Notification entity in database
    const notificationPayload = {
      id: crypto.randomUUID(),
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
      createdAt: new Date(),
    };

    let createdNotification: any = notificationPayload;

    if (this.prisma.isConnected) {
      try {
        createdNotification = await this.prisma.notification.create({
          data: {
            id: notificationPayload.id,
            userId: notificationPayload.userId,
            title: notificationPayload.title,
            message: notificationPayload.message,
            data: notificationPayload.data,
            isRead: false,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Could not save notification to Prisma: ${err.message}. Using in-memory record.`);
      }
    }

    // 5. Update reminder if reminderId is provided
    if (data.reminderId && this.prisma.isConnected) {
      try {
        await this.prisma.reminder.update({
          where: { id: data.reminderId },
          data: {
            isSent: true,
            sentAt: new Date(),
          },
        });
      } catch (err) {
        // Ignore if reminder model isn't populated in DB
      }
    }

    // 6. Broadcast via WebSocket Gateway to connected browser clients
    this.gateway.sendNotificationToUser(data.userId, createdNotification);

    return {
      status: 'delivered',
      notification: createdNotification,
    };
  }

  /**
   * Helper: Check if specific notification category is enabled in user preferences
   */
  private async isCategoryEnabledForUser(
    userId: string,
    category: NotificationCategory,
  ): Promise<boolean> {
    if (this.prisma.isConnected) {
      try {
        const pref = await this.prisma.notificationPreference.findUnique({
          where: { userId },
        });

        if (pref) {
          switch (category) {
            case NotificationCategory.UPCOMING_TASK:
              return pref.upcomingTask;
            case NotificationCategory.TASK_STARTING:
              return pref.taskStarting;
            case NotificationCategory.OVERDUE_TASK:
              return pref.overdueTask;
            case NotificationCategory.DEADLINE_APPROACHING:
              return pref.deadlineApproaching;
            case NotificationCategory.HABIT_REMINDER:
              return pref.habitReminder;
            case NotificationCategory.WATER_REMINDER:
              return pref.waterReminder;
            case NotificationCategory.MEAL_REMINDER:
              return pref.mealReminder;
            case NotificationCategory.STUDY_REMINDER:
              return pref.studyReminder;
            case NotificationCategory.EXAM_REMINDER:
              return pref.examReminder;
            case NotificationCategory.GOAL_REMINDER:
              return pref.goalReminder;
            default:
              return true;
          }
        }
      } catch (err) {
        // Fallback to true if table not queried
      }
    }

    // Default to enabled if no explicit opt-out
    return true;
  }

  /**
   * Helper: Check if quiet hours are currently active
   */
  private async isQuietHourActiveForUser(userId: string): Promise<boolean> {
    if (!this.prisma.isConnected) return false;
    try {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: { userId },
      });
      if (pref && pref.quietHoursEnabled && pref.quietHoursStart && pref.quietHoursEnd) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentMins = currentHours * 60 + currentMinutes;

        const [sH, sM] = pref.quietHoursStart.split(':').map(Number);
        const [eH, eM] = pref.quietHoursEnd.split(':').map(Number);
        const startMins = sH * 60 + sM;
        const endMins = eH * 60 + eM;

        if (startMins <= endMins) {
          return currentMins >= startMins && currentMins <= endMins;
        } else {
          // Overnight quiet hours (e.g. 22:00 to 07:00)
          return currentMins >= startMins || currentMins <= endMins;
        }
      }
    } catch {
      // Ignore
    }
    return false;
  }

  /**
   * Get queue statistics: waiting, active, delayed, completed, failed
   */
  async getQueueStats() {
    if (this.isRedisActive && this.bullQueue) {
      const [waiting, active, delayed, completed, failed] = await Promise.all([
        this.bullQueue.getWaitingCount(),
        this.bullQueue.getActiveCount(),
        this.bullQueue.getDelayedCount(),
        this.bullQueue.getCompletedCount(),
        this.bullQueue.getFailedCount(),
      ]);
      return {
        isRedisConnected: true,
        waiting,
        active,
        delayed,
        completed,
        failed,
      };
    }

    const waiting = Array.from(this.memoryJobs.values()).filter((j) => j.status === 'waiting').length;
    const active = Array.from(this.memoryJobs.values()).filter((j) => j.status === 'active').length;
    const delayed = Array.from(this.memoryJobs.values()).filter((j) => j.status === 'delayed').length;

    return {
      isRedisConnected: false,
      waiting,
      active,
      delayed,
      completed: this.completedJobs.length,
      failed: this.failedJobs.length,
    };
  }

  /**
   * Get failed jobs details
   */
  async getFailedJobs() {
    if (this.isRedisActive && this.bullQueue) {
      const jobs = await this.bullQueue.getFailed(0, 50);
      return jobs.map((j) => ({
        id: j.id,
        name: j.name,
        data: j.data,
        failedReason: j.failedReason,
        attemptsMade: j.attemptsMade,
        timestamp: j.timestamp,
      }));
    }

    return this.failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      failedAt: j.failedAt,
    }));
  }

  /**
   * Retry a single failed job
   */
  async retryFailedJob(jobId: string): Promise<boolean> {
    if (this.isRedisActive && this.bullQueue) {
      const job = await this.bullQueue.getJob(jobId);
      if (job) {
        await job.retry();
        return true;
      }
      return false;
    }

    const failedIndex = this.failedJobs.findIndex((j) => j.id === jobId);
    if (failedIndex >= 0) {
      const failedJob = this.failedJobs.splice(failedIndex, 1)[0];
      failedJob.attemptsMade = 0;
      failedJob.failedReason = undefined;
      failedJob.status = 'waiting';
      // Reset simulated failure if it was a test job
      if (failedJob.data.simulateFailure) {
        failedJob.data.simulateFailure = false;
      }
      this.memoryJobs.set(failedJob.id, failedJob);
      setImmediate(() => this.executeMemoryJob(failedJob));
      return true;
    }

    return false;
  }

  /**
   * Retry all failed jobs
   */
  async retryAllFailedJobs(): Promise<number> {
    if (this.isRedisActive && this.bullQueue) {
      const failed = await this.bullQueue.getFailed(0, 100);
      for (const job of failed) {
        await job.retry();
      }
      return failed.length;
    }

    const count = this.failedJobs.length;
    const toRetry = [...this.failedJobs];
    this.failedJobs = [];

    for (const job of toRetry) {
      job.attemptsMade = 0;
      job.failedReason = undefined;
      job.status = 'waiting';
      if (job.data.simulateFailure) {
        job.data.simulateFailure = false;
      }
      this.memoryJobs.set(job.id, job);
      setImmediate(() => this.executeMemoryJob(job));
    }

    return count;
  }
}
