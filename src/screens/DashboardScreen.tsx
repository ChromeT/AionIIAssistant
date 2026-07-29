import React, { useState, useRef } from 'react';
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

  const handleGsScrollLeft = () => {
    const nextX = Math.max(0, gsScrollXRef.current - 220);
    gsScrollViewRef.current?.scrollTo({ x: nextX, animated: true });
  };
  const handleGsScrollRight = () => {
    const nextX = gsScrollXRef.current + 220;
    gsScrollViewRef.current?.scrollTo({ x: nextX, animated: true });
  };

  const handleKinahScrollLeft = () => {
    const nextX = Math.max(0, kinahScrollXRef.current - 220);
    kinahScrollViewRef.current?.scrollTo({ x: nextX, animated: true });
  };
  const handleKinahScrollRight = () => {
    const nextX = kinahScrollXRef.current + 220;
    kinahScrollViewRef.current?.scrollTo({ x: nextX, animated: true });
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <RNStatusBar barStyle="light-content" backgroundColor="#070A10" />
      {/* Ambient Atmospheric Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      <View style={styles.container}>
        {/* App Title Header */}
        <View style={styles.appHeader}>
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
            <TouchableOpacity
              style={[styles.addCharacterIconBtn, styles.logoutIconBtn]}
              onPress={onLogout}
            >
              <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Aggregates Dashboard Cards */}
        <View style={styles.aggregatesRow}>
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
        </View>



        {/* Expedition Priority Road Map */}
        {expeditions.length > 0 && (
          <View style={styles.expeditionPanel}>
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
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                      gsScrollXRef.current = e.nativeEvent.contentOffset.x;
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
                              <Text style={[styles.expTypeTagText, { color: exp.type === 'Gear' ? '#38BDF8' : '#A78BFA' }]}>{exp.type.toUpperCase()}</Text>
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
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                      kinahScrollXRef.current = e.nativeEvent.contentOffset.x;
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
                              <Text style={[styles.expTypeTagText, { color: exp.type === 'Gear' ? '#38BDF8' : '#A78BFA' }]}>{exp.type.toUpperCase()}</Text>
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
              </View>
            )}
          </View>
        )}

        {/* Character List */}
        {filteredCharacters.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-search-outline" size={40} color="#475569" />
            <Text style={styles.emptyText}>No characters found</Text>
            <Text style={styles.emptySubtext}>Try tweaking your filter or search query</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContainer}
            >
              {filteredCharacters.map((item) => (
                <CharacterCard key={item.id} character={item} onPress={() => onSelectCharacter(item)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Floating Add Button */}
        <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.fabTouchable}
            onPress={handleFabPress}
          >
            <View style={styles.fabInnerRing}>
              <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Add Character Modal */}
        <ModalForm
          visible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          onSave={onAddCharacter}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#070A10', // Deep RPG dark backdrop
    position: 'relative',
    overflow: 'hidden',
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
    bottom: -150,
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
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
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
    paddingBottom: 72,
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
    justifyContent: 'center',
    flexGrow: 1,
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
    width: '70%',
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
});

export default DashboardScreen;
