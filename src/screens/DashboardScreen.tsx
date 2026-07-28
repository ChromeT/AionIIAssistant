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
  const totalMissingGear = characters.reduce((acc, char) => acc + char.missingGearCount, 0);
  const totalMissingAcc = characters.reduce((acc, char) => acc + char.missingAccessoryCount, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <RNStatusBar barStyle="light-content" backgroundColor="#070A10" />
      <View style={styles.container}>
        {/* App Title Header */}
        <View style={styles.appHeader}>
          <View style={styles.logoContainer}>
            <View>
              <Text style={styles.logoTitle}>AION II</Text>
              <Text style={styles.logoSubtitle}>CHARACTER TRACKER</Text>
            </View>
            <View style={styles.profileBadge}>
              <MaterialCommunityIcons name="account" size={10} color="#94A3B8" />
              <Text style={styles.profileBadgeText}>{currentUser}</Text>
            </View>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.addCharacterIconBtn, styles.logoutIconBtn]}
              onPress={onLogout}
            >
              <MaterialCommunityIcons name="logout" size={16} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addCharacterIconBtn}
              onPress={() => setIsAddModalVisible(true)}
            >
              <MaterialCommunityIcons name="account-plus-outline" size={18} color="#F8FAFC" />
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
              <Text style={[styles.aggValue, { color: '#F87171' }]}>
                {totalMissingGear + totalMissingAcc}
                <Text style={styles.missingSplitText}> ({totalMissingGear}G/{totalMissingAcc}A)</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <MaterialCommunityIcons name="magnify" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search characters or class..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <MaterialCommunityIcons name="close-circle" size={14} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Priority Filter Slider */}
        <View style={styles.filterWrapper}>
          <Text style={styles.filterTitleLabel}>FILTER PRIORITY</Text>
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
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <CharacterCard character={item} onPress={() => onSelectCharacter(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={40} color="#475569" />
              <Text style={styles.emptyText}>No characters found</Text>
              <Text style={styles.emptySubtext}>Try tweaking your filter or search query</Text>
            </View>
          }
        />

        {/* Floating Add Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.fab}
          onPress={() => setIsAddModalVisible(true)}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
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
    backgroundColor: '#070A10', // Deep RPG dark backdrop
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
    backgroundColor: '#1E233080',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D354850',
    gap: 4,
    marginTop: 2,
  },
  profileBadgeText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
  },
  addCharacterIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#111522',
    borderWidth: 1,
    borderColor: '#2D354860',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIconBtn: {
    borderColor: '#EF444430',
    backgroundColor: '#EF444410',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 6,
  },
  aggregatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  aggCard: {
    flex: 1,
    backgroundColor: '#111522', // Match deeper card background
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B80',
  },
  aggLabel: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  aggValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B80',
    paddingHorizontal: 10,
    marginBottom: 10,
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
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 8,
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
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default DashboardScreen;
