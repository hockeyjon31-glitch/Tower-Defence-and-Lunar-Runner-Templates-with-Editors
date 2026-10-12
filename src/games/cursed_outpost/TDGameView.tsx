import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TDLevel, TDTileType, PlacedTower, TDEnemy, RelicState, 
  TowerCategory, EnemyType, WaveSquad 
} from './types';
import { 
  TILE_SIZE, TOWER_DEFINITIONS, ENEMY_DEFINITIONS, 
  SPELL_COSTS, CLEAR_DEBRIS_COST, DROPPED_RELIC_RETURN_TIME 
} from './constants';
import { findGridPath, gridPathToPixelPath } from './pathfinding';
import { audio } from '../../utils/audio';
import { 
  Play, Pause, FastForward, RotateCcw, ArrowLeft, 
  ShieldAlert, Sparkles, Coins, Zap, Crosshair, 
  Trash2, Award, Edit3, Volume2, VolumeX, Eye
} from 'lucide-react';

interface TDGameViewProps {
  level: TDLevel;
  onEditLevel?: () => void;
  onNextLevel?: () => void;
  onBackToStudio: () => void;
  hasNextLevel?: boolean;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  targetEnemyId: string;
  speed: number;
  damage: number;
  category: TowerCategory;
  isArmorPiercing?: boolean;
}

interface BeamEffect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const TDGameView: React.FC<TDGameViewProps> = ({
  level,
  onEditLevel,
  onNextLevel,
  onBackToStudio,
  hasNextLevel = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [minerals, setMinerals] = useState(level.startingMinerals);
  const [energy, setEnergy] = useState(level.startingEnergy);
  const [currentWaveIdx, setCurrentWaveIdx] = useState(0);
  const [isWaveActive, setIsWaveActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2>(1);
  const [gameState, setGameState] = useState<'PLAYING' | 'VICTORY' | 'DEFEAT'>('PLAYING');
  const [stars, setStars] = useState(0);

  // Active spells
  const [activeSpell, setActiveSpell] = useState<'METEOR' | null>(null);

  // Selections
  const [selectedTile, setSelectedTile] = useState<{ x: number; y: number } | null>(null);
  const [selectedTower, setSelectedTower] = useState<PlacedTower | null>(null);

  // Simulation Refs
  const tilesRef = useRef<TDTileType[][]>(JSON.parse(JSON.stringify(level.tiles)));
  const towersRef = useRef<PlacedTower[]>([]);
  const enemiesRef = useRef<TDEnemy[]>([]);
  const relicsRef = useRef<RelicState[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const beamsRef = useRef<BeamEffect[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const spawnQueueRef = useRef<{ enemyType: EnemyType; delay: number }[]>([]);
  const spawnTimerRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animFrameRef = useRef<number | null>(null);

  // Calculated Path
  const ingressPathRef = useRef<{ x: number; y: number }[]>([]);
  const egressPathRef = useRef<{ x: number; y: number }[]>([]);

  // Compute paths
  const updatePaths = useCallback(() => {
    const gridIngress = findGridPath(tilesRef.current, level.spawnPos, level.vaultPos);
    ingressPathRef.current = gridPathToPixelPath(gridIngress);

    const gridEgress = findGridPath(tilesRef.current, level.vaultPos, level.exitPos);
    egressPathRef.current = gridPathToPixelPath(gridEgress);
  }, [level.spawnPos, level.vaultPos, level.exitPos]);

  // Init Relics & Simulation
  const resetGame = useCallback(() => {
    tilesRef.current = JSON.parse(JSON.stringify(level.tiles));
    towersRef.current = [];
    enemiesRef.current = [];
    projectilesRef.current = [];
    beamsRef.current = [];
    particlesRef.current = [];
    spawnQueueRef.current = [];
    spawnTimerRef.current = 0;

    // 5 Relics in the Vault
    const initialRelics: RelicState[] = [];
    for (let i = 0; i < level.totalRelics; i++) {
      initialRelics.push({
        id: i + 1,
        status: 'IN_VAULT',
        x: level.vaultPos.x * TILE_SIZE + TILE_SIZE / 2,
        y: level.vaultPos.y * TILE_SIZE + TILE_SIZE / 2,
        returnTimer: 0,
      });
    }
    relicsRef.current = initialRelics;

    setMinerals(level.startingMinerals);
    setEnergy(level.startingEnergy);
    setCurrentWaveIdx(0);
    setIsWaveActive(false);
    setIsPaused(false);
    setGameState('PLAYING');
    setSelectedTile(null);
    setSelectedTower(null);
    setActiveSpell(null);

    updatePaths();
  }, [level, updatePaths]);

  useEffect(() => {
    resetGame();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [resetGame]);

  // Send Wave
  const startNextWave = () => {
    if (isWaveActive) {
      // Early wave bonus!
      setMinerals((m) => m + 35);
      audio.playFuelPickup();
    }

    if (currentWaveIdx >= level.waves.length) return;

    const wave = level.waves[currentWaveIdx];
    const queue: { enemyType: EnemyType; delay: number }[] = [];

    let accumDelay = 0.5;
    for (const squad of wave.squads) {
      for (let i = 0; i < squad.count; i++) {
        queue.push({
          enemyType: squad.enemyType,
          delay: accumDelay,
        });
        accumDelay += squad.spawnInterval;
      }
      accumDelay += 1.0;
    }

    spawnQueueRef.current = queue;
    spawnTimerRef.current = 0;
    setIsWaveActive(true);
    setCurrentWaveIdx((prev) => prev + 1);
  };

  // Main Simulation Loop
  useEffect(() => {
    let active = true;

    const loop = (time: number) => {
      if (!active) return;
      const rawDt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      const dt = Math.min(rawDt, 0.05) * (isPaused ? 0 : gameSpeed);

      if (dt > 0 && gameState === 'PLAYING') {
        // Natural energy regeneration
        setEnergy((e) => Math.min(100, e + dt * 1.5));

        // 1. Spawning Enemies
        if (spawnQueueRef.current.length > 0) {
          spawnTimerRef.current += dt;
          while (
            spawnQueueRef.current.length > 0 &&
            spawnTimerRef.current >= spawnQueueRef.current[0].delay
          ) {
            const nextSpawn = spawnQueueRef.current.shift()!;
            const def = ENEMY_DEFINITIONS[nextSpawn.enemyType];
            const startPt = ingressPathRef.current[0] || {
              x: level.spawnPos.x * TILE_SIZE + TILE_SIZE / 2,
              y: level.spawnPos.y * TILE_SIZE + TILE_SIZE / 2,
            };

            const enemy: TDEnemy = {
              id: `en_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: nextSpawn.enemyType,
              x: startPt.x,
              y: startPt.y,
              hp: def.hp,
              maxHp: def.hp,
              speed: def.speed,
              baseSpeed: def.speed,
              shieldHp: def.armorType === 'SHIELDED' ? 90 : 0,
              pathIndex: 0,
              targetPath: [...ingressPathRef.current],
              isCarryingRelic: false,
              isEscaping: false,
              slowTimer: 0,
              freezeTimer: 0,
              alive: true,
            };
            enemiesRef.current.push(enemy);
          }
        }

        // Check if wave finished
        if (
          spawnQueueRef.current.length === 0 &&
          enemiesRef.current.length === 0 &&
          isWaveActive
        ) {
          setIsWaveActive(false);
          // Wave clear bonus
          const waveDef = level.waves[currentWaveIdx - 1];
          if (waveDef) {
            setMinerals((m) => m + waveDef.bonusMinerals);
          }

          // Check overall victory if all waves done
          if (currentWaveIdx >= level.waves.length) {
            // Count surviving relics
            const surviving = relicsRef.current.filter((r) => r.status !== 'LOST').length;
            if (surviving > 0) {
              setGameState('VICTORY');
              audio.playWin();
              let earnedStars = 1;
              if (surviving >= 3) earnedStars = 2;
              if (surviving === level.totalRelics) earnedStars = 3;
              setStars(earnedStars);
            } else {
              setGameState('DEFEAT');
              audio.playCrash();
            }
          }
        }

        // 2. Update Enemies & Relic Interactions
        const activeEnemies: TDEnemy[] = [];
        const vaultPixel = {
          x: level.vaultPos.x * TILE_SIZE + TILE_SIZE / 2,
          y: level.vaultPos.y * TILE_SIZE + TILE_SIZE / 2,
        };
        const exitPixel = {
          x: level.exitPos.x * TILE_SIZE + TILE_SIZE / 2,
          y: level.exitPos.y * TILE_SIZE + TILE_SIZE / 2,
        };

        for (const enemy of enemiesRef.current) {
          if (!enemy.alive) continue;

          // Freeze / Slow timers
          if (enemy.freezeTimer > 0) {
            enemy.freezeTimer -= dt;
            activeEnemies.push(enemy);
            continue; // completely immobile
          }

          let currentSpd = enemy.baseSpeed;
          if (enemy.slowTimer > 0) {
            enemy.slowTimer -= dt;
            currentSpd *= 0.45;
          }
          if (enemy.isCarryingRelic) {
            currentSpd *= 0.85; // carrying relic is heavier
          }
          enemy.speed = currentSpd;

          // Path following
          if (enemy.pathIndex < enemy.targetPath.length) {
            const targetPt = enemy.targetPath[enemy.pathIndex];
            const dx = targetPt.x - enemy.x;
            const dy = targetPt.y - enemy.y;
            const dist = Math.hypot(dx, dy);

            const moveDist = enemy.speed * dt;
            if (dist <= moveDist) {
              enemy.x = targetPt.x;
              enemy.y = targetPt.y;
              enemy.pathIndex++;
            } else {
              enemy.x += (dx / dist) * moveDist;
              enemy.y += (dy / dist) * moveDist;
            }
          }

          // Check if unburdened enemy walks near a dropped relic to pick it up!
          if (!enemy.isCarryingRelic) {
            for (const relic of relicsRef.current) {
              if (relic.status === 'DROPPED') {
                const distToRelic = Math.hypot(enemy.x - relic.x, enemy.y - relic.y);
                if (distToRelic < 18) {
                  // Pick up dropped relic!
                  relic.status = 'CARRIED';
                  relic.carrierEnemyId = enemy.id;
                  enemy.isCarryingRelic = true;
                  enemy.isEscaping = true;

                  // Reroute along egress path to exit
                  const nearestEgressIdx = egressPathRef.current.findIndex(
                    (p) => Math.hypot(p.x - enemy.x, p.y - enemy.y) < TILE_SIZE * 1.5
                  );
                  enemy.targetPath = egressPathRef.current.slice(
                    Math.max(0, nearestEgressIdx !== -1 ? nearestEgressIdx : 0)
                  );
                  enemy.pathIndex = 0;

                  audio.playRelicStolen();
                  break;
                }
              }
            }
          }

          // Check if reached the Vault to steal a Relic!
          if (!enemy.isEscaping && !enemy.isCarryingRelic) {
            const distToVault = Math.hypot(enemy.x - vaultPixel.x, enemy.y - vaultPixel.y);
            if (distToVault < 24) {
              // Attempt to steal an IN_VAULT relic
              const freeRelic = relicsRef.current.find((r) => r.status === 'IN_VAULT');
              if (freeRelic) {
                freeRelic.status = 'CARRIED';
                freeRelic.carrierEnemyId = enemy.id;
                enemy.isCarryingRelic = true;
                enemy.isEscaping = true;
                enemy.targetPath = [...egressPathRef.current];
                enemy.pathIndex = 0;
                audio.playRelicStolen();
              }
            }
          }

          // Check if escaping enemy reached the Exit with a stolen relic!
          if (enemy.isEscaping) {
            const distToExit = Math.hypot(enemy.x - exitPixel.x, enemy.y - exitPixel.y);
            if (distToExit < 24) {
              if (enemy.isCarryingRelic) {
                const carriedRelic = relicsRef.current.find(
                  (r) => r.carrierEnemyId === enemy.id
                );
                if (carriedRelic) {
                  carriedRelic.status = 'LOST';
                  carriedRelic.carrierEnemyId = undefined;
                }
              }
              // Enemy escaped
              enemy.alive = false;

              // Check if all relics lost -> immediate defeat
              const remaining = relicsRef.current.filter((r) => r.status !== 'LOST').length;
              if (remaining === 0) {
                setGameState('DEFEAT');
                audio.playCrash();
              }
              continue;
            }
          }

          activeEnemies.push(enemy);
        }
        enemiesRef.current = activeEnemies;

        // 3. Update Relics (Dropped return timer & follow carriers)
        for (const relic of relicsRef.current) {
          if (relic.status === 'CARRIED' && relic.carrierEnemyId) {
            const carrier = enemiesRef.current.find((e) => e.id === relic.carrierEnemyId);
            if (carrier) {
              relic.x = carrier.x;
              relic.y = carrier.y - 12; // float above alien head
            } else {
              // Carrier died without dropping flag properly
              relic.status = 'DROPPED';
              relic.returnTimer = DROPPED_RELIC_RETURN_TIME;
              relic.carrierEnemyId = undefined;
            }
          } else if (relic.status === 'DROPPED') {
            relic.returnTimer -= dt;
            if (relic.returnTimer <= 0) {
              // Relic auto-dematerializes back to vault!
              relic.status = 'IN_VAULT';
              relic.x = vaultPixel.x;
              relic.y = vaultPixel.y;
              audio.playRelicSaved();
            }
          }
        }

        // 4. Update Towers (Targeting & Firing)
        const now = time / 1000;
        for (const tower of towersRef.current) {
          const def = TOWER_DEFINITIONS[tower.type];
          let effRange = def.range;
          let effDmg = def.damage;
          let effRate = def.fireRate;

          // Branch multipliers
          if (tower.branch === 'A') {
            effDmg *= def.upgrades.branchA.damageMult;
            effRange *= def.upgrades.branchA.rangeMult;
          } else if (tower.branch === 'B') {
            effDmg *= def.upgrades.branchB.damageMult;
            effRange *= def.upgrades.branchB.rangeMult;
            if (tower.type === 'PLASMA') effRate = 4.2; // Gatling
          }

          // Level bonuses
          effDmg *= 1 + (tower.level - 1) * 0.25;
          effRange *= 1 + (tower.level - 1) * 0.1;

          const towerPx = tower.gridX * TILE_SIZE + TILE_SIZE / 2;
          const towerPy = tower.gridY * TILE_SIZE + TILE_SIZE / 2;

          // Prioritize Relic Carriers, then closest to exit/vault
          const enemiesInRange = enemiesRef.current.filter((en) => {
            return Math.hypot(en.x - towerPx, en.y - towerPy) <= effRange;
          });

          if (enemiesInRange.length === 0) continue;

          // Sorting: carriers first, then highest path index
          enemiesInRange.sort((a, b) => {
            if (a.isCarryingRelic && !b.isCarryingRelic) return -1;
            if (!a.isCarryingRelic && b.isCarryingRelic) return 1;
            return b.pathIndex - a.pathIndex;
          });

          const primaryTarget = enemiesInRange[0];

          if (now - tower.lastShotTime >= 1 / effRate) {
            tower.lastShotTime = now;
            tower.targetEnemyId = primaryTarget.id;

            if (tower.type === 'PLASMA') {
              // Fire kinetic projectile
              projectilesRef.current.push({
                id: `p_${Date.now()}_${Math.random()}`,
                x: towerPx,
                y: towerPy,
                targetEnemyId: primaryTarget.id,
                speed: 380,
                damage: effDmg,
                category: 'PLASMA',
                isArmorPiercing: tower.branch === 'A',
              });
              audio.playPlasmaShot();
            } else if (tower.type === 'CRYO') {
              // Pulse frost ring in range hitting all nearby enemies
              audio.playCryoPulse();
              for (const en of enemiesInRange) {
                en.hp -= effDmg;
                en.slowTimer = tower.branch === 'A' ? 3.5 : 2.5;
                if (tower.branch === 'A' && Math.random() < 0.2) {
                  en.freezeTimer = 1.2;
                }
                tower.totalDamageDealt += effDmg;
                tower.xp += 1;
              }
              // Beam/ring effect
              beamsRef.current.push({
                x1: towerPx,
                y1: towerPy,
                x2: primaryTarget.x,
                y2: primaryTarget.y,
                color: '#38bdf8',
                life: 0.15,
              });
            } else if (tower.type === 'TESLA') {
              // Chain lightning
              audio.playTeslaZap();
              const chainLimit = tower.branch === 'A' ? 6 : 3;
              const targets = enemiesInRange.slice(0, chainLimit);
              let prevPt = { x: towerPx, y: towerPy };

              for (const tgt of targets) {
                tgt.hp -= effDmg;
                tower.totalDamageDealt += effDmg;
                tower.xp += 1;
                beamsRef.current.push({
                  x1: prevPt.x,
                  y1: prevPt.y,
                  x2: tgt.x,
                  y2: tgt.y,
                  color: '#c084fc',
                  life: 0.18,
                });
                prevPt = { x: tgt.x, y: tgt.y };
              }
            }

            // Tower Level up check (Level 1 -> 2 at 60 XP, 2 -> 3 at 180 XP)
            if (tower.level === 1 && tower.xp >= 60) {
              tower.level = 2;
            } else if (tower.level === 2 && tower.xp >= 180) {
              tower.level = 3;
            }
          }
        }

        // 5. Update Projectiles
        const activeProjectiles: Projectile[] = [];
        for (const proj of projectilesRef.current) {
          const target = enemiesRef.current.find((e) => e.id === proj.targetEnemyId);
          if (!target) continue;

          const dx = target.x - proj.x;
          const dy = target.y - proj.y;
          const dist = Math.hypot(dx, dy);
          const step = proj.speed * dt;

          if (dist <= step) {
            // Hit enemy
            let actualDmg = proj.damage;
            const def = ENEMY_DEFINITIONS[target.type];

            if (def.armorType === 'HEAVY') {
              if (proj.isArmorPiercing) actualDmg *= 1.4;
              else actualDmg *= 0.55;
            } else if (def.armorType === 'SHIELDED' && target.shieldHp > 0) {
              target.shieldHp = Math.max(0, target.shieldHp - actualDmg);
              actualDmg *= 0.4;
            }

            target.hp -= actualDmg;

            // Hit particles
            for (let i = 0; i < 4; i++) {
              particlesRef.current.push({
                x: target.x,
                y: target.y,
                vx: (Math.random() - 0.5) * 60,
                vy: (Math.random() - 0.5) * 60,
                life: 0.25,
                maxLife: 0.25,
                color: '#38bdf8',
                size: 2,
              });
            }
          } else {
            proj.x += (dx / dist) * step;
            proj.y += (dy / dist) * step;
            activeProjectiles.push(proj);
          }
        }
        projectilesRef.current = activeProjectiles;

        // 6. Check Enemy Deaths & Relic Dropping
        enemiesRef.current = enemiesRef.current.filter((en) => {
          if (en.hp <= 0) {
            en.alive = false;
            audio.playEnemyKilled();
            const reward = ENEMY_DEFINITIONS[en.type].mineralReward;
            setMinerals((m) => m + reward);

            // IF ENEMY WAS CARRYING A RELIC, IT DROPS RIGHT HERE!
            if (en.isCarryingRelic) {
              const carriedRelic = relicsRef.current.find(
                (r) => r.carrierEnemyId === en.id
              );
              if (carriedRelic) {
                carriedRelic.status = 'DROPPED';
                carriedRelic.x = en.x;
                carriedRelic.y = en.y;
                carriedRelic.returnTimer = DROPPED_RELIC_RETURN_TIME;
                carriedRelic.carrierEnemyId = undefined;
              }
            }

            // Death explosion particles
            for (let i = 0; i < 12; i++) {
              const ang = Math.random() * Math.PI * 2;
              const sp = 20 + Math.random() * 80;
              particlesRef.current.push({
                x: en.x,
                y: en.y,
                vx: Math.cos(ang) * sp,
                vy: Math.sin(ang) * sp,
                life: 0.4,
                maxLife: 0.4,
                color: ENEMY_DEFINITIONS[en.type].color,
                size: 2 + Math.random() * 3,
              });
            }
            return false;
          }
          return true;
        });

        // 7. Update Beams & Particles
        beamsRef.current = beamsRef.current.filter((b) => {
          b.life -= dt;
          return b.life > 0;
        });

        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          return p.life > 0;
        });
      }

      // Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) renderCanvas(ctx, canvas.width, canvas.height);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, isPaused, gameSpeed, currentWaveIdx, isWaveActive, level]);

  // Render Canvas
  const renderCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Deep lunar surface
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const tiles = tilesRef.current;
    const gridH = tiles.length;
    const gridW = tiles[0]?.length || 0;

    // Draw Grid Tiles
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const tile = tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // Base tile
        if (tile === 'PATH') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === 'BASALT') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // High ground ridge
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (tile === 'CRYSTAL_GEODE') {
          ctx.fillStyle = '#2e1065';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Purple crystal geode facets
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'REGOLITH') {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Soft crater ring
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (tile === 'OBSIDIAN') {
          ctx.fillStyle = '#030712';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#0f172a';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
          // Mountain jagged hatch
          ctx.strokeStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(px + 4, py + TILE_SIZE - 4);
          ctx.lineTo(px + TILE_SIZE / 2, py + 6);
          ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE - 4);
          ctx.stroke();
        } else if (tile === 'DEBRIS') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Rubble rocks
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(px + 10, py + 12, 10, 8);
          ctx.fillRect(px + 24, py + 22, 12, 10);
          ctx.fillRect(px + 14, py + 26, 8, 8);
        } else if (tile === 'VAULT') {
          // Ancient Monolith Vault
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          // Monolith core
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 10, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'SPAWN') {
          ctx.fillStyle = '#831843';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#f43f5e';
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          // Swarm ingress vortex
          ctx.strokeStyle = '#fda4af';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (tile === 'EXIT') {
          ctx.fillStyle = '#701a75';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#d946ef';
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }

        // Highlight selected tile
        if (selectedTile && selectedTile.x === x && selectedTile.y === y) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw Selected Tower Range Circle
    if (selectedTower) {
      const def = TOWER_DEFINITIONS[selectedTower.type];
      let r = def.range;
      if (selectedTower.branch === 'A') r *= def.upgrades.branchA.rangeMult;
      if (selectedTower.branch === 'B') r *= def.upgrades.branchB.rangeMult;
      r *= 1 + (selectedTower.level - 1) * 0.1;

      const cx = selectedTower.gridX * TILE_SIZE + TILE_SIZE / 2;
      const cy = selectedTower.gridY * TILE_SIZE + TILE_SIZE / 2;

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.fill();
      ctx.setLineDash([]);
    }

    // Draw Towers
    for (const tower of towersRef.current) {
      const tx = tower.gridX * TILE_SIZE + TILE_SIZE / 2;
      const ty = tower.gridY * TILE_SIZE + TILE_SIZE / 2;

      ctx.save();
      ctx.translate(tx, ty);

      // Tower Pedestal
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      if (tower.type === 'PLASMA') {
        ctx.fillStyle = tower.branch === 'A' ? '#0284c7' : '#0369a1';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Barrel
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-3, -16, 6, 10);
      } else if (tower.type === 'CRYO') {
        ctx.fillStyle = '#0e7490';
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cryo crystal spire
        ctx.fillStyle = '#67e8f9';
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
      } else if (tower.type === 'TESLA') {
        ctx.fillStyle = '#7e22ce';
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Tesla coil sphere
        ctx.fillStyle = '#e9d5ff';
        ctx.beginPath();
        ctx.arc(0, -10, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Level stars
      ctx.fillStyle = '#fbbf24';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★'.repeat(tower.level), 0, 17);

      ctx.restore();
    }

    // Draw Beams
    for (const beam of beamsRef.current) {
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
    }

    // Draw Projectiles
    for (const proj of projectilesRef.current) {
      ctx.fillStyle = proj.isArmorPiercing ? '#38bdf8' : '#67e8f9';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Relics (Dropped on Ground with return ring)
    for (const relic of relicsRef.current) {
      if (relic.status === 'DROPPED') {
        // Return ring
        const progress = relic.returnTimer / DROPPED_RELIC_RETURN_TIME;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(relic.x, relic.y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();

        // Glowing core
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(relic.x, relic.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw Enemies
    for (const enemy of enemiesRef.current) {
      const def = ENEMY_DEFINITIONS[enemy.type];

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Alien body
      ctx.fillStyle = def.color;
      if (enemy.freezeTimer > 0) ctx.fillStyle = '#93c5fd';
      else if (enemy.slowTimer > 0) ctx.fillStyle = '#67e8f9';

      ctx.beginPath();
      ctx.arc(0, 0, def.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Armor ring if Mech
      if (def.armorType === 'HEAVY') {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Energy Shield ring if Void Weaver
      if (enemy.shieldHp > 0) {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, def.size + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Health bar
      const hpW = def.size * 2 + 6;
      const hpH = 4;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-hpW / 2, -def.size - 8, hpW, hpH);
      ctx.fillStyle = enemy.hp / enemy.maxHp > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(
        -hpW / 2,
        -def.size - 8,
        hpW * (Math.max(0, enemy.hp) / enemy.maxHp),
        hpH
      );

      // If carrying a Relic, show glowing gem above alien!
      if (enemy.isCarryingRelic) {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -def.size - 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    // Draw Particles
    for (const p of particlesRef.current) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw Target Reticle if active spell
    if (activeSpell === 'METEOR') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      // Reticle follows cursor or canvas center
      ctx.setLineDash([]);
    }
  };

  // Canvas Click Handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 1. If Active Spell: Orbital Meteor
    if (activeSpell === 'METEOR') {
      if (energy >= SPELL_COSTS.ORBITAL_METEOR) {
        setEnergy((e) => e - SPELL_COSTS.ORBITAL_METEOR);
        audio.playOrbitalStrike();
        setActiveSpell(null);

        // Meteor blast damage to all enemies within 120px radius
        const blastRadius = 120;
        for (const en of enemiesRef.current) {
          const d = Math.hypot(en.x - clickX, en.y - clickY);
          if (d <= blastRadius) {
            en.hp -= 340 * (1 - d / blastRadius * 0.5);
          }
        }

        // Particle blast
        for (let i = 0; i < 35; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 40 + Math.random() * 150;
          particlesRef.current.push({
            x: clickX,
            y: clickY,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 0.6,
            maxLife: 0.6,
            color: i % 2 === 0 ? '#f97316' : '#ef4444',
            size: 3 + Math.random() * 4,
          });
        }
      }
      return;
    }

    const gridX = Math.floor(clickX / TILE_SIZE);
    const gridY = Math.floor(clickY / TILE_SIZE);

    if (
      gridX < 0 ||
      gridX >= level.gridWidth ||
      gridY < 0 ||
      gridY >= level.gridHeight
    )
      return;

    // Check if clicked an existing tower
    const existingTower = towersRef.current.find(
      (t) => t.gridX === gridX && t.gridY === gridY
    );
    if (existingTower) {
      setSelectedTower(existingTower);
      setSelectedTile({ x: gridX, y: gridY });
      return;
    }

    // Otherwise select tile
    setSelectedTower(null);
    setSelectedTile({ x: gridX, y: gridY });
  };

  // Build Tower Action
  const handleBuildTower = (cat: TowerCategory) => {
    if (!selectedTile) return;
    const def = TOWER_DEFINITIONS[cat];
    if (minerals < def.cost) return;

    const tile = tilesRef.current[selectedTile.y][selectedTile.x];
    if (!def.allowedTiles.includes(tile)) return;

    setMinerals((m) => m - def.cost);
    audio.playBuildTower();

    const newTower: PlacedTower = {
      id: `tw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      gridX: selectedTile.x,
      gridY: selectedTile.y,
      type: cat,
      level: 1,
      xp: 0,
      totalDamageDealt: 0,
      lastShotTime: 0,
    };

    towersRef.current.push(newTower);
    setSelectedTower(newTower);
  };

  // Clear Debris Action
  const handleClearDebris = () => {
    if (!selectedTile) return;
    if (minerals < CLEAR_DEBRIS_COST) return;

    setMinerals((m) => m - CLEAR_DEBRIS_COST);
    audio.playCrash();

    // Convert DEBRIS to BASALT
    tilesRef.current[selectedTile.y][selectedTile.x] = 'BASALT';
    setSelectedTile({ ...selectedTile });
  };

  // Tower Upgrade Action
  const handleUpgradeBranch = (branch: 'A' | 'B') => {
    if (!selectedTower) return;
    const def = TOWER_DEFINITIONS[selectedTower.type];
    const cost = branch === 'A' ? def.upgrades.branchA.cost : def.upgrades.branchB.cost;

    if (minerals < cost) return;

    setMinerals((m) => m - cost);
    audio.playBuildTower();

    selectedTower.branch = branch;
    setSelectedTower({ ...selectedTower });
  };

  // Sell Tower Action
  const handleSellTower = () => {
    if (!selectedTower) return;
    const def = TOWER_DEFINITIONS[selectedTower.type];
    const refund = Math.floor(def.cost * 0.7);

    setMinerals((m) => m + refund);
    audio.playFuelPickup();

    towersRef.current = towersRef.current.filter((t) => t.id !== selectedTower.id);
    setSelectedTower(null);
    setSelectedTile(null);
  };

  // Activate Stasis EMP spell
  const handleTriggerEMP = () => {
    if (energy < SPELL_COSTS.STASIS_EMP) return;
    setEnergy((e) => e - SPELL_COSTS.STASIS_EMP);
    audio.playCryoPulse();

    // Freeze all aliens for 4 seconds
    for (const en of enemiesRef.current) {
      en.freezeTimer = 4.0;
    }
  };

  // Activate Relic Recall Drone spell
  const handleRecallRelic = () => {
    if (energy < SPELL_COSTS.RELIC_RECALL) return;
    const droppedRelic = relicsRef.current.find((r) => r.status === 'DROPPED');
    if (!droppedRelic) return;

    setEnergy((e) => e - SPELL_COSTS.RELIC_RECALL);
    droppedRelic.status = 'IN_VAULT';
    droppedRelic.x = level.vaultPos.x * TILE_SIZE + TILE_SIZE / 2;
    droppedRelic.y = level.vaultPos.y * TILE_SIZE + TILE_SIZE / 2;
    audio.playRelicSaved();
  };

  // Current selected tile type
  const selTileType = selectedTile
    ? tilesRef.current[selectedTile.y]?.[selectedTile.x]
    : null;

  const relicsInVault = relicsRef.current.filter((r) => r.status === 'IN_VAULT').length;
  const relicsCarried = relicsRef.current.filter((r) => r.status === 'CARRIED').length;
  const relicsDropped = relicsRef.current.filter((r) => r.status === 'DROPPED').length;
  const relicsLost = relicsRef.current.filter((r) => r.status === 'LOST').length;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden">
      {/* Top Header HUD Strip */}
      <div className="h-14 px-6 flex items-center justify-between bg-slate-950 border-b border-slate-800 z-20">
        <div className="flex items-center gap-6">
          <button
            onClick={onBackToStudio}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Studio Hub
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-white">{level.name}</span>
            <span className="text-xs text-slate-400 font-mono-numbers">
              Wave {Math.min(currentWaveIdx, level.waves.length)} / {level.waves.length}
            </span>
          </div>
        </div>

        {/* Resource Telemetry */}
        <div className="flex items-center gap-6 font-mono-numbers text-xs">
          {/* Minerals */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">MINERALS:</span>
            <span className="font-bold text-amber-400">{minerals}</span>
          </div>

          {/* Energy (Mana) */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded min-w-[130px]">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">ENERGY:</span>
            <span className="font-bold text-cyan-400">{Math.round(energy)}/100</span>
          </div>

          {/* Cursed Relic Cores Status */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
            <span className="text-slate-400">RELICS:</span>
            <div className="flex items-center gap-1.5">
              {relicsRef.current.map((r) => (
                <div
                  key={r.id}
                  className={`w-3 h-3 rounded-full border ${
                    r.status === 'IN_VAULT'
                      ? 'bg-cyan-400 border-cyan-300 shadow-sm shadow-cyan-400/50'
                      : r.status === 'DROPPED'
                      ? 'bg-amber-400 border-amber-300 animate-pulse'
                      : r.status === 'CARRIED'
                      ? 'bg-rose-500 border-rose-400 animate-bounce'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                  title={`Relic #${r.id}: ${r.status}`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400 ml-1">
              {relicsInVault} Vault · {relicsDropped} Dropped · {relicsLost} Lost
            </span>
          </div>
        </div>

        {/* Speed / Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => audio.setMuted(!audio.getMuted())}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded"
            title="Toggle Audio"
          >
            {audio.getMuted() ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setGameSpeed((s) => (s === 1 ? 2 : 1))}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono-numbers text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded"
          >
            <FastForward className="w-3.5 h-3.5" />
            {gameSpeed}x
          </button>
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded"
            title="Pause / Resume"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={resetGame}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>
          {onEditLevel && (
            <button
              onClick={onEditLevel}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800 hover:bg-cyan-900/50 rounded"
            >
              <Edit3 className="w-3.5 h-3.5" />
              TD Map Editor
            </button>
          )}
        </div>
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Orbital Strike / Spells Sidebar */}
        <div className="w-60 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between z-10 text-xs">
          <div className="space-y-4">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Orbital Command Powers
            </h4>

            {/* Spell 1: Orbital Meteor */}
            <button
              onClick={() => setActiveSpell(activeSpell === 'METEOR' ? null : 'METEOR')}
              disabled={energy < SPELL_COSTS.ORBITAL_METEOR}
              className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                activeSpell === 'METEOR'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : energy < SPELL_COSTS.ORBITAL_METEOR
                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 opacity-60 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span>☄️ Orbital Meteor</span>
                <span className="font-mono-numbers text-cyan-400">40 En</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Click map to call down a kinetic warhead dealing 340 AoE damage.
              </p>
            </button>

            {/* Spell 2: Stasis EMP Shockwave */}
            <button
              onClick={handleTriggerEMP}
              disabled={energy < SPELL_COSTS.STASIS_EMP}
              className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                energy < SPELL_COSTS.STASIS_EMP
                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 opacity-60 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span>❄️ Stasis EMP Pulse</span>
                <span className="font-mono-numbers text-cyan-400">30 En</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Instantly flash-freezes every alien on the surface for 4 seconds.
              </p>
            </button>

            {/* Spell 3: Relic Recall Drone */}
            <button
              onClick={handleRecallRelic}
              disabled={energy < SPELL_COSTS.RELIC_RECALL || relicsDropped === 0}
              className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                energy < SPELL_COSTS.RELIC_RECALL || relicsDropped === 0
                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 opacity-60 cursor-not-allowed'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span>🛸 Relic Recall Drone</span>
                <span className="font-mono-numbers text-cyan-400">25 En</span>
              </div>
              <p className="text-[10px] text-slate-400">
                Instantly teleports a dropped relic back into the Vault.
              </p>
            </button>
          </div>

          {/* Send Next Wave Button */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={startNextWave}
              disabled={currentWaveIdx >= level.waves.length && !isWaveActive}
              className={`w-full py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                isWaveActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                  : currentWaveIdx >= level.waves.length
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              {isWaveActive ? 'Call Early (+Bonus!)' : 'Deploy Next Wave'}
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950">
          <canvas
            ref={canvasRef}
            width={level.gridWidth * TILE_SIZE}
            height={level.gridHeight * TILE_SIZE}
            onClick={handleCanvasClick}
            className="border border-slate-800 rounded-lg shadow-2xl block cursor-pointer max-w-full max-h-full object-contain"
          />

          {/* Relic Alerter Toast when Relic is carried */}
          {relicsCarried > 0 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-rose-950/90 border border-rose-600 text-rose-300 text-xs font-bold rounded-full animate-bounce shadow-xl">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>DON'T TOUCH MY GEMS! RELIC BEING EXTRACTED!</span>
            </div>
          )}
        </div>

        {/* Right Tower Build / Inspect Drawer */}
        <div className="w-72 bg-slate-950 border-l border-slate-800 p-4 flex flex-col justify-between z-10 text-xs">
          {selectedTower ? (
            /* Selected Tower Inspector */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase tracking-wider">
                  {TOWER_DEFINITIONS[selectedTower.type].name}
                </span>
                <span className="font-mono-numbers text-amber-400 font-bold">
                  Lv.{selectedTower.level}
                </span>
              </div>

              {/* Stats */}
              <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-1.5 font-mono-numbers text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Damage:</span>
                  <span className="text-cyan-400">{Math.round(selectedTower.totalDamageDealt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Combat XP:</span>
                  <span className="text-white">{selectedTower.xp} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Specialization:</span>
                  <span className="text-purple-400 font-bold">
                    {selectedTower.branch === 'A'
                      ? TOWER_DEFINITIONS[selectedTower.type].upgrades.branchA.name
                      : selectedTower.branch === 'B'
                      ? TOWER_DEFINITIONS[selectedTower.type].upgrades.branchB.name
                      : 'Base Chassis'}
                  </span>
                </div>
              </div>

              {/* Branch Upgrades if not yet chosen */}
              {!selectedTower.branch && (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                    Select Upgrade Branch
                  </h5>

                  {/* Branch A */}
                  <button
                    onClick={() => handleUpgradeBranch('A')}
                    disabled={minerals < TOWER_DEFINITIONS[selectedTower.type].upgrades.branchA.cost}
                    className="w-full p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded text-left transition-all"
                  >
                    <div className="flex justify-between font-bold text-cyan-300 mb-1">
                      <span>{TOWER_DEFINITIONS[selectedTower.type].upgrades.branchA.name}</span>
                      <span className="font-mono-numbers text-amber-400">
                        {TOWER_DEFINITIONS[selectedTower.type].upgrades.branchA.cost} 🪙
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {TOWER_DEFINITIONS[selectedTower.type].upgrades.branchA.special}
                    </p>
                  </button>

                  {/* Branch B */}
                  <button
                    onClick={() => handleUpgradeBranch('B')}
                    disabled={minerals < TOWER_DEFINITIONS[selectedTower.type].upgrades.branchB.cost}
                    className="w-full p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded text-left transition-all"
                  >
                    <div className="flex justify-between font-bold text-purple-300 mb-1">
                      <span>{TOWER_DEFINITIONS[selectedTower.type].upgrades.branchB.name}</span>
                      <span className="font-mono-numbers text-amber-400">
                        {TOWER_DEFINITIONS[selectedTower.type].upgrades.branchB.cost} 🪙
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {TOWER_DEFINITIONS[selectedTower.type].upgrades.branchB.special}
                    </p>
                  </button>
                </div>
              )}

              {/* Sell Tower */}
              <button
                onClick={handleSellTower}
                className="w-full py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-semibold rounded flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Dismantle for {Math.floor(TOWER_DEFINITIONS[selectedTower.type].cost * 0.7)} 🪙
              </button>
            </div>
          ) : selectedTile ? (
            /* Selected Tile Build Menu */
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase tracking-wider block">
                  Lunar Terrain: {selTileType}
                </span>
                <span className="text-[11px] text-slate-400 font-mono-numbers">
                  Sector ({selectedTile.x}, {selectedTile.y})
                </span>
              </div>

              {selTileType === 'DEBRIS' ? (
                <div className="p-3 bg-slate-900 border border-slate-800 rounded space-y-3">
                  <p className="text-[11px] text-slate-300">
                    Meteor rubble blocks construction here. Blast clear to create Lunar Basalt.
                  </p>
                  <button
                    onClick={handleClearDebris}
                    disabled={minerals < CLEAR_DEBRIS_COST}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 font-bold text-slate-950 rounded"
                  >
                    Clear Rubble ({CLEAR_DEBRIS_COST} 🪙)
                  </button>
                </div>
              ) : selTileType === 'BASALT' || selTileType === 'CRYSTAL_GEODE' || selTileType === 'REGOLITH' ? (
                <div className="space-y-2.5">
                  <span className="font-bold text-slate-300 text-[11px] uppercase tracking-wider block">
                    Available Emplacements
                  </span>

                  {/* Plasma Cannon (Basalt) */}
                  <button
                    onClick={() => handleBuildTower('PLASMA')}
                    disabled={selTileType !== 'BASALT' || minerals < TOWER_DEFINITIONS.PLASMA.cost}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                      selTileType === 'BASALT'
                        ? 'bg-slate-900 border-slate-700 hover:bg-slate-850'
                        : 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-cyan-300 mb-0.5">
                      <span>Plasma Blaster</span>
                      <span className="font-mono-numbers text-amber-400">100 🪙</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Kinetic railgun. Must be built on Basalt rock.
                    </p>
                  </button>

                  {/* Cryo Spire (Regolith) */}
                  <button
                    onClick={() => handleBuildTower('CRYO')}
                    disabled={selTileType !== 'REGOLITH' || minerals < TOWER_DEFINITIONS.CRYO.cost}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                      selTileType === 'REGOLITH'
                        ? 'bg-slate-900 border-slate-700 hover:bg-slate-850'
                        : 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-cyan-300 mb-0.5">
                      <span>Cryo-Stasis Spire</span>
                      <span className="font-mono-numbers text-amber-400">120 🪙</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Chills and slows aliens. Built on Lunar Regolith.
                    </p>
                  </button>

                  {/* Tesla Arc Spire (Crystal Geode) */}
                  <button
                    onClick={() => handleBuildTower('TESLA')}
                    disabled={selTileType !== 'CRYSTAL_GEODE' || minerals < TOWER_DEFINITIONS.TESLA.cost}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                      selTileType === 'CRYSTAL_GEODE'
                        ? 'bg-slate-900 border-slate-700 hover:bg-slate-850'
                        : 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-purple-300 mb-0.5">
                      <span>Tesla Arc Spire</span>
                      <span className="font-mono-numbers text-amber-400">140 🪙</span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Chain lightning. Must be built on Crystalline Geodes.
                    </p>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Cannot construct towers on this terrain type.
                </p>
              )}
            </div>
          ) : (
            /* Empty selection state */
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Crosshair className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-[11px]">Click any map tile to construct towers or inspect defense nodes.</p>
            </div>
          )}

          {/* Quick rules recap at bottom */}
          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
            <p>• Aliens steal relics and head for EXIT.</p>
            <p>• Slain carriers drop relics onto the path.</p>
            <p>• Undisturbed dropped relics slowly return to vault.</p>
          </div>
        </div>

        {/* Victory Modal */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-96 p-6 bg-slate-900 border border-cyan-800/80 rounded-xl text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-950/80 border border-cyan-500 flex items-center justify-center text-cyan-400">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Outpost Defended!</h2>
              <p className="text-xs text-cyan-400 mb-4 font-mono-numbers">
                {relicsInVault + relicsDropped} of {level.totalRelics} Relics Saved
              </p>

              {/* Star Rating */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map((starIdx) => (
                  <div
                    key={starIdx}
                    className={`text-2xl transition-all ${
                      starIdx <= stars ? 'text-amber-400 scale-110' : 'text-slate-700'
                    }`}
                  >
                    ★
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={resetGame}
                  className="flex-1 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Replay
                </button>
                {hasNextLevel && onNextLevel ? (
                  <button
                    onClick={onNextLevel}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                  >
                    Next Sector
                  </button>
                ) : (
                  <button
                    onClick={onBackToStudio}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                  >
                    Studio Hub
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Defeat Modal */}
        {gameState === 'DEFEAT' && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-96 p-6 bg-slate-900 border border-rose-900/80 rounded-xl text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-950/80 border border-rose-600 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-rose-400 mb-1">All Relics Stolen!</h2>
              <p className="text-xs text-slate-300 mb-4">
                The alien swarm carried every relic off the moon surface into their mothership.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetGame}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
                {onEditLevel && (
                  <button
                    onClick={onEditLevel}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Tweak Map
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
