export interface DungeonMode {
  id: string;
  name: string;
  category: 'Conquest' | 'Transcend';
  reward: number; // 100% kina reward
  minGs: number;
  description?: string;
}

export interface PlayBracket {
  level: number;
  start: number;
  end: number;
  mult: number;
}

export interface CharExtraEnergy {
  craftChar: number;      // Craft karakter (default 0 or up to 4)
  craftServer: number;    // Craft server dialokasikan (default 0 or up to 16)
  shopStones: number;     // Beli shop stones (default 0 or up to 20)
}

export interface KinahPlannerSettingsState {
  conquestPlayCount: number;
  transcendPlayCount: number;
  charExtras: Record<string, CharExtraEnergy>; // keyed by characterId
  gsInitialMap?: Record<string, number>;        // GS awal keyed by characterId
}

export interface CharacterKinahAnalysis {
  characterId: string;
  characterName: string;
  gs: number;
  gsInitial: number;
  gsGain: number;
  odyleStatus: 'Available' | 'OutOfOdyle';
  cubesCapacity: number;
  craftChar: number;
  craftServer: number;
  shopStones: number;
  craftCost: number;
  shopCost: number;
  totalCost: number;
  
  // Best mode & current yield
  bestMode: DungeonMode;
  kinaPerCubeCurrent: number;
  
  // Play order ranking
  playOrderRank: number | null; // 1 = Main Sekarang, 2 = Berikutnya, etc. null if Out of Odyle
  
  // Upgrade simulation
  bestTargetMode: DungeonMode | null;
  kurangGs: number;
  tambahKinaMinggu: number;
  tambahPerGs: number;
  upgradePriorityRank: number | null; // 1 = Prioritas 1, etc.
  
  // Gear summary from character checklist
  missingAccCount: number;
  missingGearCount: number;
  totalMissingCount: number;
  
  advice: string;
}

export interface ModePlanBreakdown {
  mode: DungeonMode;
  plannedCubes: number;
  predictedKina: number;
  avgPerCube: number;
}

export interface TierInfo {
  category: 'Conquest' | 'Transcend';
  currentPlayCount: number;
  currentMultiplier: number;
  playsUntilTierDrop: number | 'max';
  nextMultiplier: number | null;
}

export interface KinahCalculationReport {
  // Capacity & usage
  totalCapacityCubes: number;
  usedCubes: number;
  remainingCubes: number;
  
  // Kinah projections
  kinaAlreadyEarned: number;
  predictedRemainingKina: number;
  predictedTotalGross: number;
  totalCraftAndShopCost: number;
  predictedTotalNet: number;
  
  // Tier statuses
  conquestTier: TierInfo;
  transcendTier: TierInfo;
  
  // Recommendations
  playNowChar: CharacterKinahAnalysis | null;
  playNextChar: CharacterKinahAnalysis | null;
  upgradePriorityChar: CharacterKinahAnalysis | null;
  
  // Detailed lists
  characterAnalyses: CharacterKinahAnalysis[];
  modePlans: ModePlanBreakdown[];
}
