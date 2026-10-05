import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/70 ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Greeting Skeleton */}
      <div className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-850/50 border border-slate-200 dark:border-slate-800/80 p-8 space-y-4 animate-pulse">
        <Skeleton className="h-6 w-36 rounded-full" />
        <Skeleton className="h-10 w-80 rounded-xl" />
        <Skeleton className="h-4 w-96 rounded-lg" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 space-y-3">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-64 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-6 space-y-4">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-64 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-6 space-y-4">
            <Skeleton className="h-6 w-36 rounded" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
