import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

// Firebase config is loaded from environment variables (see .env file).
// For Vercel deployment: set these in Vercel Dashboard → Settings → Environment Variables.
// IMPORTANT: EXPO_PUBLIC_ prefix makes these available in the web bundle.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:demo',
};

export const isFirebaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-project'
);

if (!isFirebaseConfigured && __DEV__) {
  console.warn(
    '[Firebase] Missing or placeholder env vars. Create a .env file with EXPO_PUBLIC_FIREBASE_* keys. See .env.example for reference.'
  );
}

// Initialize Firebase
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });
} catch {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;


