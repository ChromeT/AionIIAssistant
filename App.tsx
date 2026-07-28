import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  loadCharacters,
  saveCharacters,
  getCurrentUser,
  saveCurrentUser,
  clearCurrentUser,
} from './src/utils/storage';
import {
  fetchFirebaseProfile,
  saveFirebaseProfile,
  syncFirebaseCharacters,
} from './src/utils/firebaseStorage';
import { Character } from './src/types/character';
import DashboardScreen from './src/screens/DashboardScreen';
import CharacterDetailScreen from './src/screens/CharacterDetailScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check login session on startup (strictly online checks)
  useEffect(() => {
    async function init() {
      const savedUser = await getCurrentUser();
      if (savedUser) {
        try {
          const profile = await fetchFirebaseProfile(savedUser);
          if (profile) {
            setCurrentUser(savedUser);
            setCharacters(profile.characters || []);
            await saveCharacters(savedUser, profile.characters || []); // update local cache
          } else {
            // Account deleted or doesn't exist on server anymore, clear session
            await clearCurrentUser();
          }
        } catch (e) {
          console.error("Failed to load profile from database on startup:", e);
          // If connection fails, force them back to login screen since app is online-only
          await clearCurrentUser();
        }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const handleLogin = async (username: string, passwordEntered: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const profile = await fetchFirebaseProfile(username);
      if (!profile) {
        return { success: false, error: 'Profile username not found. Register first!' };
      }

      // Legacy check: if user exists but has no password field, set it!
      if (!profile.password) {
        profile.password = passwordEntered;
        await saveFirebaseProfile(username, passwordEntered, profile.characters || []);
      }

      if (profile.password !== passwordEntered) {
        return { success: false, error: 'Incorrect password.' };
      }

      setCurrentUser(username);
      await saveCurrentUser(username);
      setCharacters(profile.characters || []);
      await saveCharacters(username, profile.characters || []);
      
      return { success: true };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      
      if (error.code === 'permission-denied') {
        Alert.alert(
          'Database Blocked',
          'Firestore Permission Denied. Please ensure your Firestore Security Rules allow read/write access (e.g. set read/write to true).',
          [{ text: 'OK' }]
        );
        return { success: false, error: 'Firestore permission blocked' };
      }
      
      return { success: false, error: error.message || 'Connection failed' };
    }
  };

  const handleRegister = async (username: string, passwordEntered: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const profile = await fetchFirebaseProfile(username);
      if (profile) {
        return { success: false, error: 'Username is already taken!' };
      }

      // Register new user with empty characters starting list
      const emptyCharacters: Character[] = [];
      setCurrentUser(username);
      await saveCurrentUser(username);
      setCharacters(emptyCharacters);
      
      await saveFirebaseProfile(username, passwordEntered, emptyCharacters);
      await saveCharacters(username, emptyCharacters);
      
      return { success: true };
    } catch (error: any) {
      console.error('Firebase register error:', error);
      
      if (error.code === 'permission-denied') {
        Alert.alert(
          'Database Blocked',
          'Firestore Permission Denied. Please ensure your Firestore Security Rules allow read/write access.',
          [{ text: 'OK' }]
        );
        return { success: false, error: 'Firestore permission blocked' };
      }
      
      return { success: false, error: error.message || 'Connection failed' };
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setCurrentUser(null);
    setCharacters([]);
    setSelectedCharacterId(null);
    await clearCurrentUser();
    setIsLoading(false);
  };

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacterId(character.id);
  };

  const handleBackToDashboard = () => {
    setSelectedCharacterId(null);
  };

  const handleUpdateCharacter = async (updatedChar: Character) => {
    if (!currentUser) return;
    const updatedList = characters.map((c) => (c.id === updatedChar.id ? updatedChar : c));
    setCharacters(updatedList);
    await saveCharacters(currentUser, updatedList);
    syncFirebaseCharacters(currentUser, updatedList);
  };

  const handleAddCharacter = async (newCharData: Omit<Character, 'id' | 'checklist'>) => {
    if (!currentUser) return;
    const defaultChecklist = {
      wpn: false,
      earL: false,
      earR: false,
      neck: false,
      ringL: false,
      ringR: false,
      guards: false,
      breastplate: false,
      greaves: false,
      helm: false,
      pauldrons: false,
      gloves: false,
      boots: false,
      cloak: false,
    };

    const newCharacter: Character = {
      ...newCharData,
      id: Math.random().toString(36).substring(2, 9), // Simple unique ID
      checklist: defaultChecklist,
    };

    const updatedList = [...characters, newCharacter];
    setCharacters(updatedList);
    await saveCharacters(currentUser, updatedList);
    syncFirebaseCharacters(currentUser, updatedList);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!currentUser) return;
    const updatedList = characters.filter((c) => c.id !== characterId);
    setCharacters(updatedList);
    await saveCharacters(currentUser, updatedList);
    syncFirebaseCharacters(currentUser, updatedList);
  };

  // Find the currently selected character object
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Connecting to portal...</Text>
      </View>
    );
  }

  // Render LoginScreen if not authenticated
  if (!currentUser) {
    return (
      <View style={styles.appContainer}>
        <StatusBar style="light" />
        <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      {selectedCharacterId && selectedCharacter ? (
        <CharacterDetailScreen
          character={selectedCharacter}
          onBack={handleBackToDashboard}
          onUpdateCharacter={handleUpdateCharacter}
          onDeleteCharacter={handleDeleteCharacter}
        />
      ) : (
        <DashboardScreen
          characters={characters}
          onSelectCharacter={handleSelectCharacter}
          onAddCharacter={handleAddCharacter}
          onLogout={handleLogout}
          currentUser={currentUser}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0C10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
});
