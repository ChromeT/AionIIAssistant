import AsyncStorage from '@react-native-async-storage/async-storage';
import { KinahPlannerSettingsState } from '../types/kinah';
import { syncFirebaseKinahPlanner } from './firebaseStorage';

const KINAH_STORAGE_PREFIX = 'AION2_KINAH_SETTINGS_';

const getStorageKey = (username: string) => {
  return `${KINAH_STORAGE_PREFIX}${username.trim().toLowerCase()}`;
};

export const DEFAULT_KINAH_SETTINGS: KinahPlannerSettingsState = {
  conquestPlayCount: 0,
  transcendPlayCount: 0,
  charExtras: {},
  gsInitialMap: {},
};

export const loadKinahSettings = async (username: string): Promise<KinahPlannerSettingsState> => {
  try {
    const key = getStorageKey(username);
    const data = await AsyncStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        conquestPlayCount: Number(parsed.conquestPlayCount) || 0,
        transcendPlayCount: Number(parsed.transcendPlayCount) || 0,
        charExtras: parsed.charExtras || {},
        gsInitialMap: parsed.gsInitialMap || {},
      };
    }
  } catch (error) {
    console.error(`Failed to load kinah settings for ${username}:`, error);
  }
  return DEFAULT_KINAH_SETTINGS;
};

export const saveKinahSettings = async (
  username: string,
  settings: KinahPlannerSettingsState,
  syncToFirebase = true
): Promise<boolean> => {
  try {
    const key = getStorageKey(username);
    await AsyncStorage.setItem(key, JSON.stringify(settings));
    
    if (syncToFirebase) {
      syncFirebaseKinahPlanner(username, {
        conquestPlayCount: settings.conquestPlayCount,
        transcendencePlayCount: settings.transcendPlayCount,
        gsInitialMap: settings.gsInitialMap,
      }).catch((err) => console.warn('Firebase kinah sync warning:', err));
    }
    return true;
  } catch (error) {
    console.error(`Failed to save kinah settings for ${username}:`, error);
    return false;
  }
};
