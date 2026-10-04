'use client';

import React from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Task } from '@/lib/tasks-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';

interface ScheduleCardProps {
  tasks: Task[];
  onCompleteTask: (id: string) => void;
}

export function ScheduleCard({ tasks, onCompleteTask }: ScheduleCardProps) {
  // Sort tasks that have a startTime or dueTime
  const todayTasks = tasks.filter((t) => t.status !== 'CANCELLED');

  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Today&apos;s Schedule</h3>
            <p className="text-[11px] text-slate-400">Timeline & Scheduled Work Blocks</p>
          </div>
        </div>

        <span className="text-[11px] text-indigo-400 font-mono font-semibold">
          {todayTasks.length} Events
        </span>
      </div>

      {/* Schedule Items Timeline */}
      {todayTasks.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
          No scheduled events for today yet. Use Quick Add Task to schedule one!
        </div>
      ) : (
        <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800 before:z-0">
          {todayTasks.slice(0, 5).map((task) => {
            const isDone = task.status === 'COMPLETED';
            const timeDisplay = task.startTime
              ? `${task.startTime}${task.endTime ? ` - ${task.endTime}` : ''}`
              : 'Flexible Slot';

            return (
              <div
                key={task.id}
                className="relative z-10 flex items-start gap-3 pl-1 group"
              >
                {/* Timeline node */}
                <button
                  onClick={() => onCompleteTask(task.id)}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all mt-1 cursor-pointer flex-shrink-0 ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'bg-slate-900 border-slate-700 text-transparent hover:border-blue-400'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                {/* Content Box */}
                <div
                  className={`flex-1 p-3.5 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono font-semibold text-blue-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeDisplay}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <CategoryBadge category={task.category} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                  </div>

                  <h4
                    className={`text-xs font-semibold text-white ${
                      isDone ? 'line-through text-slate-400' : ''
                    }`}
                  >
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
