import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character, CharacterClass, GearChecklist, PriorityLevel } from '../types/character';
import CustomCheckbox from '../components/CustomCheckbox';
import ModalForm from '../components/ModalForm';

interface CharacterDetailScreenProps {
  character: Character;
  onBack: () => void;
  onUpdateCharacter: (character: Character) => void;
  onDeleteCharacter: (characterId: string) => void;
}

// Visual mappings
const classMeta: Record<CharacterClass, { icon: string; color: string }> = {
  Templar: { icon: 'shield-outline', color: '#38BDF8' },
  Gladiator: { icon: 'sword-cross', color: '#F87171' },
  Ranger: { icon: 'bow-arrow', color: '#4ADE80' },
  Cleric: { icon: 'shield-plus', color: '#FBBF24' },
  Chanter: { icon: 'star-three-points', color: '#A78BFA' },
  Assassin: { icon: 'knife-military', color: '#FB7185' },
  Sorcerer: { icon: 'auto-fix', color: '#60A5FA' },
  Spiritmaster: { icon: 'ghost-outline', color: '#F472B6' },
};

const priorityColors: Record<PriorityLevel, { bg: string; text: string }> = {
  Extreme: { bg: '#FFE4E6', text: '#E11D48' },
  Critical: { bg: '#FEE2E2', text: '#DC2626' },
  High: { bg: '#FFEDD5', text: '#EA580C' },
  Medium: { bg: '#FEF9C3', text: '#CA8A04' },
  Low: { bg: '#DBEAFE', text: '#2563EB' },
};

export const CharacterDetailScreen: React.FC<CharacterDetailScreenProps> = ({
  character,
  onBack,
  onUpdateCharacter,
  onDeleteCharacter,
}) => {
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [congratsData, setCongratsData] = useState<{ title: string; body: string } | null>(null);

  const { name, gs, classType, priority, deus, arkanis, checklist, gearTarget, accessoryTarget } = character;
  const meta = classMeta[classType] || { icon: 'account-outline', color: '#94A3B8' };
  const pColor = priorityColors[priority] || { bg: '#F1F5F9', text: '#475569' };

  // Calculate items checked/total
  const totalItems = Object.keys(checklist).length;
  const checkedItems = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((checkedItems / totalItems) * 100);

  const handleCheckboxChange = (key: keyof GearChecklist, value: boolean) => {
    const updatedChecklist = { ...checklist, [key]: value };
    
    // Always auto-calculate counts from checkboxes
    const gearKeys: (keyof GearChecklist)[] = ['wpn', 'guards', 'breastplate', 'greaves', 'helm', 'pauldrons', 'gloves', 'boots'];
    let updatedGearCount = gearKeys.filter(k => !updatedChecklist[k]).length;

    const accKeys: (keyof GearChecklist)[] = ['earL', 'earR', 'neck', 'ringL', 'ringR', 'cloak'];
    let updatedAccCount = accKeys.filter(k => !updatedChecklist[k]).length;

    let updatedGearTarget = gearTarget;
    let updatedAccTarget = accessoryTarget;

    // Check if gear is completed (all checked, count is 0)
    if (updatedGearCount === 0) {
      if (gearTarget === 'Draupnir') {
        updatedGearTarget = 'Vakron Sky Island';
        gearKeys.forEach(k => { updatedChecklist[k] = false; });
        updatedGearCount = 8;
        setCongratsData({
          title: 'Gear Tier Upgraded!',
          body: `Congratulations! You have completed the Draupnir Gear Set. Your target has been automatically advanced to Vakron Sky Island!`,
        });
      } else if (gearTarget === 'Vakron Sky Island') {
        updatedGearTarget = 'Fire Temple';
        gearKeys.forEach(k => { updatedChecklist[k] = false; });
        updatedGearCount = 8;
        setCongratsData({
          title: 'Gear Tier Upgraded!',
          body: `Congratulations! You have completed the Vakron Sky Island Gear Set. Your target has been automatically advanced to Fire Temple!`,
        });
      } else if (gearTarget === 'Fire Temple') {
        updatedGearTarget = "Dying Dramata's Nest";
        gearKeys.forEach(k => { updatedChecklist[k] = false; });
        updatedGearCount = 8;
        setCongratsData({
          title: 'Gear Tier Upgraded!',
          body: `Congratulations! You have completed the Fire Temple Gear Set. Your target has been automatically advanced to Dying Dramata's Nest!`,
        });
      }
    }

    // Check if accessories are completed (all checked, count is 0)
    if (updatedAccCount === 0) {
      if (accessoryTarget === 'Krao Cave') {
        updatedAccTarget = 'Urugugu Canyon';
        accKeys.forEach(k => { updatedChecklist[k] = false; });
        updatedAccCount = 6;
        setCongratsData({
          title: 'Accessory Tier Upgraded!',
          body: `Congratulations! You have completed the Krao Cave Accessory Set. Your target has been automatically advanced to Urugugu Canyon!`,
        });
      } else if (accessoryTarget === 'Urugugu Canyon') {
        updatedAccTarget = 'Ferocious Horn Den';
        accKeys.forEach(k => { updatedChecklist[k] = false; });
        updatedAccCount = 6;
        setCongratsData({
          title: 'Accessory Tier Upgraded!',
          body: `Congratulations! You have completed the Urugugu Canyon Accessory Set. Your target has been automatically advanced to Ferocious Horn Den!`,
        });
      } else if (accessoryTarget === 'Ferocious Horn Den') {
        updatedAccTarget = 'Cradle of Nihility';
        accKeys.forEach(k => { updatedChecklist[k] = false; });
        updatedAccCount = 6;
        setCongratsData({
          title: 'Accessory Tier Upgraded!',
          body: `Congratulations! You have completed the Ferocious Horn Den Accessory Set. Your target has been automatically advanced to Cradle of Nihility!`,
        });
      }
    }

    onUpdateCharacter({
      ...character,
      checklist: updatedChecklist,
      gearTarget: updatedGearTarget,
      accessoryTarget: updatedAccTarget,
      missingGearCount: updatedGearCount,
      missingAccessoryCount: updatedAccCount,
    });
  };

  const handleConfirmDelete = () => {
    setIsDeleteConfirmVisible(true);
  };

  const handleSaveEdit = (editedData: Omit<Character, 'id' | 'checklist'>) => {
    onUpdateCharacter({
      ...character,
      ...editedData,
    });
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onBack}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header Row */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <MaterialCommunityIcons name="close" size={20} color="#F8FAFC" />
              <Text style={styles.backBtnText}>Close</Text>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditModalVisible(true)}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleConfirmDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#F87171" />
              </TouchableOpacity>
            </View>
          </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Character Title Card */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarWrapper, { backgroundColor: `${meta.color}15`, borderColor: meta.color }]}>
            <MaterialCommunityIcons name={meta.icon as any} size={32} color={meta.color} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{name}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: pColor.bg }]}>
                <Text style={[styles.priorityText, { color: pColor.text }]}>{priority}</Text>
              </View>
            </View>
            <Text style={[styles.profileClass, { color: meta.color }]}>{classType}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsCardGrid}>
          <View style={styles.statsCard}>
            <Text style={styles.statLabel}>GEAR SCORE</Text>
            <Text style={[styles.statValue, { color: '#FBBF24' }]}>{gs.toLocaleString()}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statLabel}>DEUS LEVEL</Text>
            <Text style={styles.statValue}>{deus}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statLabel}>ARKANIS LEVEL</Text>
            <Text style={styles.statValue}>{arkanis}</Text>
          </View>
        </View>

        {/* Overall Progress Circle Box */}
        <View style={styles.progressSummaryCard}>
          <View style={styles.progressTextCol}>
            <Text style={styles.progressTitle}>Collection Progress</Text>
            <Text style={styles.progressRatio}>{checkedItems} / {totalItems} items obtained</Text>
          </View>
          <View style={[styles.percentageCircle, { borderColor: meta.color }]}>
            <Text style={[styles.percentageText, { color: meta.color }]}>{progressPercent}%</Text>
          </View>
        </View>

        {/* SECTION 1: WEAPONS & ARMOR (GEAR) */}
        <View style={styles.sectionHeaderCard}>
          <View style={styles.sectionHeaderTitleRow}>
            <MaterialCommunityIcons name="sword" size={18} color="#EF4444" />
            <Text style={styles.sectionTitle}>WEAPONS & ARMOR</Text>
          </View>
          <View style={styles.setDropdownBadge}>
            <Text style={styles.setDropdownLabel}>Target: <Text style={styles.setDropdownValue}>{gearTarget}</Text></Text>
          </View>
        </View>

        <View style={styles.checkboxGrid}>
          <CustomCheckbox
            label="Weapon"
            sublabel="Main Wpn"
            checked={checklist.wpn}
            onChange={(val) => handleCheckboxChange('wpn', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Helm"
            sublabel="Headgear"
            checked={checklist.helm}
            onChange={(val) => handleCheckboxChange('helm', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Breastplate"
            sublabel="Chest Armor"
            checked={checklist.breastplate}
            onChange={(val) => handleCheckboxChange('breastplate', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Pauldrons"
            sublabel="Shoulders"
            checked={checklist.pauldrons}
            onChange={(val) => handleCheckboxChange('pauldrons', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Greaves"
            sublabel="Leg Armor"
            checked={checklist.greaves}
            onChange={(val) => handleCheckboxChange('greaves', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Gloves"
            sublabel="Hand Armor"
            checked={checklist.gloves}
            onChange={(val) => handleCheckboxChange('gloves', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Guards"
            sublabel="Waist Armor"
            checked={checklist.guards}
            onChange={(val) => handleCheckboxChange('guards', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Boots"
            sublabel="Foot Armor"
            checked={checklist.boots}
            onChange={(val) => handleCheckboxChange('boots', val)}
            color={meta.color}
          />
        </View>

        {/* SECTION 2: ACCESSORIES */}
        <View style={[styles.sectionHeaderCard, { marginTop: 24 }]}>
          <View style={styles.sectionHeaderTitleRow}>
            <MaterialCommunityIcons name="ring" size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>ACCESSORIES & CLOAK</Text>
          </View>
          <View style={styles.setDropdownBadge}>
            <Text style={styles.setDropdownLabel}>Drop: <Text style={styles.setDropdownValue}>{accessoryTarget}</Text></Text>
          </View>
        </View>

        <View style={styles.checkboxGrid}>
          <CustomCheckbox
            label="Necklace"
            sublabel="Neck accessory"
            checked={checklist.neck}
            onChange={(val) => handleCheckboxChange('neck', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Cloak"
            sublabel="Back accessory"
            checked={checklist.cloak}
            onChange={(val) => handleCheckboxChange('cloak', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Earring L"
            sublabel="Left ear"
            checked={checklist.earL}
            onChange={(val) => handleCheckboxChange('earL', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Earring R"
            sublabel="Right ear"
            checked={checklist.earR}
            onChange={(val) => handleCheckboxChange('earR', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Ring L"
            sublabel="Left finger"
            checked={checklist.ringL}
            onChange={(val) => handleCheckboxChange('ringL', val)}
            color={meta.color}
          />
          <CustomCheckbox
            label="Ring R"
            sublabel="Right finger"
            checked={checklist.ringR}
            onChange={(val) => handleCheckboxChange('ringR', val)}
            color={meta.color}
          />
        </View>

        {/* Notes Section */}
        {character.notes ? (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <MaterialCommunityIcons name="note-text-outline" size={16} color="#64748B" />
              <Text style={styles.notesTitle}>CHARACTER NOTES</Text>
            </View>
            <Text style={styles.notesText}>{character.notes}</Text>
          </View>
        ) : null}

        {/* Targets Summary */}
        <View style={styles.summaryTargetsRow}>
          <View style={styles.summaryTargetBox}>
            <Text style={styles.summaryTargetLabel}>MISSING GEAR</Text>
            <Text style={styles.summaryTargetVal}>{character.missingGearCount}</Text>
          </View>
          <View style={styles.summaryTargetBox}>
            <Text style={styles.summaryTargetLabel}>MISSING ACCESSORIES</Text>
            <Text style={styles.summaryTargetVal}>{character.missingAccessoryCount}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Character Modal */}
      <ModalForm
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveEdit}
        character={character}
      />

      {/* Custom Delete Confirmation Dialog Modal */}
      <Modal
        visible={isDeleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDeleteConfirmVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            {/* Header / Warning Icon */}
            <View style={styles.alertHeader}>
              <View style={styles.alertIconBg}>
                <MaterialCommunityIcons name="alert-outline" size={24} color="#EF4444" />
              </View>
              <Text style={styles.alertTitle}>Delete Character</Text>
            </View>

            {/* Content / Body */}
            <Text style={styles.alertBody}>
              Are you sure you want to delete <Text style={styles.alertNameBold}>{name}</Text>? This action cannot be undone.
            </Text>

            {/* Footer Actions */}
            <View style={styles.alertFooter}>
              <TouchableOpacity
                onPress={() => setIsDeleteConfirmVisible(false)}
                style={styles.alertCancelBtn}
              >
                <Text style={styles.alertCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setIsDeleteConfirmVisible(false);
                  onDeleteCharacter(character.id);
                  onBack();
                }}
                style={styles.alertDeleteBtn}
              >
                <Text style={styles.alertDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Congrats / Tier Upgraded Modal */}
      <Modal
        visible={congratsData !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCongratsData(null)}
      >
        <View style={styles.alertOverlay}>
          <View style={[styles.alertCard, { borderColor: '#EAB308', shadowColor: '#EAB308' }]}>
            {/* Header / Trophy Icon */}
            <View style={styles.alertHeader}>
              <View style={[styles.alertIconBg, { backgroundColor: '#EAB30815' }]}>
                <MaterialCommunityIcons name="trophy" size={24} color="#EAB308" />
              </View>
              <Text style={styles.alertTitle}>{congratsData?.title}</Text>
            </View>

            {/* Content / Body */}
            <Text style={styles.alertBody}>{congratsData?.body}</Text>

            {/* Claim/Close Button */}
            <TouchableOpacity
              onPress={() => setCongratsData(null)}
              style={[styles.alertDeleteBtn, { backgroundColor: '#EAB308', shadowColor: '#EAB308', marginTop: 8 }]}
            >
              <Text style={[styles.alertDeleteBtnText, { color: '#0F172A' }]}>Claim Reward (Continue)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 24 : 12,
  },
  modalCard: {
    width: Platform.OS === 'web' ? 760 : '100%',
    maxHeight: '92%',
    backgroundColor: '#070A10',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    overflow: 'hidden',
    paddingBottom: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0C10',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2330',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2D3548',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    borderColor: '#EF444430',
    backgroundColor: '#EF444410',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 48,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  profileName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  profileClass: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsCardGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#131A26',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#20293A',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  progressSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1E2330',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2D3548',
  },
  progressTextCol: {
    flex: 1,
  },
  progressTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  progressRatio: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  percentageCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#20293A',
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  setDropdownBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setDropdownLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  setDropdownValue: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 4,
  },
  notesCard: {
    backgroundColor: '#131A26',
    borderRadius: 12,
    padding: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#20293A',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  notesTitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  notesText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  summaryTargetsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  summaryTargetBox: {
    flex: 1,
    backgroundColor: '#EF444410',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF444420',
  },
  summaryTargetLabel: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryTargetVal: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '900',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 16, 0.85)', // Deep backdrop matching ModalForm
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  alertCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121620',
    borderWidth: 1.5,
    borderColor: '#EF4444', // Red alert border
    borderRadius: 20,
    padding: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  alertIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EF444415',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  alertBody: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  alertNameBold: {
    color: '#EF4444',
    fontWeight: '700',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  alertCancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertCancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  alertDeleteBtn: {
    flex: 1.2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  alertDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
export default CharacterDetailScreen;
