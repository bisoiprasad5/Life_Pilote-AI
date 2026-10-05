'use client';

import React, { useState, useEffect } from 'react';
import { Droplets, Plus, RotateCcw } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';

export function WaterTrackerCard({ targetMl = 2500 }: { targetMl?: number }) {
  const [amount, setAmount] = useState(1250);

  useEffect(() => {
    const data = dashboardApi.getWaterLog();
    setAmount(data.amountMl);
  }, []);

  const addWater = (ml: number) => {
    const next = Math.min(targetMl * 2, amount + ml);
    setAmount(next);
    dashboardApi.setWaterLog(next);
  };

  const resetWater = () => {
    setAmount(0);
    dashboardApi.setWaterLog(0);
  };

  const percentage = Math.min(100, Math.round((amount / targetMl) * 100));

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 dark:text-cyan-400">
            <Droplets className="w-5 h-5 animate-bounce duration-1000" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Water Tracking</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {amount} / {targetMl} ml ({percentage}%)
            </p>
          </div>
        </div>

        <button
          onClick={resetWater}
          title="Reset today's water"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Bar with Liquid Glow */}
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative border border-slate-200 dark:border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 shadow-md shadow-cyan-500/30"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          <span>0 ml</span>
          <span>{targetMl / 2} ml</span>
          <span>{targetMl} ml</span>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => addWater(250)}
          className="flex-1 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>250 ml</span>
        </button>
        <button
          onClick={() => addWater(500)}
          className="flex-1 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>500 ml</span>
        </button>
      </div>
    </div>
  );
}
