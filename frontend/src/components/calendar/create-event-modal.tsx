'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { calendarApi, CreateEventPayload } from '@/lib/calendar-api';
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Palette,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  initialDate?: string; // YYYY-MM-DD
  initialStartTime?: string; // HH:mm
}

const COLOR_PRESETS = [
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Indigo', hex: '#6366f1' },
];

export function CreateEventModal({
  isOpen,
  onClose,
  onEventCreated,
  initialDate,
  initialStartTime,
}: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => initialDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(() => initialStartTime || '10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [category, setCategory] = useState<CreateEventPayload['category']>('EVENT');
  const [color, setColor] = useState('#3b82f6');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Sync initial inputs
  useEffect(() => {
    if (isOpen) {
      if (initialDate) setDate(initialDate);
      if (initialStartTime) {
        setStartTime(initialStartTime);
        const [h, m] = initialStartTime.split(':').map(Number);
        const endH = (h + 1).toString().padStart(2, '0');
        setEndTime(`${endH}:${m.toString().padStart(2, '0')}`);
      }
      setError(null);
      setConflictWarning(null);
    }
  }, [isOpen, initialDate, initialStartTime]);

  // Check conflicts whenever date/time changes
  useEffect(() => {
    if (!isOpen || isAllDay || !date || !startTime || !endTime) return;

    const startIso = `${date}T${startTime}:00.000Z`;
    const endIso = `${date}T${endTime}:00.000Z`;

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setConflictWarning('End time must be after start time');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await calendarApi.checkConflicts(startIso, endIso);
        if (res.hasConflict && res.conflicts.length > 0) {
          setConflictWarning(`⚠️ Time slot overlaps with "${res.conflicts[0].title}"`);
        } else {
          setConflictWarning(null);
        }
      } catch {
        // Ignore check failure
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [date, startTime, endTime, isAllDay, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an event title');
      return;
    }

    const startIso = isAllDay
      ? `${date}T00:00:00.000Z`
      : `${date}T${startTime}:00.000Z`;
    const endIso = isAllDay
      ? `${date}T23:59:59.000Z`
      : `${date}T${endTime}:00.000Z`;

    if (!isAllDay && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError('End time must be after start time');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await calendarApi.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        startTime: startIso,
        endTime: endIso,
        isAllDay,
        color,
        category,
      });

      // Reset and trigger update
      setTitle('');
      setDescription('');
      setLocation('');
      onEventCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create calendar event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Calendar Event"
      description="Schedule an event, study session, meal, or habit routine"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {conflictWarning && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{conflictWarning}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            Event Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="event-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Distributed Systems Architecture Review"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Category & Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-blue-500" />
              Category / Type
            </label>
            <select
              id="event-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as CreateEventPayload['category'])}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EVENT">Calendar Event</option>
              <option value="WORK">Work Block</option>
              <option value="STUDY">Study Session</option>
              <option value="MEAL">Meal Block</option>
              <option value="HABIT">Habit Routine</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-purple-500" />
              Color Accent
            </label>
            <div className="flex items-center gap-2 pt-1">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className="w-6 h-6 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center"
                  style={{
                    backgroundColor: c.hex,
                    borderColor: color === c.hex ? '#ffffff' : 'transparent',
                    transform: color === c.hex ? 'scale(1.15)' : 'scale(1)',
                  }}
                  title={c.name}
                >
                  {color === c.hex && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date & Time Row */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Schedule Timing
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>All Day</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">Date</label>
              <input
                id="event-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {!isAllDay && (
              <>
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">Start Time</label>
                  <input
                    id="event-starttime-input"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-1">End Time</label>
                  <input
                    id="event-endtime-input"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            Location / Room (Optional)
          </label>
          <input
            id="event-location-input"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Conference Room B, Google Meet, Library"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
            Description & Agenda
          </label>
          <textarea
            id="event-description-input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key discussion topics, links, or notes..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="create-event-submit-button"
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <span>Add to Schedule</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
