'use client';

import React from 'react';
import { StickyNote, Plus, Pin } from 'lucide-react';

export default function NotesPage() {
  const notes = [
    { title: 'Architecture Decision: Hybrid State Resilience', content: 'In-memory fallback provides offline resiliency when database is deferred.', isPinned: true, date: 'Oct 4, 2026' },
    { title: 'LifePilot AI Roadmap', content: 'Step 5: Task manager backend complete. Step 6: Frontend dashboard foundation in progress.', isPinned: true, date: 'Oct 4, 2026' },
    { title: 'Reading Notes: Deep Work', content: 'High-quality work produced = (time spent) x (intensity of focus).', isPinned: false, date: 'Oct 2, 2026' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Notes & Ideas</h1>
          <p className="text-xs text-slate-400 mt-1">Capture ideas, voice notes, and instant thoughts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {notes.map((n, i) => (
          <div key={i} className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg space-y-2 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white truncate">{n.title}</h3>
              {n.isPinned && <Pin className="w-3.5 h-3.5 text-blue-400 fill-blue-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">{n.content}</p>
            <p className="text-[10px] text-slate-500 font-mono pt-2">{n.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
