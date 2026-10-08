'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { Task } from '@/lib/tasks-api';
import {
  aiApi,
  DailyPlanResponse,
  DailyPlanSlot,
  TaskChangeItem,
} from '@/lib/ai-api';
import { dashboardApi } from '@/lib/dashboard-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';
import {
  Sparkles,
  Calendar,
  Clock,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Flame,
  BookOpen,
  ArrowRight,
  Sliders,
  Check,
  X,
  Plus,
  Trash2,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  Brain,
  Zap,
} from 'lucide-react';

interface AiDailyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks?: Task[];
  onPlanApplied?: () => void;
}

const PLANNING_STAGES = [
  'Analyzing active task backlog...',
  'Evaluating deadlines & exam milestones...',
  'Calculating priority matrices...',
  'Assessing available hours & quiet limits...',
  'Syncing fixed calendar commitments...',
  'Incorporating compounding daily habits...',
  'Integrating active study goals & topics...',
  'Calibrating user energy levels & buffers...',
  'Evaluating past productivity & focus limits...',
  'Recovering missed & overdue tasks...',
];

export function AiDailyPlannerModal({
  isOpen,
  onClose,
  tasks = [],
  onPlanApplied,
}: AiDailyPlannerModalProps) {
  // Target date (defaults to today)
  const [targetDate, setTargetDate] = useState<string>(
    () => new Date().toISOString().split('T')[0],
  );

  // Flow states
  const [loading, setLoading] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<DailyPlanResponse | null>(null);

  // Interactive editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editableSlots, setEditableSlots] = useState<DailyPlanSlot[]>([]);
  const [showChangesDiff, setShowChangesDiff] = useState(true);

  // Application feedback states
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Execute Generation Flow
  const runGeneration = useCallback(async () => {
    setLoading(true);
    setError(null);
    setApplySuccess(null);
    setIsEditing(false);
    setCurrentStageIndex(0);

    const stageInterval = setInterval(() => {
      setCurrentStageIndex((prev) =>
        prev + 1 < PLANNING_STAGES.length ? prev + 1 : prev,
      );
    }, 280);

    try {
      const nowIso = new Date().toISOString();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const clientHabits = dashboardApi.getHabits();
      const clientStudy = dashboardApi.getStudySummary();

      // Separate overdue/missed tasks from regular tasks
      const now = new Date();
      const clientMissed = tasks.filter((t) => {
        const dl = t.deadline || t.dueDate;
        return dl && new Date(dl) < now && t.status !== 'COMPLETED';
      });

      const response = await aiApi.generateDailyPlan({
        targetDate,
        currentTime: nowIso,
        timezone: tz,
        tasks,
        missedTasks: clientMissed,
        habits: clientHabits,
        studyGoals: clientStudy.activeTopic ? [{ title: clientStudy.activeTopic }] : [],
        userPreferences: {
          energyLevel: 3,
          workingHoursStart: '08:30',
          workingHoursEnd: '18:30',
        },
      });

      setPlanResult(response);
      setEditableSlots(response.slots || []);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to generate AI Daily Plan. Please check service connectivity.';
      setError(msg);
    } finally {
      clearInterval(stageInterval);
      setLoading(false);
    }
  }, [targetDate, tasks]);

  // Trigger generation automatically when modal opens
  useEffect(() => {
    if (isOpen) {
      runGeneration();
    } else {
      setPlanResult(null);
      setApplySuccess(null);
      setIsEditing(false);
      setError(null);
    }
  }, [isOpen, runGeneration]);

  // Handlers for slot edits
  const handleUpdateSlot = (index: number, updates: Partial<DailyPlanSlot>) => {
    setEditableSlots((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const handleRemoveSlot = (index: number) => {
    setEditableSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBreak = () => {
    const newBreak: DailyPlanSlot = {
      id: `break-custom-${Date.now()}`,
      slotType: 'BREAK',
      title: 'Mindful Break & Hydration',
      startTime: '15:00',
      endTime: '15:15',
      durationMinutes: 15,
      priority: 'NONE',
      category: 'HEALTH',
      isFixed: false,
      reason: 'User added break for rest and pacing.',
    };
    setEditableSlots((prev) => [...prev, newBreak]);
  };

  // Commit Apply Plan
  const handleApplyPlan = async () => {
    if (!planResult) return;
    setIsApplying(true);
    setError(null);
    try {
      const payloadSlots = isEditing ? editableSlots : planResult.slots;
      const response = await aiApi.applyDailyPlan({
        targetDate,
        slots: payloadSlots,
        changes: planResult.changes,
      });

      setApplySuccess(
        response.message ||
          `Daily plan for ${targetDate} applied successfully! No deadlines were modified.`,
      );

      if (onPlanApplied) {
        onPlanApplied();
      }

      // Auto-close after 2.2 seconds of success display
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply daily plan.';
      setError(msg);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Daily Planner"
      description="Autonomous, collision-free daily schedule respecting fixed calendar events, breaks, and deadlines."
      maxWidth="max-w-4xl"
    >
      <div id="ai-daily-planner-modal" className="relative flex flex-col space-y-4">
        {/* Date Selector Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 border border-indigo-500/20">
              STEP 13
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Target Planning Date:</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
              />
            </div>
            <button
              onClick={runGeneration}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Regenerate Plan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* MODAL BODY                                                    */}
        {/* ============================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. LOADING / SCANNING STATE */}
          {loading && (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                  <Brain className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-base font-semibold text-white">
                  Synthesizing 10 Productivity Vectors...
                </h3>
                <p className="text-xs text-indigo-300 font-mono transition-all duration-300">
                  {PLANNING_STAGES[currentStageIndex]}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentStageIndex + 1) / PLANNING_STAGES.length) * 100}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-4">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" /> Fixed Events
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" /> Urgent Deadlines
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" /> Energy Windows
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" /> Mandatory Breaks
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" /> Active Habits
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400" /> Study Mastery
                </span>
              </div>
            </div>
          )}

          {/* 2. ERROR STATE */}
          {error && !loading && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-xs font-semibold text-rose-200">Planning Alert</p>
                <p className="text-xs">{error}</p>
                <button
                  onClick={runGeneration}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Generation
                </button>
              </div>
            </div>
          )}

          {/* 3. SUCCESS NOTIFICATION */}
          {applySuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <p className="text-xs font-medium">{applySuccess}</p>
            </div>
          )}

          {/* 4. GENERATED PLAN DISPLAY */}
          {planResult && !loading && (
            <div className="space-y-6">
              {/* METRICS HEADER CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                    <span>Focus Work</span>
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <p className="text-lg font-bold text-white">
                    {Math.floor(planResult.scheduledTaskMinutes / 60)}h{' '}
                    {planResult.scheduledTaskMinutes % 60}m
                  </p>
                  <p className="text-[10px] text-slate-400">Cognitive deep sessions</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                    <span>Strategic Breaks</span>
                    <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold text-white">
                    {planResult.breakMinutes} mins
                  </p>
                  <p className="text-[10px] text-slate-400">Burnout prevention buffers</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                    <span>Fixed Events</span>
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <p className="text-lg font-bold text-white">
                    {Math.floor(planResult.fixedEventMinutes / 60)}h{' '}
                    {planResult.fixedEventMinutes % 60}m
                  </p>
                  <p className="text-[10px] text-slate-400">Locked commitments</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px] font-medium">
                    <span>Productivity Index</span>
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold text-emerald-400">
                    {planResult.productivityScoreExpected}%
                  </p>
                  <p className="text-[10px] text-slate-400">Paced capacity forecast</p>
                </div>
              </div>

              {/* STRICT DEADLINE GUARANTEE BANNER */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-200">
                    Important Deadlines Strictly Protected:
                  </span>{' '}
                  The AI planner schedules focus blocks around your commitments. No task
                  deadlines or due dates were altered.
                </div>
              </div>

              {/* SCHEDULE TIMELINE SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Optimized Daily Schedule ({isEditing ? editableSlots.length : planResult.slots.length} slots)
                  </h3>

                  {isEditing && (
                    <button
                      onClick={handleAddBreak}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Break
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {(isEditing ? editableSlots : planResult.slots).map((slot, index) => {
                    const isBreak =
                      slot.slotType === 'BREAK' || slot.slotType === 'LUNCH_BREAK';
                    const isFixed = slot.isFixed;
                    const isHabit = slot.slotType === 'HABIT';
                    const isStudy = slot.slotType === 'STUDY_SESSION';

                    return (
                      <div
                        key={slot.id || index}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isFixed
                            ? 'bg-purple-950/20 border-purple-500/30'
                            : isBreak
                              ? 'bg-slate-800/40 border-slate-700/60'
                              : isHabit
                                ? 'bg-amber-950/20 border-amber-500/30'
                                : isStudy
                                  ? 'bg-blue-950/20 border-blue-500/30'
                                  : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center gap-3">
                            {/* Time Badge */}
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-semibold text-slate-200">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={slot.startTime}
                                    onChange={(e) =>
                                      handleUpdateSlot(index, { startTime: e.target.value })
                                    }
                                    className="w-12 bg-transparent text-center border-b border-slate-600 outline-none"
                                  />
                                  <span>-</span>
                                  <input
                                    type="text"
                                    value={slot.endTime}
                                    onChange={(e) =>
                                      handleUpdateSlot(index, { endTime: e.target.value })
                                    }
                                    className="w-12 bg-transparent text-center border-b border-slate-600 outline-none"
                                  />
                                </div>
                              ) : (
                                <span>
                                  {slot.startTime} - {slot.endTime}
                                </span>
                              )}
                            </div>

                            {/* Title & Slot details */}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={slot.title}
                                    onChange={(e) =>
                                      handleUpdateSlot(index, { title: e.target.value })
                                    }
                                    className="text-xs font-semibold text-white bg-slate-900/60 border border-slate-700 rounded px-2 py-0.5 outline-none"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-white">
                                    {slot.title}
                                  </span>
                                )}

                                {isFixed && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-semibold border border-purple-500/30">
                                    <Lock className="w-2.5 h-2.5" /> Fixed Calendar Event
                                  </span>
                                )}

                                {isBreak && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                                    <Coffee className="w-2.5 h-2.5" /> Recovery Break
                                  </span>
                                )}

                                {isHabit && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                                    <Flame className="w-2.5 h-2.5" /> Habit
                                  </span>
                                )}

                                {isStudy && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
                                    <BookOpen className="w-2.5 h-2.5" /> Study Focus
                                  </span>
                                )}

                                {slot.priority && slot.priority !== 'NONE' && (
                                  <span className="text-[10px]">
                                    <PriorityBadge priority={slot.priority as any} />
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-slate-400 font-light leading-relaxed">
                                {slot.reason}
                              </p>
                            </div>
                          </div>

                          {/* Duration badge or delete button if editing */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <span className="text-[11px] font-mono text-slate-400">
                              {slot.durationMinutes}m
                            </span>
                            {isEditing && !isFixed && (
                              <button
                                onClick={() => handleRemoveSlot(index)}
                                className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                title="Remove slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WHAT WILL CHANGE ACCORDION (DIFF VIEW) */}
              {planResult.changes && planResult.changes.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <button
                    onClick={() => setShowChangesDiff((prev) => !prev)}
                    className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                      What will change in your schedule ({planResult.changes.length} adjustments)
                    </span>
                    {showChangesDiff ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showChangesDiff && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      {planResult.changes.map((ch, idx) => (
                        <div
                          key={ch.taskId || idx}
                          className="flex items-start justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{ch.taskTitle}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  ch.changeType === 'SCHEDULED'
                                    ? 'bg-blue-500/20 text-blue-300'
                                    : ch.changeType === 'RESCHEDULED'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : ch.changeType === 'POSTPONED'
                                        ? 'bg-purple-500/20 text-purple-300'
                                        : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {ch.changeType}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{ch.reason}</p>
                          </div>

                          <div className="text-right text-[11px] font-mono text-slate-300">
                            {ch.newStartTime && ch.newEndTime ? (
                              <div className="flex items-center gap-1.5 text-emerald-400">
                                <span>{ch.previousStartTime || 'None'}</span>
                                <ArrowRight className="w-3 h-3 text-slate-500" />
                                <span>
                                  {ch.newStartTime} - {ch.newEndTime}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">Backlog retained</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============================================================= */}
        {/* MODAL FOOTER - ACTIONS [Apply Plan], [Edit Plan], [Cancel]     */}
        {/* ============================================================= */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          <button
            id="cancel-plan-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {planResult && !loading && (
              <>
                {/* [Edit Plan] Button */}
                <button
                  id="edit-plan-btn"
                  onClick={() => setIsEditing((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isEditing
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isEditing ? 'Done Editing' : 'Edit Plan'}</span>
                </button>

                {/* Regenerate Button */}
                <button
                  id="regenerate-plan-btn"
                  onClick={runGeneration}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Regenerate Plan"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* [Apply Plan] Button */}
                <button
                  id="apply-plan-btn"
                  onClick={handleApplyPlan}
                  disabled={isApplying}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>{isApplying ? 'Applying Schedule...' : 'Apply Plan'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
