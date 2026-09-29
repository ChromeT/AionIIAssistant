import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TaskItem, TaskCategory, TaskScope } from '../types/tasks';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: TaskItem) => void;
  initialTask?: TaskItem | null;
}

const AVAILABLE_ICONS = [
  'castle',
  'sword-cross',
  'shield-star',
  'skull-crossbones',
  'shield-sword',
  'target',
  'crown',
  'hammer-wrench',
  'gift-outline',
  'clipboard-check-outline',
  'fencing',
  'store',
  'star-shooting-outline',
  'fire',
  'treasure-chest',
  'compass-outline',
  'calendar-check',
  'account-star',
];

const PRESET_COUNTS = [1, 2, 3, 5, 10, 14, 20];

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  onSave,
  initialTask,
}) => {
  const isEditing = !!initialTask;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('daily');
  const [scope, setScope] = useState<TaskScope>('character');
  const [maxCount, setMaxCount] = useState(1);
  const [icon, setIcon] = useState('castle');
  const [description, setDescription] = useState('');
  const [mainOnly, setMainOnly] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever modal opens or initialTask changes
  useEffect(() => {
    if (visible) {
      if (initialTask) {
        setTitle(initialTask.title || '');
        setCategory(initialTask.category || 'daily');
        setScope(initialTask.scope || 'character');
        setMaxCount(initialTask.maxCount || 1);
        setIcon(initialTask.icon || 'castle');
        setDescription(initialTask.description || '');
        setMainOnly(initialTask.mainOnly || false);
      } else {
        resetForm();
      }
      setErrorMsg(null);
    }
  }, [visible, initialTask]);

  const resetForm = () => {
    setTitle('');
    setCategory('daily');
    setScope('character');
    setMaxCount(1);
    setIcon('castle');
    setDescription('');
    setMainOnly(false);
    setErrorMsg(null);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Task title cannot be empty.');
      return;
    }

    const taskToSave: TaskItem = {
      ...(initialTask || {}),
      id: initialTask ? initialTask.id : `custom_${Date.now()}`,
      title: title.trim(),
      category,
      scope,
      maxCount: Math.max(1, maxCount),
      icon,
      description: description.trim() || '',
      mainOnly: scope === 'character' ? Boolean(mainOnly) : false,
      isCustom: true,
    };


    onSave(taskToSave);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.headerIconCircle,
                  isEditing && { backgroundColor: '#38BDF820', borderColor: '#38BDF840' },
                ]}
              >
                <MaterialCommunityIcons
                  name={isEditing ? 'pencil' : 'playlist-plus'}
                  size={18}
                  color={isEditing ? '#38BDF8' : '#6366F1'}
                />
              </View>
              <Text style={styles.modalTitle}>
                {isEditing ? 'EDIT TASK' : 'ADD NEW TASK'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {errorMsg && (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Task Title */}
            <Text style={styles.inputLabel}>TASK TITLE *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Duty Quests, Ascension Trial, Abyss Corridors"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errorMsg) setErrorMsg(null);
              }}
            />

            {/* Category Selector */}
            <Text style={styles.inputLabel}>FREQUENCY</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  category === 'daily' && styles.selectorBtnActiveDaily,
                ]}
                onPress={() => setCategory('daily')}
              >
                <MaterialCommunityIcons
                  name="weather-sunny"
                  size={16}
                  color={category === 'daily' ? '#FBBF24' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.selectorBtnText,
                    category === 'daily' && styles.selectorBtnTextActive,
                  ]}
                >
                  DAILY
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  category === 'weekly' && styles.selectorBtnActiveWeekly,
                ]}
                onPress={() => setCategory('weekly')}
              >
                <MaterialCommunityIcons
                  name="calendar-star"
                  size={16}
                  color={category === 'weekly' ? '#A78BFA' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.selectorBtnText,
                    category === 'weekly' && styles.selectorBtnTextActive,
                  ]}
                >
                  WEEKLY
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scope Selector */}
            <Text style={styles.inputLabel}>SCOPE</Text>
            <View style={styles.selectorRow}>
              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  scope === 'character' && styles.selectorBtnActive,
                ]}
                onPress={() => setScope('character')}
              >
                <MaterialCommunityIcons
                  name="account"
                  size={16}
                  color={scope === 'character' ? '#6366F1' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.selectorBtnText,
                    scope === 'character' && styles.selectorBtnTextActive,
                  ]}
                >
                  PER CHARACTER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectorBtn,
                  scope === 'account' && styles.selectorBtnActive,
                ]}
                onPress={() => setScope('account')}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={16}
                  color={scope === 'account' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.selectorBtnText,
                    scope === 'account' && styles.selectorBtnTextActive,
                  ]}
                >
                  ACCOUNT WIDE
                </Text>
              </TouchableOpacity>
            </View>

            {/* Main Character Only Toggle (only for character-scoped tasks) */}
            {scope === 'character' && (
              <View style={styles.toggleSection}>
                <TouchableOpacity
                  style={[
                    styles.mainOnlyCard,
                    mainOnly && styles.mainOnlyCardActive,
                  ]}
                  onPress={() => setMainOnly(!mainOnly)}
                  activeOpacity={0.8}
                >
                  <View style={styles.mainOnlyLeft}>
                    <View
                      style={[
                        styles.mainOnlyIconBox,
                        mainOnly && styles.mainOnlyIconBoxActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="crown"
                        size={18}
                        color={mainOnly ? '#FBBF24' : '#64748B'}
                      />
                    </View>
                    <View style={styles.mainOnlyTexts}>
                      <Text
                        style={[
                          styles.mainOnlyTitle,
                          mainOnly && styles.mainOnlyTitleActive,
                        ]}
                      >
                        Main Character Only
                      </Text>
                      <Text style={styles.mainOnlySubtitle}>
                        Only visible/playable on your Main (alts cannot do this, e.g. Duty Quests)
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.toggleSwitch,
                      mainOnly && styles.toggleSwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleSwitchThumb,
                        mainOnly && styles.toggleSwitchThumbActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Max Completions Count */}
            <Text style={styles.inputLabel}>
              COMPLETIONS PER RESET ({maxCount}x)
            </Text>
            <View style={styles.countRow}>
              {PRESET_COUNTS.map((cnt) => (
                <TouchableOpacity
                  key={cnt}
                  style={[styles.countBtn, maxCount === cnt && styles.countBtnActive]}
                  onPress={() => setMaxCount(cnt)}
                >
                  <Text
                    style={[
                      styles.countBtnText,
                      maxCount === cnt && styles.countBtnTextActive,
                    ]}
                  >
                    {cnt}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stepper adjustment */}
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setMaxCount(Math.max(1, maxCount - 1))}
              >
                <MaterialCommunityIcons name="minus" size={16} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.stepperDisplay}>
                <Text style={styles.stepperDisplayText}>{maxCount}x completions</Text>
              </View>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setMaxCount(maxCount + 1)}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Icon Picker */}
            <Text style={styles.inputLabel}>SELECT ICON</Text>
            <View style={styles.iconGrid}>
              {AVAILABLE_ICONS.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconChoice, icon === ic && styles.iconChoiceActive]}
                  onPress={() => setIcon(ic)}
                >
                  <MaterialCommunityIcons
                    name={ic as any}
                    size={20}
                    color={icon === ic ? '#6366F1' : '#94A3B8'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={styles.inputLabel}>NOTE / REWARDS (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="e.g. 5x per day, 14x per week, drops Odyle, AP"
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, isEditing && { backgroundColor: '#2563EB' }]}
              onPress={handleSave}
            >
              <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {isEditing ? 'SAVE CHANGES' : 'SAVE TASK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '92%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#131D33',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6366F120',
    borderWidth: 1,
    borderColor: '#6366F140',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444450',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    gap: 6,
  },
  selectorBtnActive: {
    backgroundColor: '#6366F120',
    borderColor: '#6366F1',
  },
  selectorBtnActiveDaily: {
    backgroundColor: '#FBBF2420',
    borderColor: '#FBBF24',
  },
  selectorBtnActiveWeekly: {
    backgroundColor: '#A78BFA20',
    borderColor: '#A78BFA',
  },
  selectorBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  selectorBtnTextActive: {
    color: '#FFFFFF',
  },
  toggleSection: {
    marginTop: 10,
  },
  mainOnlyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
  },
  mainOnlyCardActive: {
    backgroundColor: '#FBBF2410',
    borderColor: '#FBBF2460',
  },
  mainOnlyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 10,
  },
  mainOnlyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainOnlyIconBoxActive: {
    backgroundColor: '#FBBF2420',
  },
  mainOnlyTexts: {
    flex: 1,
  },
  mainOnlyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  mainOnlyTitleActive: {
    color: '#FBBF24',
  },
  mainOnlySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: '#FBBF24',
  },
  toggleSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#94A3B8',
  },
  toggleSwitchThumbActive: {
    backgroundColor: '#0F172A',
    alignSelf: 'flex-end',
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  countBtn: {
    flex: 1,
    minWidth: 42,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBtnActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  countBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  countBtnTextActive: {
    color: '#FFFFFF',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisplay: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisplayText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  iconChoice: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChoiceActive: {
    backgroundColor: '#6366F125',
    borderColor: '#6366F1',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#131D33',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    gap: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default TaskModal;
