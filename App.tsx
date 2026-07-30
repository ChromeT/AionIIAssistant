import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
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
import { Character, PriorityLevel } from './src/types/character';
import DashboardScreen from './src/screens/DashboardScreen';
import CharacterDetailScreen from './src/screens/CharacterDetailScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isInitLoading, setIsInitLoading] = useState(true); // Startup state only

  // Helper to dynamically calculate priority based on GS relative to other characters
  const getCharactersWithComputedPriority = (chars: Character[]): Character[] => {
    if (!chars || chars.length === 0) return [];
    if (chars.length === 1) {
      return [{ ...chars[0], priority: 'Extreme' }];
    }

    // Get unique GS values sorted descending (highest first)
    const uniqueGs = Array.from(new Set(chars.map((c) => c.gs))).sort((a, b) => b - a);

    return chars.map((char) => {
      if (uniqueGs.length === 1) {
        return { ...char, priority: 'Extreme' };
      }
      
      const gsIndex = uniqueGs.indexOf(char.gs);
      const ratio = gsIndex / (uniqueGs.length - 1);
      
      let computedPriority: PriorityLevel = 'Low';
      if (ratio <= 0.2) {
        computedPriority = 'Extreme';
      } else if (ratio <= 0.4) {
        computedPriority = 'Critical';
      } else if (ratio <= 0.6) {
        computedPriority = 'High';
      } else if (ratio <= 0.8) {
        computedPriority = 'Medium';
      } else {
        computedPriority = 'Low';
      }

      return { ...char, priority: computedPriority };
    });
  };

  const updateCharactersList = async (username: string, newList: Character[]) => {
    const processedList = getCharactersWithComputedPriority(newList);
    setCharacters(processedList);
    await saveCharacters(username, processedList);
    syncFirebaseCharacters(username, processedList);
  };

  // Set browser favicon dynamically on Web to match the shield-star logo
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw the rounded background box
          ctx.fillStyle = '#1E293B';
          const r = 20; // border radius
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(64 - r, 0);
          ctx.quadraticCurveTo(64, 0, 64, r);
          ctx.lineTo(64, 64 - r);
          ctx.quadraticCurveTo(64, 64, 64 - r, 64);
          ctx.lineTo(r, 64);
          ctx.quadraticCurveTo(0, 64, 0, 64 - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
          ctx.fill();

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#334155';
          ctx.stroke();

          // Draw a shield-like path in the middle
          ctx.fillStyle = '#6366F1';
          ctx.beginPath();
          ctx.moveTo(32, 14);
          ctx.quadraticCurveTo(46, 12, 48, 16);
          ctx.quadraticCurveTo(48, 38, 32, 50);
          ctx.quadraticCurveTo(16, 38, 16, 16);
          ctx.quadraticCurveTo(18, 12, 32, 14);
          ctx.closePath();
          ctx.fill();

          // Draw a star in the center of the shield
          ctx.fillStyle = '#1E293B';
          const cx = 32;
          const cy = 30;
          const spikes = 5;
          const outerRadius = 8;
          const innerRadius = 3.5;
          
          let rot = (Math.PI / 2) * 3;
          let x = cx;
          let y = cy;
          const step = Math.PI / spikes;

          ctx.beginPath();
          ctx.moveTo(cx, cy - outerRadius);
          for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.lineTo(cx, cy - outerRadius);
          ctx.closePath();
          ctx.fill();

          const faviconUrl = canvas.toDataURL('image/png');
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = faviconUrl;

          // Set viewport meta tag to prevent scale-down gaps on mobile web
          let meta = document.querySelector('meta[name="viewport"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

          // Ensure document body & html have dark background #070A10
          let globalStyle = document.getElementById('aion-global-styles');
          if (!globalStyle) {
            globalStyle = document.createElement('style');
            globalStyle.id = 'aion-global-styles';
            document.head.appendChild(globalStyle);
          }
          globalStyle.innerHTML = `
            html, body, #root {
              width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #070A10 !important;
              color-scheme: dark !important;
              overflow-x: hidden !important;
              -webkit-tap-highlight-color: transparent;
            }
          `;
        }
      } catch (err) {
        console.error('Failed to set favicon dynamically:', err);
      }
    }
  }, []);

  // Check login session on startup (strictly online checks)
  useEffect(() => {
    async function init() {
      const savedUser = await getCurrentUser();
      if (savedUser) {
        try {
          const profile = await fetchFirebaseProfile(savedUser);
          if (profile) {
            setCurrentUser(savedUser);
            const processed = getCharactersWithComputedPriority(profile.characters || []);
            setCharacters(processed);
            await saveCharacters(savedUser, processed); // update local cache
          } else {
            await clearCurrentUser();
          }
        } catch (e) {
          console.error("Failed to load profile from database on startup:", e);
          await clearCurrentUser();
        }
      }
      setIsInitLoading(false);
    }
    init();
  }, []);

  const handleLogin = async (username: string, passwordEntered: string): Promise<{ success: boolean; error?: string; username?: string; characters?: Character[] }> => {
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
        return { success: false, error: 'Incorrect password. Please try again.' };
      }

      // Just return credentials; state is set after exit animation in LoginScreen
      const loadedChars = profile.characters || [];
      return { success: true, username: profile.username, characters: loadedChars };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      
      if (error.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Database Blocked: Firestore Permission Denied. Check your security rules.' 
        };
      }
      
      return { 
        success: false, 
        error: `Connection Error: ${error.message || 'Check your internet connection.'}` 
      };
    }
  };

  const handleRegister = async (username: string, passwordEntered: string): Promise<{ success: boolean; error?: string; username?: string; characters?: Character[] }> => {
    try {
      const profile = await fetchFirebaseProfile(username);
      if (profile) {
        return { success: false, error: 'Username is already taken!' };
      }

      // Register new user with empty characters starting list
      const emptyCharacters: Character[] = [];
      
      // Attempt to save profile to Firebase first before logging in state
      const saved = await saveFirebaseProfile(username, passwordEntered, emptyCharacters);
      if (!saved) {
        return { success: false, error: 'Failed to write profile to database.' };
      }

      return { success: true, username: username.trim(), characters: emptyCharacters };
    } catch (error: any) {
      console.error('Firebase register error:', error);
      
      if (error.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Database Blocked: Firestore Permission Denied. Check your security rules.' 
        };
      }
      
      return { 
        success: false, 
        error: `Connection Error: ${error.message || 'Check your internet connection.'}` 
      };
    }
  };

  const handleAuthSuccess = async (username: string, loadedCharacters: Character[]) => {
    // Set actual session and cached data once portal portal animation concludes
    const processed = getCharactersWithComputedPriority(loadedCharacters);
    setCurrentUser(username);
    await saveCurrentUser(username);
    setCharacters(processed);
    await saveCharacters(username, processed);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setCharacters([]);
    setSelectedCharacterId(null);
    await clearCurrentUser();
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
    await updateCharactersList(currentUser, updatedList);
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
    await updateCharactersList(currentUser, updatedList);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!currentUser) return;
    const updatedList = characters.filter((c) => c.id !== characterId);
    await updateCharactersList(currentUser, updatedList);
  };

  // Find the currently selected character object
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  if (isInitLoading) {
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
        <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onAuthSuccess={handleAuthSuccess} />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <StatusBar style="light" />
      <DashboardScreen
        characters={characters}
        onSelectCharacter={handleSelectCharacter}
        onAddCharacter={handleAddCharacter}
        onLogout={handleLogout}
        currentUser={currentUser}
      />
      {selectedCharacterId && selectedCharacter && (
        <CharacterDetailScreen
          character={selectedCharacter}
          onBack={handleBackToDashboard}
          onUpdateCharacter={handleUpdateCharacter}
          onDeleteCharacter={handleDeleteCharacter}
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
