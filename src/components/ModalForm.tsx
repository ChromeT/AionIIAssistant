import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character, CharacterClass, PriorityLevel, GearSetType, AccessorySetType } from '../types/character';

interface ModalFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (characterData: Omit<Character, 'id' | 'checklist'> & { id?: string }) => void;
  character?: Character; // If editing
}

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

const CLASSES: CharacterClass[] = ['Templar', 'Gladiator', 'Ranger', 'Cleric', 'Chanter', 'Assassin', 'Sorcerer', 'Spiritmaster'];
const PRIORITIES: PriorityLevel[] = ['Extreme', 'Critical', 'High', 'Medium', 'Low'];
const GEAR_TARGETS: GearSetType[] = ['Urugugu', 'Kromede', 'Draupnir', 'Dramata', 'Custom'];
const ACCESSORY_TARGETS: AccessorySetType[] = ['Vakron', 'Nuakum', 'Cradle', 'Custom'];

export const ModalForm: React.FC<ModalFormProps> = ({ visible, onClose, onSave, character }) => {
  const [name, setName] = useState('');
  const [gs, setGs] = useState(2400);
  const [classType, setClassType] = useState<CharacterClass>('Templar');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [deus, setDeus] = useState(7);
  const [arkanis, setArkanis] = useState(7);
  const [gearTargetSelect, setGearTargetSelect] = useState<string>('Kromede');
  const [customGearTarget, setCustomGearTarget] = useState('');
  const [accessoryTargetSelect, setAccessoryTargetSelect] = useState<string>('Nuakum');
  const [customAccessoryTarget, setCustomAccessoryTarget] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom RPG transition animations state
  const [localVisible, setLocalVisible] = useState(visible);
  const backdropScale = useRef(new Animated.Value(0.3)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(800)).current;

  // Dynamic class logo change animations
  const [displayedClass, setDisplayedClass] = useState<CharacterClass>(classType);
  const sealIconScale = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  // Load character data if editing
  useEffect(() => {
    if (character) {
      setName(character.name);
      setGs(character.gs);
      setClassType(character.classType);
      setPriority(character.priority);
      setDeus(character.deus);
      setArkanis(character.arkanis);
      
      const defaultGears = ['Urugugu', 'Kromede', 'Draupnir', 'Dramata'];
      if (defaultGears.includes(character.gearTarget)) {
        setGearTargetSelect(character.gearTarget);
        setCustomGearTarget('');
      } else {
        setGearTargetSelect('Custom');
        setCustomGearTarget(character.gearTarget);
      }

      const defaultAccs = ['Vakron', 'Nuakum', 'Cradle'];
      if (defaultAccs.includes(character.accessoryTarget)) {
        setAccessoryTargetSelect(character.accessoryTarget);
        setCustomAccessoryTarget('');
      } else {
        setAccessoryTargetSelect('Custom');
        setCustomAccessoryTarget(character.accessoryTarget);
      }

      setNotes(character.notes || '');
    } else {
      // Reset to defaults for new character
      setName('');
      setGs(2400);
      setClassType('Templar');
      setPriority('Medium');
      setDeus(7);
      setArkanis(7);
      setGearTargetSelect('Kromede');
      setCustomGearTarget('');
      setAccessoryTargetSelect('Nuakum');
      setCustomAccessoryTarget('');
      setNotes('');
    }
  }, [character, visible]);

  // Sync animation triggers
  useEffect(() => {
    if (visible) {
      setErrorMsg(null);
      setLocalVisible(true);
      
      // Reset values
      backdropScale.setValue(0.3);
      backdropOpacity.setValue(0);
      cardTranslateY.setValue(800);

      // Run parallel letter-scroll entrance
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(backdropScale, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 7.5,
          tension: 35,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Run parallel exit transition
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropScale, {
          toValue: 0.5,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 800,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setLocalVisible(false);
      });
    }
  }, [visible]);

  // Trigger smooth icon scaling/fading on class selection changes
  useEffect(() => {
    Animated.timing(sealIconScale, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setDisplayedClass(classType);
      Animated.spring(sealIconScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });
  }, [classType]);

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a character name');
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setErrorMsg(null);
    onSave({
      id: character?.id,
      name,
      gs,
      classType,
      priority,
      deus,
      arkanis,
      gearTarget: gearTargetSelect === 'Custom' ? customGearTarget.trim() || 'Custom' : gearTargetSelect,
      accessoryTarget: accessoryTargetSelect === 'Custom' ? customAccessoryTarget.trim() || 'Custom' : accessoryTargetSelect,
      missingGearCount: character ? character.missingGearCount : 8,
      missingAccessoryCount: character ? character.missingAccessoryCount : 6,
      notes,
    });
    onClose();
  };

  const adjustNumber = (val: number, setter: React.Dispatch<React.SetStateAction<number>>, amount: number, min = 0, max = Infinity) => {
    setter(Math.min(max, Math.max(min, val + amount)));
  };

  if (!localVisible) return null;

  return (
    <Modal visible={localVisible} transparent={true} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Separated expanding black backdrop */}
        <Animated.View
          style={[
            styles.backdropBackground,
            {
              opacity: backdropOpacity,
              transform: [{ scale: backdropScale }],
            },
          ]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          {/* Card sliding from bottom to center */}
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: cardTranslateY }],
                borderColor: classMeta[displayedClass]?.color || '#D97706',
                shadowColor: classMeta[displayedClass]?.color || '#000000',
                shadowOpacity: classMeta[displayedClass]?.color ? 0.35 : 0.5,
              },
            ]}
          >
            {/* Wax Seal RPG Decoration - changes dynamically based on selected class */}
            <View style={[
              styles.waxSeal, 
              { 
                borderColor: classMeta[displayedClass]?.color || '#D97706',
                shadowColor: classMeta[displayedClass]?.color || '#D97706',
              }
            ]}>
              <Animated.View style={{ transform: [{ scale: sealIconScale }] }}>
                <MaterialCommunityIcons 
                  name={(classMeta[displayedClass]?.icon || 'shield-star') as any} 
                  size={20} 
                  color={classMeta[displayedClass]?.color || '#D97706'} 
                />
              </Animated.View>
            </View>

            {/* Inner Border Frame */}
            <View style={[
              styles.innerFrame,
              { borderColor: `${classMeta[displayedClass]?.color || '#D97706'}25` }
            ]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{character ? 'Edit Character' : 'New Character'}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {errorMsg ? (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                {/* Character Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>CHARACTER NAME</Text>
                  <TextInput
                    placeholder="Enter character name..."
                    placeholderTextColor="#64748B"
                    value={name}
                    onChangeText={(v) => {
                      setName(v);
                      setErrorMsg(null);
                    }}
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

                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>DEUS</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => adjustNumber(deus, setDeus, -1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="minus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                      <Text style={styles.counterText}>{deus}</Text>
                      <TouchableOpacity onPress={() => adjustNumber(deus, setDeus, 1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="plus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>ARKANIS</Text>
                    <View style={styles.counterRow}>
                      <TouchableOpacity onPress={() => adjustNumber(arkanis, setArkanis, -1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="minus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                      <Text style={styles.counterText}>{arkanis}</Text>
                      <TouchableOpacity onPress={() => adjustNumber(arkanis, setArkanis, 1)} style={styles.counterBtn}>
                        <MaterialCommunityIcons name="plus" size={16} color="#F8FAFC" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Drop Targets Row */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>GEAR TARGET</Text>
                    <View style={styles.selectorGridCompact}>
                      {GEAR_TARGETS.map((g) => {
                        const isSelected = gearTargetSelect === g;
                        return (
                          <TouchableOpacity
                            key={g}
                            onPress={() => {
                              setGearTargetSelect(g);
                              setErrorMsg(null);
                            }}
                            style={[styles.compactPill, isSelected && styles.selectedCompactPill]}
                          >
                            <Text style={[styles.compactPillText, isSelected && styles.selectedCompactPillText]}>
                              {g}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {gearTargetSelect === 'Custom' && (
                      <TextInput
                        placeholder="Enter custom gear set name..."
                        placeholderTextColor="#64748B"
                        value={customGearTarget}
                        onChangeText={(v) => {
                          setCustomGearTarget(v);
                          setErrorMsg(null);
                        }}
                        style={[styles.textInput, styles.compactInput]}
                      />
                    )}
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>ACCESSORY TARGET</Text>
                    <View style={styles.selectorGridCompact}>
                      {ACCESSORY_TARGETS.map((a) => {
                        const isSelected = accessoryTargetSelect === a;
                        return (
                          <TouchableOpacity
                            key={a}
                            onPress={() => {
                              setAccessoryTargetSelect(a);
                              setErrorMsg(null);
                            }}
                            style={[styles.compactPill, isSelected && styles.selectedCompactPill]}
                          >
                            <Text style={[styles.compactPillText, isSelected && styles.selectedCompactPillText]}>
                              {a}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {accessoryTargetSelect === 'Custom' && (
                      <TextInput
                        placeholder="Enter custom accessory..."
                        placeholderTextColor="#64748B"
                        value={customAccessoryTarget}
                        onChangeText={(v) => {
                          setCustomAccessoryTarget(v);
                          setErrorMsg(null);
                        }}
                        style={[styles.textInput, styles.compactInput]}
                      />
                    )}
                  </View>
                </View>

                {/* Manual/Auto Switch */}

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
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 0,
    position: 'relative',
  },
  backdropBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 12, 0.85)', // Deep blurred dark backdrop
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 550,
    maxHeight: Platform.OS === 'web' ? '85%' : '90%',
    flexShrink: 1,
    zIndex: 2,
  },
  modalContent: {
    backgroundColor: '#121620', // RPG textured paper background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    padding: 8, // margin around inner frame
    borderWidth: 1.5,
    borderColor: '#D97706', // Gold/amber border for letter envelope style
    flexShrink: 1,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  waxSeal: {
    position: 'absolute',
    top: -15,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#121620',
    borderWidth: 1.5,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  innerFrame: {
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.15)', // light gold accent frame
    borderRadius: 16,
    padding: 16,
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
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0A0D14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#20293A',
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectorPill: {
    backgroundColor: '#1E293B30',
    borderWidth: 1,
    borderColor: '#20293A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectedPill: {
    backgroundColor: '#4F46E5', // premium indigo accent selection
    borderColor: '#6366F1',
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedPillText: {
    color: '#FFFFFF',
  },
  horizontalPillScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityPill: {
    backgroundColor: '#1E293B30',
    borderWidth: 1,
    borderColor: '#20293A',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  selectedPriorityPill: {
    borderColor: '#FFFFFF30',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  numberStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0D14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#20293A',
    overflow: 'hidden',
  },
  stepperBtn: {
    backgroundColor: '#1E293B30',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stepperBtnText: {
    color: '#38BDF8', // light blue action
    fontSize: 12,
    fontWeight: '800',
  },
  numberInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0D14',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#20293A',
    padding: 4,
  },
  counterBtn: {
    backgroundColor: '#1E293B60',
    width: 32,
    height: 32,
    borderRadius: 6,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderWidth: 1,
    borderColor: '#EF444430',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  compactInput: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    marginTop: 8,
  },
});
export default ModalForm;
