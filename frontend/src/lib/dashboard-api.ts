import { api } from './api';

export interface HabitItem {
  id: string;
  title: string;
  category: string;
  targetCount: number;
  completedCount: number;
  isCompleted: boolean;
  streak: number;
  icon?: string;
  color?: string;
}

export interface FocusSessionState {
  todayMinutes: number;
  targetMinutes: number;
  completedSessions: number;
  currentMode: 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK';
}

export interface DietSummary {
  caloriesConsumed: number;
  calorieTarget: number;
  proteinGrams: number;
  proteinTarget: number;
  carbsGrams: number;
  carbsTarget: number;
  fatsGrams: number;
  fatsTarget: number;
  meals: {
    name: string;
    type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    calories: number;
    time: string;
    isCompleted: boolean;
  }[];
}

export interface StudySummary {
  hoursLogged: number;
  hoursTarget: number;
  activeTopic: string;
  nextExam: {
    subject: string;
    date: string;
    daysRemaining: number;
  } | null;
}

// Local storage persistent fallback + backend sync for dashboard widgets
export const dashboardApi = {
  // Water tracker
  getWaterLog(dateKey: string = new Date().toISOString().split('T')[0]): { amountMl: number; targetMl: number } {
    if (typeof window === 'undefined') return { amountMl: 1250, targetMl: 2500 };
    const saved = localStorage.getItem(`lifepilot_water_${dateKey}`);
    const amount = saved ? parseInt(saved, 10) : 1250;
    return { amountMl: amount, targetMl: 2500 };
  },

  setWaterLog(amountMl: number, dateKey: string = new Date().toISOString().split('T')[0]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`lifepilot_water_${dateKey}`, amountMl.toString());
  },

  // Habits
  getHabits(): HabitItem[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('lifepilot_habits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    const defaultHabits: HabitItem[] = [
      { id: 'h1', title: 'Morning Hydration (500ml)', category: 'HEALTH', targetCount: 1, completedCount: 1, isCompleted: true, streak: 14, icon: 'Droplets', color: 'blue' },
      { id: 'h2', title: 'Deep Work Session (90m)', category: 'WORK', targetCount: 1, completedCount: 0, isCompleted: false, streak: 8, icon: 'Brain', color: 'indigo' },
      { id: 'h3', title: 'Daily Workout / Cardio', category: 'FITNESS', targetCount: 1, completedCount: 1, isCompleted: true, streak: 5, icon: 'Dumbbell', color: 'emerald' },
      { id: 'h4', title: 'Read 20 Pages', category: 'STUDY', targetCount: 1, completedCount: 0, isCompleted: false, streak: 21, icon: 'BookOpen', color: 'amber' },
      { id: 'h5', title: 'Evening Reflection & Review', category: 'PERSONAL', targetCount: 1, completedCount: 0, isCompleted: false, streak: 4, icon: 'Moon', color: 'purple' },
    ];
    localStorage.setItem('lifepilot_habits', JSON.stringify(defaultHabits));
    return defaultHabits;
  },

  toggleHabit(habitId: string): HabitItem[] {
    const habits = this.getHabits();
    const updated = habits.map((h) => {
      if (h.id === habitId) {
        const nextState = !h.isCompleted;
        return {
          ...h,
          isCompleted: nextState,
          completedCount: nextState ? 1 : 0,
          streak: nextState ? h.streak + 1 : Math.max(0, h.streak - 1),
        };
      }
      return h;
    });
    localStorage.setItem('lifepilot_habits', JSON.stringify(updated));
    return updated;
  },

  // Focus sessions
  getFocusState(): FocusSessionState {
    if (typeof window === 'undefined') return { todayMinutes: 75, targetMinutes: 180, completedSessions: 3, currentMode: 'POMODORO' };
    const saved = localStorage.getItem('lifepilot_focus_mins');
    const mins = saved ? parseInt(saved, 10) : 75;
    return {
      todayMinutes: mins,
      targetMinutes: 180,
      completedSessions: Math.floor(mins / 25),
      currentMode: 'POMODORO',
    };
  },

  addFocusMinutes(mins: number): FocusSessionState {
    const current = this.getFocusState();
    const nextMins = current.todayMinutes + mins;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifepilot_focus_mins', nextMins.toString());
    }
    return {
      todayMinutes: nextMins,
      targetMinutes: current.targetMinutes,
      completedSessions: Math.floor(nextMins / 25),
      currentMode: 'POMODORO',
    };
  },

  // Diet summary
  getDietSummary(): DietSummary {
    return {
      caloriesConsumed: 1650,
      calorieTarget: 2200,
      proteinGrams: 115,
      proteinTarget: 140,
      carbsGrams: 180,
      carbsTarget: 250,
      fatsGrams: 45,
      fatsTarget: 65,
      meals: [
        { name: 'Oatmeal with Blueberries & Chia', type: 'BREAKFAST', calories: 420, time: '08:00 AM', isCompleted: true },
        { name: 'Grilled Chicken Bowl & Brown Rice', type: 'LUNCH', calories: 680, time: '01:00 PM', isCompleted: true },
        { name: 'Greek Yogurt & Almonds', type: 'SNACK', calories: 250, time: '04:30 PM', isCompleted: true },
        { name: 'Baked Salmon & Steamed Veggies', type: 'DINNER', calories: 550, time: '08:00 PM', isCompleted: false },
      ],
    };
  },

  // Study summary
  getStudySummary(): StudySummary {
    return {
      hoursLogged: 4.5,
      hoursTarget: 6.0,
      activeTopic: 'Advanced Distributed Systems Architecture',
      nextExam: {
        subject: 'Cloud Computing & Distributed Systems',
        date: '2026-10-24',
        daysRemaining: 20,
      },
    };
  },
};
