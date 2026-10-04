'use client';

import React from 'react';
import { DietCard } from '@/components/dashboard/diet-card';
import { WaterTrackerCard } from '@/components/dashboard/water-tracker-card';
import { Utensils, Droplets, Apple } from 'lucide-react';

export default function DietPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Diet & Nutrition</h1>
        <p className="text-xs text-slate-400 mt-1">Caloric balance, macronutrient targets, and meal planning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DietCard />
        <WaterTrackerCard />
      </div>
    </div>
  );
}
