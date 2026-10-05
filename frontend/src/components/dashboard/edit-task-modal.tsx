'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { tasksApi, Task, UpdateTaskPayload } from '@/lib/tasks-api';
import {
  Calendar,
  Clock,
  Tag,
  Flag,
  Trash2,
  CheckCircle2,
  Plus,
  Loader2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted?: () => void;
}

export function EditTaskModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Task['category']>('WORK');
  const [priority, setPriority] = useState<Task['priority']>('MEDIUM');
  const [status, setStatus] = useState<Task['status']>('TODO');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(30);
  const [subtasks, setSubtasks] = useState<{ id?: string; title: string; isCompleted: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize fields whenever modal opens with a task
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setCategory(task.category || 'WORK');
      setPriority(task.priority || 'MEDIUM');
      setStatus(task.status || 'TODO');
      setDate(task.date ? task.date.split('T')[0] : (task.dueDate ? task.dueDate.split('T')[0] : ''));
      setStartTime(task.startTime || '');
      setEndTime(task.endTime || '');
      setEstimatedDuration(task.estimatedDuration || 30);
      setSubtasks(
        task.subtasks?.map((st) => ({
          id: st.id,
          title: st.title,
          isCompleted: st.isCompleted,
        })) || [],
      );
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [task, isOpen]);

  if (!task) return null;

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, { title: newSubtaskTitle.trim(), isCompleted: false }]);
      setNewSubtaskTitle('');
    }
  };

  const handleToggleSubtask = (index: number) => {
    setSubtasks(
      subtasks.map((st, i) => (i === index ? { ...st, isCompleted: !st.isCompleted } : st)),
    );
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: UpdateTaskPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        status,
        date: date || undefined,
        dueDate: date ? `${date}T${endTime ? `${endTime}:00.000Z` : '23:59:59.000Z'}` : undefined,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        estimatedDuration: Number(estimatedDuration) || undefined,
        subtasks: subtasks.map((st, idx) => ({
          title: st.title,
          isCompleted: st.isCompleted,
          order: idx,
        })),
      };

      await tasksApi.updateTask(task.id, payload);
      onTaskUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await tasksApi.deleteTask(task.id);
      if (onTaskDeleted) onTaskDeleted();
      else onTaskUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task Details"
      description="Update task objectives, priority, time window, or subtasks"
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
            id="edit-task-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Design distributed state cache"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            Description
          </label>
          <textarea
            id="edit-task-desc-input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, requirements, and deliverables..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category, Priority, Status Row */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              Category
            </label>
            <select
              id="edit-task-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as Task['category'])}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              Priority
            </label>
            <select
              id="edit-task-priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Status
            </label>
            <select
              id="edit-task-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Date & Time Scheduling Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Scheduled Date
            </label>
            <input
              id="edit-task-date-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Start Time
            </label>
            <input
              id="edit-task-starttime-input"
              type="text"
              placeholder="e.g. 02:00 PM"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5 text-amber-500" />
              Duration (mins)
            </label>
            <input
              id="edit-task-duration-input"
              type="number"
              min={5}
              max={480}
              step={5}
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(Number(e.target.value))}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Subtasks Section */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-slate-700 dark:text-slate-300 font-semibold">Subtasks Checklist</label>
          <div className="flex items-center gap-2">
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
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
            />
            <button
              type="button"
              onClick={handleAddSubtask}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {subtasks.length > 0 && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
              {subtasks.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(idx)}
                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                        st.isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-400 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                    <span className={st.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}>
                      {st.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(idx)}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Box */}
        {showDeleteConfirm && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Are you sure you want to delete this task?</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              This will permanently delete &ldquo;{task.title}&rdquo; from your database.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                id="confirm-delete-task-button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Permanently</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          {!showDeleteConfirm && (
            <button
              type="button"
              id="delete-task-trigger-button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-task-changes-button"
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
