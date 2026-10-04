import { api } from './api';

export interface SubTask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
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
  subtasks: SubTask[];
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface QueryTasksParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  search?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  deadline?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'STUDY' | 'WORK' | 'PERSONAL' | 'HEALTH' | 'FITNESS' | 'FINANCE' | 'OTHER';
  status?: 'TODO' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  estimatedDuration?: number;
  notes?: string;
  tags?: string[];
  subtasks?: { title: string; isCompleted?: boolean; order?: number }[];
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {}

export const tasksApi = {
  // Fetch tasks with query parameters
  async getTasks(params?: QueryTasksParams): Promise<{ data: Task[]; meta: PaginationMeta }> {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  // Create new task
  async createTask(payload: CreateTaskPayload): Promise<{ data: Task; message: string }> {
    const response = await api.post('/tasks', payload);
    return response.data;
  },

  // Get task by ID
  async getTask(id: string): Promise<{ data: Task }> {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  // Update existing task
  async updateTask(id: string, payload: UpdateTaskPayload): Promise<{ data: Task; message: string }> {
    const response = await api.put(`/tasks/${id}`, payload);
    return response.data;
  },

  // Delete task
  async deleteTask(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  // Toggle complete task
  async completeTask(id: string, completed: boolean = true): Promise<{ data: Task; message: string }> {
    const response = await api.patch(`/tasks/${id}/complete`, { completed });
    return response.data;
  },

  // Snooze task
  async snoozeTask(id: string, minutes?: number, until?: string): Promise<{ data: Task; message: string }> {
    const response = await api.patch(`/tasks/${id}/snooze`, { minutes, until });
    return response.data;
  },

  // Reschedule task
  async rescheduleTask(
    id: string,
    payload: { date?: string; startTime?: string; endTime?: string; deadline?: string },
  ): Promise<{ data: Task; message: string }> {
    const response = await api.patch(`/tasks/${id}/reschedule`, payload);
    return response.data;
  },

  // Duplicate task
  async duplicateTask(id: string): Promise<{ data: Task; message: string }> {
    const response = await api.post(`/tasks/${id}/duplicate`);
    return response.data;
  },

  // Add subtask
  async addSubtask(taskId: string, title: string): Promise<{ data: SubTask; message: string }> {
    const response = await api.post(`/tasks/${taskId}/subtasks`, { title });
    return response.data;
  },

  // Update/toggle subtask
  async updateSubtask(
    taskId: string,
    subtaskId: string,
    payload: { title?: string; isCompleted?: boolean; order?: number },
  ): Promise<{ data: SubTask; message: string }> {
    const response = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}`, payload);
    return response.data;
  },

  // Delete subtask
  async deleteSubtask(taskId: string, subtaskId: string): Promise<{ message: string }> {
    const response = await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return response.data;
  },
};
