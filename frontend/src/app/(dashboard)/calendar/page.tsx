'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  calendarApi,
  UnifiedScheduleItem,
  CalendarEvent,
} from '@/lib/calendar-api';
import { tasksApi, Task } from '@/lib/tasks-api';
import { CreateEventModal } from '@/components/calendar/create-event-modal';
import { EventDetailModal } from '@/components/calendar/event-detail-modal';
import { DeadlineWarningModal } from '@/components/calendar/deadline-warning-modal';
import { EditTaskModal } from '@/components/dashboard/edit-task-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  BookOpen,
  Utensils,
  Flame,
  Flag,
  RotateCw,
  Loader2,
} from 'lucide-react';

type CalendarView = 'DAY' | 'WEEK' | 'MONTH' | 'AGENDA';
type FilterType = 'ALL' | 'TASK' | 'EVENT' | 'STUDY' | 'MEAL' | 'HABIT' | 'DEADLINE';

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

export default function CalendarPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // States
  const [view, setView] = useState<CalendarView>('WEEK');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<FilterType>('ALL');

  const [scheduleItems, setScheduleItems] = useState<UnifiedScheduleItem[]>([]);
  const [conflictsCount, setConflictsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<string | undefined>();
  const [createInitialStartTime, setCreateInitialStartTime] = useState<string | undefined>();

  const [selectedItem, setSelectedItem] = useState<UnifiedScheduleItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Task edit modal
  const [taskForEdit, setTaskForEdit] = useState<Task | null>(null);
  const [editTaskModalOpen, setEditTaskModalOpen] = useState(false);

  // Drag and Drop state
  const [draggedItem, setDraggedItem] = useState<UnifiedScheduleItem | null>(null);

  // Deadline Warning State
  const [deadlineWarning, setDeadlineWarning] = useState<{
    isOpen: boolean;
    taskTitle: string;
    deadlineIso: string;
    proposedTimeIso: string;
    taskId: string;
    newDate: string;
    newStartTime?: string;
  }>({
    isOpen: false,
    taskTitle: '',
    deadlineIso: '',
    proposedTimeIso: '',
    taskId: '',
    newDate: '',
  });

  // Calculate Date Boundaries for current view
  const { startDateRange, endDateRange, headerTitle } = useMemo(() => {
    const d = new Date(currentDate);

    if (view === 'DAY') {
      const start = new Date(d.setHours(0, 0, 0, 0)).toISOString();
      const end = new Date(d.setHours(23, 59, 59, 999)).toISOString();
      return {
        startDateRange: start,
        endDateRange: end,
        headerTitle: currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      };
    }

    if (view === 'WEEK') {
      const dayOfWeek = d.getDay(); // 0 is Sun
      const diffToMonday = (dayOfWeek + 6) % 7; // Monday = 0
      const monday = new Date(d);
      monday.setDate(d.getDate() - diffToMonday);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const monthName = monday.toLocaleDateString('en-US', { month: 'short' });
      const sunMonthName = sunday.toLocaleDateString('en-US', { month: 'short' });
      const title =
        monthName === sunMonthName
          ? `${monthName} ${monday.getDate()} – ${sunday.getDate()}, ${monday.getFullYear()}`
          : `${monthName} ${monday.getDate()} – ${sunMonthName} ${sunday.getDate()}, ${monday.getFullYear()}`;

      return {
        startDateRange: monday.toISOString(),
        endDateRange: sunday.toISOString(),
        headerTitle: title,
      };
    }

    if (view === 'MONTH') {
      const year = d.getFullYear();
      const month = d.getMonth();
      const firstDay = new Date(year, month, 1, 0, 0, 0);
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

      return {
        startDateRange: firstDay.toISOString(),
        endDateRange: lastDay.toISOString(),
        headerTitle: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      };
    }

    // Agenda: 30 days window
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return {
      startDateRange: start,
      endDateRange: end,
      headerTitle: '30-Day Scheduled Agenda',
    };
  }, [view, currentDate]);

  // Load schedule from backend
  const loadSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await calendarApi.getUnifiedSchedule({
        startDate: startDateRange,
        endDate: endDateRange,
      });
      setScheduleItems(res.data || []);
      setConflictsCount(res.conflictsCount || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch schedule';
      if (msg.toLowerCase().includes('unauthorized')) {
        router.push('/login');
        return;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [startDateRange, endDateRange, router]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Date Navigation
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (view === 'DAY') next.setDate(next.getDate() - 1);
    else if (view === 'WEEK') next.setDate(next.getDate() - 7);
    else if (view === 'MONTH') next.setMonth(next.getMonth() - 1);
    else next.setDate(next.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === 'DAY') next.setDate(next.getDate() + 1);
    else if (view === 'WEEK') next.setDate(next.getDate() + 7);
    else if (view === 'MONTH') next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open create modal at specific slot
  const handleSlotClick = (dateStr: string, timeStr?: string) => {
    setCreateInitialDate(dateStr);
    setCreateInitialStartTime(timeStr);
    setCreateModalOpen(true);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: UnifiedScheduleItem) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string, targetHour?: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const timeString = targetHour !== undefined ? `${targetHour.toString().padStart(2, '0')}:00` : '09:00';
    const proposedTimeIso = `${targetDate}T${timeString}:00.000Z`;

    // 1. Critical Deadline Protection: "Do not silently change important deadlines"
    if (draggedItem.deadline) {
      const deadlineMs = new Date(draggedItem.deadline).getTime();
      const proposedMs = new Date(proposedTimeIso).getTime();

      if (proposedMs > deadlineMs) {
        // Trigger explicit deadline warning modal
        const rawTaskId = draggedItem.referenceId || draggedItem.id.replace('task-', '');
        setDeadlineWarning({
          isOpen: true,
          taskTitle: draggedItem.title,
          deadlineIso: draggedItem.deadline,
          proposedTimeIso,
          taskId: rawTaskId,
          newDate: targetDate,
          newStartTime: timeString,
        });
        setDraggedItem(null);
        return;
      }
    }

    // 2. Perform Reschedule in Backend
    try {
      if (draggedItem.type === 'EVENT') {
        const durationMs =
          new Date(draggedItem.endTime).getTime() - new Date(draggedItem.startTime).getTime();
        const newStartIso = proposedTimeIso;
        const newEndIso = new Date(new Date(proposedTimeIso).getTime() + durationMs).toISOString();

        await calendarApi.updateEvent(draggedItem.referenceId || draggedItem.id, {
          startTime: newStartIso,
          endTime: newEndIso,
        });
      } else {
        // Task
        const rawTaskId = draggedItem.referenceId || draggedItem.id.replace('task-', '');
        await tasksApi.rescheduleTask(rawTaskId, {
          date: targetDate,
          startTime: timeString,
        });
      }

      loadSchedule();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reschedule item');
      loadSchedule();
    } finally {
      setDraggedItem(null);
    }
  };

  // Open edit task
  const handleOpenEditTask = async (taskId: string) => {
    try {
      const res = await tasksApi.getTask(taskId);
      setTaskForEdit(res.data);
      setEditTaskModalOpen(true);
    } catch {
      alert('Could not fetch task details for editing');
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    if (filterType === 'ALL') return scheduleItems;
    return scheduleItems.filter((i) => i.type === filterType);
  }, [scheduleItems, filterType]);

  // Compute Week Days for Week View
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const isoDate = day.toISOString().split('T')[0];
      const isToday = new Date().toISOString().split('T')[0] === isoDate;
      return {
        date: day,
        isoDate,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: day.getDate(),
        isToday,
      };
    });
  }, [currentDate]);

  // Compute Month Days for Month View
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0
    const totalDays = lastDay.getDate();

    const days = [];
    // Prev month padding
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevLastDay - i);
      days.push({
        date: prevDate,
        isoDate: prevDate.toISOString().split('T')[0],
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    const todayIso = new Date().toISOString().split('T')[0];
    for (let i = 1; i <= totalDays; i++) {
      const curDate = new Date(year, month, i);
      const isoDate = curDate.toISOString().split('T')[0];
      days.push({
        date: curDate,
        isoDate,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: isoDate === todayIso,
      });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: nextDate,
        isoDate: nextDate.toISOString().split('T')[0],
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [currentDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & VIEW CONTROLS                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Autonomous Schedule Matrix</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Calendar & Time Blocks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Drag-and-drop rescheduling, multi-dimensional timeline, and smart conflict detection
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Buttons */}
          <div className="p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1 text-xs">
            {(['DAY', 'WEEK', 'MONTH', 'AGENDA'] as CalendarView[]).map((v) => (
              <button
                key={v}
                id={`calendar-view-${v.toLowerCase()}`}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  view === v
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {v.charAt(0) + v.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* New Event Button */}
          <button
            id="create-event-button"
            onClick={() => {
              setCreateInitialDate(undefined);
              setCreateInitialStartTime(undefined);
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. DATE NAVIGATION & FILTER BAR                               */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-xs dark:shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            id="calendar-nav-prev"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
          >
            Today
          </button>

          <button
            onClick={handleNext}
            id="calendar-nav-next"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="font-bold text-sm text-slate-900 dark:text-white ml-2 tracking-tight">
            {headerTitle}
          </span>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Show:
          </span>
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'TASK', label: 'Tasks' },
              { key: 'EVENT', label: 'Events' },
              { key: 'STUDY', label: 'Study' },
              { key: 'MEAL', label: 'Meals' },
              { key: 'HABIT', label: 'Habits' },
              { key: 'DEADLINE', label: 'Deadlines' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilterType(t.key)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer text-[11px] whitespace-nowrap ${
                filterType === t.key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. CONFLICT ALERT BANNER (IF ANY OVERLAPS OCCUR)              */}
      {/* ------------------------------------------------------------- */}
      {conflictsCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">
                {conflictsCount} Schedule Conflict{conflictsCount > 1 ? 's' : ''} Detected:
              </span>{' '}
              <span className="text-slate-600 dark:text-slate-300">
                You have overlapping events or work sessions scheduled at the same time. Drag an item to a new time slot to resolve.
              </span>
            </div>
          </div>
          <button
            onClick={() => setView('DAY')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-semibold self-end sm:self-auto cursor-pointer"
          >
            Inspect Day
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. MAIN VIEW CONTAINER                                        */}
      {/* ------------------------------------------------------------- */}
      {isLoading && scheduleItems.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading schedule from PostgreSQL...</p>
        </div>
      ) : error && scheduleItems.length === 0 ? (
        <ErrorState title="Failed to Load Calendar" message={error} onRetry={loadSchedule} />
      ) : (
        <>
          {/* ========================================================= */}
          {/* A. WEEK VIEW (Interactive 7-Column Time-Slot Matrix)      */}
          {/* ========================================================= */}
          {view === 'WEEK' && (
            <div className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 text-xs">
                <div className="p-3 text-center font-mono text-[10px] text-slate-400 border-r border-slate-200 dark:border-slate-800">
                  GMT
                </div>
                {weekDays.map((d) => (
                  <div
                    key={d.isoDate}
                    className={`p-3 text-center border-r border-slate-200 dark:border-slate-800 last:border-r-0 ${
                      d.isToday ? 'bg-blue-500/10 font-bold text-blue-600 dark:text-blue-400' : ''
                    }`}
                  >
                    <span className="block text-[11px] text-slate-400 font-normal uppercase">
                      {d.dayName}
                    </span>
                    <span
                      className={`inline-block mt-0.5 w-6 h-6 leading-6 rounded-full text-xs ${
                        d.isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-800 dark:text-slate-200 font-bold'
                      }`}
                    >
                      {d.dayNumber}
                    </span>
                  </div>
                ))}
              </div>

              {/* Time Slots Grid (Hourly) */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[700px] overflow-y-auto">
                {HOURS.map((hour) => {
                  const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <div key={hour} className="grid grid-cols-8 min-h-[56px] group">
                      {/* Hour Axis */}
                      <div className="p-2 text-right pr-3 font-mono text-[10px] text-slate-400 border-r border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 select-none">
                        {hourLabel}
                      </div>

                      {/* 7 Columns for each Day */}
                      {weekDays.map((d) => {
                        // Find matching items in this hour slot
                        const slotItems = filteredItems.filter((item) => {
                          const itemDateStr = item.startTime.split('T')[0];
                          if (itemDateStr !== d.isoDate) return false;
                          const itemHour = new Date(item.startTime).getHours();
                          return itemHour === hour;
                        });

                        return (
                          <div
                            key={d.isoDate}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, d.isoDate, hour)}
                            onClick={() => handleSlotClick(d.isoDate, hourLabel)}
                            className="p-1 border-r border-slate-200 dark:border-slate-800/60 last:border-r-0 hover:bg-blue-500/5 transition-colors relative cursor-pointer min-h-[56px] space-y-1"
                          >
                            {slotItems.map((item) => (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                  setDetailModalOpen(true);
                                }}
                                className={`p-1.5 rounded-xl border text-[11px] font-semibold transition-all hover:scale-[1.02] shadow-2xs cursor-grab active:cursor-grabbing ${
                                  item.hasConflict
                                    ? 'border-amber-500 bg-amber-500/15 text-amber-900 dark:text-amber-200 animate-pulse'
                                    : item.type === 'DEADLINE'
                                    ? 'border-rose-500 bg-rose-500/20 text-rose-700 dark:text-rose-200 font-extrabold'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                                }`}
                                style={{
                                  borderLeftWidth: '4px',
                                  borderLeftColor: item.color || '#3b82f6',
                                }}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate">{item.title}</span>
                                  {item.hasConflict && (
                                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono font-normal">
                                  {new Date(item.startTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* B. DAY VIEW (Detailed Vertical Hourly Timeline)           */}
          {/* ========================================================= */}
          {view === 'DAY' && (
            <div className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Schedule for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <span className="text-xs text-slate-400">
                  {filteredItems.filter((i) => i.startTime.startsWith(currentDate.toISOString().split('T')[0])).length} scheduled blocks
                </span>
              </div>

              <div className="space-y-2 max-h-[700px] overflow-y-auto">
                {HOURS.map((hour) => {
                  const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
                  const curIsoDate = currentDate.toISOString().split('T')[0];
                  const hourItems = filteredItems.filter((i) => {
                    if (!i.startTime.startsWith(curIsoDate)) return false;
                    return new Date(i.startTime).getHours() === hour;
                  });

                  return (
                    <div
                      key={hour}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, curIsoDate, hour)}
                      onClick={() => handleSlotClick(curIsoDate, hourLabel)}
                      className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer min-h-[56px]"
                    >
                      <div className="w-16 font-mono text-xs font-bold text-slate-400 pt-1 flex-shrink-0">
                        {hourLabel}
                      </div>

                      <div className="flex-1 space-y-2">
                        {hourItems.length === 0 ? (
                          <div className="h-6 flex items-center text-[11px] text-slate-400 dark:text-slate-600 font-light select-none">
                            + Click to schedule slot
                          </div>
                        ) : (
                          hourItems.map((item) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, item)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                                setDetailModalOpen(true);
                              }}
                              className={`p-3 rounded-2xl border text-xs font-semibold shadow-xs flex items-center justify-between cursor-grab active:cursor-grabbing transition-transform hover:scale-[1.01] ${
                                item.hasConflict
                                  ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                  : item.type === 'DEADLINE'
                                  ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-200 font-extrabold'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                              }`}
                              style={{
                                borderLeftWidth: '5px',
                                borderLeftColor: item.color || '#3b82f6',
                              }}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span>{item.title}</span>
                                  {item.hasConflict && (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-bold">
                                      <AlertTriangle className="w-3 h-3" /> Conflict
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono font-normal">
                                  {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                  {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {item.location && ` • ${item.location}`}
                                </div>
                              </div>

                              <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase"
                                style={{
                                  backgroundColor: `${item.color || '#3b82f6'}20`,
                                  color: item.color || '#3b82f6',
                                }}
                              >
                                {item.type}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* C. MONTH VIEW (Full Calendar Grid)                        */}
          {/* ========================================================= */}
          {view === 'MONTH' && (
            <div className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 text-center text-xs font-semibold text-slate-400 py-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                {monthDays.map((d, idx) => {
                  const dayItems = filteredItems.filter((i) => i.startTime.startsWith(d.isoDate));

                  return (
                    <div
                      key={idx}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, d.isoDate)}
                      onClick={() => handleSlotClick(d.isoDate)}
                      className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors relative hover:bg-blue-500/5 cursor-pointer ${
                        !d.isCurrentMonth ? 'bg-slate-50/40 dark:bg-slate-950/40 opacity-40' : ''
                      } ${d.isToday ? 'bg-blue-500/10' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold inline-block w-6 h-6 leading-6 text-center rounded-full ${
                            d.isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {d.dayNumber}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {dayItems.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1 max-h-[70px] overflow-y-auto">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setDetailModalOpen(true);
                            }}
                            className="p-1 rounded-md text-[10px] truncate font-semibold cursor-grab"
                            style={{
                              backgroundColor: `${item.color || '#3b82f6'}25`,
                              color: item.color || '#3b82f6',
                            }}
                          >
                            {item.title}
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <span className="text-[9px] text-slate-400 pl-1">
                            +{dayItems.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* D. AGENDA VIEW (Chronological List of All Events)         */}
          {/* ========================================================= */}
          {view === 'AGENDA' && (
            <div className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Chronological Agenda ({filteredItems.length} Entries)
                </span>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  + Add Item
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <EmptyState
                  icon={CalendarIcon}
                  title="No Schedule Entries"
                  description="Your agenda is clear for the selected period. Add a meeting, work block, or study session!"
                  actionText="Schedule New Event"
                  onAction={() => setCreateModalOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => {
                    const d = new Date(item.startTime);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setDetailModalOpen(true);
                        }}
                        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer ${
                          item.hasConflict
                            ? 'border-amber-500 bg-amber-500/10'
                            : item.type === 'DEADLINE'
                            ? 'border-rose-500 bg-rose-500/15'
                            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                        style={{
                          borderLeftWidth: '5px',
                          borderLeftColor: item.color || '#3b82f6',
                        }}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {item.title}
                            </span>
                            {item.hasConflict && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-bold">
                                <AlertTriangle className="w-3 h-3" /> Conflict
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                            <span className="font-mono">
                              {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span>•</span>
                            <span className="font-mono">
                              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                              {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {item.location && (
                              <>
                                <span>•</span>
                                <span>{item.location}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: `${item.color || '#3b82f6'}20`,
                              color: item.color || '#3b82f6',
                            }}
                          >
                            {item.type}
                          </span>
                          {item.priority && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                item.priority === 'CRITICAL'
                                  ? 'bg-rose-500/15 text-rose-500'
                                  : 'bg-blue-500/15 text-blue-500'
                              }`}
                            >
                              {item.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODALS: CREATE, DETAIL, DEADLINE & EDIT                     */}
      {/* ------------------------------------------------------------- */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onEventCreated={loadSchedule}
        initialDate={createInitialDate}
        initialStartTime={createInitialStartTime}
      />

      <EventDetailModal
        item={selectedItem}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedItem(null);
        }}
        onScheduleUpdated={loadSchedule}
        onOpenEditTask={handleOpenEditTask}
      />

      <DeadlineWarningModal
        isOpen={deadlineWarning.isOpen}
        onClose={() => setDeadlineWarning((prev) => ({ ...prev, isOpen: false }))}
        taskTitle={deadlineWarning.taskTitle}
        deadlineIso={deadlineWarning.deadlineIso}
        proposedTimeIso={deadlineWarning.proposedTimeIso}
        onConfirmKeepDeadline={async () => {
          try {
            await tasksApi.rescheduleTask(deadlineWarning.taskId, {
              date: deadlineWarning.newDate,
              startTime: deadlineWarning.newStartTime,
            });
            loadSchedule();
          } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Reschedule failed');
          } finally {
            setDeadlineWarning((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onConfirmExtendDeadline={async () => {
          try {
            await tasksApi.rescheduleTask(deadlineWarning.taskId, {
              date: deadlineWarning.newDate,
              startTime: deadlineWarning.newStartTime,
              deadline: deadlineWarning.proposedTimeIso,
            });
            loadSchedule();
          } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Reschedule failed');
          } finally {
            setDeadlineWarning((prev) => ({ ...prev, isOpen: false }));
          }
        }}
      />

      <EditTaskModal
        task={taskForEdit}
        isOpen={editTaskModalOpen}
        onClose={() => {
          setEditTaskModalOpen(false);
          setTaskForEdit(null);
        }}
        onTaskUpdated={loadSchedule}
        onTaskDeleted={loadSchedule}
      />
    </div>
  );
}
