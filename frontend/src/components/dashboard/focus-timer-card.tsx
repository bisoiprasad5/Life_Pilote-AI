'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, Flame } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';

export function FocusTimerCard({ defaultLengthMinutes = 25 }: { defaultLengthMinutes?: number }) {
  const [todayMins, setTodayMins] = useState(75);
  const [secondsLeft, setSecondsLeft] = useState(defaultLengthMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const focusState = dashboardApi.getFocusState();
    setTodayMins(focusState.todayMinutes);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Finished 1 session
            const updated = dashboardApi.addFocusMinutes(defaultLengthMinutes);
            setTodayMins(updated.todayMinutes);
            return defaultLengthMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, defaultLengthMinutes]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(defaultLengthMinutes * 60);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Focus Time</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              <span className="text-amber-600 dark:text-amber-400 font-bold">{todayMins}m</span> logged today
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold">
          <Flame className="w-3 h-3" />
          <span>{Math.floor(todayMins / 25)} Sprints</span>
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center py-2">
        <div className="text-3xl font-extrabold font-mono tracking-wider text-slate-900 dark:text-white drop-shadow-sm">
          {timeFormatted}
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
          {isRunning ? 'Deep Work session in progress' : 'Ready for next sprint'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <button
          onClick={toggleTimer}
          className={`flex-1 py-2 rounded-xl text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Focus</span>
            </>
          )}
        </button>

        <button
          onClick={resetTimer}
          title="Reset Timer"
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
