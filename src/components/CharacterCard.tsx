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
      style={({ pressed, hovered }: any) => [
        styles.card,
        {
          borderColor: meta.color + (hovered || pressed ? '90' : '45'),
          backgroundColor: hovered || pressed ? '#141A29' : '#0F1320',
          shadowColor: meta.color,
          shadowOpacity: hovered || pressed ? 0.25 : 0.08,
          shadowRadius: hovered || pressed ? 12 : 6,
        },
      ]}
    >
      {/* Dynamic top color strip matching class */}
      <View style={[styles.topColorStrip, { backgroundColor: meta.color }]} />

      {/* Priority Tag absolute at top-right */}
      <View style={[styles.priorityTag, { backgroundColor: pColor.bg }]}>
        <Text style={[styles.priorityTagText, { color: pColor.text }]}>{priority}</Text>
      </View>

      {/* Class Seal Avatar */}
      <View style={styles.headerSection}>
        <View style={[styles.avatarCircle, { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}30` }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <Text numberOfLines={1} style={styles.characterName}>{name}</Text>
        <Text style={[styles.classLabelText, { color: meta.color }]}>{classType}</Text>
      </View>

      {/* Prominent Gear Score / iLvl Badge */}
      <View style={[styles.gsHighlightBox, { borderColor: `${meta.color}25`, backgroundColor: `${meta.color}08` }]}>
        <Text style={styles.gsLabel}>GEAR SCORE</Text>
        <View style={styles.gsValueRow}>
          <MaterialCommunityIcons name="trophy" size={14} color="#FBBF24" />
          <Text style={styles.gsNumber}>{gs.toLocaleString()}</Text>
        </View>
        <View style={styles.subStatsRow}>
          <Text style={styles.subStatText}>Deus: <Text style={styles.subStatVal}>D{deus}</Text></Text>
          <Text style={styles.subStatDivider}>|</Text>
          <Text style={styles.subStatText}>Ark: <Text style={styles.subStatVal}>A{arkanis}</Text></Text>
        </View>
      </View>

      {/* Dedicated Progress Bar Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressSectionLabel}>COLLECTED</Text>
          <Text style={[styles.progressPercentText, { color: meta.color }]}>
            {checkedItems}/{totalItems} ({progressPercent}%)
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: meta.color }]} />
        </View>
      </View>

      {/* Target Progress Rows */}
      <View style={styles.targetsContainer}>
        <View style={styles.targetRow}>
          <MaterialCommunityIcons name="shield-outline" size={11} color="#475569" />
          <Text numberOfLines={1} style={styles.targetNameText}>
            {gearTarget}:{' '}
            {isGearCompleted ? (
              <Text style={styles.completedText}>✓</Text>
            ) : (
              <Text style={styles.missingText}>{character.missingGearCount} left</Text>
            )}
          </Text>
        </View>
        <View style={styles.targetRow}>
          <MaterialCommunityIcons name="ring" size={11} color="#475569" />
          <Text numberOfLines={1} style={styles.targetNameText}>
            {accessoryTarget}:{' '}
            {isAccCompleted ? (
              <Text style={styles.completedText}>✓</Text>
            ) : (
              <Text style={styles.missingText}>{character.missingAccessoryCount} left</Text>
            )}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  topColorStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4.5,
    zIndex: 5,
  },
  card: {
    width: Platform.OS === 'web' ? 170 : '48%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 220, // Taller for more info
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color, box-shadow',
        transitionDuration: '0.15s',
        transitionTimingFunction: 'ease-out',
      } as any,
    }),
  },
  cardPressed: {
    opacity: 0.85,
  },
  priorityTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  priorityTagText: {
    fontSize: 7.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  characterName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    width: '85%',
  },
  classLabelText: {
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  gsHighlightBox: {
    backgroundColor: '#161C2C80',
    borderWidth: 1,
    borderColor: '#242F4740',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  gsLabel: {
    color: '#475569',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gsNumber: {
    color: '#FBBF24', // beautiful golden color
    fontSize: 16,
    fontWeight: '900',
  },
  subStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  subStatText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  subStatVal: {
    color: '#CBD5E1',
    fontWeight: '800',
  },
  subStatDivider: {
    color: '#242F47',
    fontSize: 9,
  },
  progressSection: {
    marginBottom: 10,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressSectionLabel: {
    color: '#475569',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  progressPercentText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#1E293B',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  targetsContainer: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#242F4730',
    paddingTop: 8,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  targetNameText: {
    color: '#94A3B8',
    fontSize: 9.5,
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
});

export default CharacterCard;
