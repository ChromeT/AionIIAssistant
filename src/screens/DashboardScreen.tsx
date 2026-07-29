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
  ScrollView,
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

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  characters,
  onSelectCharacter,
  onAddCharacter,
  onLogout,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter & Search Logic
  const filteredCharacters = characters.filter((char) => {
    return (
      char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      char.classType.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Calculate Aggregates
  const totalCharacters = characters.length;
  const averageGs =
    totalCharacters > 0 ? Math.round(characters.reduce((acc, char) => acc + char.gs, 0) / totalCharacters) : 0;
  
  // Find character with lowest GS (Priority Character)
  let priorityCharacter: Character | null = null;
  if (totalCharacters > 0) {
    priorityCharacter = characters.reduce((lowest, char) => (char.gs < lowest.gs ? char : lowest), characters[0]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <RNStatusBar barStyle="light-content" backgroundColor="#070A10" />
      {/* Ambient Atmospheric Glows */}
      <View style={styles.ambientGlow1} />
      <View style={styles.ambientGlow2} />
      <View style={styles.container}>
        {/* App Title Header */}
        <View style={styles.appHeader}>
          <View style={styles.logoContainer}>
            <View>
              <Text style={styles.logoTitle}>AION II</Text>
              <Text style={styles.logoSubtitle}>CHARACTER TRACKER</Text>
            </View>
            <View style={styles.profileBadge}>
              <MaterialCommunityIcons name="account" size={12} color="#38BDF8" />
              <Text style={styles.profileBadgeText}>{currentUser}</Text>
            </View>
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
              <MaterialCommunityIcons name="account-plus-outline" size={18} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Aggregates Dashboard Cards */}
        <View style={styles.aggregatesRow}>
          {/* Card 1: Total Characters */}
          <View style={[styles.aggCard, { borderColor: '#6366F130' }]}>
            <View style={[styles.topColorStrip, { backgroundColor: '#6366F1' }]} />
            <View style={styles.aggCardContent}>
              <View style={[styles.aggIconCircle, { backgroundColor: '#6366F115', borderColor: '#6366F130' }]}>
                <MaterialCommunityIcons name="account-multiple" size={16} color="#6366F1" />
              </View>
              <View style={styles.aggTextColumn}>
                <Text style={styles.aggLabel}>CHARACTERS</Text>
                <Text style={styles.aggValue}>{totalCharacters}</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Average GS */}
          <View style={[styles.aggCard, { borderColor: '#FBBF2430' }]}>
            <View style={[styles.topColorStrip, { backgroundColor: '#FBBF24' }]} />
            <View style={styles.aggCardContent}>
              <View style={[styles.aggIconCircle, { backgroundColor: '#FBBF2415', borderColor: '#FBBF2430' }]}>
                <MaterialCommunityIcons name="trophy" size={15} color="#FBBF24" />
              </View>
              <View style={styles.aggTextColumn}>
                <Text style={styles.aggLabel}>AVG GS</Text>
                <Text style={[styles.aggValue, { color: '#FBBF24' }]}>{averageGs.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Card 3: Priority Character (Lowest GS) */}
          <View style={[styles.aggCard, { borderColor: '#EF444430' }]}>
            <View style={[styles.topColorStrip, { backgroundColor: '#EF4444' }]} />
            <View style={styles.aggCardContent}>
              <View style={[styles.aggIconCircle, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                <MaterialCommunityIcons name="alert-decagram" size={15} color="#EF4444" />
              </View>
              <View style={styles.aggTextColumn}>
                <Text style={styles.aggLabel}>PRIORITY CHAR</Text>
                <Text numberOfLines={1} style={[styles.aggValue, { color: '#F87171', fontSize: 13 }]}>
                  {priorityCharacter ? `${priorityCharacter.name} (${priorityCharacter.gs.toLocaleString()})` : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[
          styles.searchBarContainer,
          isSearchFocused && styles.searchBarFocused
        ]}>
          <MaterialCommunityIcons 
            name="magnify" 
            size={18} 
            color={isSearchFocused ? '#6366F1' : '#64748B'} 
            style={styles.searchIcon} 
          />
          <TextInput
            placeholder="Search characters or class..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <MaterialCommunityIcons name="close-circle" size={14} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>



        {/* Character List */}
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.cardGrid}>
            {filteredCharacters.map((item) => (
              <CharacterCard key={item.id} character={item} onPress={() => onSelectCharacter(item)} />
            ))}
          </View>
          {filteredCharacters.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={40} color="#475569" />
              <Text style={styles.emptyText}>No characters found</Text>
              <Text style={styles.emptySubtext}>Try tweaking your filter or search query</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Floating Add Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.fab}
          onPress={() => setIsAddModalVisible(true)}
        >
          <View style={styles.fabInnerRing}>
            <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
          </View>
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
    position: 'relative',
    overflow: 'hidden',
  },
  ambientGlow1: {
    position: 'absolute',
    top: -150,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#6366F1',
    opacity: 0.08,
    ...Platform.select({
      web: {
        filter: 'blur(120px)',
        pointerEvents: 'none',
      } as any,
    }),
  },
  ambientGlow2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: '#0D9488',
    opacity: 0.08,
    ...Platform.select({
      web: {
        filter: 'blur(120px)',
        pointerEvents: 'none',
      } as any,
    }),
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
    backgroundColor: '#101B2B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38BDF840',
    gap: 5,
    marginTop: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 0 10px rgba(56, 189, 248, 0.15)',
      } as any,
    }),
  },
  profileBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  addCharacterIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#161B2C',
    borderWidth: 1.5,
    borderColor: '#2D3548',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease-out',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      } as any,
    }),
  },
  logoutIconBtn: {
    borderColor: '#EF444450',
    backgroundColor: '#2C161B',
    shadowColor: '#EF4444',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aggregatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  aggCard: {
    flex: 1,
    backgroundColor: '#111522', // Match deeper card background
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  topColorStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
    zIndex: 5,
  },
  aggCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingTop: 2,
  },
  aggIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aggTextColumn: {
    flex: 1,
    justifyContent: 'center',
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
    fontWeight: '900',
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1E293B80',
    paddingHorizontal: 12,
    marginBottom: 16,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease-in-out',
      } as any,
    }),
  },
  searchBarFocused: {
    borderColor: '#6366F180',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)',
      } as any,
    }),
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
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
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    borderWidth: 2,
    borderColor: '#818CF8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  fabInnerRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DashboardScreen;
