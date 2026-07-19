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

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {/* Top Row: Class & Name & Priority */}
      <View style={styles.topRow}>
        <View style={styles.classBadgeContainer}>
          <View style={[styles.classIconWrapper, { backgroundColor: `${meta.color}15` }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={18} color={meta.color} />
          </View>
          <Text style={styles.characterName}>{name}</Text>
          <Text style={[styles.classText, { color: meta.color }]}>{classType}</Text>
        </View>
        
        <View style={[styles.priorityBadge, { backgroundColor: pColor.bg }]}>
          <Text style={[styles.priorityText, { color: pColor.text }]}>{priority}</Text>
        </View>
      </View>

      {/* Main Stats Row */}
      <View style={styles.statsRow}>
        {/* GS Stat */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>GEAR SCORE</Text>
          <View style={styles.gsValueContainer}>
            <MaterialCommunityIcons name="trophy-outline" size={16} color="#FBBF24" style={styles.statIcon} />
            <Text style={styles.gsValue}>{gs.toLocaleString()}</Text>
          </View>
        </View>

        {/* Deus Stat */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>DEUS</Text>
          <View style={styles.statValueContainer}>
            <MaterialCommunityIcons name="chevron-double-up" size={14} color="#A78BFA" style={styles.statIcon} />
            <Text style={styles.statValue}>{deus}</Text>
          </View>
        </View>

        {/* Arkanis Stat */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>ARKANIS</Text>
          <View style={styles.statValueContainer}>
            <MaterialCommunityIcons name="shield-star-outline" size={14} color="#60A5FA" style={styles.statIcon} />
            <Text style={styles.statValue}>{arkanis}</Text>
          </View>
        </View>
      </View>

      {/* Targets Info Row */}
      <View style={styles.targetsRow}>
        <View style={styles.targetInfo}>
          <Text style={styles.targetLabel}>Gear Target: <Text style={styles.targetValue}>{gearTarget}</Text></Text>
          <Text style={styles.missingCount}>Missing: {character.missingGearCount}</Text>
        </View>
        <View style={styles.targetInfo}>
          <Text style={styles.targetLabel}>Accessory Drop: <Text style={styles.targetValue}>{accessoryTarget}</Text></Text>
          <Text style={styles.missingCount}>Missing: {character.missingAccessoryCount}</Text>
        </View>
      </View>

      {/* Progress Section */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Gear Collection Progress</Text>
          <Text style={styles.progressText}>{checkedItems}/{totalItems} ({progressPercent}%)</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: meta.color }]} />
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E2330', // Sleek dark card
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#2D3548',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
    borderColor: '#4A5568',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  classBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  characterName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  classText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#131822',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gsValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  statIcon: {
    marginRight: 4,
  },
  targetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A324630',
    paddingBottom: 8,
  },
  targetInfo: {
    width: '48%',
  },
  targetLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  targetValue: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  missingCount: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  progressContainer: {
    width: '100%',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
export default CharacterCard;
