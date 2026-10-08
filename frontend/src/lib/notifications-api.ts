import { api } from './api';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: {
    category?: string;
    reminderId?: string;
    entityId?: string;
    entityType?: string;
    jobType?: string;
    metadata?: any;
  };
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  id?: string;
  userId?: string;
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
}

export interface ReminderItem {
  id: string;
  title: string;
  category: string;
  timing?: string;
  triggerTime: string;
  targetTime?: string;
  isSent: boolean;
  sentAt?: string | null;
}

export const notificationsApi = {
  // Query notifications
  getNotifications: async (params?: { unreadOnly?: boolean; category?: string; page?: number; limit?: number }) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count');
    return res.data.data.unreadCount as number;
  },

  markAsRead: async (id: string) => {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.patch('/notifications/mark-all-read');
    return res.data;
  },

  deleteNotification: async (id: string) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },

  clearAllRead: async () => {
    const res = await api.delete('/notifications/clear-all');
    return res.data;
  },

  // Preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    const res = await api.get('/notifications/preferences');
    return res.data.data;
  },

  updatePreferences: async (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const res = await api.patch('/notifications/preferences', data);
    return res.data.data;
  },

  resetPreferences: async (): Promise<NotificationPreferences> => {
    const res = await api.post('/notifications/preferences/reset');
    return res.data.data;
  },

  // Reminders
  scheduleReminder: async (data: {
    title: string;
    category: string;
    timing?: string;
    targetTime?: string;
    triggerTime?: string;
    description?: string;
    taskId?: string;
  }) => {
    const res = await api.post('/notifications/reminders/schedule', data);
    return res.data;
  },

  getReminders: async (): Promise<ReminderItem[]> => {
    const res = await api.get('/notifications/reminders');
    return res.data.data;
  },

  cancelReminder: async (id: string) => {
    const res = await api.delete(`/notifications/reminders/${id}`);
    return res.data;
  },

  triggerReminderTest: async (id: string) => {
    const res = await api.post(`/notifications/reminders/test-trigger/${id}`);
    return res.data;
  },

  scheduleRecurring: async (data: {
    title: string;
    category: string;
    intervalMinutes?: number;
    message?: string;
  }) => {
    const res = await api.post('/notifications/reminders/recurring', data);
    return res.data;
  },

  getQueueStats: async () => {
    const res = await api.get('/notifications/jobs/stats');
    return res.data.data;
  },
};
