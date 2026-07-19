export type CharacterClass = 'Templar' | 'Gladiator' | 'Ranger' | 'Cleric' | 'Chanter' | 'Assassin' | 'Sorcerer' | 'Spiritmaster';

export type PriorityLevel = 'Extreme' | 'Critical' | 'High' | 'Medium' | 'Low';

export type GearSetType = 'Cradle' | 'Kromede' | 'Urugugu' | 'Custom';
export type AccessorySetType = 'Dramata' | 'Nuakum' | 'Vakron' | 'Custom';

export interface GearChecklist {
  // Armor / Gear
  guards: boolean;
  breastplate: boolean;
  greaves: boolean;
  helm: boolean;
  pauldrons: boolean;
  gloves: boolean;
  boots: boolean;
  
  // Accessories & Weapons
  wpn: boolean;
  earL: boolean;
  earR: boolean;
  neck: boolean;
  ringL: boolean;
  ringR: boolean;
  cloak: boolean;
}

export interface Character {
  id: string;
  name: string;
  gs: number;
  classType: CharacterClass;
  priority: PriorityLevel;
  deus: number;
  arkanis: number;
  
  // Gear checklist state
  checklist: GearChecklist;
  
  // Targets
  gearTarget: GearSetType;
  missingGearCount: number; // Custom count from spreadsheet
  accessoryTarget: AccessorySetType;
  missingAccessoryCount: number; // Custom count from spreadsheet
  
  // Custom manual settings overrides
  useManualMissingCounts: boolean;
  
  notes?: string;
}
