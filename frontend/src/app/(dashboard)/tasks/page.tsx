'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tasksApi, Task } from '@/lib/tasks-api';
import { useAuthStore } from '@/store/auth-store';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';
import { QuickAddTaskModal } from '@/components/dashboard/quick-add-task-modal';
import { EditTaskModal } from '@/components/dashboard/edit-task-modal';
import { AiTaskParserBar } from '@/components/dashboard/ai-task-parser-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Flag,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function TasksPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODO' | 'COMPLETED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real database tasks from backend
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof tasksApi.getTasks>[0] = {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (categoryFilter !== 'ALL') {
        params.category = categoryFilter;
      }
      if (priorityFilter !== 'ALL') {
        params.priority = priorityFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await tasksApi.getTasks(params);
      setTasks(res.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch tasks';
      if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('session expired')) {
        router.push('/login');
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, priorityFilter, searchQuery, router]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Toggle complete
  const handleToggleComplete = async (taskId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: (nextCompleted ? 'COMPLETED' : 'TODO') as Task['status'],
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : t,
      ),
    );

    try {
      await tasksApi.completeTask(taskId, nextCompleted);
      loadTasks();
    } catch {
      // Revert if API failed
      loadTasks();
    }
  };

  // Quick Delete
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksApi.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete task');
      loadTasks();
    }
  };

  // Open edit modal
  const handleOpenEdit = (task: Task) => {
    setSelectedTaskForEdit(task);
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Smart Task Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real database tasks synchronized for {user?.fullName || 'User'}
          </p>
        </div>

        <button
          id="new-task-button"
          onClick={() => setQuickAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* AI Task Parser Bar */}
      <AiTaskParserBar onTaskCreated={loadTasks} />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs dark:shadow-md space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              id="search-tasks-input"
              type="text"
              placeholder="Search tasks by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-slate-900 dark:text-white placeholder-slate-400 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-slate-400 hover:text-slate-200 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'TODO', 'COMPLETED'] as const).map((tab) => (
              <button
                key={tab}
                id={`status-tab-${tab.toLowerCase()}`}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer text-xs ${
                  statusFilter === tab
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab === 'ALL' ? 'All Tasks' : tab === 'TODO' ? 'Pending' : 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filters: Category and Priority */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </span>

          {/* Category Filter */}
          <select
            id="filter-category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs"
          >
            <option value="ALL">All Categories</option>
            <option value="WORK">Work</option>
            <option value="STUDY">Study</option>
            <option value="PERSONAL">Personal</option>
            <option value="HEALTH">Health</option>
            <option value="FITNESS">Fitness</option>
            <option value="FINANCE">Finance</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Priority Filter */}
          <select
            id="filter-priority-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {(categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setCategoryFilter('ALL');
                setPriorityFilter('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Loading / Error / Empty / List */}
      {loading ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading database tasks...</p>
        </div>
      ) : error ? (
        <ErrorState
          title="Database Query Error"
          message={error}
          onRetry={loadTasks}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No Tasks Found"
          description={
            searchQuery || categoryFilter !== 'ALL' || priorityFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'No tasks matched your active filter or search criteria.'
              : 'Your task list is empty. Create your first real task to start organizing your life!'
          }
          actionText="Create New Task"
          onAction={() => setQuickAddOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                id={`task-item-${task.id}`}
                onClick={() => handleOpenEdit(task)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500/50 shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Complete Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleComplete(task.id, isDone);
                    }}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-transparent hover:border-blue-500'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Task Text and Metadata */}
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold truncate transition-colors ${
                        isDone
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {task.date && (
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          {task.date.split('T')[0]}
                        </span>
                      )}
                      {task.startTime && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-blue-500" />
                          {task.startTime}
                        </span>
                      )}
                      {task.estimatedDuration && (
                        <span className="font-mono">· {task.estimatedDuration}m</span>
                      )}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span>
                          · {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length} subtasks
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Badges & Actions */}
                <div className="flex items-center gap-2.5 flex-shrink-0 ml-3">
                  <CategoryBadge category={task.category} />
                  <PriorityBadge priority={task.priority} />

                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-800">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(task);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit task"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTask(task.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddTaskModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTaskCreated={loadTasks}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={selectedTaskForEdit}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTaskForEdit(null);
        }}
        onTaskUpdated={loadTasks}
        onTaskDeleted={loadTasks}
      />
    </div>
  );
}
