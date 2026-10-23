import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Character } from '../types/character';
import {
  DungeonMode,
  CharExtraEnergy,
  KinahPlannerSettingsState,
  CharacterKinahAnalysis,
} from '../types/kinah';
import {
  DEFAULT_DUNGEON_MODES,
  calculateKinahPlanner,
} from '../utils/kinahCalculator';
import {
  loadKinahSettings,
  saveKinahSettings,
  DEFAULT_KINAH_SETTINGS,
} from '../utils/kinahStorage';

interface KinahPlannerScreenProps {
  characters: Character[];
  onUpdateCharacter: (char: Character) => void;
  currentUser: string;
  onLogout: () => void;
  activeTab: 'roster' | 'tasks' | 'kinah';
  onTabChange: (tab: 'roster' | 'tasks' | 'kinah') => void;
  onSelectCharacter?: (id: string) => void;
}

export default function KinahPlannerScreen({
  characters,
  onUpdateCharacter,
  currentUser,
  onLogout,
  activeTab,
  onTabChange,
  onSelectCharacter,
}: KinahPlannerScreenProps) {
  const [settings, setSettings] = useState<KinahPlannerSettingsState>(DEFAULT_KINAH_SETTINGS);
  const [selectedCharForExtra, setSelectedCharForExtra] = useState<Character | null>(null);
  const [extraCraftCharInput, setExtraCraftCharInput] = useState('0');
  const [extraCraftServerInput, setExtraCraftServerInput] = useState('0');
  const [extraShopStonesInput, setExtraShopStonesInput] = useState('0');
  const [isExtraModalVisible, setIsExtraModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isRewardInfoModalVisible, setIsRewardInfoModalVisible] = useState(false);
  const [rewardInfoTab, setRewardInfoTab] = useState<'conquest' | 'transcend'>('conquest');

  // Load user settings on mount
  useEffect(() => {
    if (currentUser) {
      loadKinahSettings(currentUser).then((s) => {
        setSettings(s);
      });
    }
  }, [currentUser]);

  // Handle play count update
  const handleUpdatePlayCount = (type: 'conquest' | 'transcend', value: number) => {
    const safeVal = Math.max(0, value);
    const updated: KinahPlannerSettingsState = {
      ...settings,
      conquestPlayCount: type === 'conquest' ? safeVal : settings.conquestPlayCount,
      transcendPlayCount: type === 'transcend' ? safeVal : settings.transcendPlayCount,
    };
    setSettings(updated);
    saveKinahSettings(currentUser, updated);
  };

  // Toggle Odyle Status for a character
  const handleToggleOdyle = (char: Character) => {
    const newStatus = char.odyleStatus === 'OutOfOdyle' ? 'Available' : 'OutOfOdyle';
    const updatedChar: Character = {
      ...char,
      odyleStatus: newStatus,
    };
    onUpdateCharacter(updatedChar);
  };

  // Set initial GS snapshot (Weekly reset helper)
  const handleSnapshotGsInitial = () => {
    const map: Record<string, number> = {};
    characters.forEach((c) => {
      map[c.id] = c.gs;
      onUpdateCharacter({ ...c, gsInitial: c.gs });
    });
    const updated: KinahPlannerSettingsState = {
      ...settings,
      gsInitialMap: map,
    };
    setSettings(updated);
    saveKinahSettings(currentUser, updated);
    
    if (Platform.OS === 'web') {
      window.alert('GS Awal Minggu Ini berhasil disimpan untuk semua karakter!');
    } else {
      Alert.alert('Sukses', 'GS Awal Minggu Ini berhasil disimpan untuk semua karakter!');
    }
  };

  // Reset weekly play count
  const handleResetWeeklyPlayCount = () => {
    const doReset = () => {
      const updated: KinahPlannerSettingsState = {
        ...settings,
        conquestPlayCount: 0,
        transcendPlayCount: 0,
      };
      setSettings(updated);
      saveKinahSettings(currentUser, updated);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Reset play count Conquest & Transcend ke 0 untuk awal minggu?')) {
        doReset();
      }
    } else {
      Alert.alert(
        'Reset Play Count',
        'Reset play count Conquest & Transcend ke 0 untuk awal minggu baru?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: doReset },
        ]
      );
    }
  };

  // Open modal to configure extra cubes (craft & shop) for a character
  const openExtraConfigModal = (char: Character) => {
    setSelectedCharForExtra(char);
    const existing = settings.charExtras[char.id] || { craftChar: 0, craftServer: 0, shopStones: 0 };
    setExtraCraftCharInput(String(existing.craftChar || 0));
    setExtraCraftServerInput(String(existing.craftServer || 0));
    setExtraShopStonesInput(String(existing.shopStones || 0));
    setIsExtraModalVisible(true);
  };

  const handleSaveExtraConfig = () => {
    if (!selectedCharForExtra) return;
    const craftChar = Math.max(0, parseInt(extraCraftCharInput, 10) || 0);
    const craftServer = Math.max(0, parseInt(extraCraftServerInput, 10) || 0);
    const shopStones = Math.max(0, parseInt(extraShopStonesInput, 10) || 0);

    const updatedExtras: Record<string, CharExtraEnergy> = {
      ...settings.charExtras,
      [selectedCharForExtra.id]: { craftChar, craftServer, shopStones },
    };

    const updated: KinahPlannerSettingsState = {
      ...settings,
      charExtras: updatedExtras,
    };
    setSettings(updated);
    saveKinahSettings(currentUser, updated);
    setIsExtraModalVisible(false);
  };

  // Calculation report derived via memo
  const report = useMemo(() => {
    return calculateKinahPlanner(characters, settings, DEFAULT_DUNGEON_MODES);
  }, [characters, settings]);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const formatKina = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return String(num);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="gold" size={20} color="#10B981" />
            </View>
            <View>
              <Text style={styles.headerTitle}>KINAH OPTIMIZER</Text>
              <Text style={styles.headerSubtitle}>Weekly Profit & GS Upgrade Planner</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => setIsRewardInfoModalVisible(true)}
            >
              <MaterialCommunityIcons name="table-headers-eye" size={16} color="#10B981" />
              <Text style={[styles.actionBtnSecondaryText, { color: '#10B981' }]}>Reward Tier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => setIsHelpModalVisible(true)}
            >
              <MaterialCommunityIcons name="help-circle-outline" size={16} color="#94A3B8" />
              <Text style={styles.actionBtnSecondaryText}>Guide</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={handleSnapshotGsInitial}
            >
              <MaterialCommunityIcons name="camera-timer" size={16} color="#38BDF8" />
              <Text style={[styles.actionBtnSecondaryText, { color: '#38BDF8' }]}>Lock GS Awal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={handleResetWeeklyPlayCount}
            >
              <MaterialCommunityIcons name="refresh" size={16} color="#FBBF24" />
              <Text style={[styles.actionBtnSecondaryText, { color: '#FBBF24' }]}>Reset Play</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <MaterialCommunityIcons name="logout-variant" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Global Navigation Tabs */}
        <View style={styles.headerNavTabs}>
          <TouchableOpacity
            style={[styles.headerNavTab, activeTab === 'roster' && styles.headerNavTabActive]}
            onPress={() => onTabChange('roster')}
          >
            <MaterialCommunityIcons
              name="shield-account"
              size={14}
              color={activeTab === 'roster' ? '#6366F1' : '#94A3B8'}
            />
            <Text
              style={[
                styles.headerNavTabText,
                activeTab === 'roster' && styles.headerNavTabTextActive,
              ]}
            >
              ROSTER & GEAR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerNavTab, activeTab === 'tasks' && styles.headerNavTabActiveTasks]}
            onPress={() => onTabChange('tasks')}
          >
            <MaterialCommunityIcons
              name="calendar-check"
              size={14}
              color={activeTab === 'tasks' ? '#FBBF24' : '#94A3B8'}
            />
            <Text
              style={[
                styles.headerNavTabText,
                activeTab === 'tasks' && { color: '#FBBF24', fontWeight: '800' },
              ]}
            >
              DAILY & WEEKLY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerNavTab, activeTab === 'kinah' && styles.headerNavTabActiveKinah]}
            onPress={() => onTabChange('kinah')}
          >
            <MaterialCommunityIcons
              name="gold"
              size={14}
              color={activeTab === 'kinah' ? '#10B981' : '#94A3B8'}
            />
            <Text
              style={[
                styles.headerNavTabText,
                activeTab === 'kinah' && { color: '#10B981', fontWeight: '800' },
              ]}
            >
              KINAH PLANNER
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {/* TOP HERO STATS: 4 Metrics */}
        <View style={styles.heroStatsGrid}>
          {/* Card 1: Net Kinah */}
          <View style={[styles.heroCard, styles.heroCardHighlight]}>
            <View style={styles.heroCardHeader}>
              <MaterialCommunityIcons name="wallet-giftcard" size={18} color="#10B981" />
              <Text style={styles.heroCardLabel}>PREDIKSI KINA BERSIH</Text>
            </View>
            <Text style={styles.heroCardBigVal}>{formatNumber(report.predictedTotalNet)}</Text>
            <View style={styles.heroCardFootnote}>
              <Text style={styles.heroCardSub}>
                Kotor: {formatKina(report.predictedTotalGross)} • Biaya: -{formatKina(report.totalCraftAndShopCost)}
              </Text>
            </View>
          </View>

          {/* Card 2: Cube Usage */}
          <View style={styles.heroCard}>
            <View style={styles.heroCardHeader}>
              <MaterialCommunityIcons name="cube-outline" size={18} color="#38BDF8" />
              <Text style={styles.heroCardLabel}>CUBE TERPAKAI</Text>
            </View>
            <View style={styles.valWithUnitRow}>
              <Text style={styles.heroCardBigVal}>{report.usedCubes}</Text>
              <Text style={styles.heroCardUnit}>/ {report.totalCapacityCubes} cube</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      100,
                      report.totalCapacityCubes > 0 ? (report.usedCubes / report.totalCapacityCubes) * 100 : 0
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.heroCardSub}>Sisa {report.remainingCubes} cube minggu ini</Text>
          </View>

          {/* Card 3: Earned vs Remaining */}
          <View style={styles.heroCard}>
            <View style={styles.heroCardHeader}>
              <MaterialCommunityIcons name="cash-check" size={18} color="#FBBF24" />
              <Text style={styles.heroCardLabel}>KINA SUDAH DIDAPAT</Text>
            </View>
            <Text style={styles.heroCardBigVal}>{formatNumber(report.kinaAlreadyEarned)}</Text>
            <Text style={styles.heroCardSub}>
              Sisa perkiraan: +{formatNumber(report.predictedRemainingKina)}
            </Text>
          </View>

          {/* Card 4: Expenses */}
          <View style={styles.heroCard}>
            <View style={styles.heroCardHeader}>
              <MaterialCommunityIcons name="tools" size={18} color="#F43F5E" />
              <Text style={styles.heroCardLabel}>BIAYA CRAFT & SHOP</Text>
            </View>
            <Text style={styles.heroCardBigVal}>{formatNumber(report.totalCraftAndShopCost)}</Text>
            <Text style={styles.heroCardSub}>Craft: 50K/ea • Shop: 100K/ea</Text>
          </View>
        </View>

        {/* SECTION 1: PLAY COUNT INPUT & TIER DASHBOARD */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="counter" size={18} color="#6366F1" />
            <Text style={styles.sectionTitle}>1. PLAY COUNT & BRACKET TIER MINGGU INI</Text>
          </View>

          <View style={styles.playCountGrid}>
            {/* Conquest Box */}
            <View style={styles.playCountBox}>
              <View style={styles.playCountBoxHeader}>
                <View style={styles.tagConquest}>
                  <Text style={styles.tagConquestText}>CONQUEST</Text>
                </View>
                <View style={styles.tierPill}>
                  <Text style={styles.tierPillText}>
                    Tier Saat Ini: {(report.conquestTier.currentMultiplier * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleUpdatePlayCount('conquest', settings.conquestPlayCount - 1)}
                >
                  <MaterialCommunityIcons name="minus" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TextInput
                  style={styles.counterInput}
                  keyboardType="numeric"
                  value={String(settings.conquestPlayCount)}
                  onChangeText={(val) => {
                    const parsed = parseInt(val, 10);
                    handleUpdatePlayCount('conquest', isNaN(parsed) ? 0 : parsed);
                  }}
                />

                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleUpdatePlayCount('conquest', settings.conquestPlayCount + 1)}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.tierStatusRow}>
                {report.conquestTier.playsUntilTierDrop === 'max' ? (
                  <Text style={styles.tierStatusTextGreen}>Tier terakhir (multiplier terendah 20%)</Text>
                ) : (
                  <Text style={styles.tierStatusTextWarning}>
                    <Text style={styles.boldText}>{report.conquestTier.playsUntilTierDrop} play lagi</Text> sebelum
                    tier turun ke {(report.conquestTier.nextMultiplier! * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
            </View>

            {/* Transcend Box */}
            <View style={styles.playCountBox}>
              <View style={styles.playCountBoxHeader}>
                <View style={styles.tagTranscend}>
                  <Text style={styles.tagTranscendText}>TRANSCEND</Text>
                </View>
                <View style={styles.tierPill}>
                  <Text style={styles.tierPillText}>
                    Tier Saat Ini: {(report.transcendTier.currentMultiplier * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleUpdatePlayCount('transcend', settings.transcendPlayCount - 1)}
                >
                  <MaterialCommunityIcons name="minus" size={18} color="#94A3B8" />
                </TouchableOpacity>

                <TextInput
                  style={styles.counterInput}
                  keyboardType="numeric"
                  value={String(settings.transcendPlayCount)}
                  onChangeText={(val) => {
                    const parsed = parseInt(val, 10);
                    handleUpdatePlayCount('transcend', isNaN(parsed) ? 0 : parsed);
                  }}
                />

                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => handleUpdatePlayCount('transcend', settings.transcendPlayCount + 1)}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.tierStatusRow}>
                {report.transcendTier.playsUntilTierDrop === 'max' ? (
                  <Text style={styles.tierStatusTextGreen}>Tier terakhir (multiplier terendah 20%)</Text>
                ) : (
                  <Text style={styles.tierStatusTextWarning}>
                    <Text style={styles.boldText}>{report.transcendTier.playsUntilTierDrop} play lagi</Text> sebelum
                    tier turun ke {(report.transcendTier.nextMultiplier! * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 2: SMART RECOMMENDATIONS HERO CARDS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>2. REKOMENDASI CEPAT</Text>
          </View>

          <View style={styles.recommendationsList}>
            {/* Play Now */}
            <View style={[styles.recCard, styles.recCardPlayNow]}>
              <View style={styles.recIconWrapPlayNow}>
                <MaterialCommunityIcons name="play-circle" size={24} color="#10B981" />
              </View>
              <View style={styles.recContent}>
                <Text style={styles.recLabelPlayNow}>MAIN SEKARANG</Text>
                {report.playNowChar ? (
                  <Text style={styles.recHighlight}>
                    <Text style={styles.boldWhite}>{report.playNowChar.characterName}</Text>
                    {'  ❯  '}
                    <Text style={styles.boldGreen}>{report.playNowChar.bestMode.name}</Text>
                    <Text style={styles.recDetailText}>
                      {' '}
                      (~{formatNumber(report.playNowChar.kinaPerCubeCurrent)} kina / cube)
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.recDetailText}>
                    Semua karakter Odyle habis atau belum memenuhi batas GS dungeon.
                  </Text>
                )}
              </View>
            </View>

            {/* Play Next */}
            <View style={[styles.recCard, styles.recCardPlayNext]}>
              <View style={styles.recIconWrapPlayNext}>
                <MaterialCommunityIcons name="step-forward" size={24} color="#38BDF8" />
              </View>
              <View style={styles.recContent}>
                <Text style={styles.recLabelPlayNext}>BERIKUTNYA</Text>
                {report.playNextChar ? (
                  <Text style={styles.recHighlight}>
                    <Text style={styles.boldWhite}>{report.playNextChar.characterName}</Text>
                    {'  ❯  '}
                    <Text style={styles.boldBlue}>{report.playNextChar.bestMode.name}</Text>
                    <Text style={styles.recDetailText}>
                      {' '}
                      (~{formatNumber(report.playNextChar.kinaPerCubeCurrent)} kina / cube)
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.recDetailText}>Tidak ada karakter antrean berikutnya.</Text>
                )}
              </View>
            </View>

            {/* Upgrade GS Priority */}
            <View style={[styles.recCard, styles.recCardUpgrade]}>
              <View style={styles.recIconWrapUpgrade}>
                <MaterialCommunityIcons name="arrow-up-bold-circle" size={24} color="#A855F7" />
              </View>
              <View style={styles.recContent}>
                <Text style={styles.recLabelUpgrade}>PRIORITAS NAIKKAN GS</Text>
                {report.upgradePriorityChar && report.upgradePriorityChar.bestTargetMode ? (
                  <Text style={styles.recHighlight}>
                    <Text style={styles.boldWhite}>{report.upgradePriorityChar.characterName}</Text>
                    {'  ❯  '}
                    <Text style={styles.boldPurple}>
                      {report.upgradePriorityChar.bestTargetMode.name} ({report.upgradePriorityChar.bestTargetMode.minGs})
                    </Text>
                    <Text style={styles.recDetailText}>
                      {' '}
                      (Kurang {report.upgradePriorityChar.kurangGs} GS, potensi +
                      {formatNumber(report.upgradePriorityChar.tambahKinaMinggu)} kina/minggu •{' '}
                      +{report.upgradePriorityChar.tambahPerGs.toFixed(0)} kina/GS)
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.recDetailText}>Tidak ada tier dungeon lebih tinggi yang bisa dibuka.</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 3: KARAKTER OPTIMIZER TABLE & CARDS */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRowBetween}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="account-group" size={18} color="#38BDF8" />
              <Text style={styles.sectionTitle}>3. TABEL OPTIMASI KARAKTER</Text>
            </View>
            <Text style={styles.charCountBadge}>{report.characterAnalyses.length} Karakter</Text>
          </View>

          <View style={styles.charsListContainer}>
            {report.characterAnalyses.map((charAnalysis, idx) => {
              const isOdyleAvailable = charAnalysis.odyleStatus === 'Available';
              const origChar = characters.find((c) => c.id === charAnalysis.characterId);

              return (
                <View
                  key={charAnalysis.characterId}
                  style={[
                    styles.charCard,
                    !isOdyleAvailable && styles.charCardDimmed,
                    charAnalysis.playOrderRank === 1 && styles.charCardPlayNowBorder,
                  ]}
                >
                  {/* Card Header Row */}
                  <View style={styles.charCardTopRow}>
                    <View style={styles.charIdentity}>
                      <TouchableOpacity
                        onPress={() => onSelectCharacter?.(charAnalysis.characterId)}
                        style={styles.charNameTouch}
                      >
                        <Text style={styles.charNameText}>{charAnalysis.characterName}</Text>
                        <MaterialCommunityIcons name="open-in-new" size={13} color="#64748B" />
                      </TouchableOpacity>

                      <View style={styles.gsTagsRow}>
                        <View style={styles.gsBadge}>
                          <Text style={styles.gsBadgeText}>{charAnalysis.gs} GS</Text>
                        </View>
                        {charAnalysis.gsGain !== 0 && (
                          <View
                            style={[
                              styles.gsGainBadge,
                              charAnalysis.gsGain > 0 ? styles.gsGainPositive : styles.gsGainNegative,
                            ]}
                          >
                            <Text
                              style={[
                                styles.gsGainBadgeText,
                                charAnalysis.gsGain > 0 ? styles.textGreen : styles.textRed,
                              ]}
                            >
                              {charAnalysis.gsGain > 0 ? `+${charAnalysis.gsGain}` : charAnalysis.gsGain} GS
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Odyle Toggle Switch */}
                    <View style={styles.charTopRightActions}>
                      <TouchableOpacity
                        style={[
                          styles.odyleToggleBtn,
                          isOdyleAvailable ? styles.odyleBtnAvailable : styles.odyleBtnOutOfOdyle,
                        ]}
                        onPress={() => origChar && handleToggleOdyle(origChar)}
                      >
                        <MaterialCommunityIcons
                          name={isOdyleAvailable ? 'lightning-bolt' : 'lightning-bolt-outline'}
                          size={14}
                          color={isOdyleAvailable ? '#10B981' : '#EF4444'}
                        />
                        <Text
                          style={[
                            styles.odyleBtnText,
                            isOdyleAvailable ? styles.textGreen : styles.textRed,
                          ]}
                        >
                          {isOdyleAvailable ? 'Odyle Tersedia' : 'Odyle Habis'}
                        </Text>
                      </TouchableOpacity>

                      {/* Cube Extra Energy Config Button */}
                      <TouchableOpacity
                        style={styles.extraCubesBtn}
                        onPress={() => origChar && openExtraConfigModal(origChar)}
                      >
                        <MaterialCommunityIcons name="battery-charging-high" size={15} color="#38BDF8" />
                        <Text style={styles.extraCubesBtnText}>{charAnalysis.cubesCapacity} C</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Card Main Info Grid */}
                  <View style={styles.charDetailsGrid}>
                    {/* Urutan Main */}
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLabel}>Urutan Main</Text>
                      {isOdyleAvailable ? (
                        <View
                          style={[
                            styles.rankPill,
                            charAnalysis.playOrderRank === 1 && styles.rankPillGold,
                            charAnalysis.playOrderRank === 2 && styles.rankPillBlue,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rankPillText,
                              charAnalysis.playOrderRank === 1 && styles.textGold,
                              charAnalysis.playOrderRank === 2 && styles.textBlue,
                            ]}
                          >
                            {charAnalysis.playOrderRank === 1
                              ? '🏆 #1 MAIN'
                              : charAnalysis.playOrderRank === 2
                              ? '🥈 #2 LALU'
                              : `#${charAnalysis.playOrderRank}`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.mutedText}>- (Odyle Habis)</Text>
                      )}
                    </View>

                    {/* Mode Terbaik & Yield */}
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLabel}>Mode Terbaik</Text>
                      <View style={styles.modeRow}>
                        <View style={styles.modePill}>
                          <Text style={styles.modePillText}>{charAnalysis.bestMode.name}</Text>
                        </View>
                        <Text style={styles.modeYieldText}>
                          {formatNumber(charAnalysis.kinaPerCubeCurrent)}/cube
                        </Text>
                      </View>
                    </View>

                    {/* Target Tier & Upgrade Opportunity */}
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLabel}>Target Upgrade</Text>
                      {charAnalysis.bestTargetMode ? (
                        <View>
                          <Text style={styles.targetModeText}>
                            {charAnalysis.bestTargetMode.name} ({charAnalysis.bestTargetMode.minGs})
                          </Text>
                          <Text style={styles.targetDiffText}>
                            Kurang {charAnalysis.kurangGs} GS • +{formatKina(charAnalysis.tambahKinaMinggu)}/wk
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.mutedText}>Maksimal</Text>
                      )}
                    </View>

                    {/* Prioritas Naik GS Rank */}
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLabel}>Prioritas Naik GS</Text>
                      {charAnalysis.upgradePriorityRank !== null ? (
                        <View
                          style={[
                            styles.upgradeRankPill,
                            charAnalysis.upgradePriorityRank === 1 && styles.upgradeRankPillTop,
                          ]}
                        >
                          <Text
                            style={[
                              styles.upgradeRankPillText,
                              charAnalysis.upgradePriorityRank === 1 && styles.textPurple,
                            ]}
                          >
                            {charAnalysis.upgradePriorityRank === 1
                              ? '⭐ PRIORITAS #1'
                              : `Prioritas #${charAnalysis.upgradePriorityRank}`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.mutedText}>-</Text>
                      )}
                    </View>

                    {/* Gear Missing Status */}
                    <View style={styles.detailCol}>
                      <Text style={styles.detailColLabel}>Gear Checklist</Text>
                      <TouchableOpacity
                        onPress={() => onSelectCharacter?.(charAnalysis.characterId)}
                        style={styles.gearSummaryRow}
                      >
                        <MaterialCommunityIcons
                          name={charAnalysis.totalMissingCount === 0 ? 'check-decagram' : 'alert-circle-outline'}
                          size={14}
                          color={charAnalysis.totalMissingCount === 0 ? '#10B981' : '#F59E0B'}
                        />
                        <Text
                          style={[
                            styles.gearSummaryText,
                            charAnalysis.totalMissingCount === 0 ? styles.textGreen : styles.textYellow,
                          ]}
                        >
                          {charAnalysis.totalMissingCount === 0
                            ? 'Lengkap (0/14)'
                            : `${charAnalysis.totalMissingCount} item kurang (A:${charAnalysis.missingAccCount}/G:${charAnalysis.missingGearCount})`}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Advice Footer */}
                  <View style={styles.adviceBanner}>
                    <MaterialCommunityIcons name="information-outline" size={13} color="#94A3B8" />
                    <Text style={styles.adviceText}>{charAnalysis.advice}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* SECTION 4: RENCANA PER MODE BREAKDOWN */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="view-grid" size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>4. RENCANA PER MODE DUNGEON</Text>
          </View>

          <View style={styles.modePlansGrid}>
            {report.modePlans.map((mp) => {
              const hasCubes = mp.plannedCubes > 0;
              return (
                <View
                  key={mp.mode.id}
                  style={[styles.modePlanCard, hasCubes && styles.modePlanCardActive]}
                >
                  <View style={styles.modePlanHeader}>
                    <View
                      style={[
                        styles.modeBadge,
                        mp.mode.category === 'Conquest' ? styles.modeBadgeConquest : styles.modeBadgeTranscend,
                      ]}
                    >
                      <Text style={styles.modeBadgeText}>{mp.mode.name}</Text>
                    </View>
                    <Text style={styles.modeCategoryText}>{mp.mode.category}</Text>
                  </View>

                  <Text style={styles.modeRewardText}>100% Reward: {formatNumber(mp.mode.reward)}</Text>
                  <Text style={styles.modeMinGsText}>Min GS: {mp.mode.minGs}</Text>

                  <View style={styles.modeStatRow}>
                    <Text style={styles.modeStatLabel}>Cube Direncanakan:</Text>
                    <Text style={[styles.modeStatVal, hasCubes && styles.textWhite]}>
                      {mp.plannedCubes} cube
                    </Text>
                  </View>

                  <View style={styles.modeStatRow}>
                    <Text style={styles.modeStatLabel}>Kina Prediksi:</Text>
                    <Text style={[styles.modeStatVal, hasCubes && styles.textGreen]}>
                      {formatNumber(mp.predictedKina)}
                    </Text>
                  </View>

                  {hasCubes && (
                    <View style={styles.modeStatRow}>
                      <Text style={styles.modeStatLabel}>Rata-rata/cube:</Text>
                      <Text style={styles.modeStatValHighlight}>{formatNumber(Math.round(mp.avgPerCube))}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* MODAL: Configure Character Extra Cubes (Craft & Shop) */}
      <Modal
        visible={isExtraModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExtraModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <MaterialCommunityIcons name="battery-charging-high" size={20} color="#38BDF8" />
                <Text style={styles.modalTitle}>
                  Energi Tambahan: {selectedCharForExtra?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsExtraModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Kapasitas dasar gratis: 21 cube/minggu (840 energi). Tambahkan craft & shop stone di sini:
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>
                Craft Karakter (maks 4 / minggu) — 50.000 kina/ea:
              </Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={extraCraftCharInput}
                onChangeText={setExtraCraftCharInput}
                placeholder="0"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>
                Craft Server Dialokasikan (maks 16 total server) — 50.000 kina/ea:
              </Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={extraCraftServerInput}
                onChangeText={setExtraCraftServerInput}
                placeholder="0"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>
                Beli Shop Stone (maks 20 / minggu) — 100.000 kina/ea:
              </Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={extraShopStonesInput}
                onChangeText={setExtraShopStonesInput}
                placeholder="0"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setIsExtraModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={handleSaveExtraConfig}
              >
                <Text style={styles.modalBtnConfirmText}>Simpan Kapasitas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: Info Reward Tier & Mode */}
      <Modal
        visible={isRewardInfoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRewardInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { maxWidth: 650 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <MaterialCommunityIcons name="table-headers-eye" size={20} color="#10B981" />
                <Text style={styles.modalTitle}>Info Reward Tiap Tier & Mode</Text>
              </View>
              <TouchableOpacity onPress={() => setIsRewardInfoModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Modal Subtabs */}
            <View style={styles.rewardModalTabs}>
              <TouchableOpacity
                style={[
                  styles.rewardModalTab,
                  rewardInfoTab === 'conquest' && styles.rewardModalTabActiveConquest,
                ]}
                onPress={() => setRewardInfoTab('conquest')}
              >
                <MaterialCommunityIcons
                  name="sword"
                  size={14}
                  color={rewardInfoTab === 'conquest' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.rewardModalTabText,
                    rewardInfoTab === 'conquest' && { color: '#38BDF8', fontWeight: '800' },
                  ]}
                >
                  CONQUEST DUNGEON
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rewardModalTab,
                  rewardInfoTab === 'transcend' && styles.rewardModalTabActiveTranscend,
                ]}
                onPress={() => setRewardInfoTab('transcend')}
              >
                <MaterialCommunityIcons
                  name="shield-sun"
                  size={14}
                  color={rewardInfoTab === 'transcend' ? '#A855F7' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.rewardModalTabText,
                    rewardInfoTab === 'transcend' && { color: '#A855F7', fontWeight: '800' },
                  ]}
                >
                  TRANSCENDENCE (TC)
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380, marginTop: 12 }}>
              {rewardInfoTab === 'conquest' ? (
                <View style={styles.rewardTable}>
                  {/* Table Header */}
                  <View style={styles.rewardTableHeader}>
                    <Text style={[styles.rewardTh, { flex: 1.4 }]}>Tier</Text>
                    <Text style={[styles.rewardTh, { flex: 2.2 }]}>Dungeon</Text>
                    <Text style={[styles.rewardTh, { flex: 1, textAlign: 'center' }]}>Min GS</Text>
                    <Text style={[styles.rewardTh, { flex: 1.4, textAlign: 'right' }]}>Reward (100%)</Text>
                  </View>

                  {/* Rows */}
                  <View style={styles.rewardTableRow}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={styles.boldWhite}>T1 (★) Normal</Text>
                    </View>
                    <Text style={[styles.rewardTdText, { flex: 2.2 }]}>Krao Cave, Draupnir</Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center', color: '#38BDF8' }]}>
                      700
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      200.000
                    </Text>
                  </View>

                  <View style={[styles.rewardTableRow, styles.rewardTableRowAlt]}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={styles.boldWhite}>T1 (★) Hard</Text>
                    </View>
                    <Text style={[styles.rewardTdText, { flex: 2.2 }]}>Krao Cave, Draupnir</Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center', color: '#38BDF8' }]}>
                      2.600
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      480.000
                    </Text>
                  </View>

                  <View style={styles.rewardTableRow}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={styles.boldWhite}>T2 (★★)</Text>
                    </View>
                    <Text style={[styles.rewardTdText, { flex: 2.2 }]}>Urugugu Canyon, Vakron Sky Island</Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center', color: '#38BDF8' }]}>
                      1.400
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      300.000
                    </Text>
                  </View>

                  <View style={[styles.rewardTableRow, styles.rewardTableRowAlt]}>
                    <View style={{ flex: 1.4 }}>
                      <Text style={styles.boldWhite}>T3 (★★★)</Text>
                    </View>
                    <Text style={[styles.rewardTdText, { flex: 2.2 }]}>Fire Temple, Ferocious Horn Den</Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center', color: '#38BDF8' }]}>
                      2.100
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      400.000
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.rewardTable}>
                  {/* Table Header */}
                  <View style={styles.rewardTableHeader}>
                    <Text style={[styles.rewardTh, { flex: 1 }]}>Stage</Text>
                    <Text style={[styles.rewardTh, { flex: 1.2, textAlign: 'center' }]}>Min GS</Text>
                    <Text style={[styles.rewardTh, { flex: 1.4, textAlign: 'right' }]}>Reward (100%)</Text>
                    <Text style={[styles.rewardTh, { flex: 1, textAlign: 'center' }]}>Pemain</Text>
                    <Text style={[styles.rewardTh, { flex: 1.4 }]}>Efek Stage</Text>
                  </View>

                  {/* Rows */}
                  <View style={styles.rewardTableRow}>
                    <Text style={[styles.boldWhite, { flex: 1 }]}>S1</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.2, textAlign: 'center', color: '#A855F7' }]}>
                      1.600
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      300.000
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center' }]}>2-5</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, color: '#94A3B8' }]}>tidak ada</Text>
                  </View>

                  <View style={[styles.rewardTableRow, styles.rewardTableRowAlt]}>
                    <Text style={[styles.boldWhite, { flex: 1 }]}>S2</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.2, textAlign: 'center', color: '#A855F7' }]}>
                      1.900
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      360.000
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center' }]}>2-5</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, color: '#FBBF24', fontWeight: '700' }]}>
                      1 efek
                    </Text>
                  </View>

                  <View style={styles.rewardTableRow}>
                    <Text style={[styles.boldWhite, { flex: 1 }]}>S3</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.2, textAlign: 'center', color: '#A855F7' }]}>
                      2.200
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      420.000
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center' }]}>2-5</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, color: '#FBBF24', fontWeight: '700' }]}>
                      2 efek
                    </Text>
                  </View>

                  <View style={[styles.rewardTableRow, styles.rewardTableRowAlt]}>
                    <Text style={[styles.boldWhite, { flex: 1 }]}>S4</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.2, textAlign: 'center', color: '#A855F7' }]}>
                      2.500
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, textAlign: 'right', color: '#10B981', fontWeight: '700' }]}>
                      480.000
                    </Text>
                    <Text style={[styles.rewardTdText, { flex: 1, textAlign: 'center' }]}>2-5</Text>
                    <Text style={[styles.rewardTdText, { flex: 1.4, color: '#FBBF24', fontWeight: '700' }]}>
                      3 efek
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtnConfirm, { marginTop: 16 }]}
              onPress={() => setIsRewardInfoModalVisible(false)}
            >
              <Text style={styles.modalBtnConfirmText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: Guide & Assumptions */}
      <Modal
        visible={isHelpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { maxWidth: 600 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <MaterialCommunityIcons name="book-open-outline" size={20} color="#10B981" />
                <Text style={styles.modalTitle}>Panduan Kinah Planner</Text>
              </View>
              <TouchableOpacity onPress={() => setIsHelpModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400, marginTop: 12 }}>
              <Text style={styles.helpHeading}>Cara Pakai:</Text>
              <Text style={styles.helpParagraph}>
                1. <Text style={styles.boldWhite}>Play Count:</Text> Isi angka play count Conquest dan Transcend yang sedang berjalan di game.
              </Text>
              <Text style={styles.helpParagraph}>
                2. <Text style={styles.boldWhite}>Odyle Status:</Text> Tekan tombol hijau/merah di tiap karakter. Karakter dengan Odyle Habis akan dilewati dari urutan bermain tanpa mengurangi prediksi mingguan.
              </Text>
              <Text style={styles.helpParagraph}>
                3. <Text style={styles.boldWhite}>Rekomendasi Main Sekarang:</Text> Menunjukkan karakter mana yang menghasilkan kina per cube tertinggi untuk dimainkan pada giliran berikutnya.
              </Text>
              <Text style={styles.helpParagraph}>
                4. <Text style={styles.boldWhite}>Prioritas Naik GS:</Text> Dihitung dengan mensimulasikan kenaikan reward jika karakter pindah ke tier mode lebih tinggi, dibagi selisih GS yang dibutuhkan. Karakter dengan nilai kina/GS tertinggi mendapat Prioritas #1!
              </Text>
              <Text style={styles.helpParagraph}>
                5. <Text style={styles.boldWhite}>Reset Setiap Senin:</Text> Tekan "Reset Play" untuk mengembalikan play count ke 0, dan "Lock GS Awal" untuk menetapkan GS awal minggu ini.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalBtnConfirm, { marginTop: 16 }]}
              onPress={() => setIsHelpModalVisible(false)}
            >
              <Text style={styles.modalBtnConfirmText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A10',
  },
  header: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingTop: Platform.OS === 'web' ? 14 : 40,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnSecondaryText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNavTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerNavTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerNavTabActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
  },
  headerNavTabActiveTasks: {
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
  },
  headerNavTabActiveKinah: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  headerNavTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  headerNavTabTextActive: {
    color: '#818CF8',
    fontWeight: '800',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 60,
    maxWidth: Platform.OS === 'web' ? 1200 : undefined,
    width: '100%',
    alignSelf: 'center',
  },
  heroStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  heroCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 240 : '47%',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
  },
  heroCardHighlight: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  heroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroCardLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroCardBigVal: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroCardUnit: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    marginBottom: 3,
  },
  valWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  heroCardSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  heroCardFootnote: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  sectionCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  charCountBadge: {
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  playCountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playCountBox: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 280 : '100%',
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
  },
  playCountBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tagConquest: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagConquestText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  tagTranscend: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagTranscendText: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '800',
  },
  tierPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierPillText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  counterBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  tierStatusRow: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 8,
    borderRadius: 6,
  },
  tierStatusTextWarning: {
    color: '#FBBF24',
    fontSize: 11,
  },
  tierStatusTextGreen: {
    color: '#10B981',
    fontSize: 11,
  },
  boldText: {
    fontWeight: '800',
  },
  boldWhite: {
    color: '#F8FAFC',
    fontWeight: '800',
  },
  boldGreen: {
    color: '#10B981',
    fontWeight: '800',
  },
  boldBlue: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  boldPurple: {
    color: '#A855F7',
    fontWeight: '800',
  },
  recommendationsList: {
    gap: 10,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  recCardPlayNow: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  recCardPlayNext: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  recCardUpgrade: {
    borderColor: 'rgba(168, 85, 247, 0.35)',
    backgroundColor: 'rgba(168, 85, 247, 0.05)',
  },
  recIconWrapPlayNow: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recIconWrapPlayNext: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recIconWrapUpgrade: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recContent: {
    flex: 1,
  },
  recLabelPlayNow: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recLabelPlayNext: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recLabelUpgrade: {
    color: '#A855F7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recHighlight: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  recDetailText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  charsListContainer: {
    gap: 12,
  },
  charCard: {
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
  },
  charCardDimmed: {
    opacity: 0.65,
  },
  charCardPlayNowBorder: {
    borderColor: '#10B981',
  },
  charCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 10,
  },
  charIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  charNameTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  charNameText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  gsTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gsBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gsBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  gsGainBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gsGainPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  gsGainNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  gsGainBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  charTopRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  odyleToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  odyleBtnAvailable: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  odyleBtnOutOfOdyle: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  odyleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  extraCubesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  extraCubesBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  charDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCol: {
    minWidth: 130,
    flex: 1,
  },
  detailColLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  rankPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  rankPillGold: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  rankPillBlue: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  rankPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  upgradeRankPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  upgradeRankPillTop: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  upgradeRankPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modePill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modePillText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
  },
  modeYieldText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  targetModeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  targetDiffText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  gearSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  gearSummaryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mutedText: {
    color: '#64748B',
    fontSize: 11,
  },
  textGreen: {
    color: '#10B981',
  },
  textRed: {
    color: '#EF4444',
  },
  textYellow: {
    color: '#F59E0B',
  },
  textBlue: {
    color: '#38BDF8',
  },
  textGold: {
    color: '#F59E0B',
  },
  textPurple: {
    color: '#A855F7',
  },
  textWhite: {
    color: '#F8FAFC',
  },
  adviceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
  },
  adviceText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modePlansGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modePlanCard: {
    flex: 1,
    minWidth: Platform.OS === 'web' ? 220 : '47%',
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
  },
  modePlanCardActive: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  modePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBadgeConquest: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  modeBadgeTranscend: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  modeBadgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
  },
  modeCategoryText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modeRewardText: {
    color: '#E2E8F0',
    fontSize: 11,
    marginBottom: 2,
  },
  modeMinGsText: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 8,
  },
  modeStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modeStatLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  modeStatVal: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  modeStatValHighlight: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  modalInputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 40,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F8FAFC',
    fontSize: 14,
    paddingHorizontal: 12,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  modalBtnCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalBtnCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtnConfirm: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalBtnConfirmText: {
    color: '#070A10',
    fontSize: 13,
    fontWeight: '800',
  },
  helpHeading: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  helpParagraph: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  rewardModalTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  rewardModalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rewardModalTabActiveConquest: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  rewardModalTabActiveTranscend: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderWidth: 1,
    borderColor: '#A855F7',
  },
  rewardModalTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  rewardTable: {
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    overflow: 'hidden',
  },
  rewardTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rewardTh: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rewardTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  rewardTableRowAlt: {
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
  },
  rewardTdText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
});
