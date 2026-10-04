'use client';

import React from 'react';
import { HabitsCard } from '@/components/dashboard/habits-card';
import { FocusTimerCard } from '@/components/dashboard/focus-timer-card';

export default function HabitsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Habit Tracker</h1>
        <p className="text-xs text-slate-400 mt-1">Consistency loops, streaks, and atomic behavior improvements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <HabitsCard />
        <FocusTimerCard />
      </div>
    </div>
  );
}
