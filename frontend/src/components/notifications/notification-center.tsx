'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  ExternalLink,
  Flame,
  Droplets,
  Utensils,
  BookOpen,
  GraduationCap,
  Target,
  AlertTriangle,
  Sparkles,
  Settings,
  X,
  Volume2,
} from 'lucide-react';
import { notificationsApi, NotificationItem } from '@/lib/notifications-api';
import { showBrowserNotification } from '@/lib/browser-notifications';

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  UPCOMING_TASK: { label: 'Upcoming Task', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  TASK_STARTING: { label: 'Task Starting', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  OVERDUE_TASK: { label: 'Overdue Task', icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  DEADLINE_APPROACHING: { label: 'Deadline Alert', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  HABIT_REMINDER: { label: 'Habit', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  WATER_REMINDER: { label: 'Hydration', icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  MEAL_REMINDER: { label: 'Meal', icon: Utensils, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  STUDY_REMINDER: { label: 'Study Session', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  EXAM_REMINDER: { label: 'Exam Countdown', icon: GraduationCap, color: 'text-red-500', bg: 'bg-red-500/10' },
  GOAL_REMINDER: { label: 'Goal Milestone', icon: Target, color: 'text-teal-500', bg: 'bg-teal-500/10' },
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getNotifications({
        unreadOnly: activeFilter === 'UNREAD',
        limit: 15,
      });
      setNotifications(res.data || []);
      const count = await notificationsApi.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Local fallback for offline/demo
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll unread count periodically or on dropdown open
    const interval = setInterval(async () => {
      try {
        const count = await notificationsApi.getUnreadCount();
        setUnreadCount(count);
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [activeFilter]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClearAll = async () => {
    try {
      await notificationsApi.clearAllRead();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
    } catch {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleTestBrowserAlert = () => {
    showBrowserNotification('LifePilot AI: Smart Notification Test', {
      body: 'Your BullMQ background job scheduler and browser alerts are working flawlessly!',
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="notifications-button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        title="Notifications"
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
            : 'bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer text-[10px] flex items-center gap-1 px-1.5"
                >
                  <CheckCheck className="w-3 h-3 text-blue-500" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                onClick={handleClearAll}
                title="Clear read"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer text-[10px] flex items-center gap-1 px-1.5"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear read</span>
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  activeFilter === 'ALL'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('UNREAD')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  activeFilter === 'UNREAD'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Unread only
              </button>
            </div>

            <button
              onClick={handleTestBrowserAlert}
              title="Test browser notification"
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3 h-3" />
              <span>Test Alert</span>
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Bell className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  All caught up!
                </p>
                <p className="text-[10px] text-slate-400">
                  No {activeFilter === 'UNREAD' ? 'unread' : ''} reminders or notifications.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const category = item.data?.category || 'UPCOMING_TASK';
                const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.UPCOMING_TASK;
                const IconComponent = cfg.icon;

                return (
                  <div
                    key={item.id}
                    className={`p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-start gap-3 group relative ${
                      !item.isRead ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    {/* Category Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} ${cfg.color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-400">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </p>
                      {item.message && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {item.message}
                        </p>
                      )}
                    </div>

                    {/* Quick Action Buttons on Hover */}
                    <div className="absolute right-2 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!item.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="Mark read"
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unread dot */}
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 absolute right-3 top-4 group-hover:hidden" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
            >
              <Settings className="w-3 h-3" />
              <span>Notification Preferences</span>
            </Link>

            <span className="text-[10px] text-slate-400 font-mono">
              LifePilot Job Engine
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
