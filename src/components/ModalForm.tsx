import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character, CharacterClass, PriorityLevel, GearSetType, AccessorySetType } from '../types/character';

interface ModalFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (characterData: Omit<Character, 'id' | 'checklist'> & { id?: string }) => void;
  character?: Character; // If editing
}

const CLASSES: CharacterClass[] = ['Templar', 'Gladiator', 'Ranger', 'Cleric', 'Chanter', 'Assassin', 'Sorcerer', 'Spiritmaster'];
const PRIORITIES: PriorityLevel[] = ['Extreme', 'Critical', 'High', 'Medium', 'Low'];
const GEAR_TARGETS: GearSetType[] = ['Cradle', 'Kromede', 'Urugugu', 'Custom'];
const ACCESSORY_TARGETS: AccessorySetType[] = ['Dramata', 'Nuakum', 'Vakron', 'Custom'];

export const ModalForm: React.FC<ModalFormProps> = ({ visible, onClose, onSave, character }) => {
  const [name, setName] = useState('');
  const [gs, setGs] = useState(2400);
  const [classType, setClassType] = useState<CharacterClass>('Templar');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [deus, setDeus] = useState(7);
  const [arkanis, setArkanis] = useState(7);
  const [gearTarget, setGearTarget] = useState<GearSetType>('Kromede');
  const [accessoryTarget, setAccessoryTarget] = useState<AccessorySetType>('Nuakum');
  const [missingGearCount, setMissingGearCount] = useState(4);
  const [missingAccessoryCount, setMissingAccessoryCount] = useState(7);
  const [useManualMissingCounts, setUseManualMissingCounts] = useState(true);
  const [notes, setNotes] = useState('');

  // Load character data if editing
  useEffect(() => {
    if (character) {
      setName(character.name);
      setGs(character.gs);
      setClassType(character.classType);
      setPriority(character.priority);
      setDeus(character.deus);
      setArkanis(character.arkanis);
      setGearTarget(character.gearTarget);
      setAccessoryTarget(character.accessoryTarget);
      setMissingGearCount(character.missingGearCount);
      setMissingAccessoryCount(character.missingAccessoryCount);
      setUseManualMissingCounts(character.useManualMissingCounts ?? true);
      setNotes(character.notes || '');
    } else {
      // Reset to defaults for new character
      setName('');
      setGs(2400);
      setClassType('Templar');
      setPriority('Medium');
      setDeus(7);
      setArkanis(7);
      setGearTarget('Kromede');
      setAccessoryTarget('Nuakum');
      setMissingGearCount(4);
      setMissingAccessoryCount(7);
      setUseManualMissingCounts(true);
      setNotes('');
    }
  }, [character, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a character name');
      return;
    }
    onSave({
      id: character?.id,
      name,
      gs,
      classType,
      priority,
      deus,
      arkanis,
      gearTarget,
      accessoryTarget,
      missingGearCount,
      missingAccessoryCount,
      useManualMissingCounts,
      notes,
    });
    onClose();
  };

  const adjustNumber = (val: number, setter: React.Dispatch<React.SetStateAction<number>>, amount: number, min = 0) => {
    setter(Math.max(min, val + amount));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{character ? 'Edit Character' : 'New Character'}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              {/* Character Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CHARACTER NAME</Text>
                <TextInput
                  placeholder="Enter character name..."
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                  style={styles.textInput}
                />
              </View>

              {/* Class Selector Grid */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CLASS / TIER</Text>
                <View style={styles.selectorGrid}>
                  {CLASSES.map((cls) => {
                    const isSelected = classType === cls;
                    return (
                      <TouchableOpacity
                        key={cls}
                        onPress={() => setClassType(cls)}
                        style={[
                          styles.selectorPill,
                          isSelected && styles.selectedPill,
                        ]}
                      >
                        <Text style={[styles.pillText, isSelected && styles.selectedPillText]}>
                          {cls}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Priority Selector Row */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FARM PRIORITY</Text>
                <View style={styles.horizontalPillScroll}>
                  {PRIORITIES.map((p) => {
                    const isSelected = priority === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPriority(p)}
                        style={[
                          styles.priorityPill,
                          isSelected && styles.selectedPriorityPill,
                          isSelected && p === 'Extreme' && { backgroundColor: '#F43F5E' },
                          isSelected && p === 'Critical' && { backgroundColor: '#EF4444' },
                          isSelected && p === 'High' && { backgroundColor: '#F97316' },
                          isSelected && p === 'Medium' && { backgroundColor: '#EAB308' },
                          isSelected && p === 'Low' && { backgroundColor: '#3B82F6' },
                        ]}
                      >
                        <Text style={[styles.pillText, isSelected && styles.selectedPillText]}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Numeric Inputs Row (GS, Deus, Arkanis) */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1.5, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>GEAR SCORE (GS)</Text>
                  <View style={styles.numberStepperContainer}>
                    <TouchableOpacity onPress={() => adjustNumber(gs, setGs, -50, 0)} style={styles.stepperBtn}>
                      <Text style={styles.stepperBtnText}>-50</Text>
                    </TouchableOpacity>
                    <TextInput
                      keyboardType="numeric"
                      value={gs.toString()}
                      onChangeText={(v) => setGs(parseInt(v) || 0)}
                      style={styles.numberInput}
                    />
                    <TouchableOpacity onPress={() => adjustNumber(gs, setGs, 50, 0)} style={styles.stepperBtn}>
                      <Text style={styles.stepperBtnText}>+50</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>DEUS</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity onPress={() => adjustNumber(deus, setDeus, -1, 0)} style={styles.counterBtn}>
                      <MaterialCommunityIcons name="minus" size={16} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.counterText}>{deus}</Text>
                    <TouchableOpacity onPress={() => adjustNumber(deus, setDeus, 1, 0)} style={styles.counterBtn}>
                      <MaterialCommunityIcons name="plus" size={16} color="#F8FAFC" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>ARKANIS</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity onPress={() => adjustNumber(arkanis, setArkanis, -1, 0)} style={styles.counterBtn}>
                      <MaterialCommunityIcons name="minus" size={16} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.counterText}>{arkanis}</Text>
                    <TouchableOpacity onPress={() => adjustNumber(arkanis, setArkanis, 1, 0)} style={styles.counterBtn}>
                      <MaterialCommunityIcons name="plus" size={16} color="#F8FAFC" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Target Sets Selection */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>GEAR TARGET</Text>
                  <View style={styles.selectorGridCompact}>
                    {GEAR_TARGETS.map((g) => {
                      const isSelected = gearTarget === g;
                      return (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setGearTarget(g)}
                          style={[styles.compactPill, isSelected && styles.selectedCompactPill]}
                        >
                          <Text style={[styles.compactPillText, isSelected && styles.selectedCompactPillText]}>
                            {g}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>ACCESSORY TARGET</Text>
                  <View style={styles.selectorGridCompact}>
                    {ACCESSORY_TARGETS.map((a) => {
                      const isSelected = accessoryTarget === a;
                      return (
                        <TouchableOpacity
                          key={a}
                          onPress={() => setAccessoryTarget(a)}
                          style={[styles.compactPill, isSelected && styles.selectedCompactPill]}
                        >
                          <Text style={[styles.compactPillText, isSelected && styles.selectedCompactPillText]}>
                            {a}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Manual/Auto Switch */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Override Missing Counts</Text>
                  <Text style={styles.switchDesc}>Set missing counts manually instead of auto-calculating</Text>
                </View>
                <Switch
                  value={useManualMissingCounts}
                  onValueChange={setUseManualMissingCounts}
                  trackColor={{ false: '#0F172A', true: '#4F46E5' }}
                  thumbColor={useManualMissingCounts ? '#F8FAFC' : '#94A3B8'}
                />
              </View>

              {/* Manual Counts Edit */}
              {useManualMissingCounts && (
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>MISSING GEAR</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => adjustNumber(missingGearCount, setMissingGearCount, -1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="minus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                      <Text style={styles.counterText}>{missingGearCount}</Text>
                      <TouchableOpacity onPress={() => adjustNumber(missingGearCount, setMissingGearCount, 1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="plus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>MISSING ACCESSORIES</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => adjustNumber(missingAccessoryCount, setMissingAccessoryCount, -1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="minus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                      <Text style={styles.counterText}>{missingAccessoryCount}</Text>
                      <TouchableOpacity onPress={() => adjustNumber(missingAccessoryCount, setMissingAccessoryCount, 1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="plus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOTES</Text>
                <TextInput
                  placeholder="Any character details/notes..."
                  placeholderTextColor="#64748B"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, styles.multilineInput]}
                />
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.actionsFooter}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Character</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 16, 0.75)', // Deep blurred backdrop
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 550,
    maxHeight: Platform.OS === 'web' ? '85%' : '90%',
    flexShrink: 1,
  },
  modalContent: {
    backgroundColor: '#131A26', // Deep elegant navy-dark
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A3246',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#20293A',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#20293A',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3E5930',
  },
  selectedPill: {
    backgroundColor: '#4F46E5', // Premium Violet Accent
    borderColor: '#6366F1',
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  horizontalPillScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedPriorityPill: {
    transform: [{ scale: 1.05 }],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  numberStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#20293A',
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  stepperBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  numberInput: {
    flex: 1,
    textAlign: 'center',
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#20293A',
  },
  counterBtn: {
    width: 32,
    height: 32,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  selectorGridCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  compactPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    width: '47%',
    alignItems: 'center',
  },
  selectedCompactPill: {
    backgroundColor: '#312E81',
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  compactPillText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedCompactPillText: {
    color: '#E0E7FF',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B50',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#20293A30',
  },
  switchLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '700',
  },
  switchDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#20293A',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#4F46E5', // Premium violet primary action
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
export default ModalForm;
