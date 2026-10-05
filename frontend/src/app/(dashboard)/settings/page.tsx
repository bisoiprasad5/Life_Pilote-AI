'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/lib/theme-context';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Zap,
  Droplets,
  Clock,
  Bell,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  User,
} from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'PRODUCTIVITY' | 'ROUTINES'>('GENERAL');

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [energyLevel, setEnergyLevel] = useState(user?.preference?.energyLevel ?? 4);
  const [timezone, setTimezone] = useState(user?.preference?.timezone ?? 'UTC');
  const [dailyWaterTargetMl, setDailyWaterTargetMl] = useState(
    user?.preference?.dailyWaterTargetMl ?? 2500,
  );
  const [defaultPomodoroLength, setDefaultPomodoroLength] = useState(
    user?.preference?.defaultPomodoroLength ?? 25,
  );
  const [morningBriefingEnabled, setMorningBriefingEnabled] = useState(
    user?.preference?.morningBriefingEnabled ?? true,
  );
  const [morningBriefingTime, setMorningBriefingTime] = useState(
    user?.preference?.morningBriefingTime ?? '07:30',
  );
  const [nightReviewEnabled, setNightReviewEnabled] = useState(
    user?.preference?.nightReviewEnabled ?? true,
  );
  const [nightReviewTime, setNightReviewTime] = useState(
    user?.preference?.nightReviewTime ?? '21:30',
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      await updateProfile({
        fullName,
        energyLevel: Number(energyLevel),
        timezone,
        theme,
        morningBriefingEnabled,
        morningBriefingTime,
        nightReviewEnabled,
        nightReviewTime,
        dailyWaterTargetMl: Number(dailyWaterTargetMl),
        defaultPomodoroLength: Number(defaultPomodoroLength),
      });
      setFeedback({ type: 'success', text: 'Settings updated and synchronized successfully!' });
    } catch {
      // Local optimistic fallback
      if (typeof window !== 'undefined') {
        const currentSession = localStorage.getItem('lifepilot_demo_session');
        if (currentSession) {
          try {
            const parsed = JSON.parse(currentSession);
            parsed.fullName = fullName;
            parsed.preference = {
              ...parsed.preference,
              energyLevel: Number(energyLevel),
              timezone,
              theme,
              morningBriefingEnabled,
              morningBriefingTime,
              nightReviewEnabled,
              nightReviewTime,
              dailyWaterTargetMl: Number(dailyWaterTargetMl),
              defaultPomodoroLength: Number(defaultPomodoroLength),
            };
            localStorage.setItem('lifepilot_demo_session', JSON.stringify(parsed));
          } catch {}
        }
      }
      setFeedback({ type: 'success', text: 'Settings saved locally for current workspace session.' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Application Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize your workspace appearance, productivity algorithms, health targets, and AI routines.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
              : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { key: 'GENERAL', label: 'General & Appearance' },
          { key: 'PRODUCTIVITY', label: 'Focus & Health' },
          { key: 'ROUTINES', label: 'AI Routines & Briefings' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: GENERAL & APPEARANCE */}
        {activeTab === 'GENERAL' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg space-y-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Theme & Interface Appearance
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-3 ${
                    theme === 'light'
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <Sun className="w-6 h-6 text-amber-500" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900">Light Mode</p>
                    <p className="text-[10px] text-slate-500">Crisp, clean, high-contrast</p>
                  </div>
                </div>

                <div
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-3 ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <Moon className="w-6 h-6 text-indigo-400" />
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Deep obsidian, glowing accents</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                Profile Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTIVITY & HEALTH */}
        {activeTab === 'PRODUCTIVITY' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Focus & Pomodoro Timer Target
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Default Sprint Duration (Minutes)
                  </label>
                  <select
                    value={defaultPomodoroLength}
                    onChange={(e) => setDefaultPomodoroLength(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={15}>15 Minutes (Short Sprint)</option>
                    <option value={25}>25 Minutes (Standard Pomodoro)</option>
                    <option value={45}>45 Minutes (Deep Focus)</option>
                    <option value={60}>60 Minutes (Ultra Deep Work)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Daily Water Target (ml)
                  </label>
                  <input
                    type="number"
                    step={100}
                    value={dailyWaterTargetMl}
                    onChange={(e) => setDailyWaterTargetMl(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Peak Circadian Energy Scale (1 to 5)
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyLevel(lvl)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        energyLevel === lvl
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400'
                      }`}
                    >
                      {lvl} {lvl === 5 ? '⚡ Max' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ROUTINES & BRIEFINGS */}
        {activeTab === 'ROUTINES' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm dark:shadow-lg space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              AI Cognitive Routines & Reviews
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Morning Briefing</span>
                  <input
                    type="checkbox"
                    checked={morningBriefingEnabled}
                    onChange={(e) => setMorningBriefingEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  AI summarizes your high-priority items and circadian plan upon awakening.
                </p>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={morningBriefingTime}
                    onChange={(e) => setMorningBriefingTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Night Review</span>
                  <input
                    type="checkbox"
                    checked={nightReviewEnabled}
                    onChange={(e) => setNightReviewEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  AI reviews completed habits, logs hydration delta, and prepares tomorrow&apos;s slate.
                </p>
                <div>
                  <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">Time</label>
                  <input
                    type="time"
                    value={nightReviewTime}
                    onChange={(e) => setNightReviewTime(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
