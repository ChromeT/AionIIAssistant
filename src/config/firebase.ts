import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration from the user
const firebaseConfig = {
  apiKey: "AIzaSyBp9kDmbKwhZ-ICD5jmFMBWmpQmEaCri2A",
  authDomain: "aion2assistant.firebaseapp.com",
  projectId: "aion2assistant",
  storageBucket: "aion2assistant.firebasestorage.app",
  messagingSenderId: "925561175895",
  appId: "1:925561175895:web:8e81b8e2e42c245a574812"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
