import { TaskItem } from '../types/tasks';

// Based on the Aion 2 Daily/Weekly Checklist reference image
// MAIN = main character limits | ALT = alt character limits
// Cyan numbers = MAIN | Red numbers = ALT

export const INITIAL_TASKS: TaskItem[] = [

  // ─────────────────────────────────────────────────────────────
  // DAILY — CHARACTER SCOPE
  // ─────────────────────────────────────────────────────────────
  {
    id: 'char_daily_duty_quests',
    title: 'Duty Quests',
    category: 'daily',
    scope: 'character',
    maxCount: 5,
    icon: 'clipboard-list-outline',
    description: 'Complete 5 daily duty quests per character.',
    mainOnly: true,
  },

  // ─────────────────────────────────────────────────────────────
  // WEEKLY — CHARACTER SCOPE
  // ─────────────────────────────────────────────────────────────
  {
    id: 'char_weekly_ascension_trial',
    title: 'Ascension Trial',
    category: 'weekly',
    scope: 'character',
    maxCount: 3,
    icon: 'sword-cross',
    description: '3x/week (MAIN & ALT).',
  },
  {
    id: 'char_weekly_daily_dungeon',
    title: 'Daily Dungeon',
    category: 'weekly',
    scope: 'character',
    maxCount: 14,
    icon: 'castle',
    description: '14x/week total (2x/day × 7 days).',
  },
  {
    id: 'char_weekly_battlefield',
    title: 'Battlefield',
    category: 'weekly',
    scope: 'character',
    maxCount: 3,
    icon: 'fencing',
    description: 'Weekly Battlefield PvP. 3x/week (MAIN & ALT).',
  },

  // ─────────────────────────────────────────────────────────────
  // ENERGY SYSTEM — CHARACTER SCOPE (tracked weekly)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'char_energy_dungeons',
    title: 'Dungeon Energy',
    category: 'weekly',
    scope: 'character',
    maxCount: 7,
    icon: 'lightning-bolt',
    description: '+120 energy/day | Max 840/week. Requires Lv. 22.',
  },
  {
    id: 'char_energy_shugo_festival',
    title: 'Shugo Festival',
    category: 'weekly',
    scope: 'character',
    maxCount: 14,
    icon: 'party-popper',
    description: '+2/day | Max 14/week. Requires Lv. 13.',
  },
  {
    id: 'char_energy_nightmare',
    title: 'Nightmare',
    category: 'weekly',
    scope: 'character',
    maxCount: 14,
    icon: 'skull-outline',
    description: '+2/day | Max 14/week. Requires Lv. 45.',
  },

  // ─────────────────────────────────────────────────────────────
  // CRAFTING & SHOPS — CHARACTER SCOPE (weekly)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'char_weekly_morph_craft',
    title: 'Substance Morph / Odyle Craft',
    category: 'weekly',
    scope: 'character',
    maxCount: 20,
    icon: 'hammer-wrench',
    description: 'MAIN: 20x | ALT: 4x per week.',
  },
  {
    id: 'char_weekly_subscriber_shop',
    title: 'Subscriber Shop',
    category: 'weekly',
    scope: 'character',
    maxCount: 1,
    icon: 'store-outline',
    description: 'Weekly subscriber shop purchase.',
  },
  {
    id: 'char_weekly_pve_weeklies',
    title: 'PvE Weeklies',
    category: 'weekly',
    scope: 'character',
    maxCount: 12,
    icon: 'shield-sword-outline',
    description: '12x/week. Command Merchant / Main City.',
  },
  {
    id: 'char_weekly_pvp_weeklies',
    title: 'PvP Weeklies',
    category: 'weekly',
    scope: 'character',
    maxCount: 20,
    icon: 'sword',
    description: '20x/week. Command Merchant / Abyss.',
  },

  // ─────────────────────────────────────────────────────────────
  // ABYSS EVENTS — CHARACTER SCOPE (weekly)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'char_weekly_artifact_siege',
    title: 'Artifact Siege',
    category: 'weekly',
    scope: 'character',
    maxCount: 2,
    icon: 'flag-variant-outline',
    description: 'Wednesday & Saturday.',
  },
  {
    id: 'char_weekly_abyss_corridors',
    title: 'Abyss Corridors',
    category: 'weekly',
    scope: 'character',
    maxCount: 3,
    icon: 'transit-connection-variant',
    description: 'After Artifact Siege. 0–3x/week (MAIN & ALT).',
  },

  // ─────────────────────────────────────────────────────────────
  // OPTIONAL — CHARACTER SCOPE (weekly)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'char_optional_world_bosses',
    title: 'World Bosses',
    category: 'weekly',
    scope: 'character',
    maxCount: 1,
    icon: 'dragon',
    description: 'Optional. Hunt weekly open-world bosses.',
  },
  {
    id: 'char_optional_supply_request',
    title: 'Supply Request',
    category: 'weekly',
    scope: 'character',
    maxCount: 1,
    icon: 'package-variant-closed',
    description: 'Optional. Complete weekly supply request quest.',
  },
];
