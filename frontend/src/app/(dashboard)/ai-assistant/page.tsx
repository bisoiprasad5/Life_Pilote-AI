'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Loader2,
  Tag,
  Repeat,
  AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { aiApi, ParsedTaskData } from '@/lib/ai-api';
import { tasksApi } from '@/lib/tasks-api';
import { PriorityBadge, CategoryBadge } from '@/components/ui/badge';

interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  parsedTask?: ParsedTaskData | null;
  savedTaskId?: string | null;
}

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: '1',
      role: 'assistant',
      text: `Hello ${user?.fullName || 'Pilot'}! I am your LifePilot AI Copilot. You can talk to me in natural language to schedule tasks, manage study plans, or optimize your day. For example:\n• "Remind me to study Java DSA tomorrow at 7 PM for 1 hour."\n• "Study OS for 2 hours tomorrow."\n• "Every Sunday remind me to plan my week."\n• "Submit assignment before Friday 5 PM."`,
    },
  ]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const query = input.trim();
    const userMsgId = Date.now().toString();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', text: query },
    ]);
    setInput('');
    setIsProcessing(true);

    try {
      // Call backend AI Task Parser endpoint: Next.js -> NestJS -> AI Service -> LLM Provider
      const parseRes = await aiApi.parseTask(query);

      if (parseRes && parseRes.intent === 'CREATE_TASK' && parseRes.task) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: `I have extracted and validated the details for this task. Review the structured information below:`,
            parsedTask: parseRes.task,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: `Received: "${query}". I have analyzed your request. Feel free to give me any specific task with dates, times, durations, or deadlines to structure it for you!`,
          },
        ]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error processing request';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `I encountered an issue processing that with the AI engine: ${errorMsg}. Please ensure the backend and AI services are running.`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveTask = async (msgId: string, task: ParsedTaskData) => {
    setSavingTaskId(msgId);
    try {
      const created = await tasksApi.createTask({
        title: task.title,
        description: task.notes || undefined,
        category: task.category,
        priority: task.priority,
        date: task.date || undefined,
        dueDate: task.dueDate || task.date || undefined,
        startTime: task.startTime || undefined,
        endTime: task.endTime || undefined,
        estimatedDuration: task.duration || undefined,
        deadline: task.deadline || undefined,
        tags: task.tags,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, savedTaskId: created.data.id } : m
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save task to database');
    } finally {
      setSavingTaskId(null);
    }
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
            <p className="text-xs text-slate-400">Context-aware productivity and natural-language task planner</p>
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
                className={`max-w-[85%] p-4 rounded-2xl space-y-3 ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/90 border border-slate-700/70 text-slate-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Structured Task Card */}
                {m.parsedTask && (
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/40 shadow-inner space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        AI Extracted Task
                      </span>
                      {m.savedTaskId ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" /> Saved to DB
                        </span>
                      ) : null}
                    </div>

                    <div className="font-extrabold text-sm text-white">{m.parsedTask.title}</div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <CategoryBadge category={m.parsedTask.category} />
                      <PriorityBadge priority={m.parsedTask.priority} />

                      {m.parsedTask.date && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          {m.parsedTask.date}
                        </span>
                      )}

                      {(m.parsedTask.startTime || m.parsedTask.time) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {m.parsedTask.startTime || m.parsedTask.time}
                          {m.parsedTask.endTime && ` - ${m.parsedTask.endTime}`}
                          {m.parsedTask.duration && ` (${m.parsedTask.duration}m)`}
                        </span>
                      )}

                      {!m.parsedTask.startTime && m.parsedTask.duration && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {m.parsedTask.duration} mins
                        </span>
                      )}

                      {m.parsedTask.isRecurring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-900/40 border border-purple-500/40 text-purple-300 text-[11px]">
                          <Repeat className="w-3 h-3 text-purple-400" />
                          {m.parsedTask.recurrenceInterval || 'Recurring'}
                        </span>
                      )}

                      {m.parsedTask.deadline && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-900/30 border border-rose-500/30 text-rose-300 text-[11px]">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          Due: {new Date(m.parsedTask.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {!m.savedTaskId && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveTask(m.id, m.parsedTask!)}
                          disabled={savingTaskId === m.id}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          {savingTaskId === m.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Saving...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Save to My Tasks</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-3 text-xs leading-relaxed justify-start animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>AI microservice is parsing natural language input...</span>
              </div>
            </div>
          )}
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
            placeholder="Type a task: 'Remind me to study Java DSA tomorrow at 7 PM for 1 hour'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
