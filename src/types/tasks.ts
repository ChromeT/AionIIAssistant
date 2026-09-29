export type TaskCategory = 'daily' | 'weekly';
export type TaskScope = 'account' | 'character';

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  scope: TaskScope;
  maxCount: number;
  icon?: string;
  description?: string;
  isCustom?: boolean;
  /** Jika true, task ini hanya berlaku untuk main character (ALT tidak bisa) */
  mainOnly?: boolean;
}

export interface AccountTaskProgress {
  taskProgress: Record<string, number>;
  lastDailyReset?: string;
  lastWeeklyReset?: string;
}
