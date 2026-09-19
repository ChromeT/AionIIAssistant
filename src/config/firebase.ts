import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase config is loaded from environment variables (see .env file).
// For Vercel deployment: set these in Vercel Dashboard → Settings → Environment Variables.
// IMPORTANT: EXPO_PUBLIC_ prefix makes these available in the web bundle.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey && __DEV__) {
  console.warn(
    '[Firebase] Missing env vars. Create a .env file with EXPO_PUBLIC_FIREBASE_* keys. See .env.example for reference.'
  );
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

