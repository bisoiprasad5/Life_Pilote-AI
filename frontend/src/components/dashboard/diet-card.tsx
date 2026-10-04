'use client';

import React from 'react';
import { Utensils, Flame, Check } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';

export function DietCard() {
  const diet = dashboardApi.getDietSummary();
  const caloriePercent = Math.min(100, Math.round((diet.caloriesConsumed / diet.calorieTarget) * 100));

  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Diet Information</h3>
            <p className="text-[11px] text-slate-400">
              <span className="text-emerald-400 font-bold">{diet.caloriesConsumed}</span> / {diet.calorieTarget} kcal ({caloriePercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold">
          <Flame className="w-3.5 h-3.5" />
          <span>{diet.calorieTarget - diet.caloriesConsumed} kcal left</span>
        </div>
      </div>

      {/* Calorie Bar */}
      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700/50">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/20"
          style={{ width: `${caloriePercent}%` }}
        />
      </div>

      {/* Macronutrient Pills */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <p className="text-[10px] text-slate-400 font-medium">Protein</p>
          <p className="font-bold text-blue-400 font-mono mt-0.5">
            {diet.proteinGrams}g <span className="text-[10px] text-slate-500 font-normal">/ {diet.proteinTarget}g</span>
          </p>
        </div>
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <p className="text-[10px] text-slate-400 font-medium">Carbs</p>
          <p className="font-bold text-amber-400 font-mono mt-0.5">
            {diet.carbsGrams}g <span className="text-[10px] text-slate-500 font-normal">/ {diet.carbsTarget}g</span>
          </p>
        </div>
        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <p className="text-[10px] text-slate-400 font-medium">Fats</p>
          <p className="font-bold text-rose-400 font-mono mt-0.5">
            {diet.fatsGrams}g <span className="text-[10px] text-slate-500 font-normal">/ {diet.fatsTarget}g</span>
          </p>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="space-y-1.5 pt-1">
        {diet.meals.slice(0, 3).map((meal, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 text-xs text-slate-300"
          >
            <div className="flex items-center gap-2 truncate">
              <span
                className={`w-2 h-2 rounded-full ${
                  meal.isCompleted ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
              />
              <span className="truncate">{meal.name}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
              {meal.calories} kcal
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
