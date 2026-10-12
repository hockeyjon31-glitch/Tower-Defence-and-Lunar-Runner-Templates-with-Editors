export type TDTileType =
  | 'PATH'
  | 'BASALT'        // Solid high ground for Plasma Cannon
  | 'CRYSTAL_GEODE' // Energy geode for Tesla Arc
  | 'REGOLITH'      // Lunar dust ground for Cryo Spire
  | 'OBSIDIAN'      // Impassable mountain
  | 'DEBRIS'        // Rubble that can be cleared for minerals
  | 'VAULT'         // Ancient Lunar Monolith holding relics
  | 'SPAWN'         // Alien portal
  | 'EXIT';         // Alien escape portal

export type TowerCategory = 'PLASMA' | 'CRYO' | 'TESLA';

export interface TowerDef {
  id: string;
  name: string;
  category: TowerCategory;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;      // shots per second
  allowedTiles: TDTileType[];
  description: string;
  upgrades: {
    branchA: {
      name: string;
      cost: number;
      damageMult: number;
      rangeMult: number;
      special: string;
    };
    branchB: {
      name: string;
      cost: number;
      damageMult: number;
      rangeMult: number;
      special: string;
    };
  };
}

export interface PlacedTower {
  id: string;
  gridX: number;
  gridY: number;
  type: TowerCategory;
  level: number; // 1, 2, 3
  branch?: 'A' | 'B';
  xp: number;
  totalDamageDealt: number;
  lastShotTime: number;
  targetEnemyId?: string;
}

export type EnemyType = 'SCOUT' | 'MECH' | 'VOID_WEAVER' | 'SWARM_DRONE' | 'GOLIATH';

export interface EnemyDef {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;        // pixels per second
  armorType: 'LIGHT' | 'HEAVY' | 'SHIELDED' | 'TITAN';
  mineralReward: number;
  color: string;
  size: number;
}

export interface TDEnemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  shieldHp: number;
  pathIndex: number;
  targetPath: { x: number; y: number }[];
  isCarryingRelic: boolean;
  isEscaping: boolean;
  slowTimer: number;
  freezeTimer: number;
  alive: boolean;
}

export interface RelicState {
  id: number;
  status: 'IN_VAULT' | 'CARRIED' | 'DROPPED' | 'LOST';
  carrierEnemyId?: string;
  x: number;
  y: number;
  returnTimer: number; // counts down when dropped before returning
}

export interface WaveSquad {
  enemyType: EnemyType;
  count: number;
  spawnInterval: number; // seconds
}

export interface TDWave {
  waveNumber: number;
  squads: WaveSquad[];
  bonusMinerals: number;
}

export interface TDLevel {
  id: string;
  name: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  tiles: TDTileType[][];
  spawnPos: { x: number; y: number };
  vaultPos: { x: number; y: number };
  exitPos: { x: number; y: number };
  startingMinerals: number;
  startingEnergy: number;
  totalRelics: number;
  waves: TDWave[];
}
