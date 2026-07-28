import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
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
      {/* Top Row: Class & Name & Priority */}
      <View style={styles.topRow}>
        <View style={styles.classBadgeContainer}>
          <View style={[styles.classIconWrapper, { backgroundColor: `${meta.color}15` }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={15} color={meta.color} />
          </View>
          <Text style={styles.characterName}>{name}</Text>
          <Text style={[styles.classText, { color: meta.color }]}>{classType}</Text>
        </View>
        
        <View style={[styles.priorityBadge, { backgroundColor: pColor.bg }]}>
          <Text style={[styles.priorityText, { color: pColor.text }]}>{priority}</Text>
        </View>
      </View>

      {/* Stats and Targets Inline Row */}
      <View style={styles.infoMiddleRow}>
        {/* Inline Stats */}
        <View style={styles.statsInline}>
          <View style={styles.statPill}>
            <MaterialCommunityIcons name="trophy" size={13} color="#FBBF24" />
            <Text style={styles.statValue}>{gs.toLocaleString()}</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.statPill}>
            <MaterialCommunityIcons name="chevron-double-up" size={13} color="#A78BFA" />
            <Text style={styles.statValue}>D{deus}</Text>
          </View>
          <View style={styles.statSeparator} />
          <View style={styles.statPill}>
            <MaterialCommunityIcons name="shield-star-outline" size={13} color="#60A5FA" />
            <Text style={styles.statValue}>A{arkanis}</Text>
          </View>
        </View>

        {/* Completion Progress Text */}
        <Text style={styles.progressMiniText}>
          {checkedItems}/{totalItems} ({progressPercent}%)
        </Text>
      </View>

      {/* Targets Info Inline Row */}
      <View style={styles.targetsInlineRow}>
        <View style={styles.targetItem}>
          <MaterialCommunityIcons name="shield-outline" size={12} color="#64748B" />
          <Text style={styles.targetText}>
            {gearTarget}:{' '}
            {isGearCompleted ? (
              <Text style={styles.completedText}>Completed</Text>
            ) : (
              <Text style={styles.missingText}>{character.missingGearCount} left</Text>
            )}
          </Text>
        </View>
        <Text style={styles.bulletSeparator}>•</Text>
        <View style={styles.targetItem}>
          <MaterialCommunityIcons name="ring" size={12} color="#64748B" />
          <Text style={styles.targetText}>
            {accessoryTarget}:{' '}
            {isAccCompleted ? (
              <Text style={styles.completedText}>Completed</Text>
            ) : (
              <Text style={styles.missingText}>{character.missingAccessoryCount} left</Text>
            )}
          </Text>
        </View>
      </View>

      {/* Slim Flush Bottom Progress Bar */}
      <View style={styles.flushProgressBarBg}>
        <View style={[styles.flushProgressBarFill, { width: `${progressPercent}%`, backgroundColor: meta.color }]} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111522', // Deeper, more elegant charcoal-navy card
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 15, // Extra space at bottom to cover progress bar absolute
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  classBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  characterName: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800',
  },
  classText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
    backgroundColor: '#1E2330',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C2A',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statSeparator: {
    width: 1,
    height: 10,
    backgroundColor: '#2D3548',
  },
  statValue: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  progressMiniText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  targetsInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  targetText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  completedText: {
    color: '#10B981',
    fontWeight: '700',
  },
  missingText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  bulletSeparator: {
    color: '#334155',
    fontSize: 8,
  },
  flushProgressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#1E293B',
  },
  flushProgressBarFill: {
    height: '100%',
  },
});

export default CharacterCard;
