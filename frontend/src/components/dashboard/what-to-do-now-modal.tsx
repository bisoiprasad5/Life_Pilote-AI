'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Task, tasksApi } from '@/lib/tasks-api';
import { aiApi, WhatToDoNowResponse } from '@/lib/ai-api';
import { dashboardApi } from '@/lib/dashboard-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';
import {
  Sparkles,
  Play,
  CheckCircle,
  Clock,
  Calendar,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Compass,
  Flame,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';

interface WhatToDoNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: Task[];
  energyLevel?: number;
  onStartFocus?: (task: any, durationMinutes: number) => void;
  onCompleteTask?: (taskId: string) => void;
  onTaskUpdated?: () => void;
}

const PLANNING_STEPS = [
  'Detecting current user time...',
  "Reading today's schedule & calendar...",
  'Analyzing pending tasks & deadlines...',
  'Evaluating priority matrix & energy level...',
  'Calculating available free focus window...',
  'Reading active habits & study goals...',
  'Scanning for schedule conflicts...',
  'Asking LifePilot AI Planner for best next action...',
];

export function WhatToDoNowModal({
  isOpen,
  onClose,
  tasks = [],
  energyLevel = 3,
  onStartFocus,
  onCompleteTask,
  onTaskUpdated,
}: WhatToDoNowModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<WhatToDoNowResponse | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load and execute the 9-step planning flow
  const runPlanningFlow = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConfirmStatus(null);
    setCurrentStepIndex(0);

    // Step cycle animation timer
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1 < PLANNING_STEPS.length ? prev + 1 : prev));
    }, 350);

    try {
      const nowIso = new Date().toISOString();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const clientHabits = dashboardApi.getHabits();
      const clientStudy = dashboardApi.getStudySummary();

      const response = await aiApi.getWhatToDoNow({
        currentTime: nowIso,
        timezone: tz,
        tasks: tasks,
        habits: clientHabits,
        studyGoals: clientStudy.activeTopic ? [{ title: clientStudy.activeTopic }] : [],
      });

      setPlanResult(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve AI planner recommendation';
      setError(msg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    if (isOpen) {
      runPlanningFlow();
    } else {
      setPlanResult(null);
      setError(null);
      setConfirmStatus(null);
    }
  }, [isOpen, runPlanningFlow]);

  // Explicit user confirmation actions (safety constraint: never mutate automatically)
  const handleConfirmStartFocus = () => {
    if (!planResult) return;
    const durStr = planResult.recommendedTask.estimatedDuration;
    const minsMatch = durStr.match(/\d+/);
    const duration = minsMatch ? parseInt(minsMatch[0], 10) : 30;

    if (onStartFocus) {
      onStartFocus(planResult.recommendedTask, duration);
    }
    setConfirmStatus(`Started ${duration}-minute focus session for "${planResult.recommendedTask.title}".`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleConfirmMarkDone = async () => {
    if (!planResult?.recommendedTask?.id) {
      setConfirmStatus('Action completed!');
      setTimeout(() => onClose(), 800);
      return;
    }

    setIsUpdating(true);
    try {
      if (onCompleteTask) {
        onCompleteTask(planResult.recommendedTask.id);
      } else {
        await tasksApi.completeTask(planResult.recommendedTask.id, true);
        if (onTaskUpdated) onTaskUpdated();
      }
      setConfirmStatus(`Marked "${planResult.recommendedTask.title}" as completed.`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      setError('Could not update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmInProgress = async () => {
    if (!planResult?.recommendedTask?.id) {
      setConfirmStatus('Action confirmed!');
      setTimeout(() => onClose(), 800);
      return;
    }

    setIsUpdating(true);
    try {
      await tasksApi.updateTask(planResult.recommendedTask.id, { status: 'IN_PROGRESS' });
      if (onTaskUpdated) onTaskUpdated();
      setConfirmStatus(`Task "${planResult.recommendedTask.title}" is now In Progress.`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      setError('Could not update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="What Should I Do Now?"
      description="Context-aware AI planning based on your live schedule, free time window, priorities, and deadlines."
      maxWidth="max-w-xl"
    >
      {/* ----------------------------------------------------------------- */}
      {/* 1. LOADING RADAR & SCANNING STATE                                 */}
      {/* ----------------------------------------------------------------- */}
      {loading && (
        <div className="py-10 px-4 text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            {/* Pulsing radar rings */}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-indigo-500/25 animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Compass className="w-7 h-7 text-white animate-spin-slow" />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Consulting LifePilot AI Planner
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium animate-pulse">
              {PLANNING_STEPS[currentStepIndex]}
            </p>
          </div>

          {/* Step Progress Indicators */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {PLANNING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentStepIndex ? 'w-6 bg-blue-600 dark:bg-blue-400' : 'w-2 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. ERROR STATE                                                    */}
      {/* ----------------------------------------------------------------- */}
      {!loading && error && (
        <div className="py-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Could not generate plan</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{error}</p>
          </div>
          <button
            onClick={runPlanningFlow}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. CONFIRMATION FEEDBACK TOAST                                    */}
      {/* ----------------------------------------------------------------- */}
      {confirmStatus && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 mb-4 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{confirmStatus}</span>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 4. PLAN RESULTS                                                   */}
      {/* ----------------------------------------------------------------- */}
      {!loading && !error && planResult && (
        <div className="space-y-4">
          {/* AVAILABLE TIME HERO BANNER */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-purple-500/15 border border-blue-500/25 dark:border-blue-500/30 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{planResult.availableTimeFormatted}</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-mono uppercase tracking-wider font-semibold">
                    Optimal Focus Window
                  </span>
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                  Calculated from your schedule gaps, energy, and approaching milestones.
                </p>
              </div>
            </div>

            <button
              onClick={runPlanningFlow}
              title="Refresh AI plan"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* CONFLICTS ALERT (IF ANY) */}
          {planResult.conflicts && planResult.conflicts.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Detected Schedule Notice:</p>
                {planResult.conflicts.map((c, i) => (
                  <p key={i} className="text-[11px] text-amber-800 dark:text-amber-300">
                    • {c.description}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* MAIN RECOMMENDED TASK CARD */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3.5 shadow-sm dark:shadow-md">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  Recommended Task
                </span>
                <CategoryBadge category={planResult.recommendedTask.category as any} />
                <PriorityBadge priority={planResult.recommendedTask.priority as any} />
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{planResult.recommendedTask.estimatedDuration}</span>
              </div>
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {planResult.recommendedTask.title}
              </h4>
              {planResult.recommendedTask.description && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {planResult.recommendedTask.description}
                </p>
              )}
            </div>

            {/* Subtasks Preview if present */}
            {planResult.recommendedTask.subtasks && planResult.recommendedTask.subtasks.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Targeted Steps ({planResult.recommendedTask.subtasks.length}):
                </p>
                <div className="space-y-1">
                  {planResult.recommendedTask.subtasks.slice(0, 3).map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <div className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                        {idx + 1}
                      </div>
                      <span className="truncate">{st}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI REASONING BLOCK */}
            <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Why LifePilot AI recommends this:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                {planResult.reason}
              </p>
            </div>
          </div>

          {/* THEN: NEXT TASK CARD */}
          {planResult.nextTask && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Then:</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  ⏱️ {planResult.nextTask.estimatedDuration}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {planResult.nextTask.title}
              </p>

              {planResult.nextTask.reason && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {planResult.nextTask.reason}
                </p>
              )}
            </div>
          )}

          {/* SAFETY GUARANTEE BADGE */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>
              Safety rule: No tasks or calendar schedules will be modified unless you confirm below.
            </span>
          </div>

          {/* CONFIRMATION ACTION BUTTONS */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Dismiss
            </button>

            {planResult.recommendedTask.id && (
              <button
                disabled={isUpdating}
                onClick={handleConfirmInProgress}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Mark In Progress</span>
              </button>
            )}

            <button
              disabled={isUpdating}
              onClick={handleConfirmMarkDone}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Done</span>
            </button>

            <button
              onClick={handleConfirmStartFocus}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Focus Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
