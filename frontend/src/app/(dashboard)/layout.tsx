'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/lib/theme-context';
import {
  Sparkles,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Bot,
  BookOpen,
  Utensils,
  Flame,
  Target,
  BarChart3,
  StickyNote,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Search,
  Bell,
  Clock,
  Zap,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

const SIDEBAR_NAV = [
  { name: 'Dashboard', href: '/overview', icon: LayoutDashboard },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare, badge: 'Smart' },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot, highlight: true },
  { name: 'Study', href: '/study', icon: BookOpen },
  { name: 'Diet', href: '/diet', icon: Utensils },
  { name: 'Habits', href: '/habits', icon: Flame },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Notes', href: '/notes', icon: StickyNote },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function ProtectedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const logout = useAuthStore((s) => s.logout);

  const { theme, toggleTheme } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Live real-time clock updating every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span>Verifying session security...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'LP';

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* ------------------------------------------------------------- */}
      {/* 1. DESKTOP & TABLET SIDEBAR                                    */}
      {/* ------------------------------------------------------------- */}
      <aside className="hidden lg:flex w-64 border-r border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex-col fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/overview" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                LifePilot AI
              </h2>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider">
                PRODUCTIVITY OS
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SIDEBAR_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/overview' && pathname === '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                id={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Session Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm">
            <Link href="/profile" className="flex items-center gap-2.5 min-w-0 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 transition-colors truncate">
                  {user?.fullName || 'Pilot'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </Link>
            <button
              id="sidebar-logout-button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* 2. MOBILE SLIDE-OUT DRAWER                                     */}
      {/* ------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 p-4 flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">LifePilot AI</h3>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {SIDEBAR_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. MAIN CONTENT CONTAINER                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header Navigation */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Mobile hamburger + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input bar */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-400 text-xs w-64 focus-within:w-80 focus-within:border-blue-500 focus-within:text-slate-200 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search tasks, study, notes... (⌘K)"
                className="bg-transparent border-none outline-none w-full text-slate-200 placeholder-slate-500 text-xs"
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Clock Indicator */}
            {currentTime && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-300 font-mono text-xs">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-button"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {/* Notifications Bell */}
            <button
              id="notifications-button"
              className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </button>

            {/* User Profile Pill */}
            <Link
              href="/profile"
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                {initials}
              </div>
              <span className="hidden sm:inline font-semibold">{user?.fullName?.split(' ')[0] || 'Pilot'}</span>
            </Link>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-20 lg:pb-8">
          {children}
        </main>

        {/* ------------------------------------------------------------- */}
        {/* 4. MOBILE BOTTOM NAVIGATION                                    */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 h-14 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-30 px-4 flex items-center justify-around">
          {[
            { name: 'Dashboard', href: '/overview', icon: LayoutDashboard },
            { name: 'Tasks', href: '/tasks', icon: CheckSquare },
            { name: 'Calendar', href: '/calendar', icon: Calendar },
            { name: 'AI', href: '/ai-assistant', icon: Bot },
            { name: 'Habits', href: '/habits', icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
