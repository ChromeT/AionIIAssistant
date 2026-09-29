import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  PanResponder,
  Easing,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character, CharacterClass } from '../types/character';
import { TaskItem, TaskCategory, AccountTaskProgress } from '../types/tasks';
import TaskModal from '../components/TaskModal';
import {
  getServerDate,
  getNextDailyReset,
  getNextWeeklyReset,
  formatCountdown,
  ServerDateInfo,
} from '../utils/taskStorage';

interface TasksScreenProps {
  characters: Character[];
  tasks: TaskItem[];
  accountProgress: AccountTaskProgress;
  onUpdateCharacterTask: (characterId: string, taskId: string, newCount: number) => void;
  onUpdateAccountTask: (taskId: string, newCount: number) => void;
  onSetMainCharacter: (characterId: string) => void;
  onResetDailies: () => void;
  onResetWeeklies: () => void;
  onAddTask: (task: TaskItem) => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onReorderTasks?: (newTasks: TaskItem[]) => void;
  onSelectCharacter: (character: Character) => void;
  activeTab?: 'roster' | 'tasks';
  onTabChange?: (tab: 'roster' | 'tasks') => void;
  currentUser?: string;
  onLogout?: () => void;
}

// ─── Vertical Drag-to-Reorder Task Row (render-prop pattern) ────────────────
const ROW_HEIGHT = 60;

const DraggableTaskRow: React.FC<{
  index: number;
  draggingIndex: number | null;
  dragTargetIndex: number | null;
  dragTranslateY: Animated.Value;
  dragScaleAnim: Animated.Value;
  onStartDrag: (index: number) => void;
  onMoveDrag: (fromIdx: number, dy: number) => void;
  onEndDrag: (fromIdx: number) => void;
  onCancelDrag: () => void;
  children: (isDraggingVisual: boolean, handleViewProps: object) => React.ReactNode;
}> = ({
  index,
  draggingIndex,
  dragTargetIndex,
  dragTranslateY,
  dragScaleAnim,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onCancelDrag,
  children,
}) => {
  const isDragging = draggingIndex === index;
  const [localIsDragging, setLocalIsDragging] = useState(false);
  const isDraggingVisual = isDragging || localIsDragging;

  const shiftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isDragging || draggingIndex === null || dragTargetIndex === null) {
      shiftAnim.setValue(0);
      return;
    }
    let targetShift = 0;
    if (draggingIndex < dragTargetIndex && index > draggingIndex && index <= dragTargetIndex) {
      targetShift = -ROW_HEIGHT;
    } else if (draggingIndex > dragTargetIndex && index >= dragTargetIndex && index < draggingIndex) {
      targetShift = ROW_HEIGHT;
    }
    Animated.spring(shiftAnim, { toValue: targetShift, useNativeDriver: true, speed: 28, bounciness: 0 }).start();
  }, [draggingIndex, dragTargetIndex, index, isDragging]);

  const callbacksRef = useRef({ onStartDrag, onMoveDrag, onEndDrag, onCancelDrag });
  useEffect(() => {
    callbacksRef.current = { onStartDrag, onMoveDrag, onEndDrag, onCancelDrag };
  }, [onStartDrag, onMoveDrag, onEndDrag, onCancelDrag]);

  const indexRef = useRef(index);
  useEffect(() => { indexRef.current = index; }, [index]);

  const isDragActiveRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        isDragActiveRef.current = true;
        setLocalIsDragging(true);
        callbacksRef.current.onStartDrag(indexRef.current);
      },
      onPanResponderMove: (_, gs) => {
        if (isDragActiveRef.current) {
          callbacksRef.current.onMoveDrag(indexRef.current, gs.dy);
        }
      },
      onPanResponderRelease: () => {
        if (isDragActiveRef.current) {
          isDragActiveRef.current = false;
          setLocalIsDragging(false);
          callbacksRef.current.onEndDrag(indexRef.current);
        }
      },
      onPanResponderTerminate: () => {
        if (isDragActiveRef.current) {
          isDragActiveRef.current = false;
          setLocalIsDragging(false);
          callbacksRef.current.onCancelDrag();
        }
      },
    })
  ).current;

  // handleViewProps: attach these to the drag-handle View inside the task cell
  const handleViewProps = {
    ...panResponder.panHandlers,
    style: [
      {
        width: 24,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        alignSelf: 'stretch' as const,
        opacity: isDraggingVisual ? 1 : 0.45,
        marginRight: 4,
        paddingHorizontal: 2,
      },
      Platform.select({ web: { cursor: isDraggingVisual ? 'grabbing' : 'grab', touchAction: 'none' } as any }),
    ],
  };

  return (
    <Animated.View
      style={{
        width: '100%',
        minWidth: '100%',
        transform: [
          { translateY: isDraggingVisual ? dragTranslateY : shiftAnim },
          { scale: isDraggingVisual ? dragScaleAnim : 1 },
        ],
        zIndex: isDraggingVisual ? 999 : 1,
        elevation: isDraggingVisual ? 20 : 1,
        backgroundColor: isDraggingVisual ? '#162036' : 'transparent',
        borderLeftWidth: isDraggingVisual ? 3 : 0,
        borderLeftColor: isDraggingVisual ? '#6366F1' : 'transparent',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDraggingVisual ? 0.5 : 0,
        shadowRadius: 10,
        ...Platform.select({ web: { userSelect: 'none', WebkitUserSelect: 'none' } as any }),
      }}
    >
      {children(isDraggingVisual, handleViewProps)}
    </Animated.View>
  );
};


const classColors: Record<CharacterClass, string> = {
  Templar: '#38BDF8',
  Gladiator: '#F87171',
  Ranger: '#4ADE80',
  Cleric: '#FBBF24',
  Chanter: '#A78BFA',
  Assassin: '#FB7185',
  Sorcerer: '#60A5FA',
  Spiritmaster: '#F472B6',
};

export const TasksScreen: React.FC<TasksScreenProps> = ({
  characters,
  tasks,
  accountProgress,
  onUpdateCharacterTask,
  onUpdateAccountTask,
  onSetMainCharacter,
  onResetDailies,
  onResetWeeklies,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onReorderTasks,
  onSelectCharacter,
  activeTab = 'tasks',
  onTabChange,
  currentUser,
  onLogout,
}) => {
  // ─── Local task list for instant reorder (no async latency) ──────────────
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  // ─── Drag-to-Reorder State: Daily section ─────────────────────────────────
  const [dailyDraggingIndex, setDailyDraggingIndex] = useState<number | null>(null);
  const [dailyDragTargetIndex, setDailyDragTargetIndex] = useState<number | null>(null);
  const dailyDragTargetRef = useRef<number | null>(null);
  const dailyDragTranslateY = useRef(new Animated.Value(0)).current;
  const dailyDragScaleAnim = useRef(new Animated.Value(1)).current;

  // ─── Drag-to-Reorder State: Weekly section ────────────────────────────────
  const [weeklyDraggingIndex, setWeeklyDraggingIndex] = useState<number | null>(null);
  const [weeklyDragTargetIndex, setWeeklyDragTargetIndex] = useState<number | null>(null);
  const weeklyDragTargetRef = useRef<number | null>(null);
  const weeklyDragTranslateY = useRef(new Animated.Value(0)).current;
  const weeklyDragScaleAnim = useRef(new Animated.Value(1)).current;

  const startDrag = (
    index: number,
    setDragging: (i: number | null) => void,
    setTarget: (i: number | null) => void,
    targetRef: React.MutableRefObject<number | null>,
    translateY: Animated.Value,
    scaleAnim: Animated.Value,
  ) => {
    setDragging(index);
    setTarget(index);
    targetRef.current = index;
    translateY.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1.03, useNativeDriver: true, speed: 30, bounciness: 2 }).start();
  };

  const moveDrag = (
    fromIdx: number,
    dy: number,
    sectionLength: number,
    setTarget: (i: number | null) => void,
    targetRef: React.MutableRefObject<number | null>,
    translateY: Animated.Value,
  ) => {
    translateY.setValue(dy);
    const offsetSlots = Math.round(dy / ROW_HEIGHT);
    const newTarget = Math.max(0, Math.min(sectionLength - 1, fromIdx + offsetSlots));
    if (newTarget !== targetRef.current) {
      targetRef.current = newTarget;
      setTarget(newTarget);
    }
  };

  const endDrag = (
    fromIdx: number,
    targetRef: React.MutableRefObject<number | null>,
    sectionTasks: TaskItem[],
    setDragging: (i: number | null) => void,
    setTarget: (i: number | null) => void,
    translateY: Animated.Value,
    scaleAnim: Animated.Value,
  ) => {
    const toIdx = targetRef.current ?? fromIdx;
    setDragging(null);
    setTarget(null);
    targetRef.current = null;
    translateY.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    if (fromIdx !== toIdx) {
      // Reorder within the section
      const newSection = [...sectionTasks];
      const [moved] = newSection.splice(fromIdx, 1);
      newSection.splice(toIdx, 0, moved);

      // Rebuild full task list: replace section items in-place
      const newFullTasks = localTasks.map((t) => {
        const sectionIdx = newSection.findIndex((s) => s.id === t.id);
        if (sectionIdx !== -1) return newSection[sectionIdx];
        // Check if this task was in the OLD section but isn't in newSection (shouldn't happen)
        const oldSectionIdx = sectionTasks.findIndex((s) => s.id === t.id);
        if (oldSectionIdx !== -1) return newSection[oldSectionIdx] ?? t;
        return t;
      });

      // Preserve order by reconstructing: tasks not in section stay, tasks in section reordered
      const sectionIds = new Set(sectionTasks.map((s) => s.id));
      const result: TaskItem[] = [];
      let sectionPointer = 0;
      for (const t of localTasks) {
        if (sectionIds.has(t.id)) {
          result.push(newSection[sectionPointer++]);
        } else {
          result.push(t);
        }
      }

      setLocalTasks(result);
      onReorderTasks?.(result);
    }
  };

  const cancelDrag = (
    setDragging: (i: number | null) => void,
    setTarget: (i: number | null) => void,
    targetRef: React.MutableRefObject<number | null>,
    translateY: Animated.Value,
    scaleAnim: Animated.Value,
  ) => {
    setDragging(null);
    setTarget(null);
    targetRef.current = null;
    translateY.setValue(0);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const [filterCategory, setFilterCategory] = useState<'all' | TaskCategory>('all');

  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<TaskItem | null>(null);

  // ─── Entrance & Exit Transition Animations ──────────────────────────────
  const swirlAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const trackerTitleAnim = useRef(new Animated.Value(0)).current;
  const serverTimeAnim = useRef(new Animated.Value(0)).current;
  const metricsAnim = useRef(new Animated.Value(0)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;
  const accountCardAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Screen Exit Animation when navigating to Roster & Gear tab
  const [isExiting, setIsExiting] = useState(false);
  const screenExitAnim = useRef(new Animated.Value(1)).current;

  const handleTabChangeWithExit = (targetTab: 'roster' | 'tasks') => {
    if (targetTab === activeTab || isExiting) return;
    setIsExiting(true);
    Animated.parallel([
      Animated.timing(screenExitAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onTabChange?.(targetTab);
    });
  };

  const screenExitStyle = {
    opacity: screenExitAnim,
    transform: [
      {
        scale: screenExitAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1],
          extrapolate: 'clamp',
        }),
      },
      {
        translateY: screenExitAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-12, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  };

  useEffect(() => {
    swirlAnim.setValue(0);
    headerAnim.setValue(0);
    trackerTitleAnim.setValue(0);
    serverTimeAnim.setValue(0);
    metricsAnim.setValue(0);
    filterAnim.setValue(0);
    accountCardAnim.setValue(0);
    contentAnim.setValue(0);

    Animated.timing(swirlAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();

    const makeSectionAnim = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 480,
        delay,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        useNativeDriver: true,
      });

    Animated.parallel([
      makeSectionAnim(headerAnim, 40),
      makeSectionAnim(trackerTitleAnim, 80),
      makeSectionAnim(serverTimeAnim, 130),
      makeSectionAnim(metricsAnim, 180),
      makeSectionAnim(filterAnim, 220),
      makeSectionAnim(accountCardAnim, 260),
      makeSectionAnim(contentAnim, 300),
    ]).start();
  }, []);

  const makeSectionStyle = (anim: Animated.Value, translateYFrom: number) => ({
    opacity: anim.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.7, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
          extrapolate: 'clamp',
        }),
      },
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [translateYFrom, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  const headerAnimStyle = makeSectionStyle(headerAnim, 18);
  const trackerTitleAnimStyle = makeSectionStyle(trackerTitleAnim, 20);
  const serverTimeAnimStyle = makeSectionStyle(serverTimeAnim, 22);
  const metricsAnimStyle = makeSectionStyle(metricsAnim, 26);
  const filterAnimStyle = makeSectionStyle(filterAnim, 28);
  const accountCardAnimStyle = makeSectionStyle(accountCardAnim, 30);
  const contentAnimStyle = makeSectionStyle(contentAnim, 32);

  // Live NA East Server Time and countdowns to next resets
  const [serverTime, setServerTime] = useState<ServerDateInfo>(() => getServerDate());
  const [dailyCountdown, setDailyCountdown] = useState(() => formatCountdown(getNextDailyReset()));
  const [weeklyCountdown, setWeeklyCountdown] = useState(() => formatCountdown(getNextWeeklyReset()));

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setServerTime(getServerDate(now));
      setDailyCountdown(formatCountdown(getNextDailyReset(now), now));
      setWeeklyCountdown(formatCountdown(getNextWeeklyReset(now), now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks based on selected tab (using localTasks for instant reorder)
  const filteredTasks = useMemo(() => {
    if (filterCategory === 'all') return localTasks;
    return localTasks.filter((t) => t.category === filterCategory);
  }, [localTasks, filterCategory]);


  const accountTasks = useMemo(
    () => filteredTasks.filter((t) => t.scope === 'account'),
    [filteredTasks]
  );

  const characterTasks = useMemo(
    () => filteredTasks.filter((t) => t.scope === 'character'),
    [filteredTasks]
  );

  const dailyCharTasks = useMemo(
    () => characterTasks.filter((t) => t.category === 'daily'),
    [characterTasks]
  );

  const weeklyCharTasks = useMemo(
    () => characterTasks.filter((t) => t.category === 'weekly'),
    [characterTasks]
  );

  // Overall Statistics (use localTasks so reorder doesn't affect stats, but use localTasks for consistency)
  const stats = useMemo(() => {
    let totalDailyPossible = 0;
    let totalDailyDone = 0;
    let totalWeeklyPossible = 0;
    let totalWeeklyDone = 0;

    localTasks.forEach((task) => {
      if (task.scope === 'account') {
        const count = accountProgress.taskProgress[task.id] || 0;
        if (task.category === 'daily') {
          totalDailyPossible += task.maxCount;
          totalDailyDone += Math.min(count, task.maxCount);
        } else {
          totalWeeklyPossible += task.maxCount;
          totalWeeklyDone += Math.min(count, task.maxCount);
        }
      } else {
        characters.forEach((char) => {
          if (task.mainOnly && !char.isMain) return;
          const count = char.taskProgress?.[task.id] || 0;
          if (task.category === 'daily') {
            totalDailyPossible += task.maxCount;
            totalDailyDone += Math.min(count, task.maxCount);
          } else {
            totalWeeklyPossible += task.maxCount;
            totalWeeklyDone += Math.min(count, task.maxCount);
          }
        });
      }
    });

    const dailyPct = totalDailyPossible > 0 ? Math.round((totalDailyDone / totalDailyPossible) * 100) : 0;
    const weeklyPct = totalWeeklyPossible > 0 ? Math.round((totalWeeklyDone / totalWeeklyPossible) * 100) : 0;

    return {
      dailyDone: totalDailyDone,
      dailyTotal: totalDailyPossible,
      dailyPct,
      weeklyDone: totalWeeklyDone,
      weeklyTotal: totalWeeklyPossible,
      weeklyPct,
    };
  }, [localTasks, characters, accountProgress]);

  // Handle cell click (left-click = +1, right-click/long-press = -1)
  const handleCellClick = (charId: string, task: TaskItem) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    if (task.mainOnly && !char.isMain) return;
    const current = char.taskProgress?.[task.id] || 0;
    const next = current >= task.maxCount ? 0 : current + 1;
    onUpdateCharacterTask(charId, task.id, next);
  };

  const handleCellDecrease = (charId: string, task: TaskItem) => {
    const char = characters.find((c) => c.id === charId);
    if (!char) return;
    if (task.mainOnly && !char.isMain) return;
    const current = char.taskProgress?.[task.id] || 0;
    const next = current <= 0 ? task.maxCount : current - 1;
    onUpdateCharacterTask(charId, task.id, next);
  };

  const handleAccountCellClick = (task: TaskItem) => {
    const current = accountProgress.taskProgress[task.id] || 0;
    const next = current >= task.maxCount ? 0 : current + 1;
    onUpdateAccountTask(task.id, next);
  };

  const handleAccountCellDecrease = (task: TaskItem) => {
    const current = accountProgress.taskProgress[task.id] || 0;
    const next = current <= 0 ? task.maxCount : current - 1;
    onUpdateAccountTask(task.id, next);
  };

  const handleOpenAddTask = () => {
    setEditingTask(null);
    setIsTaskModalVisible(true);
  };

  const handleOpenEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalVisible(true);
  };

  const handleSaveTaskModal = (savedTask: TaskItem) => {
    if (editingTask && onEditTask) {
      onEditTask(savedTask);
    } else {
      onAddTask(savedTask);
    }
    setEditingTask(null);
    setIsTaskModalVisible(false);
  };

  const handleDeleteTaskPrompt = (task: TaskItem) => {
    setDeleteConfirmTask(task);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Ambient Atmospheric Glows */}
      <View pointerEvents="none" style={styles.ambientGlow1} />
      <View pointerEvents="none" style={styles.ambientGlow2} />

      <Animated.View style={[styles.containerInner, screenExitStyle]}>
        {/* ─── Top App Header with Nav Switcher ────────────────── */}
        <Animated.View style={[styles.topAppHeader, headerAnimStyle]}>
          <View style={styles.logoContainer}>
            <View style={styles.headerLogoBadge}>
              <MaterialCommunityIcons name="shield-star" size={16} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.logoTitle}>AION II</Text>
              <Text style={styles.logoSubtitle}>CHARACTER TRACKER</Text>
            </View>
          </View>

          {onTabChange && (
            <View style={styles.headerNavTabs}>
              <TouchableOpacity
                style={[styles.headerNavTab, activeTab === 'roster' && styles.headerNavTabActive]}
                onPress={() => handleTabChangeWithExit('roster')}
              >
                <MaterialCommunityIcons
                  name="shield-account"
                  size={14}
                  color={activeTab === 'roster' ? '#6366F1' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.headerNavTabText,
                    activeTab === 'roster' && styles.headerNavTabTextActive,
                  ]}
                >
                  ROSTER & GEAR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerNavTab, activeTab === 'tasks' && styles.headerNavTabActiveTasks]}
                onPress={() => handleTabChangeWithExit('tasks')}
              >
                <MaterialCommunityIcons
                  name="calendar-check"
                  size={14}
                  color={activeTab === 'tasks' ? '#FBBF24' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.headerNavTabText,
                    activeTab === 'tasks' && { color: '#FBBF24', fontWeight: '800' },
                  ]}
                >
                  DAILY & WEEKLY
                </Text>
              </TouchableOpacity>
            </View>
          )}

        <View style={styles.headerRightActions}>
          {currentUser && (
            <View style={styles.profileBadge}>
              <MaterialCommunityIcons name="account" size={12} color="#38BDF8" />
              <Text style={styles.profileBadgeText}>{currentUser}</Text>
            </View>
          )}
          {onLogout && (
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ─── Header & Summary Banner ────────────────────────── */}
      <View style={styles.headerSection}>
        <Animated.View style={[styles.headerRow, trackerTitleAnimStyle]}>
          <View>
            <View style={styles.titleWithBadge}>
              <Text style={styles.mainTitle}>DAILY & WEEKLY TRACKER</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>ROSTER MATRIX</Text>
              </View>
            </View>
            <Text style={styles.subTitle}>
              Track instances, raids, PvP & checklists across all characters
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.addTaskBtn} onPress={handleOpenAddTask}>
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.addTaskBtnText}>ADD TASK</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ─── Server Time & Reset Countdown Banner ──────────── */}
        <Animated.View style={[styles.serverTimeBanner, serverTimeAnimStyle]}>
          <View style={styles.serverTimeLeft}>
            <View style={styles.serverClockBadge}>
              <View style={styles.livePulseDot} />
              <MaterialCommunityIcons name="clock-outline" size={14} color="#38BDF8" />
              <Text style={styles.serverClockLabel}>NA EAST SERVER TIME</Text>
            </View>
            <Text style={styles.serverClockTime}>
              {serverTime.weekdayStr}, {serverTime.timeString}
            </Text>
            <Text style={styles.serverClockSub}>
              Timezone: America/New_York (Automatic Reset Enabled)
            </Text>
          </View>

          <View style={styles.resetTimersWrap}>
            {/* Daily Reset Timer */}
            <View style={styles.resetTimerBox}>
              <View style={styles.resetTimerHeader}>
                <MaterialCommunityIcons name="weather-sunny" size={14} color="#FBBF24" />
                <Text style={styles.resetTimerTitle}>DAILY RESET</Text>
                <Text style={styles.resetTimerSchedule}>9:00 AM EDT</Text>
              </View>
              <Text style={styles.resetTimerCountdown}>{dailyCountdown}</Text>
              <Text style={styles.resetTimerFootnote}>Resets every day at 9:00 AM</Text>
            </View>

            {/* Weekly Reset Timer */}
            <View style={[styles.resetTimerBox, styles.resetTimerBoxWeekly]}>
              <View style={styles.resetTimerHeader}>
                <MaterialCommunityIcons name="calendar-star" size={14} color="#A78BFA" />
                <Text style={[styles.resetTimerTitle, { color: '#A78BFA' }]}>WEEKLY RESET</Text>
                <Text style={[styles.resetTimerSchedule, { color: '#A78BFA' }]}>Wed 9:00 AM</Text>
              </View>
              <Text style={[styles.resetTimerCountdown, { color: '#C4B5FD' }]}>
                {weeklyCountdown}
              </Text>
              <Text style={styles.resetTimerFootnote}>Resets every Wednesday at 9:00 AM</Text>
            </View>
          </View>
        </Animated.View>

        {/* Aggregate Progress Cards */}
        <Animated.View style={[styles.metricsRow, metricsAnimStyle]}>
          {/* Daily Progress */}
          <View style={[styles.metricCard, { borderColor: '#FBBF2430' }]}>
            <View style={[styles.metricStrip, { backgroundColor: '#FBBF24' }]} />
            <View style={styles.metricContent}>
              <View style={[styles.metricIconBox, { backgroundColor: '#FBBF2415' }]}>
                <MaterialCommunityIcons name="weather-sunny" size={18} color="#FBBF24" />
              </View>
              <View style={styles.metricTexts}>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: '#FBBF24' }]}>
                    {stats.dailyPct}%
                  </Text>
                  <Text style={styles.metricRatio}>
                    ({stats.dailyDone}/{stats.dailyTotal})
                  </Text>
                </View>
                <Text style={styles.metricLabel}>DAILY ROSTER PROGRESS</Text>
                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${stats.dailyPct}%`, backgroundColor: '#FBBF24' },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Weekly Progress */}
          <View style={[styles.metricCard, { borderColor: '#A78BFA30' }]}>
            <View style={[styles.metricStrip, { backgroundColor: '#A78BFA' }]} />
            <View style={styles.metricContent}>
              <View style={[styles.metricIconBox, { backgroundColor: '#A78BFA15' }]}>
                <MaterialCommunityIcons name="calendar-star" size={18} color="#A78BFA" />
              </View>
              <View style={styles.metricTexts}>
                <View style={styles.metricValueRow}>
                  <Text style={[styles.metricValue, { color: '#A78BFA' }]}>
                    {stats.weeklyPct}%
                  </Text>
                  <Text style={styles.metricRatio}>
                    ({stats.weeklyDone}/{stats.weeklyTotal})
                  </Text>
                </View>
                <Text style={styles.metricLabel}>WEEKLY ROSTER PROGRESS</Text>
                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${stats.weeklyPct}%`, backgroundColor: '#A78BFA' },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* View Controls & Filter Tabs */}
        <Animated.View style={[styles.controlsRow, filterAnimStyle]}>
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filterCategory === 'all' && styles.filterTabActive]}
              onPress={() => setFilterCategory('all')}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filterCategory === 'all' && styles.filterTabTextActive,
                ]}
              >
                ALL TASKS ({tasks.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterCategory === 'daily' && styles.filterTabActiveDaily]}
              onPress={() => setFilterCategory('daily')}
            >
              <MaterialCommunityIcons
                name="weather-sunny"
                size={14}
                color={filterCategory === 'daily' ? '#FBBF24' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.filterTabText,
                  filterCategory === 'daily' && { color: '#FBBF24', fontWeight: '700' },
                ]}
              >
                DAILIES
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterCategory === 'weekly' && styles.filterTabActiveWeekly]}
              onPress={() => setFilterCategory('weekly')}
            >
              <MaterialCommunityIcons
                name="calendar-star"
                size={14}
                color={filterCategory === 'weekly' ? '#A78BFA' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.filterTabText,
                  filterCategory === 'weekly' && { color: '#A78BFA', fontWeight: '700' },
                ]}
              >
                WEEKLIES
              </Text>
            </TouchableOpacity>
          </View>

          {/* View Mode Switcher */}
          <View style={styles.viewModeSwitcher}>
            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'matrix' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('matrix')}
            >
              <MaterialCommunityIcons
                name="table"
                size={15}
                color={viewMode === 'matrix' ? '#6366F1' : '#64748B'}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  viewMode === 'matrix' && styles.viewModeBtnTextActive,
                ]}
              >
                MATRIX
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModeBtn, viewMode === 'cards' && styles.viewModeBtnActive]}
              onPress={() => setViewMode('cards')}
            >
              <MaterialCommunityIcons
                name="view-grid"
                size={15}
                color={viewMode === 'cards' ? '#6366F1' : '#64748B'}
              />
              <Text
                style={[
                  styles.viewModeBtnText,
                  viewMode === 'cards' && styles.viewModeBtnTextActive,
                ]}
              >
                CARDS
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* ─── Account-Wide Tasks Card ────────────────────────── */}
      {accountTasks.length > 0 && (
        <Animated.View style={[styles.accountCard, accountCardAnimStyle]}>
          <View style={styles.accountHeader}>
            <View style={styles.accountHeaderTitleRow}>
              <View style={styles.accountIconBox}>
                <MaterialCommunityIcons name="account-group" size={16} color="#38BDF8" />
              </View>
              <View>
                <Text style={styles.accountTitle}>ACCOUNT / ROSTER TASKS</Text>
                <Text style={styles.accountSubtitle}>
                  Completed once per account per reset cycle
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.accountGrid}>
            {accountTasks.map((task) => {
              const currentCount = accountProgress.taskProgress[task.id] || 0;
              const isDone = currentCount >= task.maxCount;

              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.accountTaskItem, isDone && styles.accountTaskItemDone]}
                  onPress={() => handleAccountCellClick(task)}
                  onLongPress={() => handleAccountCellDecrease(task)}
                  {...(Platform.OS === 'web' ? {
                    onContextMenu: (e: any) => { e.preventDefault(); handleAccountCellDecrease(task); },
                  } : {})}
                  activeOpacity={0.8}
                >
                  <View style={styles.accountTaskLeft}>
                    <View
                      style={[
                        styles.taskIconBadge,
                        {
                          backgroundColor:
                            task.category === 'daily' ? '#FBBF2415' : '#A78BFA15',
                          borderColor:
                            task.category === 'daily' ? '#FBBF2430' : '#A78BFA30',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={(task.icon || 'star') as any}
                        size={16}
                        color={task.category === 'daily' ? '#FBBF24' : '#A78BFA'}
                      />
                    </View>
                    <View style={styles.accountTaskInfo}>
                      <View style={styles.accountTaskTitleRow}>
                        <Text
                          style={[
                            styles.accountTaskTitle,
                            isDone && styles.accountTaskTitleDone,
                          ]}
                        >
                          {task.title}
                        </Text>
                        <Text
                          style={[
                            styles.categoryPill,
                            task.category === 'daily'
                              ? styles.categoryPillDaily
                              : styles.categoryPillWeekly,
                          ]}
                        >
                          {task.category.toUpperCase()}
                        </Text>
                      </View>
                      {task.description && (
                        <Text style={styles.accountTaskDesc} numberOfLines={1}>
                          {task.description}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Completion status & actions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.statusBox, isDone && styles.statusBoxDone]}>
                      {isDone ? (
                        <MaterialCommunityIcons name="check-bold" size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.statusBoxCount}>
                          {currentCount}/{task.maxCount}
                        </Text>
                      )}
                    </View>
                    <View style={styles.accountTaskActions}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleOpenEditTask(task);
                        }}
                        style={styles.editTaskBtn}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={13} color="#38BDF8" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteTaskPrompt(task);
                        }}
                        style={styles.deleteTaskBtn}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={13} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* ─── View 1: Comprehensive Matrix Table ─────────────── */}
      <Animated.View style={contentAnimStyle}>
      {viewMode === 'matrix' ? (
        <View style={styles.matrixContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.tableScroll}
            contentContainerStyle={styles.tableScrollContent}
          >
            <View style={styles.table}>
              {/* Table Header Row: Characters */}
              <View style={styles.tableHeaderRow}>
                {/* Top-left corner */}
                <View style={styles.tableCornerCell}>
                  <View style={styles.cornerTitleRow}>
                    <MaterialCommunityIcons name="format-list-checks" size={15} color="#38BDF8" />
                    <Text style={styles.cornerLabel}>TASK / CHARACTER</Text>
                  </View>
                  <View style={styles.cornerBadgeRow}>
                    <View style={styles.cornerLiveDot} />
                    <Text style={styles.cornerSubLabel}>
                      {characters.length} Registered Characters
                    </Text>
                  </View>
                </View>

                {/* Character Column Headers */}
                {characters.map((char) => {
                  const isMain = char.isMain || false;
                  const charColor = classColors[char.classType] || '#6366F1';

                  // Calculate character completion
                  let charDone = 0;
                  let charTotal = 0;
                  characterTasks.forEach((t) => {
                    if (t.mainOnly && !isMain) return;
                    charTotal += t.maxCount;
                    const c = char.taskProgress?.[t.id] || 0;
                    charDone += Math.min(c, t.maxCount);
                  });
                  const charPct = charTotal > 0 ? Math.round((charDone / charTotal) * 100) : 0;

                  return (
                    <View
                      key={char.id}
                      style={[styles.charColumnHeader, isMain && styles.charColumnHeaderMain]}
                    >
                      {/* Main Character Pin / Badge */}
                      <View style={styles.charHeaderTop}>
                        {isMain ? (
                          <View style={styles.mainTagBadge}>
                            <MaterialCommunityIcons name="crown" size={12} color="#FBBF24" />
                            <Text style={styles.mainTagText}>MAIN</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.setMainBtn}
                            onPress={() => onSetMainCharacter(char.id)}
                          >
                            <MaterialCommunityIcons
                              name="star-outline"
                              size={13}
                              color="#64748B"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Character Name & Class */}
                      <TouchableOpacity
                        onPress={() => onSelectCharacter(char)}
                        activeOpacity={0.7}
                        style={styles.charNameTouch}
                      >
                        <Text
                          style={[styles.charColName, isMain && styles.charColNameMain]}
                          numberOfLines={1}
                        >
                          {char.name}
                        </Text>
                        <View style={styles.charMetaRow}>
                          <View
                            style={[
                              styles.classDot,
                              { backgroundColor: charColor },
                            ]}
                          />
                          <Text style={[styles.charColClass, { color: charColor }]}>
                            {char.classType}
                          </Text>
                        </View>
                        <Text style={styles.charColGs}>GS {char.gs.toLocaleString()}</Text>
                      </TouchableOpacity>

                      {/* Mini Progress */}
                      <View style={styles.charProgressBox}>
                        <View style={styles.charProgressBar}>
                          <View
                            style={[
                              styles.charProgressFill,
                              {
                                width: `${charPct}%`,
                                backgroundColor:
                                  charPct === 100 ? '#10B981' : isMain ? '#FBBF24' : '#6366F1',
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.charProgressText}>
                          {charDone}/{charTotal} ({charPct}%)
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* ─── Section 1: Daily Character Tasks ─────────── */}
              {dailyCharTasks.length > 0 && (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={styles.sectionHeaderIconWrap}>
                        <MaterialCommunityIcons name="weather-sunny" size={16} color="#FBBF24" />
                      </View>
                      <Text style={styles.sectionHeaderText}>DAILY CHARACTER TASKS</Text>
                      <View style={styles.sectionTaskCountBadge}>
                        <Text style={styles.sectionTaskCountText}>
                          {dailyCharTasks.length} {dailyCharTasks.length === 1 ? 'Task' : 'Tasks'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.sectionHeaderHint}>
                      <MaterialCommunityIcons name="swap-vertical" size={13} color="#FBBF24" />
                      <Text style={styles.sectionHeaderHintText}>Drag handle to prioritize</Text>
                    </View>
                  </View>

                  {dailyCharTasks.map((task, taskIndex) => (
                    <DraggableTaskRow
                      key={task.id}
                      index={taskIndex}
                      draggingIndex={dailyDraggingIndex}
                      dragTargetIndex={dailyDragTargetIndex}
                      dragTranslateY={dailyDragTranslateY}
                      dragScaleAnim={dailyDragScaleAnim}
                      onStartDrag={(i) => startDrag(i, setDailyDraggingIndex, setDailyDragTargetIndex, dailyDragTargetRef, dailyDragTranslateY, dailyDragScaleAnim)}
                      onMoveDrag={(i, dy) => moveDrag(i, dy, dailyCharTasks.length, setDailyDragTargetIndex, dailyDragTargetRef, dailyDragTranslateY)}
                      onEndDrag={(i) => endDrag(i, dailyDragTargetRef, dailyCharTasks, setDailyDraggingIndex, setDailyDragTargetIndex, dailyDragTranslateY, dailyDragScaleAnim)}
                      onCancelDrag={() => cancelDrag(setDailyDraggingIndex, setDailyDragTargetIndex, dailyDragTargetRef, dailyDragTranslateY, dailyDragScaleAnim)}
                    >
                      {(isDraggingVisual, handleProps) => (
                        <View style={styles.tableRow}>
                          {/* Left: Task Info */}
                          <View style={styles.taskCell}>
                            <View style={styles.taskCellContent}>
                              {/* Drag Handle - inside task cell */}
                              <View {...handleProps}>
                                <MaterialCommunityIcons
                                  name="drag-vertical"
                                  size={15}
                                  color={isDraggingVisual ? '#6366F1' : '#475569'}
                                />
                              </View>
                              <View style={styles.taskCellIconBox}>
                                <MaterialCommunityIcons
                                  name={(task.icon || 'checkbox-blank-circle-outline') as any}
                                  size={14}
                                  color="#FBBF24"
                                />
                              </View>
                              <View style={styles.taskCellTexts}>
                                <View style={styles.taskTitleRow}>
                                  <Text style={styles.taskCellTitle} numberOfLines={1}>
                                    {task.title}
                                  </Text>
                                  {task.mainOnly && (
                                    <View style={styles.mainOnlyTag}>
                                      <MaterialCommunityIcons name="crown" size={9} color="#FBBF24" />
                                      <Text style={styles.mainOnlyTagText}>MAIN</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.taskSubRow}>
                                  <Text style={styles.taskCellMax} numberOfLines={1}>
                                    Max {task.maxCount}x{task.description ? ` • ${task.description}` : ''}
                                  </Text>
                                  <View style={styles.taskActionBtns}>
                                    <TouchableOpacity
                                      onPress={() => handleOpenEditTask(task)}
                                      style={styles.editTaskBtn}
                                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                    >
                                      <MaterialCommunityIcons name="pencil-outline" size={11} color="#38BDF8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => handleDeleteTaskPrompt(task)}
                                      style={styles.deleteTaskBtn}
                                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                    >
                                      <MaterialCommunityIcons name="trash-can-outline" size={11} color="#EF4444" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Character Cells */}
                          {characters.map((char) => {
                            const isMain = char.isMain || false;
                            if (task.mainOnly && !isMain) {
                              return (
                                <View key={char.id} style={[styles.tableCell, styles.tableCellDisabled]}>
                                  <MaterialCommunityIcons name="lock-outline" size={13} color="#475569" />
                                  <Text style={styles.cellDisabledText}>MAIN ONLY</Text>
                                </View>
                              );
                            }
                            const count = char.taskProgress?.[task.id] || 0;
                            const isDone = count >= task.maxCount;
                            const isPartial = count > 0 && !isDone;
                            return (
                              <TouchableOpacity
                                key={char.id}
                                style={[styles.tableCell, isDone && styles.tableCellDone, isPartial && styles.tableCellPartial]}
                                onPress={() => handleCellClick(char.id, task)}
                                onLongPress={() => handleCellDecrease(char.id, task)}
                                {...(Platform.OS === 'web' ? {
                                  onContextMenu: (e: any) => { e.preventDefault(); handleCellDecrease(char.id, task); },
                                } : {})}
                                activeOpacity={0.7}
                              >
                                {task.maxCount === 1 ? (
                                  <View style={[styles.checkboxBox, isDone && styles.checkboxBoxDone]}>
                                    {isDone && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                                  </View>
                                ) : (
                                  <View style={[styles.counterBox, isDone && styles.counterBoxDone, isPartial && styles.counterBoxPartial]}>
                                    <Text style={[styles.counterBoxText, isDone && styles.counterBoxTextDone]}>
                                      {count} / {task.maxCount}
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </DraggableTaskRow>
                  ))}

                </>
              )}

              {/* ─── Section 2: Weekly Character Tasks ────────── */}
              {weeklyCharTasks.length > 0 && (
                <>
                  <View style={[styles.sectionHeaderRow, styles.sectionHeaderRowWeekly]}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={[styles.sectionHeaderIconWrap, { backgroundColor: '#8B5CF625', borderColor: '#8B5CF640' }]}>
                        <MaterialCommunityIcons name="calendar-star" size={16} color="#A78BFA" />
                      </View>
                      <Text style={[styles.sectionHeaderText, { color: '#A78BFA' }]}>
                        WEEKLY CHARACTER TASKS
                      </Text>
                      <View style={[styles.sectionTaskCountBadge, { backgroundColor: '#8B5CF625', borderColor: '#8B5CF640' }]}>
                        <Text style={[styles.sectionTaskCountText, { color: '#C4B5FD' }]}>
                          {weeklyCharTasks.length} {weeklyCharTasks.length === 1 ? 'Task' : 'Tasks'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.sectionHeaderHint}>
                      <MaterialCommunityIcons name="swap-vertical" size={13} color="#A78BFA" />
                      <Text style={[styles.sectionHeaderHintText, { color: '#A78BFA' }]}>Drag handle to prioritize</Text>
                    </View>
                  </View>

                  {weeklyCharTasks.map((task, taskIndex) => (
                    <DraggableTaskRow
                      key={task.id}
                      index={taskIndex}
                      draggingIndex={weeklyDraggingIndex}
                      dragTargetIndex={weeklyDragTargetIndex}
                      dragTranslateY={weeklyDragTranslateY}
                      dragScaleAnim={weeklyDragScaleAnim}
                      onStartDrag={(i) => startDrag(i, setWeeklyDraggingIndex, setWeeklyDragTargetIndex, weeklyDragTargetRef, weeklyDragTranslateY, weeklyDragScaleAnim)}
                      onMoveDrag={(i, dy) => moveDrag(i, dy, weeklyCharTasks.length, setWeeklyDragTargetIndex, weeklyDragTargetRef, weeklyDragTranslateY)}
                      onEndDrag={(i) => endDrag(i, weeklyDragTargetRef, weeklyCharTasks, setWeeklyDraggingIndex, setWeeklyDragTargetIndex, weeklyDragTranslateY, weeklyDragScaleAnim)}
                      onCancelDrag={() => cancelDrag(setWeeklyDraggingIndex, setWeeklyDragTargetIndex, weeklyDragTargetRef, weeklyDragTranslateY, weeklyDragScaleAnim)}
                    >
                      {(isDraggingVisual, handleProps) => (
                        <View style={styles.tableRow}>
                          {/* Left: Task Info */}
                          <View style={styles.taskCell}>
                            <View style={styles.taskCellContent}>
                              {/* Drag Handle */}
                              <View {...handleProps}>
                                <MaterialCommunityIcons
                                  name="drag-vertical"
                                  size={15}
                                  color={isDraggingVisual ? '#A78BFA' : '#475569'}
                                />
                              </View>
                              <View style={[styles.taskCellIconBox, { backgroundColor: '#A78BFA15', borderColor: '#A78BFA30' }]}>
                                <MaterialCommunityIcons
                                  name={(task.icon || 'star') as any}
                                  size={14}
                                  color="#A78BFA"
                                />
                              </View>
                              <View style={styles.taskCellTexts}>
                                <View style={styles.taskTitleRow}>
                                  <Text style={styles.taskCellTitle} numberOfLines={1}>
                                    {task.title}
                                  </Text>
                                  {task.mainOnly && (
                                    <View style={styles.mainOnlyTag}>
                                      <MaterialCommunityIcons name="crown" size={9} color="#FBBF24" />
                                      <Text style={styles.mainOnlyTagText}>MAIN</Text>
                                    </View>
                                  )}
                                </View>
                                <View style={styles.taskSubRow}>
                                  <Text style={styles.taskCellMax} numberOfLines={1}>
                                    Max {task.maxCount}x{task.description ? ` • ${task.description}` : ''}
                                  </Text>
                                  <View style={styles.taskActionBtns}>
                                    <TouchableOpacity
                                      onPress={() => handleOpenEditTask(task)}
                                      style={styles.editTaskBtn}
                                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                    >
                                      <MaterialCommunityIcons name="pencil-outline" size={11} color="#38BDF8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => handleDeleteTaskPrompt(task)}
                                      style={styles.deleteTaskBtn}
                                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                                    >
                                      <MaterialCommunityIcons name="trash-can-outline" size={11} color="#EF4444" />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Character Cells */}
                          {characters.map((char) => {
                            const isMain = char.isMain || false;
                            if (task.mainOnly && !isMain) {
                              return (
                                <View key={char.id} style={[styles.tableCell, styles.tableCellDisabled]}>
                                  <MaterialCommunityIcons name="lock-outline" size={13} color="#475569" />
                                  <Text style={styles.cellDisabledText}>MAIN ONLY</Text>
                                </View>
                              );
                            }
                            const count = char.taskProgress?.[task.id] || 0;
                            const isDone = count >= task.maxCount;
                            const isPartial = count > 0 && !isDone;
                            return (
                              <TouchableOpacity
                                key={char.id}
                                style={[styles.tableCell, isDone && styles.tableCellDoneWeekly, isPartial && styles.tableCellPartialWeekly]}
                                onPress={() => handleCellClick(char.id, task)}
                                onLongPress={() => handleCellDecrease(char.id, task)}
                                {...(Platform.OS === 'web' ? {
                                  onContextMenu: (e: any) => { e.preventDefault(); handleCellDecrease(char.id, task); },
                                } : {})}
                                activeOpacity={0.7}
                              >
                                {task.maxCount === 1 ? (
                                  <View style={[styles.checkboxBox, isDone && styles.checkboxBoxDoneWeekly]}>
                                    {isDone && <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />}
                                  </View>
                                ) : (
                                  <View style={[styles.counterBox, isDone && styles.counterBoxDoneWeekly, isPartial && styles.counterBoxPartialWeekly]}>
                                    <Text style={[styles.counterBoxText, isDone && styles.counterBoxTextDone]}>
                                      {count} / {task.maxCount}
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </DraggableTaskRow>
                  ))}

                </>
              )}
            </View>
          </ScrollView>
        </View>
      ) : (
        /* ─── View 2: Character Cards View ──────────────────── */
        <View style={styles.cardsGrid}>
          {characters.map((char) => {
            const isMain = char.isMain || false;
            const charColor = classColors[char.classType] || '#6366F1';

            return (
              <View
                key={char.id}
                style={[styles.charCardView, isMain && styles.charCardViewMain]}
              >
                {/* Header */}
                <View style={styles.charCardHeader}>
                  <View style={styles.charCardHeaderLeft}>
                    <View
                      style={[styles.charCardClassDot, { backgroundColor: charColor }]}
                    />
                    <View>
                      <View style={styles.nameAndMainRow}>
                        <Text style={styles.charCardName}>{char.name}</Text>
                        {isMain && (
                          <View style={styles.mainTagBadgeSmall}>
                            <MaterialCommunityIcons
                              name="crown"
                              size={10}
                              color="#FBBF24"
                            />
                            <Text style={styles.mainTagTextSmall}>MAIN</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.charCardClass, { color: charColor }]}>
                        {char.classType} • GS {char.gs.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.openDetailBtn}
                    onPress={() => onSelectCharacter(char)}
                  >
                    <MaterialCommunityIcons
                      name="open-in-new"
                      size={15}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>

                {/* Dailies */}
                <View style={styles.cardSection}>
                  <Text style={styles.cardSectionTitle}>DAILY TASKS</Text>
                  {dailyCharTasks
                    .filter((task) => !task.mainOnly || isMain)
                    .map((task) => {
                    const count = char.taskProgress?.[task.id] || 0;
                    const isDone = count >= task.maxCount;

                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={[
                          styles.cardTaskRow,
                          isDone && styles.cardTaskRowDone,
                        ]}
                        onPress={() => handleCellClick(char.id, task)}
                        onLongPress={() => handleCellDecrease(char.id, task)}
                        {...(Platform.OS === 'web' ? {
                          onContextMenu: (e: any) => { e.preventDefault(); handleCellDecrease(char.id, task); },
                        } : {})}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.cardTaskTitle,
                            isDone && styles.cardTaskTitleDone,
                          ]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        <View
                          style={[
                            styles.cardTaskBadge,
                            isDone && styles.cardTaskBadgeDone,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardTaskBadgeText,
                              isDone && styles.cardTaskBadgeTextDone,
                            ]}
                          >
                            {count}/{task.maxCount}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Weeklies */}
                <View style={styles.cardSection}>
                  <Text style={[styles.cardSectionTitle, { color: '#A78BFA' }]}>
                    WEEKLY TASKS
                  </Text>
                  {weeklyCharTasks
                    .filter((task) => !task.mainOnly || isMain)
                    .map((task) => {
                    const count = char.taskProgress?.[task.id] || 0;
                    const isDone = count >= task.maxCount;

                    return (
                      <TouchableOpacity
                        key={task.id}
                        style={[
                          styles.cardTaskRow,
                          isDone && styles.cardTaskRowDoneWeekly,
                        ]}
                        onPress={() => handleCellClick(char.id, task)}
                        onLongPress={() => handleCellDecrease(char.id, task)}
                        {...(Platform.OS === 'web' ? {
                          onContextMenu: (e: any) => { e.preventDefault(); handleCellDecrease(char.id, task); },
                        } : {})}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.cardTaskTitle,
                            isDone && styles.cardTaskTitleDone,
                          ]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        <View
                          style={[
                            styles.cardTaskBadge,
                            isDone && styles.cardTaskBadgeDoneWeekly,
                          ]}
                        >
                          <Text
                            style={[
                              styles.cardTaskBadgeText,
                              isDone && styles.cardTaskBadgeTextDone,
                            ]}
                          >
                            {count}/{task.maxCount}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}
        </Animated.View>
      </Animated.View>

      {/* Add / Edit Task Modal */}
      <TaskModal
        visible={isTaskModalVisible}
        onClose={() => {
          setIsTaskModalVisible(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTaskModal}
        initialTask={editingTask}
      />

      {/* ─── Delete Confirmation Modal ────────────────────────── */}
      <Modal
        visible={deleteConfirmTask !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmTask(null)}
      >
        <View style={styles.deleteModalOverlay}>
          <Animated.View style={styles.deleteModalCard}>
            {/* Header */}
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteModalIconWrap}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deleteModalTitle}>DELETE TASK</Text>
                <Text style={styles.deleteModalSubtitle}>This action cannot be undone</Text>
              </View>
              <TouchableOpacity
                onPress={() => setDeleteConfirmTask(null)}
                style={styles.deleteModalClose}
              >
                <MaterialCommunityIcons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.deleteModalDivider} />

            {/* Body */}
            <View style={styles.deleteModalBody}>
              <View style={styles.deleteTaskPreview}>
                <View style={styles.deleteTaskPreviewIcon}>
                  <MaterialCommunityIcons
                    name={(deleteConfirmTask?.icon || 'star') as any}
                    size={18}
                    color={deleteConfirmTask?.category === 'weekly' ? '#A78BFA' : '#FBBF24'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deleteTaskPreviewTitle} numberOfLines={1}>
                    {deleteConfirmTask?.title}
                  </Text>
                  <View style={styles.deleteTaskPreviewMeta}>
                    <Text style={[
                      styles.deleteTaskPreviewPill,
                      deleteConfirmTask?.category === 'weekly'
                        ? styles.deleteTaskPillWeekly
                        : styles.deleteTaskPillDaily,
                    ]}>
                      {deleteConfirmTask?.category?.toUpperCase()}
                    </Text>
                    <Text style={styles.deleteTaskPreviewPillScope}>
                      {deleteConfirmTask?.scope === 'account' ? 'ACCOUNT' : 'CHARACTER'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to permanently delete this task? All progress data associated with it will also be removed.
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setDeleteConfirmTask(null)}
              >
                <MaterialCommunityIcons name="close" size={15} color="#94A3B8" />
                <Text style={styles.deleteModalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmBtn}
                onPress={() => {
                  if (deleteConfirmTask) {
                    onDeleteTask(deleteConfirmTask.id);
                    setDeleteConfirmTask(null);
                  }
                }}
              >
                <MaterialCommunityIcons name="trash-can" size={15} color="#FFFFFF" />
                <Text style={styles.deleteModalConfirmText}>DELETE</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A10',
    position: 'relative',
  },
  containerInner: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  ambientGlow1: {
    position: 'absolute',
    top: 0,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#F59E0B',
    opacity: 0.07,
    ...Platform.select({
      web: {
        filter: 'blur(120px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
  ambientGlow2: {
    position: 'absolute',
    bottom: 0,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#8B5CF6',
    opacity: 0.07,
    ...Platform.select({
      web: {
        filter: 'blur(120px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
  topAppHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1E293B80',
    borderWidth: 1.5,
    borderColor: '#33415550',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  logoTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  logoSubtitle: {
    color: '#4F46E5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -2,
  },
  headerNavTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 3,
    gap: 4,
  },
  headerNavTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
    gap: 6,
  },
  headerNavTabActive: {
    backgroundColor: '#6366F125',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  headerNavTabActiveTasks: {
    backgroundColor: '#FBBF2415',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  headerNavTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerNavTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101B2B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  profileBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F120',
    borderWidth: 1,
    borderColor: '#6366F140',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#818CF8',
    letterSpacing: 0.8,
  },
  subTitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  addTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resetDailyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF2415',
    borderWidth: 1,
    borderColor: '#FBBF2440',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  resetDailyBtnText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resetWeeklyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A78BFA15',
    borderWidth: 1,
    borderColor: '#A78BFA40',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  resetWeeklyBtnText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  metricStrip: {
    height: 3,
    width: '100%',
  },
  metricContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  metricIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTexts: {
    flex: 1,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricRatio: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#6366F125',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  filterTabActiveDaily: {
    backgroundColor: '#FBBF2420',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  filterTabActiveWeekly: {
    backgroundColor: '#A78BFA20',
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  viewModeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 7,
    gap: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#6366F125',
  },
  viewModeBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  viewModeBtnTextActive: {
    color: '#6366F1',
  },
  // ─── Account Tasks ──────────────────────────────────────────
  accountCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 20,
  },
  accountHeader: {
    marginBottom: 12,
  },
  accountHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#38BDF815',
    borderWidth: 1,
    borderColor: '#38BDF830',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  accountSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  accountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  accountTaskItem: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#1E293B50',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountTaskItemDone: {
    backgroundColor: '#10B98115',
    borderColor: '#10B98150',
  },
  accountTaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  taskIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTaskInfo: {
    flex: 1,
  },
  accountTaskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountTaskTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  accountTaskTitleDone: {
    color: '#10B981',
    textDecorationLine: 'line-through',
  },
  categoryPill: {
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  categoryPillDaily: {
    backgroundColor: '#FBBF2420',
    color: '#FBBF24',
  },
  categoryPillWeekly: {
    backgroundColor: '#A78BFA20',
    color: '#A78BFA',
  },
  accountTaskDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  statusBox: {
    width: 32,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusBoxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusBoxCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  // ─── Matrix Table Styles ───────────────────────────────────
  matrixContainer: {
    backgroundColor: '#0A0E1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    marginBottom: 40,
    width: '100%',
  },
  tableScroll: {
    width: '100%',
  },
  tableScrollContent: {
    minWidth: '100%',
    width: '100%',
    flexGrow: 1,
  },
  table: {
    width: '100%',
    minWidth: '100%',
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#0D1527',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    minWidth: '100%',
    width: '100%',
  },
  tableCornerCell: {
    width: 320,
    minWidth: 280,
    flex: 2.2,
    flexShrink: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    backgroundColor: '#0D1527',
  },
  cornerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cornerLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.8,
  },
  cornerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  cornerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  cornerSubLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  charColumnHeader: {
    minWidth: 90,
    flex: 1,
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D1527',
  },
  charColumnHeaderMain: {
    backgroundColor: '#F59E0B12',
    borderColor: '#F59E0B40',
  },
  charHeaderTop: {
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  mainTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B25',
    borderWidth: 1,
    borderColor: '#F59E0B60',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    gap: 2,
  },
  mainTagText: {
    color: '#FBBF24',
    fontSize: 8,
    fontWeight: '900',
  },
  setMainBtn: {
    padding: 2,
  },
  charNameTouch: {
    alignItems: 'center',
  },
  charColName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
  },
  charColNameMain: {
    color: '#FBBF24',
  },
  charMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  classDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  charColClass: {
    fontSize: 9,
    fontWeight: '700',
  },
  charColGs: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  charProgressBox: {
    width: '90%',
    marginTop: 6,
  },
  charProgressBar: {
    height: 3,
    backgroundColor: '#1E293B',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  charProgressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  charProgressText: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B12',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B30',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '100%',
    width: '100%',
  },
  sectionHeaderRowWeekly: {
    backgroundColor: '#8B5CF612',
    borderLeftColor: '#8B5CF6',
    borderBottomColor: '#8B5CF630',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionTaskCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  sectionTaskCountText: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionHeaderHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B60',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#33415550',
  },
  sectionHeaderHintText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    minWidth: '100%',
    width: '100%',
    height: 60,
    minHeight: 60,
  },
  taskCell: {
    width: 320,
    minWidth: 280,
    flex: 2.2,
    flexShrink: 0,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    justifyContent: 'center',
    backgroundColor: '#0A0F1D',
  },
  taskCellContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskCellIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F59E0B18',
    borderWidth: 1,
    borderColor: '#F59E0B35',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskCellTexts: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  taskCellTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.2,
  },
  taskSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    gap: 6,
  },
  taskCellMax: {
    color: '#64748B',
    fontSize: 10,
    flex: 1,
    fontWeight: '500',
  },
  taskActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editTaskBtn: {
    padding: 4,
    borderRadius: 5,
    backgroundColor: '#38BDF815',
    borderWidth: 1,
    borderColor: '#38BDF830',
  },
  deleteTaskBtn: {
    padding: 4,
    borderRadius: 5,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  mainOnlyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    borderWidth: 1,
    borderColor: '#F59E0B60',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    gap: 3,
  },
  mainOnlyTagText: {
    color: '#FBBF24',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  accountTaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  tableCell: {
    minWidth: 90,
    flex: 1,
    flexShrink: 0,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080C16',
  },
  tableCellDisabled: {
    backgroundColor: '#060810',
    opacity: 0.65,
  },
  cellDisabledText: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  tableCellDone: {
    backgroundColor: '#10B98112',
  },
  tableCellPartial: {
    backgroundColor: '#F59E0B0A',
  },
  tableCellDoneWeekly: {
    backgroundColor: '#8B5CF612',
  },
  tableCellPartialWeekly: {
    backgroundColor: '#8B5CF608',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxBoxDoneWeekly: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  counterBox: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#24334E',
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBoxDone: {
    backgroundColor: '#10B98125',
    borderColor: '#10B98180',
  },
  counterBoxPartial: {
    backgroundColor: '#F59E0B20',
    borderColor: '#F59E0B70',
  },
  counterBoxDoneWeekly: {
    backgroundColor: '#8B5CF625',
    borderColor: '#8B5CF680',
  },
  counterBoxPartialWeekly: {
    backgroundColor: '#8B5CF618',
    borderColor: '#8B5CF660',
  },
  counterBoxText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  counterBoxTextDone: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  // ─── Card View Styles ──────────────────────────────────────
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 40,
  },
  charCardView: {
    flex: 1,
    minWidth: 220,
    maxWidth: 280,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
  },
  charCardViewMain: {
    borderColor: '#FBBF2460',
    backgroundColor: '#121A2F',
  },
  charCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 10,
    marginBottom: 10,
  },
  charCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  charCardClassDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nameAndMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  charCardName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  mainTagBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF2420',
    borderWidth: 1,
    borderColor: '#FBBF2450',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    gap: 2,
  },
  mainTagTextSmall: {
    color: '#FBBF24',
    fontSize: 8,
    fontWeight: '900',
  },
  charCardClass: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  openDetailBtn: {
    padding: 4,
  },
  cardSection: {
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardTaskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B40',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  cardTaskRowDone: {
    backgroundColor: '#10B98115',
    borderColor: '#10B98150',
  },
  cardTaskRowDoneWeekly: {
    backgroundColor: '#A78BFA15',
    borderColor: '#A78BFA50',
  },
  cardTaskTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  cardTaskTitleDone: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cardTaskBadge: {
    backgroundColor: '#1E293B',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cardTaskBadgeDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  cardTaskBadgeDoneWeekly: {
    backgroundColor: '#A78BFA',
    borderColor: '#A78BFA',
  },
  cardTaskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  cardTaskBadgeTextDone: {
    color: '#FFFFFF',
  },
  // ─── Delete Confirmation Modal ─────────────────────────────
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EF444430',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 24px 64px rgba(239, 68, 68, 0.15), 0 8px 24px rgba(0,0,0,0.5)',
      } as any,
    }),
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  deleteModalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  deleteModalSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  deleteModalClose: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalDivider: {
    height: 1,
    backgroundColor: '#1E293B',
  },
  deleteModalBody: {
    padding: 16,
    gap: 14,
  },
  deleteTaskPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B50',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
  },
  deleteTaskPreviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#FBBF2415',
    borderWidth: 1,
    borderColor: '#FBBF2430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTaskPreviewTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteTaskPreviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  deleteTaskPreviewPill: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  deleteTaskPillDaily: {
    backgroundColor: '#FBBF2420',
    color: '#FBBF24',
  },
  deleteTaskPillWeekly: {
    backgroundColor: '#A78BFA20',
    color: '#A78BFA',
  },
  deleteTaskPreviewPillScope: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  deleteModalMessage: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 0,
  },
  deleteModalCancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 11,
    borderRadius: 10,
  },
  deleteModalCancelText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  deleteModalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    paddingVertical: 11,
    borderRadius: 10,
  },
  deleteModalConfirmText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  // ─── Server Time & Reset Countdown Styles ─────────────────
  serverTimeBanner: {
    backgroundColor: '#0B1120',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginTop: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  serverTimeLeft: {
    minWidth: 220,
    flex: 1,
  },
  serverClockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  serverClockLabel: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  serverClockTime: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  serverClockSub: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  resetTimersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  resetTimerBox: {
    backgroundColor: '#1E293B50',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FBBF2430',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 175,
  },
  resetTimerBoxWeekly: {
    borderColor: '#A78BFA30',
  },
  resetTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  resetTimerTitle: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    flex: 1,
  },
  resetTimerSchedule: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '700',
  },
  resetTimerCountdown: {
    color: '#FEF08A',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  resetTimerFootnote: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default TasksScreen;
