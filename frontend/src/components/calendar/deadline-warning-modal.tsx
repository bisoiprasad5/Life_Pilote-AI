'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { AlertTriangle, Clock, Calendar, CheckCircle, X } from 'lucide-react';

interface DeadlineWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  deadlineIso: string;
  proposedTimeIso: string;
  onConfirmKeepDeadline: () => void;
  onConfirmExtendDeadline: () => void;
}

export function DeadlineWarningModal({
  isOpen,
  onClose,
  taskTitle,
  deadlineIso,
  proposedTimeIso,
  onConfirmKeepDeadline,
  onConfirmExtendDeadline,
}: DeadlineWarningModalProps) {
  const deadlineDate = new Date(deadlineIso);
  const proposedDate = new Date(proposedTimeIso);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Critical Deadline Alert"
      description="Important deadlines cannot be changed silently."
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Reschedule Exceeds Fixed Deadline</p>
            <p className="text-slate-600 dark:text-slate-300">
              You are attempting to reschedule work on <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{taskTitle}&rdquo;</span> to:
            </p>
            <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-amber-500/20 font-mono text-[11px] space-y-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Proposed Slot:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {proposedDate.toLocaleDateString()} {proposedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-amber-500/20 pt-1">
                <span className="text-rose-500 font-semibold">Strict Deadline:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {deadlineDate.toLocaleDateString()} {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
          Please choose how you wish to resolve this schedule allocation:
        </p>

        <div className="space-y-2 pt-1">
          {/* Option 1: Keep original deadline and adjust work block */}
          <button
            type="button"
            onClick={onConfirmKeepDeadline}
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-left font-semibold border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="text-xs">Keep Deadline Untouched</div>
              <div className="text-[10px] text-slate-500 font-normal">
                Schedule work session here, but preserve strict deadline for alerts
              </div>
            </div>
            <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
          </button>

          {/* Option 2: Push deadline with work block */}
          <button
            type="button"
            onClick={onConfirmExtendDeadline}
            className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-left font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-between cursor-pointer"
          >
            <div>
              <div className="text-xs">Explicitly Extend Deadline</div>
              <div className="text-[10px] text-blue-100 font-normal">
                Synchronize new deadline with completion of this work session
              </div>
            </div>
            <Calendar className="w-4 h-4 text-white flex-shrink-0" />
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel Reschedule
          </button>
        </div>
      </div>
    </Modal>
  );
}
