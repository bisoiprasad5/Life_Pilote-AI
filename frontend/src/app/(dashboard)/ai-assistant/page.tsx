'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, Send, User, Zap, Brain, Compass } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'assistant',
      text: `Hello ${user?.fullName || 'Pilot'}! I am your LifePilot AI Copilot. How can I optimize your schedule, study plan, or productivity workflows today?`,
    },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    const query = input;
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', text: query }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `Analyzing your request: "${query}". Based on your active focus profile, I suggest time-blocking 45 minutes for this goal and taking a 10-minute hydration break immediately following.`,
        },
      ]);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">AI Assistant</h1>
            <p className="text-xs text-slate-400">Context-aware productivity and lifestyle agent</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/80 border border-slate-700/70 text-slate-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask AI Copilot to plan your day, analyze productivity, or generate tasks..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
