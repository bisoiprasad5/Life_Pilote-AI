export interface SubTaskEntity {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TaskEntity {
  id: string;
  userId: string;
  categoryId?: string | null;
  category: 'STUDY' | 'WORK' | 'PERSONAL' | 'HEALTH' | 'FITNESS' | 'FINANCE' | 'OTHER';
  title: string;
  description?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  deadline?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  estimatedDuration?: number | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  isAllDay: boolean;
  isRecurring: boolean;
  recurringSchedule?: {
    isRecurring?: boolean;
    interval?: string;
    rule?: string;
  } | null;
  reminder?: {
    triggerTime?: string;
    channel?: string;
  } | null;
  reminderTime?: string | null;
  notes?: string | null;
  tags: string[];
  subtasks: SubTaskEntity[];
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
