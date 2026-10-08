'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Calendar,
  Clock,
  Repeat,
  AlertCircle,
  CheckCircle2,
  Tag,
  Flag,
  Layers,
  X,
  Plus,
} from 'lucide-react';
import { aiApi, ParsedTaskData } from '@/lib/ai-api';
import { tasksApi } from '@/lib/tasks-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';

interface AiTaskParserBarProps {
  onTaskCreated?: () => void;
  className?: string;
}

const EXAMPLE_PROMPTS = [
  'Remind me to study Java DSA tomorrow at 7 PM for 1 hour.',
  'Study OS for 2 hours tomorrow.',
  'Every Sunday remind me to plan my week.',
  'Submit assignment before Friday 5 PM.',
  'Gym workout tomorrow morning at 6:30 AM for 45 minutes',
];

export function AiTaskParserBar({ onTaskCreated, className = '' }: AiTaskParserBarProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoAdd, setAutoAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedTaskData | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleParse = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToParse = overrideText !== undefined ? overrideText : input;
    if (!textToParse.trim()) {
      setError('Please enter a task description');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setParsedResult(null);

    try {
      const res = await aiApi.parseTask(textToParse.trim(), {
        autoCreate: autoAdd,
      });

      if (autoAdd && res.createdTask) {
        setSuccessMessage(`Task "${res.task.title}" successfully created and saved to database!`);
        setInput('');
        setParsedResult(null);
        if (onTaskCreated) onTaskCreated();
      } else {
        setParsedResult(res.task);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse task with AI');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParsedTask = async () => {
    if (!parsedResult) return;
    setIsSaving(true);
    setError(null);

    try {
      await tasksApi.createTask({
        title: parsedResult.title,
        description: parsedResult.notes || undefined,
        category: parsedResult.category,
        priority: parsedResult.priority,
        date: parsedResult.date || undefined,
        dueDate: parsedResult.dueDate || parsedResult.date || undefined,
        startTime: parsedResult.startTime || undefined,
        endTime: parsedResult.endTime || undefined,
        estimatedDuration: parsedResult.duration || undefined,
        deadline: parsedResult.deadline || undefined,
        tags: parsedResult.tags,
      });

      setSuccessMessage(`Task "${parsedResult.title}" saved to your database!`);
      setParsedResult(null);
      setInput('');
      if (onTaskCreated) onTaskCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save task to database');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-3xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900/60 border border-purple-500/30 shadow-xl backdrop-blur-md relative overflow-hidden ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              AI Task Parser
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Natural Language
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Type naturally — dates, times, durations, recurrence, and priorities are strictly validated
            </p>
          </div>
        </div>

        {/* Auto-Add Toggle */}
        <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto text-xs text-slate-300">
          <input
            type="checkbox"
            checked={autoAdd}
            onChange={(e) => setAutoAdd(e.target.checked)}
            className="w-4 h-4 rounded text-purple-600 bg-slate-800 border-slate-700 focus:ring-purple-500 focus:ring-offset-slate-900"
          />
          <span className="text-[11px] text-slate-300 select-none">Auto-save on parse</span>
        </label>
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => handleParse(e)} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id="ai-task-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 'Remind me to study Java DSA tomorrow at 7 PM for 1 hour.'"
            className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-900/80 border border-purple-500/40 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 text-white placeholder-slate-500 text-xs shadow-inner outline-none transition-all"
            disabled={loading}
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          id="ai-parse-button"
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Parsing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{autoAdd ? 'Parse & Save' : 'Parse with AI'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Example Prompt Chips */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Try:</span>
        {EXAMPLE_PROMPTS.map((ex, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setInput(ex);
              handleParse(undefined, ex);
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-purple-900/40 border border-slate-700/60 hover:border-purple-500/50 text-slate-300 hover:text-white transition-all text-[11px] truncate max-w-[280px] sm:max-w-none cursor-pointer"
          >
            &ldquo;{ex}&rdquo;
          </button>
        ))}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Parsed Result Preview Card */}
      {parsedResult && (
        <div
          id="parsed-task-preview"
          className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-purple-500/40 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200">
                Backend Validated Structured Task
              </span>
            </div>
            <button
              onClick={() => setParsedResult(null)}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Task Title & Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-extrabold text-white">{parsedResult.title}</h3>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <CategoryBadge category={parsedResult.category} />
              <PriorityBadge priority={parsedResult.priority} />

              {parsedResult.date && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  {parsedResult.date}
                </span>
              )}

              {(parsedResult.startTime || parsedResult.time) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {parsedResult.startTime || parsedResult.time}
                  {parsedResult.endTime && ` - ${parsedResult.endTime}`}
                  {parsedResult.duration && ` (${parsedResult.duration} mins)`}
                </span>
              )}

              {!parsedResult.startTime && parsedResult.duration && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  {parsedResult.duration} minutes
                </span>
              )}

              {parsedResult.isRecurring && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-900/40 border border-purple-500/40 text-purple-300 text-[11px]">
                  <Repeat className="w-3 h-3 text-purple-400" />
                  {parsedResult.recurrenceInterval || 'Recurring'}
                </span>
              )}

              {parsedResult.deadline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-900/30 border border-rose-500/30 text-rose-300 text-[11px]">
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  Deadline: {new Date(parsedResult.deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Tags row */}
            {parsedResult.tags && parsedResult.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {parsedResult.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] text-slate-400 font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action confirmation button */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setParsedResult(null)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Dismiss
            </button>
            <button
              id="confirm-add-task-button"
              type="button"
              onClick={handleSaveParsedTask}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save to Tasks</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
