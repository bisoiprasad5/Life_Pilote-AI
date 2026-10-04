'use client';

import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Zap, Calendar, CheckSquare, RefreshCw } from 'lucide-react';
import { Task } from '@/lib/tasks-api';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  userName?: string;
  onQuickAdd: () => void;
}

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  time: string;
}

export function AiAssistantDrawer({
  isOpen,
  onClose,
  tasks,
  userName = 'Pilot',
  onQuickAdd,
}: AiAssistantDrawerProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      role: 'assistant',
      text: `Hello ${userName}! I'm your LifePilot AI Life Operating Assistant. I can help organize your day, prioritize your ${tasks.filter((t) => t.status !== 'COMPLETED').length} pending tasks, optimize your study slots, or generate smart reminders. What would you like to accomplish?`,
      time: 'Just now',
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'How should I structure my remaining hours today?',
    'Summarize my highest-priority critical tasks',
    'Suggest a 25-minute Pomodoro deep work sprint',
    'Tips to avoid cognitive fatigue this afternoon',
  ];

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: query,
      time: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response based on real task context
    setTimeout(() => {
      let reply = '';
      const pendingCount = tasks.filter((t) => t.status !== 'COMPLETED').length;
      const criticalCount = tasks.filter((t) => t.priority === 'CRITICAL' && t.status !== 'COMPLETED').length;

      if (query.toLowerCase().includes('structure') || query.toLowerCase().includes('schedule')) {
        reply = `Based on your circadian profile and ${pendingCount} active tasks, I recommend: 1) Block the next 45 minutes for your most critical item. 2) Take a 10-minute hydration and walk break. 3) Wrap up lower-priority administrative tasks before 5 PM.`;
      } else if (query.toLowerCase().includes('priority') || query.toLowerCase().includes('critical')) {
        reply = `You have ${criticalCount} critical task(s) and ${pendingCount} total pending tasks. Your top focus should be resolving your critical deadlines first before switching context.`;
      } else if (query.toLowerCase().includes('pomodoro') || query.toLowerCase().includes('deep work')) {
        reply = `I recommend starting a 25-minute Pomodoro timer on your top task. Put your phone in Do Not Disturb and drink a glass of water before starting. Ready when you are!`;
      } else {
        reply = `Great goal! I've analyzed your schedule. To execute on "${query}", breaking it down into 2-3 focused 20-minute intervals will yield the highest retention and velocity. Would you like me to add these as subtasks?`;
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: reply,
        time: 'Just now',
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 z-10 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  LifePilot AI Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-slate-400">Contextual Schedule & Life Copilot</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 overflow-x-auto flex gap-2 no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-blue-600/20 hover:border-blue-500/30 border border-slate-700/80 text-[11px] text-slate-300 hover:text-blue-300 transition-all cursor-pointer flex-shrink-0"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-800/80 border border-slate-700/70 text-slate-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span className="block mt-1 text-[9px] opacity-60 text-right">{m.time}</span>
                </div>
                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="animate-pulse">Thinking & evaluating schedule...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask LifePilot anything or request scheduling advice..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
