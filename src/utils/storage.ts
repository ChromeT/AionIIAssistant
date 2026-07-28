import AsyncStorage from '@react-native-async-storage/async-storage';
import { Character } from '../types/character';
import { INITIAL_CHARACTERS } from '../constants/initialData';

const CHARACTERS_STORAGE_KEY_PREFIX = 'AION2_TRACKER_CHARACTERS_';
const CURRENT_USER_KEY = 'AION2_TRACKER_CURRENT_USER';

const getCharactersKey = (username: string) => {
  return `${CHARACTERS_STORAGE_KEY_PREFIX}${username.trim().toLowerCase()}`;
};

export const loadCharacters = async (username: string): Promise<Character[]> => {
  try {
    const key = getCharactersKey(username);
    const data = await AsyncStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    
    // Seed with INITIAL_CHARACTERS when loaded for the first time for a user
    // to give them a great starting dataset.
    await saveCharacters(username, INITIAL_CHARACTERS);
    return INITIAL_CHARACTERS;
  } catch (error) {
    console.error(`Failed to load characters for user ${username}:`, error);
    return INITIAL_CHARACTERS;
  }
};

export const saveCharacters = async (username: string, characters: Character[]): Promise<boolean> => {
  try {
    const key = getCharactersKey(username);
    await AsyncStorage.setItem(key, JSON.stringify(characters));
    return true;
  } catch (error) {
    console.error(`Failed to save characters for user ${username}:`, error);
    return false;
  }
};

export const getCurrentUser = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Failed to get current user from storage:', error);
    return null;
  }
};

export const saveCurrentUser = async (username: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(CURRENT_USER_KEY, username.trim());
    return true;
  } catch (error) {
    console.error('Failed to save current user to storage:', error);
    return false;
  }
};

export const clearCurrentUser = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear current user from storage:', error);
    return false;
  }
};
