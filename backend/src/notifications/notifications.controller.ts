import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preferences.dto';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { CreateRecurringReminderDto } from './dto/recurring-reminder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private extractUserId(user: any): string {
    return typeof user === 'string' ? user : user?.id || user?.userId || user?.sub;
  }

  // ==========================================================================
  // NOTIFICATIONS LIST & MANAGEMENT
  // ==========================================================================

  @Get()
  @HttpCode(HttpStatus.OK)
  async getNotifications(
    @CurrentUser() user: any,
    @Query() query: QueryNotificationsDto,
  ) {
    const userId = this.extractUserId(user);
    const result = await this.notificationsService.getUserNotifications(userId, query);
    return {
      success: true,
      data: result.notifications,
      meta: result.pagination,
    };
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@CurrentUser() user: any) {
    const userId = this.extractUserId(user);
    const result = await this.notificationsService.getUnreadCount(userId);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') notificationId: string,
  ) {
    const userId = this.extractUserId(user);
    const updated = await this.notificationsService.markAsRead(userId, notificationId);
    return {
      success: true,
      data: updated,
    };
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: any) {
    const userId = this.extractUserId(user);
    await this.notificationsService.markAllAsRead(userId);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Delete('clear-all')
  @HttpCode(HttpStatus.OK)
  async clearAllRead(@CurrentUser() user: any) {
    const userId = this.extractUserId(user);
    await this.notificationsService.clearAllRead(userId);
    return {
      success: true,
      message: 'All read notifications cleared',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @CurrentUser() user: any,
    @Param('id') notificationId: string,
  ) {
    const userId = this.extractUserId(user);
    await this.notificationsService.deleteNotification(userId, notificationId);
    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  // ==========================================================================
  // NOTIFICATION PREFERENCES
  // ==========================================================================

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  async getPreferences(@CurrentUser() user: any) {
    const userId = this.extractUserId(user);
    const preferences = await this.notificationsService.getPreferences(userId);
    return {
      success: true,
      data: preferences,
    };
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const userId = this.extractUserId(user);
    const updated = await this.notificationsService.updatePreferences(userId, dto);
    return {
      success: true,
      data: updated,
      message: 'Notification preferences updated successfully',
    };
  }

  @Post('preferences/reset')
  @HttpCode(HttpStatus.OK)
  async resetPreferences(@CurrentUser() user: any) {
    const userId = this.extractUserId(user);
    const reset = await this.notificationsService.resetPreferences(userId);
    return {
      success: true,
      data: reset,
      message: 'Notification preferences reset to defaults',
    };
  }

  // ==========================================================================
  // SMART REMINDERS & BACKGROUND SCHEDULING
  // ==========================================================================

  @Post('reminders/schedule')
  @HttpCode(HttpStatus.CREATED)
  async scheduleReminder(
    @CurrentUser() user: any,
    @Body() dto: CreateReminderDto,
  ) {
    const userId = this.extractUserId(user);
    const result = await this.notificationsService.scheduleReminder(userId, dto);
    return {
      success: true,
      data: result,
      message: `Scheduled ${dto.category} reminder successfully`,
    };
  }

  @Get('reminders')
  @HttpCode(HttpStatus.OK)
  async getReminders(@CurrentUser() user: any) {
    const userId = this.extractUserId(user);
    const reminders = await this.notificationsService.getUserReminders(userId);
    return {
      success: true,
      data: reminders,
    };
  }

  @Delete('reminders/:id')
  @HttpCode(HttpStatus.OK)
  async cancelReminder(
    @CurrentUser() user: any,
    @Param('id') reminderId: string,
  ) {
    const userId = this.extractUserId(user);
    await this.notificationsService.cancelReminder(userId, reminderId);
    return {
      success: true,
      message: 'Reminder cancelled successfully',
    };
  }

  @Post('reminders/test-trigger/:id')
  @HttpCode(HttpStatus.OK)
  async triggerReminderImmediately(
    @CurrentUser() user: any,
    @Param('id') reminderId: string,
  ) {
    const userId = this.extractUserId(user);
    const result = await this.notificationsService.triggerReminderImmediately(userId, reminderId);
    return {
      success: true,
      data: result,
      message: 'Reminder triggered immediately for test execution',
    };
  }

  @Post('reminders/recurring')
  @HttpCode(HttpStatus.CREATED)
  async scheduleRecurring(
    @CurrentUser() user: any,
    @Body() dto: CreateRecurringReminderDto,
  ) {
    const userId = this.extractUserId(user);
    const result = await this.notificationsService.scheduleRecurringReminder(userId, dto);
    return {
      success: true,
      data: result,
      message: `Recurring ${dto.category} reminder registered successfully`,
    };
  }

  // ==========================================================================
  // QUEUE MONITORING, FAILED JOBS & RETRY BEHAVIOR
  // ==========================================================================

  @Get('jobs/stats')
  @HttpCode(HttpStatus.OK)
  async getJobStats() {
    const stats = await this.notificationsService.getQueueStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get('jobs/failed')
  @HttpCode(HttpStatus.OK)
  async getFailedJobs() {
    const failedJobs = await this.notificationsService.getFailedJobs();
    return {
      success: true,
      data: failedJobs,
    };
  }

  @Post('jobs/retry-failed')
  @HttpCode(HttpStatus.OK)
  async retryAllFailedJobs() {
    const result = await this.notificationsService.retryAllFailedJobs();
    return {
      success: true,
      data: result,
      message: `Retried ${result.retriedCount} failed jobs`,
    };
  }

  @Post('jobs/retry/:jobId')
  @HttpCode(HttpStatus.OK)
  async retrySingleFailedJob(@Param('jobId') jobId: string) {
    const result = await this.notificationsService.retryFailedJob(jobId);
    return {
      success: result.success,
      data: result,
    };
  }

  @Post('jobs/test-fail-retry')
  @HttpCode(HttpStatus.OK)
  async testFailAndRetry(
    @CurrentUser() user: any,
    @Query('failTimes') failTimes?: string,
  ) {
    const userId = this.extractUserId(user);
    const times = failTimes ? parseInt(failTimes, 10) : 2;
    const result = await this.notificationsService.testJobFailureAndRetry(userId, times);
    return {
      success: true,
      data: result,
    };
  }
}
