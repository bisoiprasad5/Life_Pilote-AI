'use client';

import React, { useState } from 'react';
import { useAuthStore, User as UserType } from '@/store/auth-store';
import {
  User,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Clock,
  Droplets,
  Sun,
} from 'lucide-react';

function ProfileForm({ initialUser }: { initialUser: UserType | null }) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [fullName, setFullName] = useState(initialUser?.fullName || '');
  const [energyLevel, setEnergyLevel] = useState(initialUser?.preference?.energyLevel ?? 3);
  const [timezone, setTimezone] = useState(initialUser?.preference?.timezone ?? 'UTC');
  const [theme] = useState(initialUser?.preference?.theme ?? 'dark');
  const [morningBriefingEnabled, setMorningBriefingEnabled] = useState(
    initialUser?.preference?.morningBriefingEnabled ?? true,
  );
  const [morningBriefingTime, setMorningBriefingTime] = useState(
    initialUser?.preference?.morningBriefingTime ?? '07:00',
  );
  const [nightReviewEnabled, setNightReviewEnabled] = useState(
    initialUser?.preference?.nightReviewEnabled ?? true,
  );
  const [nightReviewTime, setNightReviewTime] = useState(
    initialUser?.preference?.nightReviewTime ?? '21:00',
  );
  const [dailyWaterTargetMl, setDailyWaterTargetMl] = useState(
    initialUser?.preference?.dailyWaterTargetMl ?? 2500,
  );
  const [defaultPomodoroLength, setDefaultPomodoroLength] = useState(
    initialUser?.preference?.defaultPomodoroLength ?? 25,
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
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

      setFeedback({
        type: 'success',
        text: 'User profile and AI scheduling preferences updated successfully!',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save changes. Please try again.',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          User Profile & Preferences
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your account identity, biometric preferences, and autonomous assistant schedules.
        </p>
      </div>

      {feedback && (
        <div
          id="profile-feedback-alert"
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Account Info Read-only Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" />
          Authentication & Credentials
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block mb-1">Email (Immutable)</span>
            <span className="font-mono text-slate-200">{initialUser?.email}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block mb-1">Access Role</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono font-medium">
              {initialUser?.role}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block mb-1">Account Created</span>
            <span className="text-slate-300">
              {initialUser?.createdAt ? new Date(initialUser.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Editable Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            Personal Details
          </h2>
          <div>
            <label
              htmlFor="profile-fullName"
              className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Full Name
            </label>
            <input
              id="profile-fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full max-w-md px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* AI & Productivity Preferences */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            AI Productivity & Scheduling Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="profile-energyLevel"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Default Energy Level (1-5):{' '}
                <span className="text-amber-400 font-bold">{energyLevel}</span>
              </label>
              <input
                id="profile-energyLevel"
                type="range"
                min="1"
                max="5"
                step="1"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1 (Low / Recovery)</span>
                <span>3 (Moderate)</span>
                <span>5 (Peak Focus)</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-timezone"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Timezone
              </label>
              <select
                id="profile-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <label
                htmlFor="profile-pomodoro"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Pomodoro Focus Interval (Minutes)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Clock className="w-4 h-4" />
                </div>
                <input
                  id="profile-pomodoro"
                  type="number"
                  min="5"
                  max="120"
                  value={defaultPomodoroLength}
                  onChange={(e) => setDefaultPomodoroLength(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-water"
                className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Daily Hydration Target (ml)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Droplets className="w-4 h-4" />
                </div>
                <input
                  id="profile-water"
                  type="number"
                  min="500"
                  max="10000"
                  step="100"
                  value={dailyWaterTargetMl}
                  onChange={(e) => setDailyWaterTargetMl(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ambient Briefings */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            Automated Daily AI Briefings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Morning Briefing</span>
                <input
                  type="checkbox"
                  checked={morningBriefingEnabled}
                  onChange={(e) => setMorningBriefingEnabled(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Trigger Time</label>
                <input
                  type="time"
                  value={morningBriefingTime}
                  onChange={(e) => setMorningBriefingTime(e.target.value)}
                  disabled={!morningBriefingEnabled}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 disabled:opacity-40"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Night Review</span>
                <input
                  type="checkbox"
                  checked={nightReviewEnabled}
                  onChange={(e) => setNightReviewEnabled(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Trigger Time</label>
                <input
                  type="time"
                  value={nightReviewTime}
                  onChange={(e) => setNightReviewTime(e.target.value)}
                  disabled={!nightReviewEnabled}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          id="profile-save-button"
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Profile & Preferences</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return <ProfileForm key={user?.id || 'loading'} initialUser={user} />;
}
