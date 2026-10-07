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
  /** Kuota fleksibel/bergantung server (misal: Abyss Corridor 0-3x, Supply Request) */
  isDynamicQuota?: boolean;
  /** Nilai batas minimal kuota (biasanya 0) */
  minCount?: number;
  /** Task opsional (dapat dilewati tanpa penalti progress) */
  isOptional?: boolean;
}

export interface CycleTaskOverride {
  /** Target penyelesaian khusus untuk siklus reset saat ini (misal 0x atau 2x) */
  targetCount: number;
  /** Status siklus saat ini */
  status?: 'active' | 'server_lost' | 'skipped';
}

export interface AccountTaskProgress {
  taskProgress: Record<string, number>;
  lastDailyReset?: string;
  lastWeeklyReset?: string;
  /** Override target per siklus reset: { [taskId]: CycleTaskOverride } */
  cycleOverrides?: Record<string, CycleTaskOverride>;
}

