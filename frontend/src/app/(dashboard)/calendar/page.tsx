'use client';

import React from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function CalendarPage() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Calendar</h1>
          <p className="text-xs text-slate-400 mt-1">Smart scheduling and time-block timeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-semibold text-xs text-white">
            October 2026
          </span>
          <button className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
          {days.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {dates.map((date) => {
            const isToday = date === 4;
            return (
              <div
                key={date}
                className={`min-h-[75px] sm:min-h-[90px] p-2 rounded-2xl border transition-all flex flex-col justify-between ${
                  isToday
                    ? 'bg-blue-600/10 border-blue-500/40 text-blue-400'
                    : 'bg-slate-800/30 border-slate-800/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className={`text-xs font-bold ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                  {date}
                </span>
                {isToday && (
                  <div className="p-1 rounded-lg bg-blue-500/20 text-[10px] font-medium text-blue-300 truncate">
                    3 tasks scheduled
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
