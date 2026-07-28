import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Character } from '../types/character';

const USERS_COLLECTION = 'aion2_users';

export interface UserProfile {
  username: string;
  password?: string;
  characters: Character[];
}

/**
 * Fetch user profile from Firebase. Returns null if profile does not exist.
 */
export const fetchFirebaseProfile = async (username: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, username.trim().toLowerCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch Firebase profile for ${username}:`, error);
    throw error;
  }
};

/**
 * Creates a new user profile or merges character updates in Firebase.
 */
export const saveFirebaseProfile = async (
  username: string,
  password?: string,
  characters: Character[] = []
): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, username.trim().toLowerCase());
    const data: any = {
      username: username.trim(),
      characters,
      lastUpdated: serverTimestamp(),
    };
    if (password) {
      data.password = password;
    }
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error(`Failed to save Firebase profile for ${username}:`, error);
    return false;
  }
};

/**
 * Syncs only the characters array to Firebase for the logged-in user.
 */
export const syncFirebaseCharacters = async (username: string, characters: Character[]): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, username.trim().toLowerCase());
    await updateDoc(docRef, {
      characters,
      lastUpdated: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to sync characters to Firebase for ${username}:`, error);
    return false;
  }
};
