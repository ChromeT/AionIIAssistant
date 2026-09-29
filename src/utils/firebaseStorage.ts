import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Character } from '../types/character';
import { TaskItem, AccountTaskProgress } from '../types/tasks';

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
  /** Task definitions (default + custom) saved per user */
  taskDefinitions?: TaskItem[];
  /** Account-wide task progress (daily/weekly completions) */
  accountTaskProgress?: AccountTaskProgress;
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

/**
 * Save task definitions (default + custom) to Firebase for the user.
 */
export const syncFirebaseTaskDefinitions = async (
  username: string,
  tasks: TaskItem[]
): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, username.trim().toLowerCase());
    await updateDoc(docRef, {
      taskDefinitions: tasks,
      lastUpdated: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to sync task definitions to Firebase for ${username}:`, error);
    return false;
  }
};

/**
 * Save account-wide task progress to Firebase for the user.
 */
export const syncFirebaseAccountProgress = async (
  username: string,
  progress: AccountTaskProgress
): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, username.trim().toLowerCase());
    await updateDoc(docRef, {
      accountTaskProgress: progress,
      lastUpdated: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Failed to sync account progress to Firebase for ${username}:`, error);
    return false;
  }
};


