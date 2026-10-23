import { Character } from '../types/character';
import {
  DungeonMode,
  PlayBracket,
  CharExtraEnergy,
  KinahPlannerSettingsState,
  CharacterKinahAnalysis,
  ModePlanBreakdown,
  TierInfo,
  KinahCalculationReport,
} from '../types/kinah';

export const DEFAULT_DUNGEON_MODES: DungeonMode[] = [
  { id: 'm1_norm', name: 'T1 Normal', category: 'Conquest', reward: 200000, minGs: 700, description: 'Krao Cave, Draupnir' },
  { id: 'm1', name: 'T2', category: 'Conquest', reward: 300000, minGs: 1400, description: 'Urugugu Canyon, Vakron Sky Island' },
  { id: 'm2', name: 'T3', category: 'Conquest', reward: 400000, minGs: 2100, description: 'Fire Temple, Ferocious Horn Den' },
  { id: 'm1_hard', name: 'T1 Hard', category: 'Conquest', reward: 480000, minGs: 2600, description: 'Krao Cave, Draupnir' },
  { id: 'm3', name: 'S1', category: 'Transcend', reward: 300000, minGs: 1600, description: 'Transcendence Stage 1 (2-5P)' },
  { id: 'm4', name: 'S2', category: 'Transcend', reward: 360000, minGs: 1900, description: 'Transcendence Stage 2 (Efek: 1)' },
  { id: 'm5', name: 'S3', category: 'Transcend', reward: 420000, minGs: 2200, description: 'Transcendence Stage 3 (Efek: 2)' },
  { id: 'm6', name: 'S4', category: 'Transcend', reward: 480000, minGs: 2500, description: 'Transcendence Stage 4 (Efek: 3)' },
];

export const BRACKETS: Record<'Conquest' | 'Transcend', PlayBracket[]> = {
  Conquest: [
    { level: 1, start: 0, end: 83, mult: 1.0 },
    { level: 2, start: 84, end: 104, mult: 0.8 },
    { level: 3, start: 105, end: 125, mult: 0.6 },
    { level: 4, start: 126, end: 146, mult: 0.4 },
    { level: 5, start: 147, end: 999999, mult: 0.2 },
  ],
  Transcend: [
    { level: 1, start: 0, end: 55, mult: 1.0 },
    { level: 2, start: 56, end: 69, mult: 0.8 },
    { level: 3, start: 70, end: 83, mult: 0.6 },
    { level: 4, start: 84, end: 97, mult: 0.4 },
    { level: 5, start: 98, end: 999999, mult: 0.2 },
  ],
};

export const KINAH_CONSTANTS = {
  FREE_WEEKLY_CUBES: 21,       // 840 free energy / 40 energy per cube
  COST_PER_CRAFT: 50000,       // Kina cost per craft
  COST_PER_SHOP_STONE: 100000, // Kina cost per shop stone
};

/**
 * Returns multiplier for a specific run index in a category
 */
export const getTierMultiplier = (category: 'Conquest' | 'Transcend', playCount: number): number => {
  const brackets = BRACKETS[category];
  for (const b of brackets) {
    if (playCount >= b.start && playCount <= b.end) {
      return b.mult;
    }
  }
  return 0.2;
};

/**
 * Computes tier status information for dashboard display
 */
export const getTierInfo = (category: 'Conquest' | 'Transcend', playCount: number): TierInfo => {
  const brackets = BRACKETS[category];
  const safePlay = Math.max(0, playCount);
  
  let currentMultiplier = 0.2;
  let playsUntilTierDrop: number | 'max' = 'max';
  let nextMultiplier: number | null = null;
  
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    if (safePlay >= b.start && safePlay <= b.end) {
      currentMultiplier = b.mult;
      if (b.end >= 999999) {
        playsUntilTierDrop = 'max';
        nextMultiplier = null;
      } else {
        playsUntilTierDrop = b.end - safePlay + 1;
        const nextB = brackets[i + 1];
        nextMultiplier = nextB ? nextB.mult : null;
      }
      break;
    }
  }
  
  return {
    category,
    currentPlayCount: safePlay,
    currentMultiplier,
    playsUntilTierDrop,
    nextMultiplier,
  };
};

/**
 * Cumulative integral of multiplier from 0 to N
 */
const getMultiplierIntegral = (category: 'Conquest' | 'Transcend', n: number): number => {
  if (n <= 0) return 0;
  let total = 0;
  const brackets = BRACKETS[category];
  for (const b of brackets) {
    if (n <= b.start) break;
    const countInBracket = Math.min(n, b.end + 1) - b.start;
    if (countInBracket > 0) {
      total += countInBracket * b.mult;
    }
  }
  return total;
};

/**
 * Calculate kina for a range of cubes in a category
 */
const calcKinaForRange = (
  category: 'Conquest' | 'Transcend',
  reward: number,
  startPos: number,
  count: number
): number => {
  if (count <= 0) return 0;
  const multSum = getMultiplierIntegral(category, startPos + count) - getMultiplierIntegral(category, startPos);
  return reward * multSum;
};

/**
 * Count missing accessories and gears from character checklist
 */
export const getMissingGearSummary = (char: Character): { missingAcc: number; missingGear: number; total: number } => {
  const cl = char.checklist;
  if (!cl) {
    return { missingAcc: 6, missingGear: 8, total: 14 };
  }
  
  // 6 accessory items: wpn, earL, earR, neck, ringL, ringR
  let accOwned = 0;
  if (cl.wpn) accOwned++;
  if (cl.earL) accOwned++;
  if (cl.earR) accOwned++;
  if (cl.neck) accOwned++;
  if (cl.ringL) accOwned++;
  if (cl.ringR) accOwned++;
  const missingAcc = Math.max(0, 6 - accOwned);
  
  // 8 gear items: guards, breastplate, greaves, helm, pauldrons, gloves, boots, cloak
  let gearOwned = 0;
  if (cl.guards) gearOwned++;
  if (cl.breastplate) gearOwned++;
  if (cl.greaves) gearOwned++;
  if (cl.helm) gearOwned++;
  if (cl.pauldrons) gearOwned++;
  if (cl.gloves) gearOwned++;
  if (cl.boots) gearOwned++;
  if (cl.cloak) gearOwned++;
  const missingGear = Math.max(0, 8 - gearOwned);
  
  return {
    missingAcc,
    missingGear,
    total: missingAcc + missingGear,
  };
};

/**
 * Main Kinah calculation engine matching Aion2.xlsx
 */
export const calculateKinahPlanner = (
  characters: Character[],
  settings: KinahPlannerSettingsState,
  modes: DungeonMode[] = DEFAULT_DUNGEON_MODES
): KinahCalculationReport => {
  const conquestPlay = Math.max(0, settings.conquestPlayCount || 0);
  const transcendPlay = Math.max(0, settings.transcendPlayCount || 0);
  
  // 1. Process character capacities & costs
  const charData = characters.map((char) => {
    const extra = settings.charExtras[char.id] || { craftChar: 0, craftServer: 0, shopStones: 0, odyleEventBonus: 0 };
    const craftChar = Math.max(0, extra.craftChar || 0);
    const craftServer = Math.max(0, extra.craftServer || 0);
    const shopStones = Math.max(0, extra.shopStones || 0);
    const odyleEventBonus = Math.max(0, extra.odyleEventBonus || 0);
    
    const cubesCapacity = KINAH_CONSTANTS.FREE_WEEKLY_CUBES + craftChar + craftServer + shopStones + odyleEventBonus;
    const craftCost = (craftChar + craftServer) * KINAH_CONSTANTS.COST_PER_CRAFT;
    const shopCost = shopStones * KINAH_CONSTANTS.COST_PER_SHOP_STONE;
    const totalCost = craftCost + shopCost;
    
    const gs = Math.max(0, char.gs || 0);
    const gsInitial = settings.gsInitialMap?.[char.id] ?? char.gsInitial ?? gs;
    const gsGain = gs - gsInitial;
    
    const odyleStatus = char.odyleStatus || 'Available';
    
    // Eligible modes for this character's GS
    const eligibleModes = modes.filter((m) => gs >= m.minGs);
    
    return {
      char,
      extra,
      craftChar,
      craftServer,
      shopStones,
      odyleEventBonus,
      cubesCapacity,
      craftCost,
      shopCost,
      totalCost,
      gs,
      gsInitial,
      gsGain,
      odyleStatus,
      eligibleModes,
    };
  });
  
  // Pass 1: pick eligible mode with highest raw reward
  const pass1Assignments = charData.map((cd) => {
    if (cd.eligibleModes.length === 0) {
      return { cd, best1: modes[0] };
    }
    const best1 = [...cd.eligibleModes].sort((a, b) => b.reward - a.reward)[0];
    return { cd, best1 };
  });
  
  // Total cubes per category in Pass 1
  let pass1ConquestCubes = 0;
  let pass1TranscendCubes = 0;
  for (const item of pass1Assignments) {
    if (item.best1.category === 'Conquest') {
      pass1ConquestCubes += item.cd.cubesCapacity;
    } else {
      pass1TranscendCubes += item.cd.cubesCapacity;
    }
  }
  
  // Multiplier acuan from pass 1
  const multAcuan: Record<string, number> = {};
  for (const m of modes) {
    const catCubes = m.category === 'Conquest' ? pass1ConquestCubes : pass1TranscendCubes;
    multAcuan[m.id] = getTierMultiplier(m.category, catCubes);
  }
  
  // Pass 2: pick eligible mode with highest (reward * multAcuan)
  const pass2Assignments = charData.map((cd) => {
    if (cd.eligibleModes.length === 0) {
      return { cd, best2: modes[0] };
    }
    const sorted = [...cd.eligibleModes].sort((a, b) => {
      const valA = a.reward * (multAcuan[a.id] ?? 1);
      const valB = b.reward * (multAcuan[b.id] ?? 1);
      if (valB !== valA) return valB - valA;
      return b.reward - a.reward;
    });
    return { cd, best2: sorted[0] };
  });
  
  // Planned cubes per mode in Pass 2
  const plannedCubesPerMode: Record<string, number> = {};
  for (const m of modes) {
    plannedCubesPerMode[m.id] = 0;
  }
  for (const item of pass2Assignments) {
    plannedCubesPerMode[item.best2.id] = (plannedCubesPerMode[item.best2.id] || 0) + item.cd.cubesCapacity;
  }
  
  // Separate modes by category, sorted by reward desc (higher reward is played first)
  const modesByCategory: Record<'Conquest' | 'Transcend', DungeonMode[]> = {
    Conquest: modes.filter((m) => m.category === 'Conquest').sort((a, b) => b.reward - a.reward || a.id.localeCompare(b.id)),
    Transcend: modes.filter((m) => m.category === 'Transcend').sort((a, b) => b.reward - a.reward || a.id.localeCompare(b.id)),
  };
  
  // Compute planned kina per mode
  const modePlans: ModePlanBreakdown[] = [];
  const modeKinaMap: Record<string, number> = {};
  
  for (const cat of ['Conquest', 'Transcend'] as const) {
    let pos = 0;
    for (const m of modesByCategory[cat]) {
      const cnt = plannedCubesPerMode[m.id] || 0;
      const k = calcKinaForRange(cat, m.reward, pos, cnt);
      modeKinaMap[m.id] = k;
      modePlans.push({
        mode: m,
        plannedCubes: cnt,
        predictedKina: k,
        avgPerCube: cnt > 0 ? k / cnt : 0,
      });
      pos += cnt;
    }
  }
  
  // Total planned gross kina
  const predictedTotalGross = Object.values(modeKinaMap).reduce((a, b) => a + b, 0);
  
  // Current kina already earned (based on play counts)
  let kinaAlreadyEarned = 0;
  const playCounts = { Conquest: conquestPlay, Transcend: transcendPlay };
  
  for (const cat of ['Conquest', 'Transcend'] as const) {
    let pos = 0;
    const pc = playCounts[cat];
    for (const m of modesByCategory[cat]) {
      const cnt = plannedCubesPerMode[m.id] || 0;
      const doneCount = Math.max(0, Math.min(pos + cnt, pc) - pos);
      if (doneCount > 0) {
        kinaAlreadyEarned += calcKinaForRange(cat, m.reward, pos, doneCount);
      }
      pos += cnt;
    }
  }
  
  const totalCapacityCubes = charData.reduce((acc, cd) => acc + cd.cubesCapacity, 0);
  const usedCubes = conquestPlay + transcendPlay;
  const remainingCubes = Math.max(0, totalCapacityCubes - usedCubes);
  const predictedRemainingKina = Math.max(0, predictedTotalGross - kinaAlreadyEarned);
  const totalCraftAndShopCost = charData.reduce((acc, cd) => acc + cd.totalCost, 0);
  const predictedTotalNet = predictedTotalGross - totalCraftAndShopCost;
  
  // Current multipliers
  const currentMultMap: Record<'Conquest' | 'Transcend', number> = {
    Conquest: getTierMultiplier('Conquest', conquestPlay),
    Transcend: getTierMultiplier('Transcend', transcendPlay),
  };
  
  // Upgrade simulation helper
  const simulateUpgrade = (charCubes: number, fromMode: DungeonMode, toMode: DungeonMode): number => {
    const simCubes = { ...plannedCubesPerMode };
    simCubes[fromMode.id] = Math.max(0, (simCubes[fromMode.id] || 0) - charCubes);
    simCubes[toMode.id] = (simCubes[toMode.id] || 0) + charCubes;
    
    let simTotal = 0;
    for (const cat of ['Conquest', 'Transcend'] as const) {
      let pos = 0;
      for (const m of modesByCategory[cat]) {
        const cnt = simCubes[m.id] || 0;
        simTotal += calcKinaForRange(cat, m.reward, pos, cnt);
        pos += cnt;
      }
    }
    return simTotal - predictedTotalGross;
  };
  
  // Build character analyses
  const charAnalysesBeforeRank = pass2Assignments.map(({ cd, best2 }, index) => {
    const kinaPerCubeCurrent = best2.reward * currentMultMap[best2.category];
    const gearSummary = getMissingGearSummary(cd.char);
    
    // Play ranking score (only if Odyle Available)
    // Formula in Excel: Z + (100 - row) / 10,000,000 (highest kina/cube first, ties broken by original order)
    const playScore = cd.odyleStatus === 'Available' ? kinaPerCubeCurrent + (100 - index) / 10000000 : -100 - index;
    
    // Upgrade evaluations
    let bestTargetMode: DungeonMode | null = null;
    let maxGainPerGs = 0;
    let maxWeeklyGain = 0;
    let targetKurangGs = 0;
    
    for (const targetM of modes) {
      if (targetM.minGs > cd.gs && targetM.id !== best2.id) {
        const weeklyGain = simulateUpgrade(cd.cubesCapacity, best2, targetM);
        const kurang = targetM.minGs - cd.gs;
        const gainPerGs = kurang > 0 && weeklyGain > 0 ? weeklyGain / kurang : 0;
        
        if (gainPerGs > maxGainPerGs) {
          maxGainPerGs = gainPerGs;
          bestTargetMode = targetM;
          maxWeeklyGain = weeklyGain;
          targetKurangGs = kurang;
        }
      }
    }
    
    const upgradeScore = maxGainPerGs > 0 ? maxGainPerGs + (100 - index) / 1000000 : -100 - index;
    
    return {
      cd,
      best2,
      kinaPerCubeCurrent,
      gearSummary,
      playScore,
      bestTargetMode,
      targetKurangGs,
      maxWeeklyGain,
      maxGainPerGs,
      upgradeScore,
    };
  });
  
  // Determine play order rank (only for Available characters)
  const availableChars = charAnalysesBeforeRank.filter((item) => item.cd.odyleStatus === 'Available');
  availableChars.sort((a, b) => b.playScore - a.playScore);
  const playRankMap = new Map<string, number>();
  availableChars.forEach((item, idx) => {
    playRankMap.set(item.cd.char.id, idx + 1);
  });
  
  // Determine upgrade priority rank (only for characters with positive gain)
  const upgradeCandidates = charAnalysesBeforeRank.filter((item) => item.maxGainPerGs > 0);
  upgradeCandidates.sort((a, b) => b.upgradeScore - a.upgradeScore);
  const upgradeRankMap = new Map<string, number>();
  upgradeCandidates.forEach((item, idx) => {
    upgradeRankMap.set(item.cd.char.id, idx + 1);
  });
  
  // Build final CharacterKinahAnalysis array
  const characterAnalyses: CharacterKinahAnalysis[] = charAnalysesBeforeRank.map((item) => {
    const playOrderRank = playRankMap.get(item.cd.char.id) ?? null;
    const upgradePriorityRank = upgradeRankMap.get(item.cd.char.id) ?? null;
    
    let advice = '-';
    if (item.cd.odyleStatus === 'OutOfOdyle') {
      advice = 'Odyle habis: tunggu pulih';
    } else if (playOrderRank === 1) {
      advice = 'MAIN SEKARANG';
    } else if (playOrderRank !== null) {
      advice = `Main urutan ${playOrderRank}`;
    }
    
    if (upgradePriorityRank === 1) {
      advice += advice !== '-' ? '  |  PRIORITAS NAIK GS' : 'PRIORITAS NAIK GS';
    }
    
    return {
      characterId: item.cd.char.id,
      characterName: item.cd.char.name,
      gs: item.cd.gs,
      gsInitial: item.cd.gsInitial,
      gsGain: item.cd.gsGain,
      odyleStatus: item.cd.odyleStatus,
      cubesCapacity: item.cd.cubesCapacity,
      craftChar: item.cd.craftChar,
      craftServer: item.cd.craftServer,
      shopStones: item.cd.shopStones,
      odyleEventBonus: item.cd.odyleEventBonus,
      craftCost: item.cd.craftCost,
      shopCost: item.cd.shopCost,
      totalCost: item.cd.totalCost,
      
      bestMode: item.best2,
      kinaPerCubeCurrent: item.kinaPerCubeCurrent,
      playOrderRank,
      
      bestTargetMode: item.bestTargetMode,
      kurangGs: item.targetKurangGs,
      tambahKinaMinggu: item.maxWeeklyGain,
      tambahPerGs: item.maxGainPerGs,
      upgradePriorityRank,
      
      missingAccCount: item.gearSummary.missingAcc,
      missingGearCount: item.gearSummary.missingGear,
      totalMissingCount: item.gearSummary.total,
      
      advice,
    };
  });
  
  const playNowChar = characterAnalyses.find((c) => c.playOrderRank === 1) || null;
  const playNextChar = characterAnalyses.find((c) => c.playOrderRank === 2) || null;
  const upgradePriorityChar = characterAnalyses.find((c) => c.upgradePriorityRank === 1) || null;
  
  return {
    totalCapacityCubes,
    usedCubes,
    remainingCubes,
    kinaAlreadyEarned,
    predictedRemainingKina,
    predictedTotalGross,
    totalCraftAndShopCost,
    predictedTotalNet,
    conquestTier: getTierInfo('Conquest', conquestPlay),
    transcendTier: getTierInfo('Transcend', transcendPlay),
    playNowChar,
    playNextChar,
    upgradePriorityChar,
    characterAnalyses,
    modePlans,
  };
};
