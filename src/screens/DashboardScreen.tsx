import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
  ScrollView,
  Animated,
  PanResponder,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character, PriorityLevel } from '../types/character';
import CharacterCard from '../components/CharacterCard';
import ModalForm from '../components/ModalForm';

interface DashboardScreenProps {
  characters: Character[];
  onSelectCharacter: (character: Character) => void;
  onAddCharacter: (characterData: Omit<Character, 'id' | 'checklist'>) => void;
  onLogout: () => void;
  currentUser: string;
}

interface ExpeditionItem {
  dungeonName: string;
  type: 'Gear' | 'Accessory';
  tier: number;
  characters: {
    character: Character;
    missingCount: number;
  }[];
}

const dungeonTierList: Record<string, number> = {
  'Draupnir': 1,
  'Krao Cave': 1,
  'Urugugu Canyon': 2,
  'Vakron Sky Island': 2,
  'Fire Temple': 3,
  'Ferocious Horn Den': 3,
  'Dying Dramata\'s Nest': 4,
  'Cradle of Nihility': 4,
};

const dungeonAccentColors: Record<string, { primary: string; secondary: string; border: string }> = {
  'Fire Temple': {
    primary: '#F87171',       // Soft Red
    secondary: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  'Urugugu Canyon': {
    primary: '#FB923C',       // Soft Orange
    secondary: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.35)',
  },
  'Draupnir': {
    primary: '#38BDF8',       // Cyan/Sky Blue
    secondary: 'rgba(56, 189, 248, 0.15)',
    border: 'rgba(56, 189, 248, 0.35)',
  },
  'Krao Cave': {
    primary: '#C084FC',       // Purple/Violet
    secondary: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
  'Vakron Sky Island': {
    primary: '#34D399',       // Emerald Green
    secondary: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  'Ferocious Horn Den': {
    primary: '#F43F5E',       // Rose Red
    secondary: 'rgba(244, 63, 94, 0.15)',
    border: 'rgba(244, 63, 94, 0.35)',
  },
  'Dying Dramata\'s Nest': {
    primary: '#FBBF24',       // Amber Yellow
    secondary: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.35)',
  },
  'Cradle of Nihility': {
    primary: '#F472B6',       // Neon Pink
    secondary: 'rgba(217, 70, 239, 0.15)',
    border: 'rgba(217, 70, 239, 0.35)',
  },
};

const defaultDungeonAccent = {
  primary: '#94A3B8',         // Slate Gray
  secondary: 'rgba(148, 163, 184, 0.15)',
  border: 'rgba(148, 163, 184, 0.35)',
};

const priorityWeight: Record<PriorityLevel, number> = {
  Extreme: 5,
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  characters,
  onSelectCharacter,
  onAddCharacter,
  onLogout,
  currentUser,
}) => {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  // ─── Per-Section Staggered Burst-From-Center Animation ────────────────────
  // Each section has its OWN Animated.Value so it spins independently.
  // All share the same scale/rotate curve, but each has a unique translateY
  // offset that makes it appear to start from the screen center, then fly
  // to its own final position — like cards bursting outward from a single point.
  // Stagger delay: header first, then stats, expedition, charList.
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const expeditionAnim = useRef(new Animated.Value(0)).current;
  const charListAnim = useRef(new Animated.Value(0)).current;

  // Portal Swirl Entrance Animation on Mount (portal ring only)
  const swirlAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    swirlAnim.setValue(0);
    headerAnim.setValue(0);
    statsAnim.setValue(0);
    expeditionAnim.setValue(0);
    charListAnim.setValue(0);

    // Portal ring burst (background visual)
    Animated.timing(swirlAnim, {
      toValue: 1,
      duration: 1400,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();

    // Each section animates with the same curve but staggered start:
    const makeSectionAnim = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 900,                              // longer = spin clearly visible
        delay,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // ease-out: fast start, smooth landing
        useNativeDriver: true,
      });

    Animated.parallel([
      makeSectionAnim(headerAnim, 80),
      makeSectionAnim(statsAnim, 200),
      makeSectionAnim(expeditionAnim, 320),
      makeSectionAnim(charListAnim, 440),
    ]).start();
  }, []);

  // Helper: build per-section entrance style.
  //
  // Transform ORDER matters critically in React Native:
  //   scale first  → shrink the card
  //   rotate next  → tilt it slightly (subtle, not full spin)
  //   translateY LAST → the ALREADY-SCALED+ROTATED card moves from near-center to final position
  //
  // This order makes the card visibly fly in from the center area — you see
  // the card (at 35% size, slightly tilted) swooping in from near the screen
  // center and landing at its final spot while scaling up and un-tilting.
  //
  // translateYFrom (positive = card is ABOVE center → starts shifted DOWN toward center)
  // translateYFrom (negative = card is BELOW center → starts shifted UP toward center)
  const makeSectionStyle = (
    anim: Animated.Value,
    translateYFrom: number,
    translateXFrom: number = 0,
  ) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 1], extrapolate: 'clamp' }),
    transform: [
      // 1) Scale: card starts at 35% — clearly visible so you can watch it fly in
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 1],
          extrapolate: 'clamp',
        }),
      },
      // 2) Full spin -360deg→0: with scale+translateY already in play, this spin
      //    is clearly visible as the card rotates while flying from screen center
      {
        rotate: anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-360deg', '0deg'],
          extrapolate: 'clamp',
        }),
      },
      // 3) Translate LAST — moves card from near screen-center to its final position
      //    Applied after scale/rotate, so the movement path is large and clearly visible
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [translateYFrom, 0],
          extrapolate: 'clamp',
        }),
      },
      {
        translateX: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [translateXFrom, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  });

  // Offsets are distance from each section's natural position to screen center.
  // Larger = more dramatic fly-in motion. Screen center ≈ 350px from top.
  //   header    center ≈ y40   → 350-40  = +310px below  → push DOWN to center
  //   stats     center ≈ y120  → 350-120 = +230px below  → push DOWN to center
  //   expedition center ≈ y300 → 350-300 = +50px  below  → small push
  //   charList  center ≈ y520  → 350-520 = -170px above  → push UP to center
  const headerAnimStyle = makeSectionStyle(headerAnim, 310);
  const statsAnimStyle = makeSectionStyle(statsAnim, 230);
  const expeditionAnimStyle = makeSectionStyle(expeditionAnim, 50);
  const charListAnimStyle = makeSectionStyle(charListAnim, -170);

  // Unused aliases kept for backward compat with any stale JSX references
  const burstOpacity = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const headerOpacity = burstOpacity;
  const statsOpacity = burstOpacity;
  const expeditionOpacity = burstOpacity;
  const charListOpacity = burstOpacity;

  const handleFabPress = () => {
    setIsAddModalVisible(true);
    Animated.sequence([
      Animated.spring(fabScale, {
        toValue: 0.82,
        useNativeDriver: true,
        speed: 50,
        bounciness: 0,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 10,
        bounciness: 18,
      }),
    ]).start();
  };

  const gsScrollViewRef = useRef<ScrollView>(null);
  const gsScrollXRef = useRef(0);
  const kinahScrollViewRef = useRef<ScrollView>(null);
  const kinahScrollXRef = useRef(0);

  const isGsDragging = useRef(false);
  const isKinahDragging = useRef(false);
  const isCharDragging = useRef(false);

  // Instant scroll for dragging gestures
  const scrollToImmediate = (ref: React.RefObject<ScrollView>, x: number) => {
    if (Platform.OS === 'web' && ref.current) {
      const el = (ref.current as any).getScrollableNode
        ? (ref.current as any).getScrollableNode()
        : (ref.current as any);

      if (el && typeof el.scrollLeft === 'number') {
        el.scrollLeft = x;
        return;
      }
    }
    ref.current?.scrollTo({ x, animated: false });
  };

  // Scroll helper - smooth JS animated interpolation for web, native smooth scroll for app
  const smoothScrollTo = (ref: React.RefObject<ScrollView>, targetX: number) => {
    if (Platform.OS === 'web' && ref.current) {
      const el = (ref.current as any).getScrollableNode
        ? (ref.current as any).getScrollableNode()
        : (ref.current as any);

      if (el && typeof el.scrollLeft === 'number') {
        const startX = el.scrollLeft;
        const distance = targetX - startX;
        const startTime = performance.now();
        const duration = 280; // ms duration for smooth gliding

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease Out Cubic formula for smooth deceleration
          const ease = 1 - Math.pow(1 - progress, 3);
          el.scrollLeft = startX + distance * ease;

          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          }
        };
        requestAnimationFrame(animateScroll);
        return;
      }
    }
    ref.current?.scrollTo({ x: targetX, animated: true });
  };

  // GS track animated thumb
  const gsThumbAnim = useRef(new Animated.Value(0)).current;
  const [gsContentWidth, setGsContentWidth] = useState(1);
  const [gsContainerWidth, setGsContainerWidth] = useState(1);
  const gsContentWidthRef = useRef(1);
  const gsContainerWidthRef = useRef(1);
  const gsTrackWidthRef = useRef(0);
  const gsThumbStartRef = useRef(0);

  const getGsThumbMetrics = () => {
    const cw = gsContentWidthRef.current;
    const vw = gsContainerWidthRef.current;
    const tw = gsTrackWidthRef.current || Math.max(100, vw - 80);
    const ratio = Math.min(1, vw / Math.max(1, cw));
    const thumbW = Math.min(60, Math.max(28, ratio * tw));
    const maxThumbX = Math.max(0, tw - thumbW);
    const maxScrollX = Math.max(1, cw - vw);
    return { thumbW, maxThumbX, maxScrollX };
  };

  const gsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        isGsDragging.current = true;
        gsThumbStartRef.current = (gsThumbAnim as any)._value || 0;
      },
      onPanResponderMove: (_, state) => {
        const { maxThumbX, maxScrollX } = getGsThumbMetrics();
        const newThumbX = Math.max(0, Math.min(maxThumbX, gsThumbStartRef.current + state.dx));
        gsThumbAnim.setValue(newThumbX);

        let realMaxScroll = maxScrollX;
        if (Platform.OS === 'web' && gsScrollViewRef.current) {
          const el = (gsScrollViewRef.current as any).getScrollableNode
            ? (gsScrollViewRef.current as any).getScrollableNode()
            : (gsScrollViewRef.current as any);
          if (el && typeof el.scrollWidth === 'number' && typeof el.clientWidth === 'number') {
            const domMax = el.scrollWidth - el.clientWidth;
            if (domMax > 0) realMaxScroll = domMax;
          }
        }

        const newScrollX = maxThumbX > 0 ? (newThumbX / maxThumbX) * realMaxScroll : 0;
        gsScrollXRef.current = newScrollX;
        scrollToImmediate(gsScrollViewRef, newScrollX);
      },
      onPanResponderRelease: () => {
        isGsDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isGsDragging.current = false;
      },
    })
  ).current;

  const handleGsScrollLeft = () => {
    const nextX = Math.max(0, gsScrollXRef.current - 220);
    smoothScrollTo(gsScrollViewRef, nextX);
  };
  const handleGsScrollRight = () => {
    const { maxScrollX } = getGsThumbMetrics();
    const nextX = Math.min(maxScrollX, gsScrollXRef.current + 220);
    smoothScrollTo(gsScrollViewRef, nextX);
  };

  // Kinah track animated thumb
  const kinahThumbAnim = useRef(new Animated.Value(0)).current;
  const [kinahContentWidth, setKinahContentWidth] = useState(1);
  const [kinahContainerWidth, setKinahContainerWidth] = useState(1);
  const kinahContentWidthRef = useRef(1);
  const kinahContainerWidthRef = useRef(1);
  const kinahTrackWidthRef = useRef(0);
  const kinahThumbStartRef = useRef(0);

  const getKinahThumbMetrics = () => {
    const cw = kinahContentWidthRef.current;
    const vw = kinahContainerWidthRef.current;
    const tw = kinahTrackWidthRef.current || Math.max(100, vw - 80);
    const ratio = Math.min(1, vw / Math.max(1, cw));
    const thumbW = Math.min(60, Math.max(28, ratio * tw));
    const maxThumbX = Math.max(0, tw - thumbW);
    const maxScrollX = Math.max(1, cw - vw);
    return { thumbW, maxThumbX, maxScrollX };
  };

  const kinahPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        isKinahDragging.current = true;
        kinahThumbStartRef.current = (kinahThumbAnim as any)._value || 0;
      },
      onPanResponderMove: (_, state) => {
        const { maxThumbX, maxScrollX } = getKinahThumbMetrics();
        const newThumbX = Math.max(0, Math.min(maxThumbX, kinahThumbStartRef.current + state.dx));
        kinahThumbAnim.setValue(newThumbX);

        let realMaxScroll = maxScrollX;
        if (Platform.OS === 'web' && kinahScrollViewRef.current) {
          const el = (kinahScrollViewRef.current as any).getScrollableNode
            ? (kinahScrollViewRef.current as any).getScrollableNode()
            : (kinahScrollViewRef.current as any);
          if (el && typeof el.scrollWidth === 'number' && typeof el.clientWidth === 'number') {
            const domMax = el.scrollWidth - el.clientWidth;
            if (domMax > 0) realMaxScroll = domMax;
          }
        }

        const newScrollX = maxThumbX > 0 ? (newThumbX / maxThumbX) * realMaxScroll : 0;
        kinahScrollXRef.current = newScrollX;
        scrollToImmediate(kinahScrollViewRef, newScrollX);
      },
      onPanResponderRelease: () => {
        isKinahDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isKinahDragging.current = false;
      },
    })
  ).current;

  const handleKinahScrollLeft = () => {
    const nextX = Math.max(0, kinahScrollXRef.current - 220);
    smoothScrollTo(kinahScrollViewRef, nextX);
  };
  const handleKinahScrollRight = () => {
    const { maxScrollX } = getKinahThumbMetrics();
    const nextX = Math.min(maxScrollX, kinahScrollXRef.current + 220);
    smoothScrollTo(kinahScrollViewRef, nextX);
  };

  // Character row track
  const charScrollViewRef = useRef<ScrollView>(null);
  const charScrollXRef = useRef(0);
  const CHAR_CARD_WIDTH = 185;
  const charThumbAnim = useRef(new Animated.Value(0)).current;
  const [charContentWidth, setCharContentWidth] = useState(1);
  const [charContainerWidth, setCharContainerWidth] = useState(1);
  const charContentWidthRef = useRef(1);
  const charContainerWidthRef = useRef(1);
  const charTrackWidthRef = useRef(0);
  const charThumbStartRef = useRef(0);

  const getCharThumbMetrics = () => {
    const cw = charContentWidthRef.current;
    const vw = charContainerWidthRef.current;
    const tw = charTrackWidthRef.current || Math.max(100, vw - 80);
    const ratio = Math.min(1, vw / Math.max(1, cw));
    const thumbW = Math.min(60, Math.max(28, ratio * tw));
    const maxThumbX = Math.max(0, tw - thumbW);
    const maxScrollX = Math.max(1, cw - vw);
    return { thumbW, maxThumbX, maxScrollX };
  };

  const charPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        isCharDragging.current = true;
        charThumbStartRef.current = (charThumbAnim as any)._value || 0;
      },
      onPanResponderMove: (_, state) => {
        const { maxThumbX, maxScrollX } = getCharThumbMetrics();
        const newThumbX = Math.max(0, Math.min(maxThumbX, charThumbStartRef.current + state.dx));
        charThumbAnim.setValue(newThumbX);

        let realMaxScroll = maxScrollX;
        if (Platform.OS === 'web' && charScrollViewRef.current) {
          const el = (charScrollViewRef.current as any).getScrollableNode
            ? (charScrollViewRef.current as any).getScrollableNode()
            : (charScrollViewRef.current as any);
          if (el && typeof el.scrollWidth === 'number' && typeof el.clientWidth === 'number') {
            const domMax = el.scrollWidth - el.clientWidth;
            if (domMax > 0) realMaxScroll = domMax;
          }
        }

        const newScrollX = maxThumbX > 0 ? (newThumbX / maxThumbX) * realMaxScroll : 0;
        charScrollXRef.current = newScrollX;
        scrollToImmediate(charScrollViewRef, newScrollX);
      },
      onPanResponderRelease: () => {
        isCharDragging.current = false;
      },
      onPanResponderTerminate: () => {
        isCharDragging.current = false;
      },
    })
  ).current;

  const handleCharScrollLeft = () => {
    const nextX = Math.max(0, charScrollXRef.current - CHAR_CARD_WIDTH);
    smoothScrollTo(charScrollViewRef, nextX);
  };
  const handleCharScrollRight = (total: number) => {
    const { maxScrollX } = getCharThumbMetrics();
    const nextX = Math.min(maxScrollX, charScrollXRef.current + CHAR_CARD_WIDTH);
    smoothScrollTo(charScrollViewRef, nextX);
  };

  // Filter & Search Logic
  const filteredCharacters = characters;

  // Calculate Aggregates
  const totalCharacters = characters.length;
  const averageGs =
    totalCharacters > 0 ? Math.round(characters.reduce((acc, char) => acc + char.gs, 0) / totalCharacters) : 0;

  // Find character with lowest GS (Priority Character)
  let priorityCharacter: Character | null = null;
  if (totalCharacters > 0) {
    priorityCharacter = characters.reduce((lowest, char) => (char.gs < lowest.gs ? char : lowest), characters[0]);
  }

  // Calculate expedition roadmap
  const getExpeditions = (): ExpeditionItem[] => {
    const map: Record<string, { name: string; type: 'Gear' | 'Accessory'; chars: Record<string, { character: Character; count: number }> }> = {};

    characters.forEach((char) => {
      // Gear target
      if (char.missingGearCount > 0) {
        const key = `${char.gearTarget}-Gear`;
        if (!map[key]) {
          map[key] = { name: char.gearTarget, type: 'Gear', chars: {} };
        }
        map[key].chars[char.id] = { character: char, count: char.missingGearCount };
      }

      // Accessory target
      if (char.missingAccessoryCount > 0) {
        const key = `${char.accessoryTarget}-Accessory`;
        if (!map[key]) {
          map[key] = { name: char.accessoryTarget, type: 'Accessory', chars: {} };
        }
        map[key].chars[char.id] = { character: char, count: char.missingAccessoryCount };
      }
    });

    return Object.values(map).map((item) => {
      const tier = dungeonTierList[item.name] || 99;
      return {
        dungeonName: item.name,
        type: item.type,
        tier: tier,
        characters: Object.values(item.chars).map((c) => ({ character: c.character, missingCount: c.count })),
      };
    });
  };

  const expeditions = getExpeditions();
  const gsExpeditions = expeditions
    .map((exp) => ({
      ...exp,
      characters: [...exp.characters].sort((a, b) => a.character.gs - b.character.gs),
    }))
    .sort((a, b) => a.tier - b.tier);

  const kinahExpeditions = expeditions
    .map((exp) => ({
      ...exp,
      characters: [...exp.characters].sort((a, b) => b.character.gs - a.character.gs),
    }))
    .sort((a, b) => b.tier - a.tier);

  const WrapperView = ScrollView;

  return (
    <WrapperView style={styles.safeArea}>
      {/* Ambient Atmospheric Glows */}
      <View pointerEvents="none" style={styles.ambientGlow1} />
      <View pointerEvents="none" style={styles.ambientGlow2} />
      <View style={styles.container}>
        {/* App Title Header — spins in from above center */}
        <Animated.View style={[styles.appHeader, headerAnimStyle]}>
          <View style={styles.logoContainer}>
            <View style={styles.headerLogoBadge}>
              <MaterialCommunityIcons name="shield-star" size={16} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.logoTitle}>AION II</Text>
              <Text style={styles.logoSubtitle}>CHARACTER TRACKER</Text>
            </View>
          </View>
          <View style={styles.headerRightActions}>
            <View style={styles.profileBadge}>
              <MaterialCommunityIcons name="account" size={12} color="#38BDF8" />
              <Text style={styles.profileBadgeText}>{currentUser}</Text>
            </View>
            {/* Add Character Button in header */}
            <Animated.View style={[styles.headerAddBtn, { transform: [{ scale: fabScale }] }]}>
              <TouchableOpacity
                activeOpacity={1}
                style={styles.headerAddBtnTouchable}
                onPress={handleFabPress}
              >
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={[styles.addCharacterIconBtn, styles.logoutIconBtn]}
              onPress={onLogout}
            >
              <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Aggregates Dashboard Cards — spins in from slightly above center */}
        <Animated.View style={[styles.aggregatesRow, statsAnimStyle]}>
          {/* Card 1: Total Characters */}
          <View style={[styles.aggCard, { borderColor: '#6366F130' }]}>
            <View style={[styles.topColorStrip, { backgroundColor: '#6366F1' }]} />
            <View style={styles.aggCardContent}>
              <View style={[styles.aggIconCircle, { backgroundColor: '#6366F115', borderColor: '#6366F130' }]}>
                <MaterialCommunityIcons name="account-multiple" size={16} color="#6366F1" />
              </View>
              <View style={styles.aggTextColumn}>
                <Text style={styles.aggValue}>{totalCharacters}</Text>
                <Text style={styles.aggLabel}>CHARACTERS</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Average GS */}
          <View style={[styles.aggCard, { borderColor: '#FBBF2430' }]}>
            <View style={[styles.topColorStrip, { backgroundColor: '#FBBF24' }]} />
            <View style={styles.aggCardContent}>
              <View style={[styles.aggIconCircle, { backgroundColor: '#FBBF2415', borderColor: '#FBBF2430' }]}>
                <MaterialCommunityIcons name="trophy" size={15} color="#FBBF24" />
              </View>
              <View style={styles.aggTextColumn}>
                <Text style={[styles.aggValue, { color: '#FBBF24' }]}>{averageGs.toLocaleString()}</Text>
                <Text style={styles.aggLabel}>AVG GS</Text>
              </View>
            </View>
          </View>

          {/* Card 3: Priority Character (Lowest GS) */}
          <View style={[styles.aggCard, { borderColor: '#EF444430' }]}>
            <View style={[styles.topColorStrip, { backgroundColor: '#EF4444' }]} />
            <View style={styles.aggCardContent}>
              <View style={[styles.aggIconCircle, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                <MaterialCommunityIcons name="alert-decagram" size={15} color="#EF4444" />
              </View>
              <View style={styles.aggTextColumn}>
                <Text numberOfLines={1} style={[styles.aggValue, { color: '#F87171', fontSize: 13 }]}>
                  {priorityCharacter ? `${priorityCharacter.name} (${priorityCharacter.gs.toLocaleString()})` : '-'}
                </Text>
                <Text style={styles.aggLabel}>PRIORITY CHAR</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Expedition Priority Road Map — spins in from near center */}
        {expeditions.length > 0 && (
          <Animated.View style={[styles.expeditionPanel, expeditionAnimStyle]}>
            <View style={styles.expeditionHeader}>
              <MaterialCommunityIcons name="sword-cross" size={16} color="#FBBF24" />
              <Text style={styles.expeditionTitle}>EXPEDITION PRIORITY ROADMAP</Text>
            </View>

            <View style={styles.expTitleDivider}>
              <View style={styles.expTitleDividerGlow} />
            </View>

            {/* Row 1: Gear Score Priority */}
            {gsExpeditions.length > 0 && (
              <View style={{ width: '100%' }}>
                <View style={styles.conveyorSubHeader}>
                  <View style={[styles.subHeaderDot, { backgroundColor: '#38BDF8' }]} />
                  <Text style={[styles.subHeaderText, { color: '#38BDF8' }]}>GEAR SCORE</Text>
                  <View style={[styles.subHeaderDot, { backgroundColor: '#38BDF8' }]} />
                </View>

                <View style={styles.conveyorWrapper}>
                  <TouchableOpacity onPress={handleGsScrollLeft} style={styles.conveyorArrowBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={22} color="#38BDF8" />
                  </TouchableOpacity>

                  <ScrollView
                    ref={gsScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    scrollEventThrottle={16}
                    onContentSizeChange={(w) => {
                      gsContentWidthRef.current = w;
                      setGsContentWidth(w);
                    }}
                    onLayout={(e) => {
                      gsContainerWidthRef.current = e.nativeEvent.layout.width;
                      setGsContainerWidth(e.nativeEvent.layout.width);
                    }}
                    onScroll={(e) => {
                      if (isGsDragging.current) return;
                      const x = e.nativeEvent.contentOffset.x;
                      gsScrollXRef.current = x;
                      const nativeMax = e.nativeEvent.contentSize.width - e.nativeEvent.layoutMeasurement.width;
                      const { maxThumbX } = getGsThumbMetrics();
                      const ratio = nativeMax > 0 ? Math.max(0, Math.min(1, x / nativeMax)) : 0;
                      const newThumbX = ratio * maxThumbX;
                      gsThumbAnim.setValue(newThumbX);
                    }}
                    contentContainerStyle={styles.expeditionScrollContainer}
                  >
                    {gsExpeditions.map((exp, index) => {
                      const accent = dungeonAccentColors[exp.dungeonName] || defaultDungeonAccent;
                      return (
                        <React.Fragment key={`${exp.dungeonName}-${exp.type}`}>
                          <View style={[styles.expeditionCard, { borderColor: accent.border }]}>
                            <View style={[styles.expCardTopStrip, { backgroundColor: accent.primary }]} />
                            <View style={[styles.expTypeTag, { backgroundColor: exp.type === 'Gear' ? '#38BDF820' : '#A78BFA20', borderColor: exp.type === 'Gear' ? '#38BDF850' : '#A78BFA50' }]}>
                              <Text style={[styles.expTypeTagText, { color: exp.type === 'Gear' ? '#38BDF8' : '#A78BFA' }]}>{exp.type === 'Accessory' ? 'ACC' : exp.type.toUpperCase()}</Text>
                            </View>
                            <Text numberOfLines={1} style={[styles.expDungeonName, { color: accent.primary }]}>{exp.dungeonName}</Text>
                            <Text style={styles.expTierLabel}>Tier {exp.tier === 99 ? 'Custom' : exp.tier}</Text>
                            <View style={styles.expDivider} />
                            <View style={styles.expCharList}>
                              {exp.characters.map((item, charIdx) => {
                                const badgeColor =
                                  item.character.priority === 'Extreme' ? '#F43F5E' :
                                    item.character.priority === 'Critical' ? '#EF4444' :
                                      item.character.priority === 'High' ? '#F97316' :
                                        item.character.priority === 'Medium' ? '#EAB308' : '#3B82F6';
                                return (
                                  <View key={item.character.id} style={styles.expCharRow}>
                                    <View style={styles.expCharInfo}>
                                      <Text style={styles.expCharIndex}>{charIdx + 1}.</Text>
                                      <Text numberOfLines={1} style={styles.expCharName}>{item.character.name}</Text>
                                      <Text style={styles.expCharGs}>({item.character.gs})</Text>
                                    </View>
                                    <View style={[styles.expPriorityBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '50' }]}>
                                      <Text style={[styles.expPriorityText, { color: badgeColor }]}>{item.missingCount}</Text>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                          {index < gsExpeditions.length - 1 && (
                            <View style={styles.conveyorSeparator}>
                              <View style={styles.separatorTrackLineLeft} />
                              <View style={styles.separatorCircle}>
                                <MaterialCommunityIcons name="chevron-double-right" size={13} color="#38BDF8" />
                              </View>
                              <View style={styles.separatorTrackLineRight} />
                            </View>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity onPress={handleGsScrollRight} style={styles.conveyorArrowBtn}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#38BDF8" />
                  </TouchableOpacity>
                </View>
                {/* GS progress track */}
                {gsContentWidth > gsContainerWidth && (
                  <View
                    style={styles.conveyorTrackWrapper}
                    onLayout={(e) => { gsTrackWidthRef.current = e.nativeEvent.layout.width; }}
                  >
                    <View style={styles.conveyorTrackBg} />
                    <Animated.View
                      {...gsPanResponder.panHandlers}
                      style={[
                        styles.conveyorTrackThumb,
                        {
                          width: getGsThumbMetrics().thumbW,
                          backgroundColor: '#38BDF8',
                          transform: [{ translateX: gsThumbAnim }],
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Row Divider if both present */}
            {gsExpeditions.length > 0 && kinahExpeditions.length > 0 && (
              <View style={styles.conveyorRowDivider} />
            )}

            {/* Row 2: Kinah Farming Priority */}
            {kinahExpeditions.length > 0 && (
              <View style={{ width: '100%' }}>
                <View style={styles.conveyorSubHeader}>
                  <View style={[styles.subHeaderDot, { backgroundColor: '#FBBF24' }]} />
                  <Text style={[styles.subHeaderText, { color: '#FBBF24' }]}>KINAH</Text>
                  <View style={[styles.subHeaderDot, { backgroundColor: '#FBBF24' }]} />
                </View>

                <View style={styles.conveyorWrapper}>
                  <TouchableOpacity onPress={handleKinahScrollLeft} style={styles.conveyorArrowBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={22} color="#FBBF24" />
                  </TouchableOpacity>

                  <ScrollView
                    ref={kinahScrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    scrollEventThrottle={16}
                    onContentSizeChange={(w) => {
                      kinahContentWidthRef.current = w;
                      setKinahContentWidth(w);
                    }}
                    onLayout={(e) => {
                      kinahContainerWidthRef.current = e.nativeEvent.layout.width;
                      setKinahContainerWidth(e.nativeEvent.layout.width);
                    }}
                    onScroll={(e) => {
                      if (isKinahDragging.current) return;
                      const x = e.nativeEvent.contentOffset.x;
                      kinahScrollXRef.current = x;
                      const nativeMax = e.nativeEvent.contentSize.width - e.nativeEvent.layoutMeasurement.width;
                      const { maxThumbX } = getKinahThumbMetrics();
                      const ratio = nativeMax > 0 ? Math.max(0, Math.min(1, x / nativeMax)) : 0;
                      const newThumbX = ratio * maxThumbX;
                      kinahThumbAnim.setValue(newThumbX);
                    }}
                    contentContainerStyle={styles.expeditionScrollContainer}
                  >
                    {kinahExpeditions.map((exp, index) => {
                      const accent = dungeonAccentColors[exp.dungeonName] || defaultDungeonAccent;
                      return (
                        <React.Fragment key={`${exp.dungeonName}-${exp.type}`}>
                          <View style={[styles.expeditionCard, { borderColor: accent.border }]}>
                            <View style={[styles.expCardTopStrip, { backgroundColor: accent.primary }]} />
                            <View style={[styles.expTypeTag, { backgroundColor: exp.type === 'Gear' ? '#38BDF820' : '#A78BFA20', borderColor: exp.type === 'Gear' ? '#38BDF850' : '#A78BFA50' }]}>
                              <Text style={[styles.expTypeTagText, { color: exp.type === 'Gear' ? '#38BDF8' : '#A78BFA' }]}>{exp.type === 'Accessory' ? 'ACC' : exp.type.toUpperCase()}</Text>
                            </View>
                            <Text numberOfLines={1} style={[styles.expDungeonName, { color: accent.primary }]}>{exp.dungeonName}</Text>
                            <Text style={styles.expTierLabel}>Tier {exp.tier === 99 ? 'Custom' : exp.tier}</Text>
                            <View style={styles.expDivider} />
                            <View style={styles.expCharList}>
                              {exp.characters.map((item, charIdx) => {
                                const badgeColor =
                                  item.character.priority === 'Extreme' ? '#F43F5E' :
                                    item.character.priority === 'Critical' ? '#EF4444' :
                                      item.character.priority === 'High' ? '#F97316' :
                                        item.character.priority === 'Medium' ? '#EAB308' : '#3B82F6';
                                return (
                                  <View key={item.character.id} style={styles.expCharRow}>
                                    <View style={styles.expCharInfo}>
                                      <Text style={styles.expCharIndex}>{charIdx + 1}.</Text>
                                      <Text numberOfLines={1} style={styles.expCharName}>{item.character.name}</Text>
                                      <Text style={styles.expCharGs}>({item.character.gs})</Text>
                                    </View>
                                    <View style={[styles.expPriorityBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '50' }]}>
                                      <Text style={[styles.expPriorityText, { color: badgeColor }]}>{item.missingCount}</Text>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                          {index < kinahExpeditions.length - 1 && (
                            <View style={styles.conveyorSeparator}>
                              <View style={styles.separatorTrackLineLeft} />
                              <View style={styles.separatorCircle}>
                                <MaterialCommunityIcons name="chevron-double-right" size={13} color="#FBBF24" />
                              </View>
                              <View style={styles.separatorTrackLineRight} />
                            </View>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity onPress={handleKinahScrollRight} style={styles.conveyorArrowBtn}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#FBBF24" />
                  </TouchableOpacity>
                </View>
                {/* Kinah progress track */}
                {kinahContentWidth > kinahContainerWidth && (
                  <View
                    style={styles.conveyorTrackWrapper}
                    onLayout={(e) => { kinahTrackWidthRef.current = e.nativeEvent.layout.width; }}
                  >
                    <View style={styles.conveyorTrackBg} />
                    <Animated.View
                      {...kinahPanResponder.panHandlers}
                      style={[
                        styles.conveyorTrackThumb,
                        {
                          width: getKinahThumbMetrics().thumbW,
                          backgroundColor: '#FBBF24',
                          transform: [{ translateX: kinahThumbAnim }],
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}
          </Animated.View>
        )}

        {/* Character List — spins in from below center */}
        <Animated.View style={[{ width: '100%' }, charListAnimStyle]}>
          {filteredCharacters.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={40} color="#475569" />
              <Text style={styles.emptyText}>No characters found</Text>
              <Text style={styles.emptySubtext}>Try tweaking your filter or search query</Text>
            </View>
          ) : (
            <View
              style={styles.listContainer}
              onLayout={(e) => {
                charContainerWidthRef.current = e.nativeEvent.layout.width;
                setCharContainerWidth(e.nativeEvent.layout.width);
              }}
            >
              <ScrollView
                ref={charScrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                contentContainerStyle={styles.horizontalListContainer}
                onContentSizeChange={(w) => {
                  charContentWidthRef.current = w;
                  setCharContentWidth(w);
                }}
                onScroll={(e) => {
                  if (isCharDragging.current) return;
                  const x = e.nativeEvent.contentOffset.x;
                  charScrollXRef.current = x;
                  const nativeMax = e.nativeEvent.contentSize.width - e.nativeEvent.layoutMeasurement.width;
                  const { maxThumbX } = getCharThumbMetrics();
                  const ratio = nativeMax > 0 ? Math.max(0, Math.min(1, x / nativeMax)) : 0;
                  const newThumbX = ratio * maxThumbX;
                  charThumbAnim.setValue(newThumbX);
                }}
                scrollEventThrottle={16}
              >
                {filteredCharacters.map((item) => (
                  <CharacterCard key={item.id} character={item} onPress={() => onSelectCharacter(item)} />
                ))}
              </ScrollView>

              {/* Navigation row with draggable progress track */}
              {filteredCharacters.length > 1 && (
                <View style={styles.charNavRow}>
                  <TouchableOpacity
                    onPress={handleCharScrollLeft}
                    style={styles.charNavBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={18} color="#38BDF8" />
                  </TouchableOpacity>

                  {/* Draggable progress track */}
                  <View
                    style={styles.charTrack}
                    onLayout={(e) => { charTrackWidthRef.current = e.nativeEvent.layout.width; }}
                  >
                    <View style={styles.charTrackBg} />
                    <Animated.View
                      {...charPanResponder.panHandlers}
                      style={[
                        styles.charTrackThumb,
                        {
                          width: getCharThumbMetrics().thumbW,
                          transform: [{ translateX: charThumbAnim }],
                        },
                      ]}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => handleCharScrollRight(filteredCharacters.length)}
                    style={styles.charNavBtn}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#38BDF8" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Footer Watermark */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>AIIA • Aion 2 Assistant.</Text>
            <Text style={styles.footerCopy}>© 2026 ChromeT</Text>
          </View>
        </Animated.View>

        {/* Add Character Modal */}
        <ModalForm
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          onSave={onAddCharacter}
        />
      </View>
    </WrapperView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: '#070A10',
    position: 'relative',
    paddingTop: 0,
  },
  ambientGlow1: {
    position: 'absolute',
    top: -150,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#6366F1',
    opacity: 0.08,
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
    backgroundColor: '#0D9488',
    opacity: 0.08,
    ...Platform.select({
      web: {
        filter: 'blur(120px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
  container: {
    width: '100%',
    maxWidth: 1050,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 12,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
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
    color: '#4F46E5', // vibrant indigo accent
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: -2,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#101B2B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF840',
    gap: 5,
    ...Platform.select({
      web: {
        boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)',
      } as any,
    }),
  },
  profileBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  addCharacterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#161B2C',
    borderWidth: 1.5,
    borderColor: '#2D3548',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease-out',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      } as any,
    }),
  },
  logoutIconBtn: {
    borderColor: '#EF444450',
    backgroundColor: '#2C161B',
    shadowColor: '#EF4444',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aggregatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  aggCard: {
    flex: 1,
    backgroundColor: '#111522', // Match deeper card background
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  topColorStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
    zIndex: 5,
  },
  aggCardContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  aggIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aggTextColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aggLabel: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'center',
  },
  aggValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  missingAggValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  missingSplitText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111522',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E293B80',
    paddingHorizontal: 12,
    marginBottom: 16,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease-in-out',
      } as any,
    }),
  },
  searchBarFocused: {
    borderColor: '#6366F180',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)',
      } as any,
    }),
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 7,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  clearSearchBtn: {
    padding: 3,
  },
  filterWrapper: {
    marginBottom: 8,
  },
  filterTitleLabel: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  filterSlider: {
    gap: 6,
    paddingBottom: 2,
  },
  filterPill: {
    backgroundColor: '#111522',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B80',
    marginRight: 4,
  },
  selectedFilterPill: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F180',
  },
  filterPillText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedFilterPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContainer: {
    paddingBottom: 4,
  },
  horizontalListContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    borderWidth: 2,
    borderColor: '#818CF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      } as any,
    }),
  },
  fabTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  fabInnerRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expeditionPanel: {
    backgroundColor: '#0F1322',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 18,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  expeditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  expTitleDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginVertical: 12,
    position: 'relative',
    alignItems: 'center',
  },
  expTitleDividerGlow: {
    position: 'absolute',
    height: 1.5,
    width: 60,
    backgroundColor: '#FBBF24',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  expeditionTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  expeditionSubtitle: {
    color: '#64748B',
    fontSize: 9.5,
    lineHeight: 14,
    marginBottom: 12,
  },
  conveyorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  conveyorArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
      } as any,
    }),
  },
  expeditionScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  conveyorSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
  },
  conveyorSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  subHeaderDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  subHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  conveyorRowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginVertical: 14,
    width: '100%',
  },
  separatorTrackLineLeft: {
    height: 1.5,
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  separatorTrackLineRight: {
    height: 1.5,
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  separatorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0A0D14',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  expeditionCard: {
    width: 170,
    backgroundColor: '#0E1322',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E293B80',
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  expCardTopStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  expTypeTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  expTypeTagText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  expDungeonName: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    maxWidth: '62%',
  },
  expTierLabel: {
    color: '#475569',
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: 2,
  },
  expDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 8,
  },
  expCharList: {
    gap: 6,
  },
  expCharRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  expCharInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  expCharIndex: {
    color: '#475569',
    fontSize: 9.5,
    fontWeight: '800',
  },
  expCharName: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 75,
  },
  expCharGs: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '600',
  },
  expPriorityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
  },
  expPriorityText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    marginTop: 12,
    paddingBottom: Platform.OS === 'android' ? 36 : 24,
  },
  footerTitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.55,
    textAlign: 'center',
  },
  footerCopy: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 3,
    textAlign: 'center',
    opacity: 0.7,
  },
  headerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4F46E5',
    borderWidth: 1.5,
    borderColor: '#818CF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  headerAddBtnTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  charNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  charNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  charDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  charDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  charDotActive: {
    width: 18,
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  conveyorTrackWrapper: {
    marginTop: 10,
    height: 16,
    borderRadius: 8,
    position: 'relative',
    marginHorizontal: 40,
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer', userSelect: 'none', touchAction: 'none' } as any }),
  },
  conveyorTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    top: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
  },
  conveyorTrackThumb: {
    position: 'absolute',
    top: 3,
    left: 0,
    height: 10,
    borderRadius: 5,
    opacity: 0.95,
    ...Platform.select({ web: { cursor: 'grabbing', userSelect: 'none', touchAction: 'none' } as any }),
  },
  charTrack: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    position: 'relative',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer', userSelect: 'none', touchAction: 'none' } as any }),
  },
  charTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    top: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  charTrackThumb: {
    position: 'absolute',
    top: 3,
    left: 0,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    ...Platform.select({ web: { cursor: 'grabbing', boxShadow: '0 0 8px #38BDF8', userSelect: 'none', touchAction: 'none' } as any }),
  },

});

export default DashboardScreen;
