import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character, CharacterClass, PriorityLevel } from '../types/character';

interface CharacterCardProps {
  character: Character;
  onPress: () => void;
}

// Map Aion Classes to premium icons and thematic colors
const classMeta: Record<CharacterClass, { icon: string; color: string }> = {
  Templar: { icon: 'shield-outline', color: '#38BDF8' }, // Sky Blue for tank
  Gladiator: { icon: 'sword-cross', color: '#F87171' }, // Red for DPS
  Ranger: { icon: 'bow-arrow', color: '#4ADE80' }, // Green for Ranger
  Cleric: { icon: 'shield-plus', color: '#FBBF24' }, // Gold for Healer
  Chanter: { icon: 'star-three-points', color: '#A78BFA' }, // Purple for Support
  Assassin: { icon: 'knife-military', color: '#FB7185' }, // Rose for Rogue
  Sorcerer: { icon: 'auto-fix', color: '#60A5FA' }, // Light Blue for Mage
  Spiritmaster: { icon: 'ghost-outline', color: '#F472B6' }, // Pink for Summoner
};

// Map Priority to vibrant badge colors
const priorityColors: Record<PriorityLevel, { bg: string; text: string }> = {
  Extreme: { bg: '#FFE4E6', text: '#E11D48' },
  Critical: { bg: '#FEE2E2', text: '#DC2626' },
  High: { bg: '#FFEDD5', text: '#EA580C' },
  Medium: { bg: '#FEF9C3', text: '#CA8A04' },
  Low: { bg: '#DBEAFE', text: '#2563EB' },
};

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, onPress }) => {
  const { name, gs, classType, priority, deus, arkanis, checklist, gearTarget, accessoryTarget } = character;

  // Calculate gear completion progress
  const totalItems = Object.keys(checklist).length;
  const checkedItems = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((checkedItems / totalItems) * 100);

  const meta = classMeta[classType] || { icon: 'account-outline', color: '#94A3B8' };
  const pColor = priorityColors[priority] || { bg: '#F1F5F9', text: '#475569' };

  const isGearCompleted = character.missingGearCount === 0;
  const isAccCompleted = character.missingAccessoryCount === 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: `${meta.color}25` },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Priority Tag absolute at top-right */}
      <View style={[styles.priorityTag, { backgroundColor: pColor.bg }]}>
        <Text style={[styles.priorityTagText, { color: pColor.text }]}>{priority}</Text>
      </View>

      {/* Class Seal Avatar & Profile Info */}
      <View style={styles.headerSection}>
        <View style={[styles.avatarCircle, { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}30` }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={18} color={meta.color} />
        </View>
        <Text numberOfLines={1} style={styles.characterName}>{name}</Text>
        <Text style={[styles.classLabelText, { color: meta.color }]}>{classType}</Text>
      </View>

      {/* GS & Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.gsRow}>
          <MaterialCommunityIcons name="trophy" size={11} color="#FBBF24" />
          <Text style={styles.gsValueText}>{gs.toLocaleString()}</Text>
          <Text style={styles.progressPercentText}>({progressPercent}%)</Text>
        </View>
        <View style={styles.subStatsRow}>
          <Text style={styles.subStatText}>Deus: <Text style={styles.subStatVal}>D{deus}</Text></Text>
          <Text style={styles.subStatDivider}>|</Text>
          <Text style={styles.subStatText}>Ark: <Text style={styles.subStatVal}>A{arkanis}</Text></Text>
        </View>
      </View>

      {/* Target Progress Rows */}
      <View style={styles.targetsContainer}>
        <View style={styles.targetRow}>
          <MaterialCommunityIcons name="shield-outline" size={10} color="#64748B" />
          <Text numberOfLines={1} style={styles.targetNameText}>
            {gearTarget}:{' '}
            {isGearCompleted ? (
              <Text style={styles.completedText}>✓</Text>
            ) : (
              <Text style={styles.missingText}>{character.missingGearCount}</Text>
            )}
          </Text>
        </View>
        <View style={styles.targetRow}>
          <MaterialCommunityIcons name="ring" size={10} color="#64748B" />
          <Text numberOfLines={1} style={styles.targetNameText}>
            {accessoryTarget}:{' '}
            {isAccCompleted ? (
              <Text style={styles.completedText}>✓</Text>
            ) : (
              <Text style={styles.missingText}>{character.missingAccessoryCount}</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Thin Bottom Progress Edge */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: meta.color }]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: Platform.OS === 'web' ? 170 : '48%',
    backgroundColor: '#111522',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 145, // Gives a nice square aspect ratio!
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  priorityTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priorityTagText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  characterName: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    width: '90%',
  },
  classLabelText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 1,
  },
  statsContainer: {
    backgroundColor: '#161C2A',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  gsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gsValueText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
  },
  progressPercentText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  subStatText: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '700',
  },
  subStatVal: {
    color: '#94A3B8',
  },
  subStatDivider: {
    color: '#1E293B',
    fontSize: 8,
  },
  targetsContainer: {
    gap: 2,
    paddingHorizontal: 2,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  targetNameText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    flex: 1,
  },
  completedText: {
    color: '#10B981',
    fontWeight: '800',
  },
  missingText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  progressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#1E293B',
  },
  progressBarFill: {
    height: '100%',
  },
});

export default CharacterCard;
