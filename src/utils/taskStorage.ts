import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskItem, AccountTaskProgress, CycleTaskOverride } from '../types/tasks';
import { Character } from '../types/character';
import { INITIAL_TASKS } from '../constants/initialTasks';

/**
 * Mendapatkan target penyelesaian efektif untuk suatu task pada siklus reset aktif.
 * Jika task bersifat dinamis dan memiliki override pada siklus ini, gunakan override tersebut.
 */
export const getEffectiveTaskTarget = (
  task: TaskItem,
  cycleOverrides?: Record<string, CycleTaskOverride>
): number => {
  if (task.isDynamicQuota && cycleOverrides && cycleOverrides[task.id] !== undefined) {
    return Math.max(task.minCount ?? 0, cycleOverrides[task.id].targetCount);
  }
  return task.maxCount;
};
import {
  fetchFirebaseProfile,
  syncFirebaseTaskDefinitions,
  syncFirebaseAccountProgress,
  syncFirebaseDeletedTaskIds,
} from './firebaseStorage';

const TASKS_CONFIG_KEY_PREFIX = 'AION2_TASKS_CONFIG_';
const DELETED_TASKS_KEY_PREFIX = 'AION2_DELETED_TASKS_';
const ACCOUNT_PROGRESS_KEY_PREFIX = 'AION2_ACCOUNT_TASKS_';

const getTasksConfigKey = (username: string) =>
  `${TASKS_CONFIG_KEY_PREFIX}${username.trim().toLowerCase()}`;

const getDeletedTasksKey = (username: string) =>
  `${DELETED_TASKS_KEY_PREFIX}${username.trim().toLowerCase()}`;

const getAccountProgressKey = (username: string) =>
  `${ACCOUNT_PROGRESS_KEY_PREFIX}${username.trim().toLowerCase()}`;

/**
 * Load set ID task default yang telah dihapus oleh pengguna.
 */
export const loadDeletedTaskIds = async (username: string): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(getDeletedTasksKey(username));
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      return new Set(parsed);
    }
  } catch (e) {
    console.error(`Failed to load deleted task IDs for ${username}:`, e);
  }
  return new Set<string>();
};

/**
 * Simpan ID task default yang dihapus pengguna agar tidak muncul kembali setelah refresh.
 */
export const saveDeletedTaskId = async (username: string, taskId: string): Promise<void> => {
  try {
    const existing = await loadDeletedTaskIds(username);
    existing.add(taskId);
    const arr = Array.from(existing);
    await AsyncStorage.setItem(getDeletedTasksKey(username), JSON.stringify(arr));
    await syncFirebaseDeletedTaskIds(username, arr);
  } catch (e) {
    console.error(`Failed to save deleted task ID ${taskId} for ${username}:`, e);
  }
};

/**
 * Merge saved task list dengan INITIAL_TASKS terbaru:
 * - Pertahankan urutan yang diatur pengguna (prioritas geser ke atas/bawah)
 * - Pertahankan SEMUA modifikasi pengguna (title, count, icon, description, mainOnly)
 * - Jangan munculkan kembali task default yang sudah dihapus pengguna (deletedIds)
 * - Tambah task default baru jika ada update aplikasi yang belum ada dan belum dihapus
 */
export const mergeWithLatestDefaults = (
  saved: TaskItem[],
  deletedIds: Set<string> = new Set()
): TaskItem[] => {
  const defaultMap = new Map(INITIAL_TASKS.map((t) => [t.id, t]));
  const defaultIds = new Set(INITIAL_TASKS.map((t) => t.id));

  const mergedSaved: TaskItem[] = [];
  const processedIds = new Set<string>();

  // 1. Pertahankan urutan dan seluruh konfigurasi yang sudah diatur pengguna
  saved.forEach((item) => {
    if (deletedIds.has(item.id)) {
      // Task ini sudah dihapus pengguna secara eksplisit
      return;
    }

    if (item.isCustom) {
      mergedSaved.push(item);
      processedIds.add(item.id);
    } else if (defaultIds.has(item.id)) {
      const def = defaultMap.get(item.id)!;
      mergedSaved.push({
        ...def,
        ...item,
        // PERTAHANKAN mainOnly pengguna jika ada, fallback ke def hanya jika undefined
        mainOnly: item.mainOnly !== undefined ? item.mainOnly : def.mainOnly,
        isDynamicQuota: item.isDynamicQuota !== undefined ? item.isDynamicQuota : def.isDynamicQuota,
        minCount: item.minCount !== undefined ? item.minCount : def.minCount,
        isOptional: item.isOptional !== undefined ? item.isOptional : def.isOptional,
      });
      processedIds.add(item.id);
    } else {
      mergedSaved.push(item);
      processedIds.add(item.id);
    }
  });

  // 2. Tambah default tasks baru yang belum pernah disimpan dan TIDAK dihapus pengguna
  INITIAL_TASKS.forEach((def) => {
    if (!processedIds.has(def.id) && !deletedIds.has(def.id)) {
      mergedSaved.push(def);
      processedIds.add(def.id);
    }
  });

  return mergedSaved;
};

/**
 * Load task definitions — Firebase sebagai primary source dengan fallback AsyncStorage cache.
 */
export const loadTaskDefinitions = async (username: string): Promise<TaskItem[]> => {
  try {
    const deletedSet = await loadDeletedTaskIds(username);

    // 1. Coba ambil dari Firebase dulu
    const profile = await fetchFirebaseProfile(username);
    if (profile?.deletedTaskIds && Array.isArray(profile.deletedTaskIds)) {
      profile.deletedTaskIds.forEach((id) => deletedSet.add(id));
      await AsyncStorage.setItem(
        getDeletedTasksKey(username),
        JSON.stringify(Array.from(deletedSet))
      );
    }

    if (profile?.taskDefinitions && profile.taskDefinitions.length > 0) {
      const merged = mergeWithLatestDefaults(profile.taskDefinitions, deletedSet);
      // Simpan ke cache lokal
      await AsyncStorage.setItem(getTasksConfigKey(username), JSON.stringify(merged));
      // Jika ada perubahan (task baru), sync balik ke Firebase
      if (merged.length !== profile.taskDefinitions.length) {
        await syncFirebaseTaskDefinitions(username, merged);
      }
      return merged;
    }

    // 2. Fallback ke AsyncStorage cache
    const localData = await AsyncStorage.getItem(getTasksConfigKey(username));
    if (localData) {
      const parsed: TaskItem[] = JSON.parse(localData);
      const merged = mergeWithLatestDefaults(parsed, deletedSet);
      await AsyncStorage.setItem(getTasksConfigKey(username), JSON.stringify(merged));
      await syncFirebaseTaskDefinitions(username, merged);
      return merged;
    }

    // 3. Pertama kali: gunakan INITIAL_TASKS
    const initialClean = INITIAL_TASKS.filter((t) => !deletedSet.has(t.id));
    await AsyncStorage.setItem(getTasksConfigKey(username), JSON.stringify(initialClean));
    await syncFirebaseTaskDefinitions(username, initialClean);
    return initialClean;
  } catch (error) {
    console.error(`Failed to load tasks config for user ${username}:`, error);
    try {
      const localData = await AsyncStorage.getItem(getTasksConfigKey(username));
      if (localData) return JSON.parse(localData);
    } catch {}
    return INITIAL_TASKS;
  }
};

/**
 * Save task definitions ke AsyncStorage (cache) dan Firebase (primary) secara reliable.
 */
export const saveTaskDefinitions = async (
  username: string,
  tasks: TaskItem[]
): Promise<boolean> => {
  try {
    const cleanTasks = JSON.parse(JSON.stringify(tasks));
    await AsyncStorage.setItem(getTasksConfigKey(username), JSON.stringify(cleanTasks));
    await syncFirebaseTaskDefinitions(username, cleanTasks);
    return true;
  } catch (error) {
    console.error(`Failed to save tasks config for user ${username}:`, error);
    return false;
  }
};

/**
 * Load account task progress — Firebase sebagai primary source.
 */
export const loadAccountTaskProgress = async (
  username: string
): Promise<AccountTaskProgress> => {
  try {
    // 1. Coba ambil dari Firebase
    const profile = await fetchFirebaseProfile(username);
    if (profile?.accountTaskProgress) {
      await AsyncStorage.setItem(
        getAccountProgressKey(username),
        JSON.stringify(profile.accountTaskProgress)
      );
      return profile.accountTaskProgress;
    }

    // 2. Fallback ke AsyncStorage cache
    const localData = await AsyncStorage.getItem(getAccountProgressKey(username));
    if (localData) {
      return JSON.parse(localData);
    }

    // 3. Default kosong
    const defaultProgress: AccountTaskProgress = {
      taskProgress: {},
      lastDailyReset: new Date().toISOString(),
      lastWeeklyReset: new Date().toISOString(),
    };
    await AsyncStorage.setItem(getAccountProgressKey(username), JSON.stringify(defaultProgress));
    return defaultProgress;
  } catch (error) {
    console.error(`Failed to load account progress for user ${username}:`, error);
    return { taskProgress: {} };
  }
};

/**
 * Save account task progress ke Firebase (primary) dan AsyncStorage (cache).
 */
export const saveAccountTaskProgress = async (
  username: string,
  progress: AccountTaskProgress
): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(getAccountProgressKey(username), JSON.stringify(progress));
    syncFirebaseAccountProgress(username, progress); // fire & forget ke Firebase
    return true;
  } catch (error) {
    console.error(`Failed to save account progress for user ${username}:`, error);
    return false;
  }
};

/**
 * Resets all daily task progress for account and all characters.
 */
export const resetDailyProgress = (
  characters: Character[],
  tasks: TaskItem[],
  accountProgress: AccountTaskProgress
): { updatedCharacters: Character[]; updatedAccount: AccountTaskProgress } => {
  const dailyTaskIds = new Set(
    tasks.filter((t) => t.category === 'daily').map((t) => t.id)
  );

  const updatedCharacters = characters.map((char) => {
    const prevProgress = char.taskProgress || {};
    const newProgress: Record<string, number> = {};
    Object.keys(prevProgress).forEach((taskId) => {
      if (!dailyTaskIds.has(taskId)) {
        newProgress[taskId] = prevProgress[taskId];
      }
    });
    return { ...char, taskProgress: newProgress };
  });

  const prevAccProgress = accountProgress.taskProgress || {};
  const newAccProgress: Record<string, number> = {};
  Object.keys(prevAccProgress).forEach((taskId) => {
    if (!dailyTaskIds.has(taskId)) {
      newAccProgress[taskId] = prevAccProgress[taskId];
    }
  });

  const prevCycleOverrides = accountProgress.cycleOverrides || {};
  const newCycleOverrides: Record<string, CycleTaskOverride> = {};
  Object.keys(prevCycleOverrides).forEach((taskId) => {
    if (!dailyTaskIds.has(taskId)) {
      newCycleOverrides[taskId] = prevCycleOverrides[taskId];
    }
  });

  return {
    updatedCharacters,
    updatedAccount: {
      ...accountProgress,
      taskProgress: newAccProgress,
      cycleOverrides: newCycleOverrides,
      lastDailyReset: new Date().toISOString(),
    },
  };
};

/**
 * Resets all weekly task progress for account and all characters.
 */
export const resetWeeklyProgress = (
  characters: Character[],
  tasks: TaskItem[],
  accountProgress: AccountTaskProgress
): { updatedCharacters: Character[]; updatedAccount: AccountTaskProgress } => {
  const weeklyTaskIds = new Set(
    tasks.filter((t) => t.category === 'weekly').map((t) => t.id)
  );

  const updatedCharacters = characters.map((char) => {
    const prevProgress = char.taskProgress || {};
    const newProgress: Record<string, number> = {};
    Object.keys(prevProgress).forEach((taskId) => {
      if (!weeklyTaskIds.has(taskId)) {
        newProgress[taskId] = prevProgress[taskId];
      }
    });
    return { ...char, taskProgress: newProgress };
  });

  const prevAccProgress = accountProgress.taskProgress || {};
  const newAccProgress: Record<string, number> = {};
  Object.keys(prevAccProgress).forEach((taskId) => {
    if (!weeklyTaskIds.has(taskId)) {
      newAccProgress[taskId] = prevAccProgress[taskId];
    }
  });

  const prevCycleOverrides = accountProgress.cycleOverrides || {};
  const newCycleOverrides: Record<string, CycleTaskOverride> = {};
  Object.keys(prevCycleOverrides).forEach((taskId) => {
    if (!weeklyTaskIds.has(taskId)) {
      newCycleOverrides[taskId] = prevCycleOverrides[taskId];
    }
  });

  return {
    updatedCharacters,
    updatedAccount: {
      ...accountProgress,
      taskProgress: newAccProgress,
      cycleOverrides: newCycleOverrides,
      lastWeeklyReset: new Date().toISOString(),
    },
  };
};

/**
 * ─────────────────────────────────────────────────────────────
 * Server Reset Time Configuration for Aion 2 (NA East / America/New_York)
 * - Daily Reset: Setiap hari pukul 14:00 WIB (03:00:00 AM EDT)
 * - Weekly Reset: Setiap hari Rabu pukul 14:00 WIB (03:00:00 AM EDT)
 * ─────────────────────────────────────────────────────────────
 */
export const SERVER_TIMEZONE = 'America/New_York';
export const DAILY_RESET_HOUR = 3; // 3:00 AM NY Time (14:00 WIB)
export const WEEKLY_RESET_DAY = 3; // 3 = Rabu (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
export const WEEKLY_RESET_HOUR = 3; // 3:00 AM NY Time (14:00 WIB)

export interface ServerDateInfo {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekdayStr: string;
  dayOfWeek: number;
  timeString: string;
  isDST: boolean;
}

export const getServerDate = (d = new Date()): ServerDateInfo => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVER_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    weekday: 'short',
    timeZoneName: 'short',
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hour = parseInt(map.hour, 10) % 24;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const pad = (n: number) => String(n).padStart(2, '0');
  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const tzName = map.timeZoneName || 'EDT';
  const timeString = `${pad(h12)}:${pad(minute)}:${pad(second)} ${ampm} ${tzName}`;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute,
    second,
    weekdayStr: map.weekday || 'Wed',
    dayOfWeek: weekdayMap[map.weekday] ?? 3,
    timeString,
    isDST: tzName === 'EDT',
  };
};

/**
 * Mengonversi tanggal & jam spesifik di New York ke objek UTC Date.
 */
export const nyDateTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour = 3,
  minute = 0,
  second = 0
): Date => {
  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const nyParts = getServerDate(new Date(targetUtc));
  const nyAsUtc = Date.UTC(
    nyParts.year,
    nyParts.month - 1,
    nyParts.day,
    nyParts.hour,
    nyParts.minute,
    nyParts.second
  );
  const offset = nyAsUtc - targetUtc;
  return new Date(targetUtc - offset);
};

/**
 * Mengembalikan timestamp reset harian terakhir (pukul 14:00 WIB / 3:00 AM EDT).
 */
export const getLastDailyReset = (now = new Date()): Date => {
  const ny = getServerDate(now);
  const dayOffset = ny.hour >= DAILY_RESET_HOUR ? 0 : -1;
  const targetDay = new Date(Date.UTC(ny.year, ny.month - 1, ny.day + dayOffset));
  return nyDateTimeToUtc(
    targetDay.getUTCFullYear(),
    targetDay.getUTCMonth() + 1,
    targetDay.getUTCDate(),
    DAILY_RESET_HOUR,
    0,
    0
  );
};

/**
 * Mengembalikan timestamp reset harian berikutnya (pukul 14:00 WIB / 3:00 AM EDT).
 */
export const getNextDailyReset = (now = new Date()): Date => {
  const ny = getServerDate(now);
  const dayOffset = ny.hour >= DAILY_RESET_HOUR ? 1 : 0;
  const targetDay = new Date(Date.UTC(ny.year, ny.month - 1, ny.day + dayOffset));
  return nyDateTimeToUtc(
    targetDay.getUTCFullYear(),
    targetDay.getUTCMonth() + 1,
    targetDay.getUTCDate(),
    DAILY_RESET_HOUR,
    0,
    0
  );
};

/**
 * Mengembalikan timestamp reset mingguan terakhir (hari Rabu pukul 14:00 WIB / 3:00 AM EDT).
 */
export const getLastWeeklyReset = (now = new Date()): Date => {
  const ny = getServerDate(now);
  let daysSinceWed = (ny.dayOfWeek - WEEKLY_RESET_DAY + 7) % 7;
  if (daysSinceWed === 0 && ny.hour < WEEKLY_RESET_HOUR) {
    daysSinceWed = 7;
  }
  const targetDay = new Date(Date.UTC(ny.year, ny.month - 1, ny.day - daysSinceWed));
  return nyDateTimeToUtc(
    targetDay.getUTCFullYear(),
    targetDay.getUTCMonth() + 1,
    targetDay.getUTCDate(),
    WEEKLY_RESET_HOUR,
    0,
    0
  );
};

/**
 * Mengembalikan timestamp reset mingguan berikutnya (hari Rabu pukul 14:00 WIB / 3:00 AM EDT).
 */
export const getNextWeeklyReset = (now = new Date()): Date => {
  const ny = getServerDate(now);
  let daysUntilWed = (WEEKLY_RESET_DAY - ny.dayOfWeek + 7) % 7;
  if (daysUntilWed === 0 && ny.hour >= WEEKLY_RESET_HOUR) {
    daysUntilWed = 7;
  }
  const targetDay = new Date(Date.UTC(ny.year, ny.month - 1, ny.day + daysUntilWed));
  return nyDateTimeToUtc(
    targetDay.getUTCFullYear(),
    targetDay.getUTCMonth() + 1,
    targetDay.getUTCDate(),
    WEEKLY_RESET_HOUR,
    0,
    0
  );
};

/**
 * Format sisa waktu menuju target date menjadi "Xd Yh Zm" atau "Xh Ym Zs".
 */
export const formatCountdown = (targetDate: Date, fromDate = new Date()): string => {
  const diffMs = Math.max(0, targetDate.getTime() - fromDate.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

/**
 * Memeriksa apakah waktu saat ini telah melewati jadwal reset daily atau weekly
 * server NA East (America/New_York) sejak reset terakhir yang tercatat.
 * Jika ya, jalankan reset otomatis dan perbarui timestamp.
 */
export const checkAndPerformAutoReset = (
  characters: Character[],
  tasks: TaskItem[],
  accountProgress: AccountTaskProgress,
  now = new Date()
): {
  hasReset: boolean;
  needsDailyReset: boolean;
  needsWeeklyReset: boolean;
  updatedCharacters: Character[];
  updatedAccount: AccountTaskProgress;
} => {
  const lastDailyResetTime = getLastDailyReset(now);
  const lastWeeklyResetTime = getLastWeeklyReset(now);

  const prevDailyRecorded = accountProgress.lastDailyReset
    ? new Date(accountProgress.lastDailyReset)
    : null;
  const prevWeeklyRecorded = accountProgress.lastWeeklyReset
    ? new Date(accountProgress.lastWeeklyReset)
    : null;

  const needsDailyReset =
    !prevDailyRecorded || prevDailyRecorded.getTime() < lastDailyResetTime.getTime();
  const needsWeeklyReset =
    !prevWeeklyRecorded || prevWeeklyRecorded.getTime() < lastWeeklyResetTime.getTime();

  if (!needsDailyReset && !needsWeeklyReset) {
    return {
      hasReset: false,
      needsDailyReset: false,
      needsWeeklyReset: false,
      updatedCharacters: characters,
      updatedAccount: accountProgress,
    };
  }

  let currCharacters = characters;
  let currAccount = accountProgress;

  if (needsDailyReset) {
    const res = resetDailyProgress(currCharacters, tasks, currAccount);
    currCharacters = res.updatedCharacters;
    currAccount = res.updatedAccount;
  }

  if (needsWeeklyReset) {
    const res = resetWeeklyProgress(currCharacters, tasks, currAccount);
    currCharacters = res.updatedCharacters;
    currAccount = res.updatedAccount;
  }

  return {
    hasReset: true,
    needsDailyReset,
    needsWeeklyReset,
    updatedCharacters: currCharacters,
    updatedAccount: currAccount,
  };
};

