import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar as RNStatusBar } from 'react-native';
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
  migratePasswordToHash,
} from './src/utils/firebaseStorage';
import {
  hashPassword,
  verifyPassword,
  sanitizeUsername,
  validateUsername,
  validatePassword,
  checkRateLimit,
  resetRateLimit,
} from './src/utils/security';
import { Character, PriorityLevel } from './src/types/character';
import DashboardScreen from './src/screens/DashboardScreen';
import CharacterDetailScreen from './src/screens/CharacterDetailScreen';
import LoginScreen from './src/screens/LoginScreen';
import TasksScreen from './src/screens/TasksScreen';
import { TaskItem, AccountTaskProgress, CycleTaskOverride } from './src/types/tasks';
import { INITIAL_TASKS } from './src/constants/initialTasks';
import {
  loadTaskDefinitions,
  saveTaskDefinitions,
  loadAccountTaskProgress,
  saveAccountTaskProgress,
  resetDailyProgress,
  resetWeeklyProgress,
  checkAndPerformAutoReset,
  saveDeletedTaskId,
} from './src/utils/taskStorage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isInitLoading, setIsInitLoading] = useState(true); // Startup state only
  const [activeAppTab, setActiveAppTab] = useState<'roster' | 'tasks'>('roster');
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);
  const [accountProgress, setAccountProgress] = useState<AccountTaskProgress>({ taskProgress: {} });

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
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #070A10 !important;
              color-scheme: dark !important;
              overflow-x: hidden !important;
              overflow-y: hidden !important;
              overscroll-behavior-y: none;
              -webkit-tap-highlight-color: transparent;
            }
            #root {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: #070A10 !important;
              display: flex;
              flex-direction: column;
            }
            /* Prevent Chrome yellow autofill background in inputs */
            input:-webkit-autofill,
            input:-webkit-autofill:hover,
            input:-webkit-autofill:focus,
            input:-webkit-autofill:active {
              -webkit-box-shadow: 0 0 0 1000px #0A0D14 inset !important;
              -webkit-text-fill-color: #F8FAFC !important;
              caret-color: #F8FAFC !important;
              transition: background-color 5000s ease-in-out 0s;
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
            const displayName = profile.username || savedUser;
            setCurrentUser(displayName);
            await saveCurrentUser(displayName);
            const processed = getCharactersWithComputedPriority(profile.characters || []);
            setCharacters(processed);
            await saveCharacters(displayName, processed); // update local cache
            const [loadedTasks, loadedAcc] = await Promise.all([
              loadTaskDefinitions(displayName),
              loadAccountTaskProgress(displayName),
            ]);
            // Otomatis cek apakah sudah melewati jadwal reset server NA East
            const autoResetResult = checkAndPerformAutoReset(processed, loadedTasks, loadedAcc);
            const finalChars = autoResetResult.updatedCharacters;
            const finalAcc = autoResetResult.updatedAccount;

            setCharacters(finalChars);
            await saveCharacters(displayName, finalChars);
            setTasks(loadedTasks);
            setAccountProgress(finalAcc);

            if (autoResetResult.hasReset) {
              await saveAccountTaskProgress(displayName, finalAcc);
              await updateCharactersList(displayName, finalChars);
            }
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
    // ── 1. Sanitize & Validate Input ──────────────────────────────────────────
    const cleanUsername = sanitizeUsername(username);
    const usernameValidation = validateUsername(cleanUsername);
    if (!usernameValidation.valid) {
      return { success: false, error: usernameValidation.error };
    }
    const passwordValidation = validatePassword(passwordEntered);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error };
    }

    // ── 2. Rate Limit Check ───────────────────────────────────────────────────
    const rateLimit = checkRateLimit(cleanUsername);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error };
    }

    try {
      const profile = await fetchFirebaseProfile(cleanUsername);
      if (!profile) {
        return { success: false, error: 'Username tidak ditemukan. Daftar terlebih dahulu!' };
      }

      // ── 3. Legacy Account Migration (plaintext → hash) ────────────────────
      // Accounts created before this security update still have a plaintext
      // `password` field. We detect this and migrate on first successful login.
      if (profile.password && !profile.passwordHash) {
        // Verify with plaintext first
        if (profile.password !== passwordEntered) {
          return { success: false, error: 'Password salah. Coba lagi.' };
        }
        // Migrate: hash the password and save
        const { hash, salt } = await hashPassword(passwordEntered);
        await migratePasswordToHash(cleanUsername, hash, salt);
        resetRateLimit(cleanUsername);
        const loadedChars = profile.characters || [];
        return { success: true, username: profile.username, characters: loadedChars };
      }

      // ── 4. Normal Hashed Login ─────────────────────────────────────────────
      if (!profile.passwordHash || !profile.passwordSalt) {
        return { success: false, error: 'Akun bermasalah. Hubungi administrator.' };
      }

      const isValid = await verifyPassword(passwordEntered, profile.passwordHash, profile.passwordSalt);
      if (!isValid) {
        return { success: false, error: 'Password salah. Coba lagi.' };
      }

      resetRateLimit(cleanUsername);
      const loadedChars = profile.characters || [];
      return { success: true, username: profile.username, characters: loadedChars };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      if (error.code === 'permission-denied') {
        return {
          success: false,
          error: 'Database Blocked: Firestore Permission Denied. Check your security rules.',
        };
      }
      return {
        success: false,
        error: `Connection Error: ${error.message || 'Check your internet connection.'}`,
      };
    }
  };

  const handleRegister = async (username: string, passwordEntered: string): Promise<{ success: boolean; error?: string; username?: string; characters?: Character[] }> => {
    // ── 1. Sanitize & Validate Input ──────────────────────────────────────────
    const cleanUsername = sanitizeUsername(username);
    const usernameValidation = validateUsername(cleanUsername);
    if (!usernameValidation.valid) {
      return { success: false, error: usernameValidation.error };
    }
    const passwordValidation = validatePassword(passwordEntered);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.error };
    }

    // ── 2. Rate Limit Check ───────────────────────────────────────────────────
    const rateLimit = checkRateLimit(`register:${cleanUsername}`);
    if (!rateLimit.allowed) {
      return { success: false, error: rateLimit.error };
    }

    try {
      const profile = await fetchFirebaseProfile(cleanUsername);
      if (profile) {
        return { success: false, error: 'Username sudah dipakai. Pilih username lain!' };
      }

      // ── 3. Hash Password Before Storing ──────────────────────────────────────
      const { hash, salt } = await hashPassword(passwordEntered);
      const emptyCharacters: Character[] = [];

      const saved = await saveFirebaseProfile(cleanUsername, hash, salt, emptyCharacters);
      if (!saved) {
        return { success: false, error: 'Gagal menyimpan profil ke database.' };
      }

      return { success: true, username: cleanUsername, characters: emptyCharacters };
    } catch (error: any) {
      console.error('Firebase register error:', error);
      if (error.code === 'permission-denied') {
        return {
          success: false,
          error: 'Database Blocked: Firestore Permission Denied. Check your security rules.',
        };
      }
      return {
        success: false,
        error: `Connection Error: ${error.message || 'Check your internet connection.'}`,
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
    const [loadedTasks, loadedAcc] = await Promise.all([
      loadTaskDefinitions(username),
      loadAccountTaskProgress(username),
    ]);

    // Otomatis cek apakah sudah melewati jadwal reset server NA East
    const autoResetResult = checkAndPerformAutoReset(processed, loadedTasks, loadedAcc);
    const finalChars = autoResetResult.updatedCharacters;
    const finalAcc = autoResetResult.updatedAccount;

    setCharacters(finalChars);
    await saveCharacters(username, finalChars);
    setTasks(loadedTasks);
    setAccountProgress(finalAcc);

    if (autoResetResult.hasReset) {
      await saveAccountTaskProgress(username, finalAcc);
      await updateCharactersList(username, finalChars);
    }
  };

  // Periodic background check untuk reset otomatis setiap 30 detik saat aplikasi aktif
  useEffect(() => {
    if (!currentUser || tasks.length === 0) return;
    const interval = setInterval(async () => {
      const autoResetResult = checkAndPerformAutoReset(characters, tasks, accountProgress);
      if (autoResetResult.hasReset) {
        setCharacters(autoResetResult.updatedCharacters);
        setAccountProgress(autoResetResult.updatedAccount);
        await saveAccountTaskProgress(currentUser, autoResetResult.updatedAccount);
        await updateCharactersList(currentUser, autoResetResult.updatedCharacters);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, characters, tasks, accountProgress]);

  const handleLogout = async () => {
    setCurrentUser(null);
    setCharacters([]);
    setSelectedCharacterId(null);
    setActiveAppTab('roster');
    setTasks(INITIAL_TASKS);
    setAccountProgress({ taskProgress: {} });
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

  const handleUpdateCharacterTask = async (characterId: string, taskId: string, newCount: number) => {
    if (!currentUser) return;
    const updatedList = characters.map((c) => {
      if (c.id === characterId) {
        return {
          ...c,
          taskProgress: {
            ...(c.taskProgress || {}),
            [taskId]: newCount,
          },
        };
      }
      return c;
    });
    await updateCharactersList(currentUser, updatedList);
  };

  const handleUpdateAccountTask = async (taskId: string, newCount: number) => {
    if (!currentUser) return;
    const updated: AccountTaskProgress = {
      ...accountProgress,
      taskProgress: {
        ...(accountProgress.taskProgress || {}),
        [taskId]: newCount,
      },
    };
    setAccountProgress(updated);
    await saveAccountTaskProgress(currentUser, updated);
  };

  const handleUpdateCycleOverride = async (taskId: string, override: CycleTaskOverride) => {
    if (!currentUser) return;
    const updated: AccountTaskProgress = {
      ...accountProgress,
      cycleOverrides: {
        ...(accountProgress.cycleOverrides || {}),
        [taskId]: override,
      },
    };
    setAccountProgress(updated);
    await saveAccountTaskProgress(currentUser, updated);
  };

  const handleSetMainCharacter = async (characterId: string) => {
    if (!currentUser) return;
    const updatedList = characters.map((c) => ({
      ...c,
      isMain: c.id === characterId,
    }));
    await updateCharactersList(currentUser, updatedList);
  };

  const handleResetDailies = async () => {
    if (!currentUser) return;
    const { updatedCharacters, updatedAccount } = resetDailyProgress(
      characters,
      tasks,
      accountProgress
    );
    setAccountProgress(updatedAccount);
    await saveAccountTaskProgress(currentUser, updatedAccount);
    await updateCharactersList(currentUser, updatedCharacters);
  };

  const handleResetWeeklies = async () => {
    if (!currentUser) return;
    const { updatedCharacters, updatedAccount } = resetWeeklyProgress(
      characters,
      tasks,
      accountProgress
    );
    setAccountProgress(updatedAccount);
    await saveAccountTaskProgress(currentUser, updatedAccount);
    await updateCharactersList(currentUser, updatedCharacters);
  };

  const handleAddTask = async (newTask: TaskItem) => {
    if (!currentUser) return;
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    await saveTaskDefinitions(currentUser, updatedTasks);
  };

  const handleEditTask = async (editedTask: TaskItem) => {
    if (!currentUser) return;
    const updatedTasks = tasks.map((t) => (t.id === editedTask.id ? editedTask : t));
    setTasks(updatedTasks);
    await saveTaskDefinitions(currentUser, updatedTasks);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    await saveDeletedTaskId(currentUser, taskId);
    const updatedTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
    await saveTaskDefinitions(currentUser, updatedTasks);
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

  const handleReorderCharacters = async (newList: Character[]) => {
    if (!currentUser) return;
    await updateCharactersList(currentUser, newList);
  };

  const handleReorderTasks = async (newTasks: TaskItem[]) => {
    if (!currentUser) return;
    setTasks(newTasks);
    await saveTaskDefinitions(currentUser, newTasks);
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
      <View style={styles.authAppContainer}>
      <ExpoStatusBar translucent backgroundColor="transparent" style="light" />
        <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onAuthSuccess={handleAuthSuccess} />
      </View>
    );
  }

  return (
    <View style={styles.appContainer}>
      <ExpoStatusBar translucent backgroundColor="transparent" style="light" />
      {activeAppTab === 'roster' ? (
        <DashboardScreen
          characters={characters}
          onSelectCharacter={handleSelectCharacter}
          onAddCharacter={handleAddCharacter}
          onReorderCharacters={handleReorderCharacters}
          onLogout={handleLogout}
          currentUser={currentUser}
          activeTab={activeAppTab}
          onTabChange={setActiveAppTab}
        />
      ) : (
        <TasksScreen
          characters={characters}
          tasks={tasks}
          accountProgress={accountProgress}
          onUpdateCharacterTask={handleUpdateCharacterTask}
          onUpdateAccountTask={handleUpdateAccountTask}
          onUpdateCycleOverride={handleUpdateCycleOverride}
          onSetMainCharacter={handleSetMainCharacter}
          onResetDailies={handleResetDailies}
          onResetWeeklies={handleResetWeeklies}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onReorderTasks={handleReorderTasks}
          onSelectCharacter={handleSelectCharacter}
          activeTab={activeAppTab}
          onTabChange={setActiveAppTab}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
      {selectedCharacterId && selectedCharacter && (
        <CharacterDetailScreen
          character={selectedCharacter}
          onBack={handleBackToDashboard}
          onUpdateCharacter={handleUpdateCharacter}
          onDeleteCharacter={handleDeleteCharacter}
          tasks={tasks}
          onSetMainCharacter={handleSetMainCharacter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  authAppContainer: {
    flex: 1,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    backgroundColor: '#070A10',
    ...Platform.select({ web: { overflow: 'hidden' } as any }),
  },
  appContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#070A10',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0,
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
