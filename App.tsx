import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  loadCharacters,
  saveCharacters,
  getCurrentUser,
  saveCurrentUser,
  clearCurrentUser,
  getLocalPassword,
  saveLocalPassword,
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

  // Check login session on startup
  useEffect(() => {
    async function init() {
      const savedUser = await getCurrentUser();
      if (savedUser) {
        setCurrentUser(savedUser);
        try {
          const profile = await fetchFirebaseProfile(savedUser);
          if (profile) {
            setCharacters(profile.characters || []);
            await saveCharacters(savedUser, profile.characters || []); // update local cache
          } else {
            const data = await loadCharacters(savedUser);
            setCharacters(data);
          }
        } catch (e) {
          // Offline fallback
          const data = await loadCharacters(savedUser);
          setCharacters(data);
        }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const handleLoginSuccess = async (username: string, passwordEntered: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const profile = await fetchFirebaseProfile(username);
      if (profile) {
        // User profile exists in Firebase
        // Lock password for legacy profiles if none exists yet
        if (!profile.password) {
          profile.password = passwordEntered;
          await saveFirebaseProfile(username, passwordEntered, profile.characters || []);
        }

        if (profile.password !== passwordEntered) {
          setIsLoading(false);
          return false; // Password mismatch
        }
        
        setCurrentUser(username);
        await saveCurrentUser(username);
        await saveLocalPassword(username, passwordEntered); // Cache password locally for offline use
        setCharacters(profile.characters || []);
        await saveCharacters(username, profile.characters || []);
      } else {
        // New user registration - empty array starting point as requested!
        const emptyCharacters: Character[] = [];
        setCurrentUser(username);
        await saveCurrentUser(username);
        setCharacters(emptyCharacters);
        
        // Write credentials and empty document to Firebase & local storage cache
        await saveFirebaseProfile(username, passwordEntered, emptyCharacters);
        await saveLocalPassword(username, passwordEntered);
        await saveCharacters(username, emptyCharacters);
      }
      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Firebase login error:', error);
      
      // If it is a Firebase permission error, warn the user clearly and reject login
      if (error.code === 'permission-denied') {
        setIsLoading(false);
        Alert.alert(
          'Firebase Database Blocked',
          'Firestore Permission Denied. Please ensure your Firestore Security Rules allow read/write access (e.g. set read/write to true).',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // Check offline mode: fallback to local cache check
      const localPassword = await getLocalPassword(username);
      if (localPassword) {
        if (localPassword === passwordEntered) {
          setCurrentUser(username);
          await saveCurrentUser(username);
          const localData = await loadCharacters(username);
          setCharacters(localData);
          setIsLoading(false);
          Alert.alert(
            'Offline Mode',
            'Successfully logged in using locally cached credentials.',
            [{ text: 'OK' }]
          );
          return true;
        } else {
          setIsLoading(false);
          return false; // Local password mismatch
        }
      }
      
      setIsLoading(false);
      Alert.alert(
        'Connection Error',
        `Could not reach the database: ${error.message || 'Unknown error'}`,
        [{ text: 'OK' }]
      );
      return false;
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
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
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
