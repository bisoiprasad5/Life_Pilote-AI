import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load content',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-rose-300 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/20 text-rose-700 dark:text-rose-200 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 mb-3 shadow-inner">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-300">{title}</h3>
      <p className="text-xs text-rose-700/80 dark:text-rose-300/80 max-w-sm mt-1 mb-4 leading-relaxed font-mono">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
