'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Task } from '@/lib/tasks-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';
import { Sparkles, Play, CheckCircle, Clock, Calendar, ArrowRight } from 'lucide-react';

interface WhatToDoNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  energyLevel?: number;
  onStartFocus: (task: Task) => void;
  onCompleteTask: (taskId: string) => void;
}

export function WhatToDoNowModal({
  isOpen,
  onClose,
  tasks,
  energyLevel = 3,
  onStartFocus,
  onCompleteTask,
}: WhatToDoNowModalProps) {
  // Find pending tasks
  const pendingTasks = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

  // Compute recommendation
  // Priority: 1) Overdue/due today with CRITICAL or HIGH priority, 2) in-progress, 3) highest priority task matching energy level
  const recommendation = React.useMemo(() => {
    if (pendingTasks.length === 0) return null;

    const criticalTasks = pendingTasks.filter((t) => t.priority === 'CRITICAL');
    if (criticalTasks.length > 0) {
      return {
        task: criticalTasks[0],
        reason: 'This task has CRITICAL urgency and requires your immediate, undivided attention.',
      };
    }

    const highTasks = pendingTasks.filter((t) => t.priority === 'HIGH');
    if (highTasks.length > 0) {
      return {
        task: highTasks[0],
        reason: 'This is a HIGH priority milestone. Tackling this now aligns with your daily peak energy.',
      };
    }

    // Next scheduled task with a time
    const timedTask = pendingTasks.find((t) => t.startTime);
    if (timedTask) {
      return {
        task: timedTask,
        reason: `Scheduled for today at ${timedTask.startTime}. Keeping to your calendar prevents schedule backlog.`,
      };
    }

    return {
      task: pendingTasks[0],
      reason: 'Top task in your backlog. Making progress on this will maintain your momentum today.',
    };
  }, [pendingTasks]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="What Should I Do Now?"
      description="LifePilot AI algorithmically selects your highest-leverage task based on priority, energy, and deadlines."
      maxWidth="max-w-lg"
    >
      {recommendation ? (
        <div className="space-y-5">
          {/* AI Recommendation Header Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/10 border border-blue-500/25">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 mb-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Optimal Next Focus Target</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{recommendation.reason}</p>
          </div>

          {/* Highlighted Task Details */}
          <div className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CategoryBadge category={recommendation.task.category} />
                <PriorityBadge priority={recommendation.task.priority} />
              </div>
              {recommendation.task.estimatedDuration && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  {recommendation.task.estimatedDuration} mins
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-white tracking-tight">
              {recommendation.task.title}
            </h4>

            {recommendation.task.description && (
              <p className="text-xs text-slate-300 leading-relaxed">
                {recommendation.task.description}
              </p>
            )}

            {/* Subtasks Preview */}
            {recommendation.task.subtasks && recommendation.task.subtasks.length > 0 && (
              <div className="pt-2 border-t border-slate-700/60">
                <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
                  Subtasks ({recommendation.task.subtasks.filter((s) => s.isCompleted).length}/
                  {recommendation.task.subtasks.length}):
                </p>
                <div className="space-y-1">
                  {recommendation.task.subtasks.slice(0, 3).map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2 text-xs text-slate-300 truncate"
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                          st.isCompleted
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'border-slate-600'
                        }`}
                      >
                        {st.isCompleted && <CheckCircle className="w-3 h-3" />}
                      </div>
                      <span className={st.isCompleted ? 'line-through text-slate-500' : ''}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                onCompleteTask(recommendation.task.id);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark Done</span>
            </button>

            <button
              onClick={() => {
                onStartFocus(recommendation.task);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Focus Session Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">All Caught Up!</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have no pending tasks right now. Take a well-deserved break, review your goals, or add your next milestone.
          </p>
        </div>
      )}
    </Modal>
  );
}
