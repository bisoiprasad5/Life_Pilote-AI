'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { tasksApi, CreateTaskPayload } from '@/lib/tasks-api';
import { Sparkles, Calendar, Clock, Tag, Flag, Plus, Trash2, Loader2 } from 'lucide-react';

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export function QuickAddTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
}: QuickAddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CreateTaskPayload['category']>('WORK');
  const [priority, setPriority] = useState<CreateTaskPayload['priority']>('MEDIUM');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(30);
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, newSubtaskTitle.trim()]);
      setNewSubtaskTitle('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await tasksApi.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        date: date || undefined,
        dueDate: date ? `${date}T${endTime ? `${endTime}:00.000Z` : '23:59:59.000Z'}` : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        estimatedDuration: Number(estimatedDuration) || undefined,
        subtasks: subtasks.map((st, idx) => ({ title: st, isCompleted: false, order: idx })),
      });

      // Reset and notify
      setTitle('');
      setDescription('');
      setSubtasks([]);
      onTaskCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Task"
      description="Create a task with smart scheduling and priority tags"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Prepare quarterly roadmap review"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description (Optional)</label>
          <textarea
            placeholder="Key objectives, links, or notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Priority & Category Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CreateTaskPayload['priority'])}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CreateTaskPayload['category'])}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WORK">Work</option>
              <option value="STUDY">Study</option>
              <option value="PERSONAL">Personal</option>
              <option value="HEALTH">Health</option>
              <option value="FITNESS">Fitness</option>
              <option value="FINANCE">Finance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Date & Times */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Duration (m)
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(parseInt(e.target.value, 10))}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Subtasks */}
        <div className="pt-1">
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Subtasks</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add subtask step..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              Add
            </button>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {subtasks.map((st, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-300"
                >
                  <span className="truncate">{st}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(i)}
                    className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Create Task</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
