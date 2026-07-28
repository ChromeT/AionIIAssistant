import React, { useState } from 'react';
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

const PRIORITIES: (PriorityLevel | 'All')[] = ['All', 'Extreme', 'Critical', 'High', 'Medium', 'Low'];

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  characters,
  onSelectCharacter,
  onAddCharacter,
  onLogout,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel | 'All'>('All');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Filter & Search Logic
  const filteredCharacters = characters.filter((char) => {
    const matchesSearch =
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.classType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = selectedPriority === 'All' || char.priority === selectedPriority;
    return matchesSearch && matchesPriority;
  });

  // Calculate Aggregates
  const totalCharacters = characters.length;
  const averageGs =
    totalCharacters > 0 ? Math.round(characters.reduce((acc, char) => acc + char.gs, 0) / totalCharacters) : 0;
  
  // Calculate missing items across all characters
  const totalMissingGear = characters.reduce((acc, char) => {
    if (char.useManualMissingCounts) return acc + char.missingGearCount;
    // Auto-calculate logic (unchecked armor)
    const gearKeys = ['guards', 'breastplate', 'greaves', 'helm', 'pauldrons', 'gloves', 'boots'];
    const missingCount = gearKeys.filter((key) => !char.checklist[key as keyof typeof char.checklist]).length;
    return acc + missingCount;
  }, 0);

  const totalMissingAcc = characters.reduce((acc, char) => {
    if (char.useManualMissingCounts) return acc + char.missingAccessoryCount;
    // Auto-calculate logic (unchecked accessories/weapons)
    const accKeys = ['wpn', 'earL', 'earR', 'neck', 'ringL', 'ringR', 'cloak'];
    const missingCount = accKeys.filter((key) => !char.checklist[key as keyof typeof char.checklist]).length;
    return acc + missingCount;
  }, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <RNStatusBar barStyle="light-content" backgroundColor="#0B0C10" />
      <View style={styles.container}>
        {/* App Title Header */}
        <View style={styles.appHeader}>
          <View>
            <Text style={styles.logoTitle}>AION II</Text>
            <Text style={styles.logoSubtitle}>CHARACTER TRACKER</Text>
            <Text style={styles.profileIndicator}>
              Profile: <Text style={styles.profileNameText}>{currentUser}</Text>
            </Text>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.addCharacterIconBtn, styles.logoutIconBtn]}
              onPress={onLogout}
            >
              <MaterialCommunityIcons name="logout" size={18} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addCharacterIconBtn}
              onPress={() => setIsAddModalVisible(true)}
            >
              <MaterialCommunityIcons name="account-plus-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Aggregates Dashboard Cards */}
        <View style={styles.aggregatesRow}>
          {/* Card 1: Total Characters */}
          <View style={styles.aggCard}>
            <Text style={styles.aggLabel}>CHARACTERS</Text>
            <Text style={styles.aggValue}>{totalCharacters}</Text>
          </View>
          {/* Card 2: Average GS */}
          <View style={styles.aggCard}>
            <Text style={styles.aggLabel}>AVG GS</Text>
            <Text style={[styles.aggValue, { color: '#FBBF24' }]}>{averageGs.toLocaleString()}</Text>
          </View>
          {/* Card 3: Total Missing Items */}
          <View style={styles.aggCard}>
            <Text style={styles.aggLabel}>MISSING</Text>
            <View style={styles.missingAggValRow}>
              <Text style={[styles.aggValue, { color: '#F87171' }]}>{totalMissingGear + totalMissingAcc}</Text>
              <Text style={styles.missingSplitText}>({totalMissingGear}G / {totalMissingAcc}A)</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search characters or class..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Priority Filter Slider */}
        <View style={styles.filterWrapper}>
          <Text style={styles.filterTitleLabel}>FILTER PRIORITY:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={PRIORITIES}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterSlider}
            renderItem={({ item }) => {
              const isSelected = selectedPriority === item;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedPriority(item)}
                  style={[
                    styles.filterPill,
                    isSelected && styles.selectedFilterPill,
                  ]}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.selectedFilterPillText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Character List */}
        <FlatList
          data={filteredCharacters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CharacterCard character={item} onPress={() => onSelectCharacter(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>No characters found</Text>
              <Text style={styles.emptySubtext}>Try tweaking your filter or search query</Text>
            </View>
          }
        />

        {/* Playful Floating Add Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.fab}
          onPress={() => setIsAddModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#FFFFFF" />
        </TouchableOpacity>

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
    backgroundColor: '#0B0C10',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  logoTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  logoSubtitle: {
    color: '#4F46E5', // vibrant indigo accent
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: -2,
  },
  addCharacterIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2D3548',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconBtn: {
    borderColor: '#EF444430',
    backgroundColor: '#EF444415',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  profileIndicator: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },
  profileNameText: {
    color: '#E2E8F0',
    fontWeight: '800',
  },
  aggregatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  aggCard: {
    flex: 1,
    backgroundColor: '#131A26', // clean dark card
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#20293A',
  },
  aggLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  aggValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  missingAggValRow: {
    alignItems: 'center',
  },
  missingSplitText: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2330',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3548',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 10,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterWrapper: {
    marginBottom: 8,
  },
  filterTitleLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  filterSlider: {
    gap: 8,
    paddingBottom: 4,
  },
  filterPill: {
    backgroundColor: '#131A26',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#20293A',
    marginRight: 6,
  },
  selectedFilterPill: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedFilterPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5', // vibrant purple accent
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
export default DashboardScreen;
