'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Check, Plus, Trophy } from 'lucide-react';
import { dashboardApi, HabitItem } from '@/lib/dashboard-api';

export function HabitsCard() {
  const [habits, setHabits] = useState<HabitItem[]>([]);

  useEffect(() => {
    setHabits(dashboardApi.getHabits());
  }, []);

  const handleToggle = (id: string) => {
    const updated = dashboardApi.toggleHabit(id);
    setHabits(updated);
  };

  const completedCount = habits.filter((h) => h.isCompleted).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 dark:text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Habit Progress</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {completedCount} of {habits.length} habits completed ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-orange-500 dark:text-orange-400 font-semibold font-mono">
          <Trophy className="w-3.5 h-3.5" />
          <span>Active</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700/50">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300 shadow-md shadow-orange-500/20"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Habits Checklist */}
      <div className="space-y-2 pt-1">
        {habits.slice(0, 4).map((habit) => (
          <div
            key={habit.id}
            onClick={() => handleToggle(habit.id)}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
              habit.isCompleted
                ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-slate-700 dark:text-slate-300'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                  habit.isCompleted
                    ? 'bg-emerald-500 border-emerald-400 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50'
                }`}
              >
                {habit.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span
                className={`text-xs font-medium ${
                  habit.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {habit.title}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-orange-500 dark:text-orange-400">
              <Flame className="w-3 h-3 fill-orange-500 dark:fill-orange-400" />
              <span>{habit.streak}d</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
