export type CharacterClass = 'Templar' | 'Gladiator' | 'Ranger' | 'Cleric' | 'Chanter' | 'Assassin' | 'Sorcerer' | 'Spiritmaster';

export type PriorityLevel = 'Extreme' | 'Critical' | 'High' | 'Medium' | 'Low';

export type GearSetType = string;
export type AccessorySetType = string;

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
  
  // Transcendence (TC) Boost completed
  tc?: boolean;
}

export type OdyleStatus = 'Available' | 'OutOfOdyle';

export interface Character {
  id: string;
  name: string;
  gs: number;
  classType: CharacterClass;
  priority: PriorityLevel;
  deus: number;
  arkanis: number;
  
  cp?: number;
  
  // Gear checklist state
  checklist: GearChecklist;
  
  // Targets
  gearTarget: GearSetType;
  missingGearCount: number; // Custom count from spreadsheet
  accessoryTarget: AccessorySetType;
  missingAccessoryCount: number; // Custom count from spreadsheet
  
  isMain?: boolean;
  taskProgress?: Record<string, number>;
  
  notes?: string;

  // Kinah Planner fields
  odyleStatus?: OdyleStatus;   // Toggle: Odyle Available or Out of Odyle
  gsInitial?: number;           // GS at start of week (for weekly GS gain tracking)
  tcComplete?: boolean;         // True if Transcendence checklist is complete
}
