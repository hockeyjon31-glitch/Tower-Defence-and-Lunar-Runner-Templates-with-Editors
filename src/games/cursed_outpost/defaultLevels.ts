import { TDLevel, TDTileType } from './types';

// Helper to create tile grid
function makeGrid(w: number, h: number, defaultTile: TDTileType = 'REGOLITH'): TDTileType[][] {
  const grid: TDTileType[][] = [];
  for (let y = 0; y < h; y++) {
    const row: TDTileType[] = [];
    for (let x = 0; x < w; x++) {
      row.push(defaultTile);
    }
    grid.push(row);
  }
  return grid;
}

// Level 1: Mare Tranquillitatis
const grid1 = makeGrid(16, 11, 'REGOLITH');
// Surround borders with Obsidian
for (let x = 0; x < 16; x++) {
  grid1[0][x] = 'OBSIDIAN';
  grid1[10][x] = 'OBSIDIAN';
}
for (let y = 0; y < 11; y++) {
  grid1[y][0] = 'OBSIDIAN';
  grid1[y][15] = 'OBSIDIAN';
}

// Spawn at (1, 5)
grid1[5][1] = 'SPAWN';

// Path winding to Vault at (13, 5)
// Path segment 1: (2, 5) to (5, 5)
for (let x = 2; x <= 5; x++) grid1[5][x] = 'PATH';
// Down to (5, 8)
for (let y = 6; y <= 8; y++) grid1[y][5] = 'PATH';
// Right to (9, 8)
for (let x = 6; x <= 9; x++) grid1[8][x] = 'PATH';
// Up to (9, 3)
for (let y = 3; y <= 7; y++) grid1[y][9] = 'PATH';
// Right to (12, 3)
for (let x = 10; x <= 12; x++) grid1[3][x] = 'PATH';
// Down to (12, 5)
for (let y = 4; y <= 5; y++) grid1[y][12] = 'PATH';
// Vault at (13, 5)
grid1[5][13] = 'VAULT';

// Exit loop back: (12, 5) up to (12, 2) to (1, 2) exit
for (let y = 2; y <= 3; y++) grid1[y][12] = 'PATH';
for (let x = 2; x <= 12; x++) grid1[2][x] = 'PATH';
grid1[2][1] = 'EXIT';

// Strategic Basalt & Crystal tiles
grid1[4][4] = 'BASALT';
grid1[4][6] = 'BASALT';
grid1[7][7] = 'BASALT';
grid1[7][8] = 'BASALT';
grid1[4][10] = 'BASALT';
grid1[4][11] = 'BASALT';

grid1[6][7] = 'CRYSTAL_GEODE';
grid1[4][8] = 'CRYSTAL_GEODE';
grid1[6][10] = 'CRYSTAL_GEODE';

grid1[6][4] = 'DEBRIS';
grid1[9][9] = 'DEBRIS';
grid1[3][8] = 'DEBRIS';

// Level 2: Crystalline Crevasse
const grid2 = makeGrid(16, 11, 'REGOLITH');
for (let x = 0; x < 16; x++) {
  grid2[0][x] = 'OBSIDIAN';
  grid2[10][x] = 'OBSIDIAN';
}
for (let y = 0; y < 11; y++) {
  grid2[y][0] = 'OBSIDIAN';
  grid2[y][15] = 'OBSIDIAN';
}

grid2[2][1] = 'SPAWN';
// Winding S-curve
for (let x = 2; x <= 6; x++) grid2[2][x] = 'PATH';
for (let y = 3; y <= 5; y++) grid2[y][6] = 'PATH';
for (let x = 2; x <= 5; x++) grid2[5][x] = 'PATH';
for (let y = 6; y <= 8; y++) grid2[y][2] = 'PATH';
for (let x = 3; x <= 10; x++) grid2[8][x] = 'PATH';
for (let y = 4; y <= 7; y++) grid2[y][10] = 'PATH';
for (let x = 11; x <= 13; x++) grid2[4][x] = 'PATH';
for (let y = 5; y <= 7; y++) grid2[y][13] = 'PATH';
grid2[7][13] = 'VAULT';

// Exit along top
for (let y = 1; y <= 4; y++) grid2[y][13] = 'PATH';
for (let x = 2; x <= 13; x++) grid2[1][x] = 'PATH';
grid2[1][1] = 'EXIT';

// High Crystal concentration
grid2[3][4] = 'CRYSTAL_GEODE';
grid2[4][4] = 'CRYSTAL_GEODE';
grid2[6][4] = 'CRYSTAL_GEODE';
grid2[7][5] = 'CRYSTAL_GEODE';
grid2[6][8] = 'CRYSTAL_GEODE';
grid2[7][8] = 'CRYSTAL_GEODE';
grid2[5][11] = 'CRYSTAL_GEODE';
grid2[6][11] = 'CRYSTAL_GEODE';

grid2[4][8] = 'BASALT';
grid2[5][8] = 'BASALT';
grid2[3][8] = 'BASALT';
grid2[6][12] = 'BASALT';

grid2[3][3] = 'DEBRIS';
grid2[7][6] = 'DEBRIS';
grid2[5][12] = 'DEBRIS';

// Level 3: Obsidian Stronghold
const grid3 = makeGrid(16, 11, 'REGOLITH');
for (let x = 0; x < 16; x++) {
  grid3[0][x] = 'OBSIDIAN';
  grid3[10][x] = 'OBSIDIAN';
}
for (let y = 0; y < 11; y++) {
  grid3[y][0] = 'OBSIDIAN';
  grid3[y][15] = 'OBSIDIAN';
}

grid3[8][1] = 'SPAWN';
for (let x = 2; x <= 4; x++) grid3[8][x] = 'PATH';
for (let y = 4; y <= 7; y++) grid3[y][4] = 'PATH';
for (let x = 5; x <= 8; x++) grid3[4][x] = 'PATH';
for (let y = 5; y <= 8; y++) grid3[y][8] = 'PATH';
for (let x = 9; x <= 12; x++) grid3[8][x] = 'PATH';
for (let y = 3; y <= 7; y++) grid3[y][12] = 'PATH';
grid3[3][12] = 'VAULT';

// Exit path
for (let x = 2; x <= 11; x++) grid3[2][x] = 'PATH';
grid3[3][11] = 'PATH';
grid3[2][1] = 'EXIT';

// Choke points with Debris
grid3[6][3] = 'DEBRIS';
grid3[7][3] = 'DEBRIS';
grid3[3][6] = 'DEBRIS';
grid3[5][6] = 'DEBRIS';
grid3[6][9] = 'DEBRIS';
grid3[7][9] = 'DEBRIS';
grid3[4][11] = 'DEBRIS';

grid3[5][5] = 'BASALT';
grid3[6][5] = 'BASALT';
grid3[6][7] = 'BASALT';
grid3[7][7] = 'BASALT';
grid3[5][10] = 'BASALT';
grid3[6][10] = 'BASALT';

grid3[3][5] = 'CRYSTAL_GEODE';
grid3[3][7] = 'CRYSTAL_GEODE';
grid3[7][11] = 'CRYSTAL_GEODE';
grid3[5][13] = 'CRYSTAL_GEODE';

export const DEFAULT_TD_LEVELS: TDLevel[] = [
  {
    id: 'td_level_1',
    name: 'Sector 1: Mare Tranquillitatis',
    description: 'An ancient lunar vault holding 5 alien power relics has been located by alien scouts. Protect the cores from being extracted!',
    gridWidth: 16,
    gridHeight: 11,
    tiles: grid1,
    spawnPos: { x: 1, y: 5 },
    vaultPos: { x: 13, y: 5 },
    exitPos: { x: 1, y: 2 },
    startingMinerals: 260,
    startingEnergy: 60,
    totalRelics: 5,
    waves: [
      {
        waveNumber: 1,
        bonusMinerals: 40,
        squads: [{ enemyType: 'SCOUT', count: 6, spawnInterval: 1.2 }],
      },
      {
        waveNumber: 2,
        bonusMinerals: 50,
        squads: [
          { enemyType: 'SCOUT', count: 8, spawnInterval: 1.0 },
          { enemyType: 'SWARM_DRONE', count: 10, spawnInterval: 0.5 },
        ],
      },
      {
        waveNumber: 3,
        bonusMinerals: 65,
        squads: [
          { enemyType: 'MECH', count: 3, spawnInterval: 2.2 },
          { enemyType: 'SCOUT', count: 6, spawnInterval: 1.0 },
        ],
      },
      {
        waveNumber: 4,
        bonusMinerals: 80,
        squads: [
          { enemyType: 'VOID_WEAVER', count: 4, spawnInterval: 1.8 },
          { enemyType: 'SWARM_DRONE', count: 12, spawnInterval: 0.4 },
        ],
      },
      {
        waveNumber: 5,
        bonusMinerals: 120,
        squads: [
          { enemyType: 'GOLIATH', count: 1, spawnInterval: 5.0 },
          { enemyType: 'MECH', count: 4, spawnInterval: 2.0 },
          { enemyType: 'SCOUT', count: 8, spawnInterval: 0.8 },
        ],
      },
    ],
  },
  {
    id: 'td_level_2',
    name: 'Sector 2: Crystalline Crevasse',
    description: 'High crystal resonance sector. The alien swarm is phasing through subterranean caverns. Leverage Tesla Arc towers on geode nodes.',
    gridWidth: 16,
    gridHeight: 11,
    tiles: grid2,
    spawnPos: { x: 1, y: 2 },
    vaultPos: { x: 13, y: 7 },
    exitPos: { x: 1, y: 1 },
    startingMinerals: 280,
    startingEnergy: 75,
    totalRelics: 5,
    waves: [
      {
        waveNumber: 1,
        bonusMinerals: 45,
        squads: [{ enemyType: 'SWARM_DRONE', count: 14, spawnInterval: 0.6 }],
      },
      {
        waveNumber: 2,
        bonusMinerals: 55,
        squads: [
          { enemyType: 'SCOUT', count: 7, spawnInterval: 1.1 },
          { enemyType: 'VOID_WEAVER', count: 3, spawnInterval: 2.0 },
        ],
      },
      {
        waveNumber: 3,
        bonusMinerals: 70,
        squads: [
          { enemyType: 'MECH', count: 5, spawnInterval: 1.8 },
          { enemyType: 'SWARM_DRONE', count: 16, spawnInterval: 0.4 },
        ],
      },
      {
        waveNumber: 4,
        bonusMinerals: 85,
        squads: [
          { enemyType: 'VOID_WEAVER', count: 6, spawnInterval: 1.5 },
          { enemyType: 'SCOUT', count: 10, spawnInterval: 0.8 },
        ],
      },
      {
        waveNumber: 5,
        bonusMinerals: 110,
        squads: [
          { enemyType: 'GOLIATH', count: 1, spawnInterval: 6.0 },
          { enemyType: 'MECH', count: 5, spawnInterval: 1.8 },
          { enemyType: 'VOID_WEAVER', count: 5, spawnInterval: 1.6 },
        ],
      },
      {
        waveNumber: 6,
        bonusMinerals: 150,
        squads: [
          { enemyType: 'GOLIATH', count: 2, spawnInterval: 7.0 },
          { enemyType: 'SWARM_DRONE', count: 25, spawnInterval: 0.3 },
        ],
      },
    ],
  },
  {
    id: 'td_level_3',
    name: 'Sector 3: Obsidian Stronghold',
    description: 'A perilous lunar canyon choked with meteor debris. Blast open rubble tiles to carve out firing arcs for your railgun emplacements.',
    gridWidth: 16,
    gridHeight: 11,
    tiles: grid3,
    spawnPos: { x: 1, y: 8 },
    vaultPos: { x: 12, y: 3 },
    exitPos: { x: 1, y: 2 },
    startingMinerals: 300,
    startingEnergy: 90,
    totalRelics: 5,
    waves: [
      {
        waveNumber: 1,
        bonusMinerals: 50,
        squads: [{ enemyType: 'SCOUT', count: 8, spawnInterval: 1.0 }],
      },
      {
        waveNumber: 2,
        bonusMinerals: 60,
        squads: [
          { enemyType: 'MECH', count: 4, spawnInterval: 2.0 },
          { enemyType: 'SWARM_DRONE', count: 12, spawnInterval: 0.5 },
        ],
      },
      {
        waveNumber: 3,
        bonusMinerals: 75,
        squads: [
          { enemyType: 'VOID_WEAVER', count: 5, spawnInterval: 1.8 },
          { enemyType: 'MECH', count: 4, spawnInterval: 2.0 },
        ],
      },
      {
        waveNumber: 4,
        bonusMinerals: 90,
        squads: [
          { enemyType: 'GOLIATH', count: 1, spawnInterval: 5.0 },
          { enemyType: 'SCOUT', count: 12, spawnInterval: 0.7 },
        ],
      },
      {
        waveNumber: 5,
        bonusMinerals: 110,
        squads: [
          { enemyType: 'VOID_WEAVER', count: 8, spawnInterval: 1.4 },
          { enemyType: 'MECH', count: 6, spawnInterval: 1.7 },
        ],
      },
      {
        waveNumber: 6,
        bonusMinerals: 140,
        squads: [
          { enemyType: 'GOLIATH', count: 2, spawnInterval: 8.0 },
          { enemyType: 'SWARM_DRONE', count: 30, spawnInterval: 0.25 },
        ],
      },
      {
        waveNumber: 7,
        bonusMinerals: 200,
        squads: [
          { enemyType: 'GOLIATH', count: 3, spawnInterval: 6.0 },
          { enemyType: 'VOID_WEAVER', count: 10, spawnInterval: 1.2 },
          { enemyType: 'SCOUT', count: 15, spawnInterval: 0.6 },
        ],
      },
    ],
  },
];
