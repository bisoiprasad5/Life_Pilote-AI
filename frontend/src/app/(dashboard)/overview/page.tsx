'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { tasksApi, Task } from '@/lib/tasks-api';
import { dashboardApi } from '@/lib/dashboard-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { QuickAddTaskModal } from '@/components/dashboard/quick-add-task-modal';
import { WhatToDoNowModal } from '@/components/dashboard/what-to-do-now-modal';
import { AiAssistantDrawer } from '@/components/dashboard/ai-assistant-drawer';
import { WaterTrackerCard } from '@/components/dashboard/water-tracker-card';
import { FocusTimerCard } from '@/components/dashboard/focus-timer-card';
import { HabitsCard } from '@/components/dashboard/habits-card';
import { DietCard } from '@/components/dashboard/diet-card';
import { ScheduleCard } from '@/components/dashboard/schedule-card';
import {
  Sparkles,
  Plus,
  Bot,
  Play,
  CheckCircle,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Brain,
  CheckSquare,
  BookOpen,
  Zap,
  RotateCw,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const user = useAuthStore((s) => s.user);

  // States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [whatToDoOpen, setWhatToDoOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // Time & Greeting
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Good day');

  // Load live time and greeting
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= 5 && hour < 12) setGreeting('Good morning');
      else if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
      else if (hour >= 17 && hour < 22) setGreeting('Good evening');
      else setGreeting('Working late');

      setCurrentDateFormatted(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      );

      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real tasks from backend API
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tasksApi.getTasks({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' });
      setTasks(response.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to connect to LifePilot task backend');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Task Actions
  const handleToggleComplete = async (taskId: string, currentCompleted: boolean) => {
    try {
      const nextCompleted = !currentCompleted;
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: nextCompleted ? 'COMPLETED' : 'TODO',
                completedAt: nextCompleted ? new Date().toISOString() : null,
              }
            : t,
        ),
      );
      await tasksApi.completeTask(taskId, nextCompleted);
    } catch (err) {
      // Revert on error
      loadTasks();
    }
  };

  const handleSnooze = async (taskId: string) => {
    try {
      await tasksApi.snoozeTask(taskId, 60);
      loadTasks();
    } catch {
      loadTasks();
    }
  };

  // Compute Task Metrics
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');

  // Overdue: tasks whose deadline or dueDate is before now and not completed
  const nowMs = Date.now();
  const overdueTasks = pendingTasks.filter((t) => {
    const due = t.deadline || t.dueDate;
    if (!due) return false;
    return new Date(due).getTime() < nowMs;
  });

  const criticalTasks = pendingTasks.filter((t) => t.priority === 'CRITICAL' || t.priority === 'HIGH');

  // Current Task: First pending critical/high or first timed task
  const currentTask = pendingTasks.find((t) => t.priority === 'CRITICAL') || pendingTasks[0] || null;
  // Next Task: The second pending task
  const nextTask = pendingTasks.length > 1 ? pendingTasks[1] : null;

  // Upcoming deadlines in next 7 days
  const upcomingDeadlines = pendingTasks
    .filter((t) => t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 4);

  // Study summary from dashboard service
  const study = dashboardApi.getStudySummary();

  if (isLoading && tasks.length === 0) {
    return <DashboardSkeleton />;
  }

  if (error && tasks.length === 0) {
    return <ErrorState message={error} onRetry={loadTasks} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ------------------------------------------------------------- */}
      {/* 1. GREETING HERO BANNER & COMMAND BAR                          */}
      {/* ------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/25 border border-blue-500/20 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            {/* Live date badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{currentDateFormatted}</span>
              {currentTime && <span className="font-mono text-slate-300">· {currentTime}</span>}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {greeting}, {user?.fullName?.split(' ')[0] || 'Pilot'} 👋
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              {pendingTasks.length > 0 ? (
                <>
                  You have <span className="font-semibold text-white">{pendingTasks.length} pending tasks</span>{' '}
                  today{criticalTasks.length > 0 && (
                    <>
                      , including{' '}
                      <span className="text-rose-400 font-bold">{criticalTasks.length} high priority items</span>
                    </>
                  )}
                  . Ready to build momentum?
                </>
              ) : (
                'You have crushed all your scheduled tasks! Take a breath or plan ahead.'
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* "What should I do now?" Button */}
            <button
              id="what-to-do-now-button"
              onClick={() => setWhatToDoOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Compass className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span>What Should I Do Now?</span>
            </button>

            {/* Quick Add Task */}
            <button
              id="quick-add-task-button"
              onClick={() => setQuickAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Quick Add Task</span>
            </button>

            {/* AI Assistant Button */}
            <button
              id="ai-assistant-button"
              onClick={() => setAiAssistantOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4 text-purple-400" />
              <span>AI Copilot</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. OVERDUE TASKS ALERT (IF APPLICABLE)                         */}
      {/* ------------------------------------------------------------- */}
      {overdueTasks.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-200 shadow-md">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-rose-300">
                {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}:
              </span>{' '}
              <span className="text-slate-300">{overdueTasks[0].title}</span>
              {overdueTasks.length > 1 && (
                <span className="text-slate-400"> and {overdueTasks.length - 1} more</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handleSnooze(overdueTasks[0].id)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Snooze 1h
            </button>
            <button
              onClick={() => handleToggleComplete(overdueTasks[0].id, false)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Mark Done
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. KEY METRICS ROW                                             */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Tasks */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending Tasks</span>
            <CheckSquare className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{pendingTasks.length}</div>
          <p className="text-[11px] text-slate-400">
            {criticalTasks.length} high priority items
          </p>
        </div>

        {/* Completed Tasks */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Completed Tasks</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {completedTasks.length}
          </div>
          <p className="text-[11px] text-slate-400">
            {tasks.length > 0
              ? `${Math.round((completedTasks.length / tasks.length) * 100)}% completion rate`
              : 'Start logging today'}
          </p>
        </div>

        {/* Focus Time */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Focus Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">75 mins</div>
          <p className="text-[11px] text-slate-400">3 Pomodoro sprints</p>
        </div>

        {/* AI Health & Energy Score */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Energy & Focus</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {user?.preference?.energyLevel || 4} / 5
          </div>
          <p className="text-[11px] text-slate-400">Optimal cognitive window</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. CURRENT TASK & NEXT TASK HIGHLIGHT ROW                     */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CURRENT TASK */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-blue-500/20 shadow-lg space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              Current Task
            </span>
            {currentTask && <PriorityBadge priority={currentTask.priority} />}
          </div>

          {currentTask ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {currentTask.title}
                  </h3>
                  {currentTask.description && (
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                      {currentTask.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <CategoryBadge category={currentTask.category} />
                {currentTask.startTime && (
                  <span className="text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    {currentTask.startTime}
                  </span>
                )}
                {currentTask.estimatedDuration && (
                  <span className="text-slate-400 font-mono">
                    · {currentTask.estimatedDuration}m
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleToggleComplete(currentTask.id, false)}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Done</span>
                </button>
                <button
                  onClick={() => handleSnooze(currentTask.id)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  Snooze
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">No current task active right now.</p>
          )}
        </div>

        {/* NEXT TASK */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Next in Queue
            </span>
            {nextTask && <PriorityBadge priority={nextTask.priority} />}
          </div>

          {nextTask ? (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white tracking-tight">{nextTask.title}</h3>
              {nextTask.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{nextTask.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <CategoryBadge category={nextTask.category} />
                {nextTask.estimatedDuration && (
                  <span className="text-slate-400 font-mono">
                    · {nextTask.estimatedDuration}m estimated
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleToggleComplete(nextTask.id, false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Complete Early</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4">No upcoming tasks queued next.</p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MAIN TWO-COLUMN DASHBOARD GRID                             */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 COLS): Tasks & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* TODAY'S SCHEDULE TIMELINE */}
          <ScheduleCard
            tasks={tasks}
            onCompleteTask={(id) => handleToggleComplete(id, false)}
          />

          {/* PENDING TASKS CARD */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Pending Tasks</h3>
                  <p className="text-[11px] text-slate-400">
                    {pendingTasks.length} tasks needing attention
                  </p>
                </div>
              </div>

              <button
                onClick={() => setQuickAddOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {pendingTasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="No Pending Tasks"
                description="You are totally on top of your schedule! Add a task to get ahead."
                actionText="Create Task"
                onAction={() => setQuickAddOpen(true)}
              />
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleComplete(task.id, false)}
                        className="w-5 h-5 rounded-lg border border-slate-600 hover:border-blue-400 flex items-center justify-center text-transparent hover:text-blue-400 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          {task.startTime && <span>{task.startTime}</span>}
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
                ))}
              </div>
            )}
          </div>

          {/* COMPLETED TASKS PREVIEW */}
          {completedTasks.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Recently Completed ({completedTasks.length})
                </h4>
              </div>
              <div className="space-y-1.5">
                {completedTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 text-xs text-slate-400"
                  >
                    <span className="line-through truncate">{t.title}</span>
                    <button
                      onClick={() => handleToggleComplete(t.id, true)}
                      className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                    >
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI RECOMMENDATIONS CARD */}
          <div className="p-6 rounded-3xl bg-gradient-to-tr from-indigo-950/40 via-purple-950/20 to-slate-900/60 border border-indigo-500/20 shadow-lg space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Cognitive Insights
                </h4>
                <p className="text-[10px] text-slate-400">Personalized daily strategy</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold text-blue-400">PEAK FOCUS</span>
                <p className="text-slate-300 font-medium">Schedule Deep Work now</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your circadian profile indicates high cognitive sharpness between 10 AM - 1 PM.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400">HYDRATION PACING</span>
                <p className="text-slate-300 font-medium">Optimal water timing</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Log 250ml water every 90 minutes to maintain steady focus and avoid fatigue.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1 COL): Habits, Water, Focus, Diet, Deadlines */}
        <div className="space-y-6">
          {/* FOCUS TIMER CARD */}
          <FocusTimerCard defaultLengthMinutes={user?.preference?.defaultPomodoroLength || 25} />

          {/* WATER TRACKING CARD */}
          <WaterTrackerCard targetMl={user?.preference?.dailyWaterTargetMl || 2500} />

          {/* HABIT PROGRESS CARD */}
          <HabitsCard />

          {/* DIET INFORMATION CARD */}
          <DietCard />

          {/* STUDY PROGRESS & UPCOMING EXAMS */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Study Progress</h3>
                  <p className="text-[11px] text-slate-400">
                    {study.hoursLogged} / {study.hoursTarget} hrs logged
                  </p>
                </div>
              </div>

              <span className="text-xs text-purple-400 font-mono font-bold">
                {Math.round((study.hoursLogged / study.hoursTarget) * 100)}%
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-1 text-xs">
              <span className="text-[10px] text-purple-400 font-bold uppercase">Active Subject</span>
              <p className="text-white font-semibold">{study.activeTopic}</p>
              {study.nextExam && (
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
                  Next Exam: <span className="text-slate-200">{study.nextExam.subject}</span> (in {study.nextExam.daysRemaining} days)
                </p>
              )}
            </div>
          </div>

          {/* UPCOMING DEADLINES */}
          {upcomingDeadlines.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  Upcoming Deadlines
                </h4>
              </div>

              <div className="space-y-2">
                {upcomingDeadlines.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate">{t.title}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Due: {new Date(t.deadline!).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 6. MODALS & SLIDE-OVER ASSISTANT                              */}
      {/* ------------------------------------------------------------- */}
      <QuickAddTaskModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onTaskCreated={loadTasks}
      />

      <WhatToDoNowModal
        isOpen={whatToDoOpen}
        onClose={() => setWhatToDoOpen(false)}
        tasks={tasks}
        energyLevel={user?.preference?.energyLevel || 3}
        onStartFocus={() => {
          // Focus session triggered
        }}
        onCompleteTask={(id) => handleToggleComplete(id, false)}
      />

      <AiAssistantDrawer
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        tasks={tasks}
        userName={user?.fullName || 'Pilot'}
        onQuickAdd={() => setQuickAddOpen(true)}
      />
    </div>
  );
}
