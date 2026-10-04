'use client';

import React, { useState, useEffect } from 'react';
import { tasksApi, Task } from '@/lib/tasks-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';
import { QuickAddTaskModal } from '@/components/dashboard/quick-add-task-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckSquare, Plus, Filter, Search, CheckCircle2, Clock } from 'lucide-react';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [search, setSearch] = useState('');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await tasksApi.getTasks({ limit: 100 });
      setTasks(res.data || []);
    } catch {
      // Graceful error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const toggleComplete = async (taskId: string, isCompleted: boolean) => {
    try {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: isCompleted ? 'TODO' : 'COMPLETED' }
            : t,
        ),
      );
      await tasksApi.completeTask(taskId, !isCompleted);
    } catch {
      loadTasks();
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'PENDING' && t.status === 'COMPLETED') return false;
    if (filter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Smart Task Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize, prioritize, and execute your daily mission objectives
          </p>
        </div>

        <button
          onClick={() => setQuickAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-white placeholder-slate-500 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No Tasks Found"
          description={
            search
              ? 'No tasks matched your search query.'
              : 'Your task list is empty. Get started by creating your first task!'
          }
          actionText="Create Task"
          onAction={() => setQuickAddOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'COMPLETED';
            return (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => toggleComplete(task.id, isDone)}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-slate-600 bg-slate-800/40 text-transparent hover:border-blue-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isDone ? 'line-through text-slate-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      {task.startTime && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-blue-400" />
                          {task.startTime}
                        </span>
                      )}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <span>
                          {task.subtasks.filter((s) => s.isCompleted).length}/
                          {task.subtasks.length} subtasks
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <CategoryBadge category={task.category} />
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QuickAddTaskModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTaskCreated={loadTasks}
      />
    </div>
  );
}
