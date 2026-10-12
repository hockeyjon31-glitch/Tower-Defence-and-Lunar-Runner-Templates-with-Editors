import { TowerCategory, TowerDef, EnemyType, EnemyDef } from './types';

export const TILE_SIZE = 48;

export const TOWER_DEFINITIONS: Record<TowerCategory, TowerDef> = {
  PLASMA: {
    id: 'plasma_cannon',
    name: 'Plasma Blaster',
    category: 'PLASMA',
    cost: 100,
    range: 120,
    damage: 26,
    fireRate: 1.6,
    allowedTiles: ['BASALT'],
    description: 'High-velocity kinetic plasma cannon. Must be constructed on Lunar Basalt rock.',
    upgrades: {
      branchA: {
        name: 'Hyper-Railgun',
        cost: 140,
        damageMult: 2.4,
        rangeMult: 1.35,
        special: 'Armor-piercing rounds deal +100% damage to Mechs & Titans.',
      },
      branchB: {
        name: 'Gatling Repeater',
        cost: 120,
        damageMult: 1.4,
        rangeMult: 1.1,
        special: 'Insane 4.5x fire rate, shreds light scouts and swarms.',
      },
    },
  },
  CRYO: {
    id: 'cryo_spire',
    name: 'Cryo-Stasis Spire',
    category: 'CRYO',
    cost: 120,
    range: 100,
    damage: 10,
    fireRate: 1.0,
    allowedTiles: ['REGOLITH'],
    description: 'Emits cryogenic pulses that slow enemy movement. Built on soft Lunar Regolith.',
    upgrades: {
      branchA: {
        name: 'Glacial Permafrost',
        cost: 130,
        damageMult: 1.8,
        rangeMult: 1.3,
        special: 'Slows enemies by 65% and stops relic carriers dead in their tracks.',
      },
      branchB: {
        name: 'Absolute Zero Laser',
        cost: 150,
        damageMult: 2.2,
        rangeMult: 1.25,
        special: 'Focuses a thermal extraction beam that shatters alien shields.',
      },
    },
  },
  TESLA: {
    id: 'tesla_node',
    name: 'Tesla Arc Spire',
    category: 'TESLA',
    cost: 140,
    range: 125,
    damage: 20,
    fireRate: 1.2,
    allowedTiles: ['CRYSTAL_GEODE'],
    description: 'Channels lunar crystal resonance into chain lightning. Built on Crystalline Geodes.',
    upgrades: {
      branchA: {
        name: 'Overcharge Arc Storm',
        cost: 160,
        damageMult: 2.1,
        rangeMult: 1.3,
        special: 'Lightning bolts chain between up to 6 simultaneous targets.',
      },
      branchB: {
        name: 'Solar Disintegrator',
        cost: 175,
        damageMult: 2.6,
        rangeMult: 1.2,
        special: 'Continuous ray that ramps up damage the longer it strikes an enemy.',
      },
    },
  },
};

export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyDef> = {
  SCOUT: {
    type: 'SCOUT',
    name: 'Lunar Scouter',
    hp: 85,
    speed: 78,
    armorType: 'LIGHT',
    mineralReward: 16,
    color: '#38bdf8',
    size: 11,
  },
  MECH: {
    type: 'MECH',
    name: 'Armored Mech',
    hp: 310,
    speed: 38,
    armorType: 'HEAVY',
    mineralReward: 38,
    color: '#f97316',
    size: 15,
  },
  VOID_WEAVER: {
    type: 'VOID_WEAVER',
    name: 'Phase Weaver',
    hp: 170,
    speed: 54,
    armorType: 'SHIELDED',
    mineralReward: 32,
    color: '#a855f7',
    size: 13,
  },
  SWARM_DRONE: {
    type: 'SWARM_DRONE',
    name: 'Swarm Parasite',
    hp: 45,
    speed: 70,
    armorType: 'LIGHT',
    mineralReward: 9,
    color: '#22c55e',
    size: 9,
  },
  GOLIATH: {
    type: 'GOLIATH',
    name: 'Goliath Titan',
    hp: 1100,
    speed: 26,
    armorType: 'TITAN',
    mineralReward: 130,
    color: '#ef4444',
    size: 20,
  },
};

export const SPELL_COSTS = {
  ORBITAL_METEOR: 40,
  STASIS_EMP: 30,
  RELIC_RECALL: 25,
};

export const CLEAR_DEBRIS_COST = 30;
export const DROPPED_RELIC_RETURN_TIME = 15; // seconds until auto-return to vault
