'use client';

import React from 'react';
import { BarChart3, TrendingUp, Zap, Clock, CheckCircle } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Analytics & Insights</h1>
        <p className="text-xs text-slate-400 mt-1">Velocity charts, task completion ratios, and circadian focus efficiency</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400">Weekly Completion Rate</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">88.5%</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400">Total Deep Work</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">18.4 hrs</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400">Habit Adherence</span>
          <div className="text-2xl font-bold text-blue-400 font-mono">92%</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
          <span className="text-xs text-slate-400">Productivity Score</span>
          <div className="text-2xl font-bold text-purple-400 font-mono">94 / 100</div>
        </div>
      </div>
    </div>
  );
}
