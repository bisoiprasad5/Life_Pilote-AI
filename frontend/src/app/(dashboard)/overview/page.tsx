'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  CheckCircle,
  Activity,
  ArrowRight,
  User,
  RefreshCw,
} from 'lucide-react';

interface TestResultState {
  status: 'SUCCESS' | 'ERROR';
  message: string;
  data?: unknown;
}

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);
  const [testResult, setTestResult] = useState<TestResultState | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const testProtectedApi = async () => {
    setIsTesting(true);
    try {
      const res = await api.get('/auth/me');
      setTestResult({
        status: 'SUCCESS',
        message: 'Protected API request succeeded via HTTP-Only session cookie!',
        data: res.data,
      });
    } catch (err: unknown) {
      setTestResult({
        status: 'ERROR',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/20 border border-blue-500/20 p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Command Center Active
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Good day, {user?.fullName || 'Pilot'} 👋
          </h1>
          <p className="mt-2 text-sm text-slate-300 font-light leading-relaxed">
            Your LifePilot AI ecosystem is ready. All core identity & authentication layers are operational with strict HTTP-Only cookie containment.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Edit User Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              id="test-protected-api-button"
              onClick={testProtectedApi}
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Verify Protected API Guard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Result Feedback */}
      {testResult && (
        <div
          id="api-test-result"
          className={`p-5 rounded-2xl border text-xs font-mono transition-all animate-fadeIn ${
            testResult.status === 'SUCCESS'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              {testResult.message}
            </span>
            <button
              onClick={() => setTestResult(null)}
              className="text-slate-400 hover:text-slate-200 text-[10px] uppercase font-sans"
            >
              Dismiss
            </button>
          </div>
          <pre className="overflow-x-auto p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] leading-relaxed">
            {JSON.stringify(testResult.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Grid of Session & User Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Identity & Role */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">Security Credentials</h2>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>
              Account ID: <span className="font-mono text-slate-300">{user?.id?.slice(0, 12)}...</span>
            </p>
            <p>
              Email: <span className="text-slate-300">{user?.email}</span>
            </p>
            <p>
              Access Role:{' '}
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-mono text-[10px]">
                {user?.role}
              </span>
            </p>
          </div>
        </div>

        {/* Energy Level & Preferences */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">AI Scheduling State</h2>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>
              Energy Level: <span className="text-amber-400 font-bold">{user?.preference?.energyLevel || 3} / 5</span>
            </p>
            <p>
              Timezone: <span className="text-slate-300">{user?.preference?.timezone || 'UTC'}</span>
            </p>
            <p>
              Pomodoro Default: <span className="text-slate-300">{user?.preference?.defaultPomodoroLength || 25} mins</span>
            </p>
          </div>
        </div>

        {/* Ambient Briefings */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">Briefing Automation</h2>
          <div className="space-y-1.5 text-xs text-slate-400">
            <p>
              Morning Briefing:{' '}
              <span className="text-emerald-400 font-medium">
                {user?.preference?.morningBriefingEnabled ? `Enabled (${user.preference.morningBriefingTime})` : 'Disabled'}
              </span>
            </p>
            <p>
              Night Review:{' '}
              <span className="text-indigo-400 font-medium">
                {user?.preference?.nightReviewEnabled ? `Enabled (${user.preference.nightReviewTime})` : 'Disabled'}
              </span>
            </p>
            <p>
              Hydration Goal: <span className="text-slate-300">{user?.preference?.dailyWaterTargetMl || 2500} ml/day</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
