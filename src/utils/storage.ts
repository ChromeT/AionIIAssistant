import AsyncStorage from '@react-native-async-storage/async-storage';
import { Character } from '../types/character';
import { INITIAL_CHARACTERS } from '../constants/initialData';

const CHARACTERS_STORAGE_KEY = 'AION2_TRACKER_CHARACTERS';

export const loadCharacters = async (): Promise<Character[]> => {
  try {
    const data = await AsyncStorage.getItem(CHARACTERS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Preload with default data if empty
    await saveCharacters(INITIAL_CHARACTERS);
    return INITIAL_CHARACTERS;
  } catch (error) {
    console.error('Failed to load characters from AsyncStorage:', error);
    return INITIAL_CHARACTERS;
  }
};

export const saveCharacters = async (characters: Character[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    return true;
  } catch (error) {
    console.error('Failed to save characters to AsyncStorage:', error);
    return false;
  }
};
