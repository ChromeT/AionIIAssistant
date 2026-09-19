import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Character } from '../types/character';

const USERS_COLLECTION = 'aion2_users';

export interface UserProfile {
  username: string;
  /**
   * @deprecated Use passwordHash + passwordSalt instead.
   * Kept only for legacy migration detection.
   */
  password?: string;
  /** SHA-256 hash of (salt + ":" + password) */
  passwordHash?: string;
  /** Random 16-byte hex salt generated at registration */
  passwordSalt?: string;
  characters: Character[];
}

/**
 * Fetch user profile from Firebase.
 * Returns null if profile does not exist.
 *
 * NOTE: The returned object retains passwordHash & passwordSalt for internal
 * auth verification. The raw `password` legacy field is also preserved
 * so App.tsx can detect and migrate legacy accounts.
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
 * Creates a new user profile or merges updates in Firebase.
 * Stores passwordHash + passwordSalt — NEVER stores plaintext passwords.
 */
export const saveFirebaseProfile = async (
  username: string,
  passwordHash: string,
  passwordSalt: string,
  characters: Character[] = []
): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, username.trim().toLowerCase());
    const data: Omit<UserProfile, 'password'> = {
      username: username.trim(),
      passwordHash,
      passwordSalt,
      characters,
      lastUpdated: serverTimestamp(),
    } as any;
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error(`Failed to save Firebase profile for ${username}:`, error);
    return false;
  }
};

/**
 * Migrate a legacy plaintext-password account to hashed credentials.
 * Called automatically on first login for accounts created before the security update.
 * Removes the old `password` field and writes passwordHash + passwordSalt.
 */
export const migratePasswordToHash = async (
  username: string,
  passwordHash: string,
  passwordSalt: string
): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, username.trim().toLowerCase());
    await updateDoc(docRef, {
      passwordHash,
      passwordSalt,
      password: null, // null removes the field on next read effectively
      lastUpdated: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to migrate password for ${username}:`, error);
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
