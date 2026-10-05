import { api } from './api';

export interface CalendarEvent {
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
  category?: 'EVENT' | 'WORK' | 'STUDY' | 'MEAL' | 'HABIT' | 'DEADLINE' | 'OTHER';
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

export interface CreateEventPayload {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  isAllDay?: boolean;
  color?: string;
  category?: 'EVENT' | 'WORK' | 'STUDY' | 'MEAL' | 'HABIT' | 'DEADLINE' | 'OTHER';
}

export interface UpdateEventPayload extends Partial<CreateEventPayload> {}

export interface QueryCalendarParams {
  startDate?: string;
  endDate?: string;
  type?: string;
  search?: string;
}

export const calendarApi = {
  // 1. Get calendar events
  async getEvents(params?: QueryCalendarParams): Promise<{ data: CalendarEvent[] }> {
    const response = await api.get('/calendar/events', { params });
    return response.data;
  },

  // 2. Create calendar event
  async createEvent(payload: CreateEventPayload): Promise<{ data: CalendarEvent; message: string }> {
    const response = await api.post('/calendar/events', payload);
    return response.data;
  },

  // 3. Get single event
  async getEvent(id: string): Promise<{ data: CalendarEvent }> {
    const response = await api.get(`/calendar/events/${id}`);
    return response.data;
  },

  // 4. Update event
  async updateEvent(id: string, payload: UpdateEventPayload): Promise<{ data: CalendarEvent; message: string }> {
    const response = await api.put(`/calendar/events/${id}`, payload);
    return response.data;
  },

  // 5. Delete event
  async deleteEvent(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/calendar/events/${id}`);
    return response.data;
  },

  // 6. Get Unified Schedule (Events, Tasks, Deadlines, Study, Meals, Habits)
  async getUnifiedSchedule(params?: QueryCalendarParams): Promise<{ data: UnifiedScheduleItem[]; conflictsCount: number }> {
    const response = await api.get('/calendar/schedule', { params });
    return response.data;
  },

  // 7. Check Conflicts
  async checkConflicts(
    startTime: string,
    endTime: string,
    excludeEventId?: string,
  ): Promise<{ hasConflict: boolean; conflicts: { id: string; title: string; startTime: string; endTime: string }[] }> {
    const response = await api.post('/calendar/check-conflicts', {
      startTime,
      endTime,
      excludeEventId,
    });
    return response.data;
  },
};
