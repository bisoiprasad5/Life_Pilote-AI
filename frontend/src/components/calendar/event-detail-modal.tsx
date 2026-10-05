'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { UnifiedScheduleItem, calendarApi } from '@/lib/calendar-api';
import { tasksApi } from '@/lib/tasks-api';
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit3,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface EventDetailModalProps {
  item: UnifiedScheduleItem | null;
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated: () => void;
  onOpenEditTask?: (taskId: string) => void;
}

export function EventDetailModal({
  item,
  isOpen,
  onClose,
  onScheduleUpdated,
  onOpenEditTask,
}: EventDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const startDate = new Date(item.startTime);
  const endDate = new Date(item.endTime);

  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = item.isAllDay
    ? 'All Day'
    : `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const isTask = item.type === 'TASK' || item.type === 'STUDY' || item.type === 'HABIT' || item.type === 'DEADLINE';
  const rawTaskId = item.referenceId || (item.id.startsWith('task-') ? item.id.replace('task-', '') : (item.id.startsWith('deadline-') ? item.id.replace('deadline-', '') : null));

  const handleToggleTaskComplete = async () => {
    if (!rawTaskId) return;
    setIsLoading(true);
    try {
      const isCurrentlyDone = item.status === 'COMPLETED';
      await tasksApi.completeTask(rawTaskId, !isCurrentlyDone);
      onScheduleUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update task completion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    setIsLoading(true);
    try {
      if (item.type === 'EVENT') {
        await calendarApi.deleteEvent(item.referenceId || item.id);
      } else if (rawTaskId) {
        await tasksApi.deleteTask(rawTaskId);
      }
      onScheduleUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      description={`${item.type} Schedule Entry`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Conflict Warning */}
        {item.hasConflict && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Schedule Conflict Detected</span>
            </div>
            {item.conflictDetails?.map((det, idx) => (
              <p key={idx} className="text-[11px] text-slate-600 dark:text-slate-300">
                • {det}
              </p>
            ))}
          </div>
        )}

        {/* Date and Time card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-semibold">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
            <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="font-mono">{formattedTime}</span>
          </div>
          {item.location && (
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{item.location}</span>
            </div>
          )}
        </div>

        {/* Details & Description */}
        {item.description && (
          <div className="space-y-1">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Notes & Description
            </span>
            <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {item.description}
            </p>
          </div>
        )}

        {/* Type & Status pills */}
        <div className="flex flex-wrap items-center gap-2">
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
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                item.priority === 'CRITICAL'
                  ? 'bg-rose-500/15 text-rose-500'
                  : item.priority === 'HIGH'
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-blue-500/15 text-blue-500'
              }`}
            >
              {item.priority} Priority
            </span>
          )}
          {item.status && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Status: {item.status}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDeleteEvent}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            {isTask && rawTaskId && onOpenEditTask && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditTask(rawTaskId);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Task</span>
              </button>
            )}

            {isTask && rawTaskId && (
              <button
                type="button"
                onClick={handleToggleTaskComplete}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>{item.status === 'COMPLETED' ? 'Reopen' : 'Mark Done'}</span>
              </button>
            )}

            {!isTask && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
