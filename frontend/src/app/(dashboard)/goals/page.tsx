'use client';

import React from 'react';
import { Target, CheckCircle2, TrendingUp, Plus } from 'lucide-react';

export default function GoalsPage() {
  const goals = [
    { title: 'Launch LifePilot AI Platform v1', category: 'CAREER', progress: 75, targetDate: '2026-11-01' },
    { title: 'Complete Distributed Systems Mastery', category: 'LEARNING', progress: 50, targetDate: '2026-12-15' },
    { title: 'Run 10km under 50 minutes', category: 'FITNESS', progress: 65, targetDate: '2026-11-20' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Goals & Milestones</h1>
          <p className="text-xs text-slate-400 mt-1">High-leverage life targets broken down into actionable milestones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {goals.map((g, idx) => (
          <div key={idx} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                {g.category}
              </span>
              <span className="text-xs font-mono font-bold text-white">{g.progress}%</span>
            </div>

            <h3 className="text-base font-bold text-white">{g.title}</h3>

            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${g.progress}%` }} />
            </div>

            <p className="text-[11px] text-slate-400 font-mono">Target: {g.targetDate}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
