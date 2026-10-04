'use client';

import React from 'react';
import { BookOpen, Award, Clock, Calendar, CheckCircle } from 'lucide-react';
import { dashboardApi } from '@/lib/dashboard-api';

export default function StudyPage() {
  const study = dashboardApi.getStudySummary();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Study & Exams</h1>
        <p className="text-xs text-slate-400 mt-1">Syllabus tracking, exam prep countdowns, and active study plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Weekly Target</span>
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {study.hoursLogged} <span className="text-sm font-normal text-slate-400">/ {study.hoursTarget} hrs</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${(study.hoursLogged / study.hoursTarget) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Active Subject</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white truncate">{study.activeTopic}</div>
          <p className="text-[11px] text-slate-400">Chapter 4: Consensus & Paxos</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Next Exam</span>
            <Calendar className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">
            {study.nextExam ? `${study.nextExam.daysRemaining} Days Left` : 'None'}
          </div>
          <p className="text-[11px] text-slate-300 truncate">{study.nextExam?.subject}</p>
        </div>
      </div>
    </div>
  );
}
