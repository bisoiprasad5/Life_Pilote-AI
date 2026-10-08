import { api } from './api';
import { Task } from './tasks-api';

export interface ParsedTaskData {
  title: string;
  date?: string | null;
  time?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  category: 'STUDY' | 'WORK' | 'PERSONAL' | 'HEALTH' | 'FITNESS' | 'FINANCE' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isRecurring: boolean;
  recurrenceInterval?: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM' | 'NONE' | null;
  recurrenceRule?: string | null;
  deadline?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  tags: string[];
}

export interface ParseTaskResponse {
  success: boolean;
  intent: string;
  task: ParsedTaskData;
  autoCreated: boolean;
  createdTask?: Task | null;
  providerUsed?: string;
  confidence?: number;
}

export interface ParseTaskOptions {
  timezone?: string;
  referenceDate?: string;
  autoCreate?: boolean;
}

export interface RecommendedTaskAction {
  id?: string | null;
  title: string;
  reason: string;
  estimatedDuration: string;
  priority: string;
  category: string;
  description?: string | null;
  subtasks?: string[];
}

export interface NextTaskAction {
  title: string;
  estimatedDuration: string;
  reason: string;
}

export interface ScheduleConflict {
  type: string;
  description: string;
  severity: string;
}

export interface WhatToDoNowResponse {
  success: boolean;
  availableTimeMinutes: number;
  availableTimeFormatted: string;
  recommendedTask: RecommendedTaskAction;
  reason: string;
  estimatedDuration: string;
  priority: string;
  nextTask: NextTaskAction;
  conflicts: ScheduleConflict[];
  summaryText: string;
  providerUsed: string;
  autoMutated: boolean;
}

export interface WhatToDoNowOptions {
  currentTime?: string;
  timezone?: string;
  customAvailableMinutes?: number;
  tasks?: any[];
  schedule?: any[];
  habits?: any[];
  studyGoals?: any[];
}

export const aiApi = {
  /**
   * Send natural language task input to NestJS backend for AI parsing and validation.
   * The frontend NEVER calls the LLM provider directly.
   */
  async parseTask(text: string, options?: ParseTaskOptions): Promise<ParseTaskResponse> {
    const tz = options?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const response = await api.post('/ai/task-parser', {
      text,
      timezone: tz,
      referenceDate: options?.referenceDate,
      autoCreate: options?.autoCreate ?? false,
    });
    return response.data;
  },

  /**
   * STEP 12: "What should I do now?"
   * Asks the AI planner for the best next action based on current user time,
   * schedule, pending tasks, deadlines, priorities, available free time,
   * habits/study goals, and detected conflicts.
   *
   * Crucial safety constraint:
   * Tasks are NEVER modified or created automatically without user confirmation.
   */
  async getWhatToDoNow(options?: WhatToDoNowOptions): Promise<WhatToDoNowResponse> {
    const tz = options?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const nowIso = options?.currentTime || new Date().toISOString();

    const response = await api.post('/ai/what-to-do-now', {
      currentTime: nowIso,
      timezone: tz,
      customAvailableMinutes: options?.customAvailableMinutes,
      tasks: options?.tasks,
      schedule: options?.schedule,
      habits: options?.habits,
      studyGoals: options?.studyGoals,
    });

    return response.data;
  },

  /**
   * Get list of active AI providers configured in the backend
   */
  async getProviders(): Promise<any> {
    const response = await api.get('/ai/providers');
    return response.data;
  },

  /**
   * STEP 13: AI Daily Planner
   * Generates an optimized, collision-free daily schedule analyzing:
   * Tasks, Deadlines, Priorities, Available Time, Calendar, Habits, Study Goals,
   * User Preferences, Previous Productivity, and Missed Tasks.
   */
  async generateDailyPlan(options?: GenerateDailyPlanOptions): Promise<DailyPlanResponse> {
    const tz = options?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const nowIso = options?.currentTime || new Date().toISOString();
    const targetDate = options?.targetDate || nowIso.split('T')[0];

    const response = await api.post('/ai/daily-plan/generate', {
      targetDate,
      currentTime: nowIso,
      timezone: tz,
      tasks: options?.tasks,
      missedTasks: options?.missedTasks,
      calendarEvents: options?.calendarEvents,
      habits: options?.habits,
      studyGoals: options?.studyGoals,
      userPreferences: options?.userPreferences,
      previousProductivity: options?.previousProductivity,
    });

    return response.data;
  },

  /**
   * Applies the approved Daily Plan schedule to existing tasks and creates calendar slots.
   * STRICT SAFETY GUARANTEE: Never modifies important deadlines!
   */
  async applyDailyPlan(payload: ApplyDailyPlanPayload): Promise<any> {
    const response = await api.post('/ai/daily-plan/apply', payload);
    return response.data;
  },
};

// =============================================================================
// STEP 13: DAILY PLAN TYPES
// =============================================================================

export interface DailyPlanSlot {
  id: string;
  slotType: 'TASK' | 'CALENDAR_EVENT' | 'HABIT' | 'STUDY_SESSION' | 'BREAK' | 'LUNCH_BREAK' | 'REVIEW';
  taskId?: string | null;
  title: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationMinutes: number;
  priority?: string;
  category?: string;
  isFixed?: boolean;
  reason?: string;
  deadline?: string | null;
  status?: string;
}

export interface TaskChangeItem {
  taskId: string;
  taskTitle: string;
  changeType: 'SCHEDULED' | 'RESCHEDULED' | 'DURATION_ADJUSTED' | 'UNCHANGED' | 'POSTPONED';
  previousStartTime?: string | null;
  newStartTime?: string | null;
  previousEndTime?: string | null;
  newEndTime?: string | null;
  deadline?: string | null; // Strictly preserved
  reason: string;
}

export interface DailyPlanResponse {
  success: boolean;
  date: string;
  totalAvailableMinutes: number;
  scheduledTaskMinutes: number;
  breakMinutes: number;
  fixedEventMinutes: number;
  productivityScoreExpected: number;
  slots: DailyPlanSlot[];
  changes: TaskChangeItem[];
  warnings: string[];
  summary: string;
  deadlinesPreserved: boolean;
  providerUsed: string;
}

export interface GenerateDailyPlanOptions {
  targetDate?: string;
  currentTime?: string;
  timezone?: string;
  tasks?: any[];
  missedTasks?: any[];
  calendarEvents?: any[];
  habits?: any[];
  studyGoals?: any[];
  userPreferences?: any;
  previousProductivity?: any;
}

export interface ApplyDailyPlanPayload {
  targetDate: string;
  slots: DailyPlanSlot[];
  changes?: TaskChangeItem[];
}

