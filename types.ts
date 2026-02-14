
export enum TrackerType {
  SHOPPING = 'SHOPPING', // Has price/quantity
  TODO = 'TODO',         // Simple checkbox
  TRAVEL = 'TRAVEL',     // Checklist + packing
  HABIT = 'HABIT',       // Calendar Grid tracking
  NOTE = 'NOTE'          // Free text
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  value?: number; // Price or count
  quantity?: number;
  completedDates?: string[]; // Array of ISO date strings (YYYY-MM-DD) for habits
}

export interface Tracker {
  id: string;
  title: string;
  type: TrackerType;
  description?: string;
  color: string;
  icon: string;
  currency?: string; // Currency symbol
  tasks: Task[];
  createdAt: number;
  noteContent?: string; // For NOTE type
}

export interface CalculatorState {
  isOpen: boolean;
  currentValue: string;
  history: string;
}

export interface AppSettings {
  themeId: string;
  patternId: string;
  userApiKey?: string;
  language: 'ru' | 'en';
}
