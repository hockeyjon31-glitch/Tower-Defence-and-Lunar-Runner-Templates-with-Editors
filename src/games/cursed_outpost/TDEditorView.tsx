import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TDLevel, TDTileType, TDWave, EnemyType } from './types';
import { TILE_SIZE, ENEMY_DEFINITIONS } from './constants';
import { findGridPath } from './pathfinding';
import { 
  Play, Save, ArrowLeft, Settings2, Download, Upload, 
  Layers, Plus, Trash2, CheckCircle2, AlertTriangle
} from 'lucide-react';

interface TDEditorViewProps {
  initialLevel: TDLevel;
  onSaveLevel: (level: TDLevel) => void;
  onTestDefense: (level: TDLevel) => void;
  onBackToStudio: () => void;
}

type PaletteBrush = TDTileType;

export const TDEditorView: React.FC<TDEditorViewProps> = ({
  initialLevel,
  onSaveLevel,
  onTestDefense,
  onBackToStudio,
}) => {
  const [level, setLevel] = useState<TDLevel>(() => JSON.parse(JSON.stringify(initialLevel)));
  const [activeBrush, setActiveBrush] = useState<PaletteBrush>('PATH');
  const [activeTab, setActiveTab] = useState<'GRID' | 'WAVES' | 'SETTINGS'>('GRID');
  const [saveToast, setSaveToast] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef(false);

  // Validate path connectivity
  const [isPathValid, setIsPathValid] = useState(true);

  const checkPath = useCallback(() => {
    const ingress = findGridPath(level.tiles, level.spawnPos, level.vaultPos);
    const egress = findGridPath(level.tiles, level.vaultPos, level.exitPos);
    setIsPathValid(ingress.length > 0 && egress.length > 0);
  }, [level.tiles, level.spawnPos, level.vaultPos, level.exitPos]);

  useEffect(() => {
    checkPath();
  }, [checkPath]);

  // Render Grid
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tiles = level.tiles;
    const gridH = tiles.length;
    const gridW = tiles[0]?.length || 0;

    // Draw tiles
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const tile = tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === 'PATH') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === 'BASALT') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        } else if (tile === 'CRYSTAL_GEODE') {
          ctx.fillStyle = '#2e1065';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#a855f7';
          ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'REGOLITH') {
          ctx.fillStyle = '#090d16';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (tile === 'OBSIDIAN') {
          ctx.fillStyle = '#030712';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#1e293b';
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        } else if (tile === 'DEBRIS') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(px + 12, py + 12, 10, 8);
          ctx.fillRect(px + 24, py + 24, 8, 8);
        } else if (tile === 'VAULT') {
          ctx.fillStyle = '#064e3b';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#10b981';
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'SPAWN') {
          ctx.fillStyle = '#831843';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#f43f5e';
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === 'EXIT') {
          ctx.fillStyle = '#701a75';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#d946ef';
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }

    // Overlay Path indicator lines
    const ingress = findGridPath(level.tiles, level.spawnPos, level.vaultPos);
    if (ingress.length > 1) {
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(ingress[0].x * TILE_SIZE + TILE_SIZE / 2, ingress[0].y * TILE_SIZE + TILE_SIZE / 2);
      for (let i = 1; i < ingress.length; i++) {
        ctx.lineTo(ingress[i].x * TILE_SIZE + TILE_SIZE / 2, ingress[i].y * TILE_SIZE + TILE_SIZE / 2);
      }
      ctx.stroke();
    }

    const egress = findGridPath(level.tiles, level.vaultPos, level.exitPos);
    if (egress.length > 1) {
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(egress[0].x * TILE_SIZE + TILE_SIZE / 2, egress[0].y * TILE_SIZE + TILE_SIZE / 2);
      for (let i = 1; i < egress.length; i++) {
        ctx.lineTo(egress[i].x * TILE_SIZE + TILE_SIZE / 2, egress[i].y * TILE_SIZE + TILE_SIZE / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [level]);

  useEffect(() => {
    render();
  }, [render]);

  // Painting tiles
  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const gx = Math.floor(((clientX - rect.left) * scaleX) / TILE_SIZE);
    const gy = Math.floor(((clientY - rect.top) * scaleY) / TILE_SIZE);

    if (gx < 0 || gx >= level.gridWidth || gy < 0 || gy >= level.gridHeight) return;

    const nextTiles = level.tiles.map((row) => [...row]);

    if (activeBrush === 'SPAWN') {
      // Clear old spawn
      for (let y = 0; y < level.gridHeight; y++) {
        for (let x = 0; x < level.gridWidth; x++) {
          if (nextTiles[y][x] === 'SPAWN') nextTiles[y][x] = 'REGOLITH';
        }
      }
      nextTiles[gy][gx] = 'SPAWN';
      setLevel((prev) => ({ ...prev, tiles: nextTiles, spawnPos: { x: gx, y: gy } }));
    } else if (activeBrush === 'VAULT') {
      // Clear old vault
      for (let y = 0; y < level.gridHeight; y++) {
        for (let x = 0; x < level.gridWidth; x++) {
          if (nextTiles[y][x] === 'VAULT') nextTiles[y][x] = 'REGOLITH';
        }
      }
      nextTiles[gy][gx] = 'VAULT';
      setLevel((prev) => ({ ...prev, tiles: nextTiles, vaultPos: { x: gx, y: gy } }));
    } else if (activeBrush === 'EXIT') {
      // Clear old exit
      for (let y = 0; y < level.gridHeight; y++) {
        for (let x = 0; x < level.gridWidth; x++) {
          if (nextTiles[y][x] === 'EXIT') nextTiles[y][x] = 'REGOLITH';
        }
      }
      nextTiles[gy][gx] = 'EXIT';
      setLevel((prev) => ({ ...prev, tiles: nextTiles, exitPos: { x: gx, y: gy } }));
    } else {
      nextTiles[gy][gx] = activeBrush;
      setLevel((prev) => ({ ...prev, tiles: nextTiles }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPaintingRef.current = true;
    paintAt(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPaintingRef.current) {
      paintAt(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    isPaintingRef.current = false;
  };

  // Wave modifications
  const addWave = () => {
    const newWave: TDWave = {
      waveNumber: level.waves.length + 1,
      bonusMinerals: 50,
      squads: [{ enemyType: 'SCOUT', count: 6, spawnInterval: 1.0 }],
    };
    setLevel((prev) => ({ ...prev, waves: [...prev.waves, newWave] }));
  };

  const deleteWave = (idx: number) => {
    setLevel((prev) => ({
      ...prev,
      waves: prev.waves.filter((_, i) => i !== idx).map((w, i) => ({ ...w, waveNumber: i + 1 })),
    }));
  };

  const addSquad = (waveIdx: number) => {
    const nextWaves = [...level.waves];
    nextWaves[waveIdx].squads.push({ enemyType: 'SWARM_DRONE', count: 8, spawnInterval: 0.5 });
    setLevel((prev) => ({ ...prev, waves: nextWaves }));
  };

  const deleteSquad = (waveIdx: number, squadIdx: number) => {
    const nextWaves = [...level.waves];
    nextWaves[waveIdx].squads = nextWaves[waveIdx].squads.filter((_, i) => i !== squadIdx);
    setLevel((prev) => ({ ...prev, waves: nextWaves }));
  };

  // Export JSON
  const handleExportJson = () => {
    const str = JSON.stringify(level, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${level.name.toLowerCase().replace(/\s+/g, '_')}_td_level.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    onSaveLevel(level);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden">
      {/* Top Header */}
      <div className="h-14 px-6 flex items-center justify-between bg-slate-950 border-b border-slate-800 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToStudio}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Studio Hub
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-cyan-400 font-mono-numbers">
              TD Map Editor
            </span>
            <span className="text-sm font-bold text-white">{level.name}</span>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('GRID')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'GRID' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Terrain Grid
          </button>
          <button
            onClick={() => setActiveTab('WAVES')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'WAVES' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Wave Configurator ({level.waves.length})
          </button>
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'SETTINGS' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Settings & Economy
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTestDefense(level)}
            disabled={!isPathValid}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded shadow-sm transition-all ${
              isPathValid
                ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Test Play Defense
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded"
          >
            <Save className="w-3.5 h-3.5" />
            Save Map
          </button>
          <button
            onClick={handleExportJson}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded"
            title="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Main Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {activeTab === 'GRID' && (
          <>
            {/* Left Paint Palette */}
            <div className="w-56 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between z-10 text-xs">
              <div className="space-y-4">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                  Terrain Tile Brushes
                </span>

                <div className="space-y-1.5">
                  <button
                    onClick={() => setActiveBrush('PATH')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'PATH' ? 'bg-slate-800 border-cyan-400 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-slate-900 border border-slate-700" />
                    <span>Alien Trench (Path)</span>
                  </button>

                  <button
                    onClick={() => setActiveBrush('BASALT')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'BASALT' ? 'bg-slate-800 border-cyan-400 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-slate-700 border border-slate-500" />
                    <span>Basalt Rock (Plasma)</span>
                  </button>

                  <button
                    onClick={() => setActiveBrush('CRYSTAL_GEODE')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'CRYSTAL_GEODE' ? 'bg-slate-800 border-cyan-400 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-purple-900 border border-purple-500" />
                    <span>Crystal Geode (Tesla)</span>
                  </button>

                  <button
                    onClick={() => setActiveBrush('REGOLITH')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'REGOLITH' ? 'bg-slate-800 border-cyan-400 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-slate-950 border border-slate-800" />
                    <span>Lunar Dust (Cryo)</span>
                  </button>

                  <button
                    onClick={() => setActiveBrush('OBSIDIAN')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'OBSIDIAN' ? 'bg-slate-800 border-cyan-400 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-black border border-slate-800" />
                    <span>Obsidian (Mountain)</span>
                  </button>

                  <button
                    onClick={() => setActiveBrush('DEBRIS')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'DEBRIS' ? 'bg-slate-800 border-cyan-400 text-white' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-amber-950 border border-amber-700" />
                    <span>Meteor Debris (Clearable)</span>
                  </button>
                </div>

                <div className="w-full h-px bg-slate-800" />

                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                  Critical Waypoints
                </span>

                <div className="space-y-1.5">
                  <button
                    onClick={() => setActiveBrush('SPAWN')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'SPAWN' ? 'bg-rose-950 border-rose-500 text-rose-300' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-rose-600" />
                    <span>Swarm Ingress Portal</span>
                  </button>

                  <button
                    onClick={() => setActiveBrush('VAULT')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'VAULT' ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-emerald-500" />
                    <span>Relic Vault Monolith</span>
                  </button>

                  <button
                    onClick={() => setActiveBrush('EXIT')}
                    className={`w-full p-2 rounded border text-left flex items-center gap-2.5 transition-colors ${
                      activeBrush === 'EXIT' ? 'bg-purple-950 border-purple-500 text-purple-300' : 'border-slate-800 text-slate-400 hover:bg-slate-900'
                    }`}
                  >
                    <div className="w-4 h-4 rounded bg-purple-500" />
                    <span>Alien Escape Portal</span>
                  </button>
                </div>
              </div>

              {/* Path status check */}
              <div className="pt-3 border-t border-slate-800 text-xs">
                {isPathValid ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Path Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Path Disconnected!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Canvas Viewport */}
            <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950">
              <canvas
                ref={canvasRef}
                width={level.gridWidth * TILE_SIZE}
                height={level.gridHeight * TILE_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="border border-slate-800 rounded-lg shadow-2xl block cursor-crosshair max-w-full max-h-full object-contain"
              />
            </div>
          </>
        )}

        {/* Waves Configurator Tab */}
        {activeTab === 'WAVES' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Wave & Swarm Configurator</h3>
                <p className="text-xs text-slate-400">Design enemy attack waves, squad compositions, intervals, and rewards.</p>
              </div>
              <button
                onClick={addWave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded"
              >
                <Plus className="w-4 h-4" />
                Add Wave
              </button>
            </div>

            <div className="space-y-4">
              {level.waves.map((wave, waveIdx) => (
                <div key={wave.waveNumber} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-sm">Wave #{wave.waveNumber}</span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono-numbers">
                        <span>Bonus Minerals:</span>
                        <input
                          type="number"
                          value={wave.bonusMinerals}
                          onChange={(e) => {
                            const nw = [...level.waves];
                            nw[waveIdx].bonusMinerals = Number(e.target.value);
                            setLevel({ ...level, waves: nw });
                          }}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addSquad(waveIdx)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Squad
                      </button>
                      {level.waves.length > 1 && (
                        <button
                          onClick={() => deleteWave(waveIdx)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Squads in wave */}
                  <div className="space-y-2">
                    {wave.squads.map((squad, sqIdx) => (
                      <div key={sqIdx} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                        <div className="flex items-center gap-4">
                          <select
                            value={squad.enemyType}
                            onChange={(e) => {
                              const nw = [...level.waves];
                              nw[waveIdx].squads[sqIdx].enemyType = e.target.value as EnemyType;
                              setLevel({ ...level, waves: nw });
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-semibold"
                          >
                            <option value="SCOUT">Lunar Scouter (Fast)</option>
                            <option value="MECH">Armored Mech (Heavy Armor)</option>
                            <option value="VOID_WEAVER">Phase Weaver (Shielded)</option>
                            <option value="SWARM_DRONE">Swarm Parasite (Pack)</option>
                            <option value="GOLIATH">Goliath Titan (Boss)</option>
                          </select>

                          <div className="flex items-center gap-2 font-mono-numbers">
                            <span className="text-slate-400">Count:</span>
                            <input
                              type="number"
                              min="1"
                              value={squad.count}
                              onChange={(e) => {
                                const nw = [...level.waves];
                                nw[waveIdx].squads[sqIdx].count = Math.max(1, Number(e.target.value));
                                setLevel({ ...level, waves: nw });
                              }}
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                            />
                          </div>

                          <div className="flex items-center gap-2 font-mono-numbers">
                            <span className="text-slate-400">Spawn Delay:</span>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={squad.spawnInterval}
                              onChange={(e) => {
                                const nw = [...level.waves];
                                nw[waveIdx].squads[sqIdx].spawnInterval = Math.max(0.1, Number(e.target.value));
                                setLevel({ ...level, waves: nw });
                              }}
                              className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                            />
                            <span className="text-slate-500">sec</span>
                          </div>
                        </div>

                        {wave.squads.length > 1 && (
                          <button
                            onClick={() => deleteSquad(waveIdx, sqIdx)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'SETTINGS' && (
          <div className="flex-1 p-6 max-w-xl mx-auto space-y-5 text-xs">
            <h3 className="text-base font-bold text-white pb-2 border-b border-slate-800">
              Sector Settings & Economy
            </h3>

            <div>
              <label className="text-slate-400 block mb-1">Map Sector Title</label>
              <input
                type="text"
                value={level.name}
                onChange={(e) => setLevel({ ...level, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Briefing Description</label>
              <textarea
                rows={3}
                value={level.description}
                onChange={(e) => setLevel({ ...level, description: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Starting Minerals (🪙)</label>
                <input
                  type="number"
                  value={level.startingMinerals}
                  onChange={(e) => setLevel({ ...level, startingMinerals: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono-numbers"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Starting Energy (⚡)</label>
                <input
                  type="number"
                  value={level.startingEnergy}
                  onChange={(e) => setLevel({ ...level, startingEnergy: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono-numbers"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Relic Cores in Vault</label>
              <input
                type="number"
                min="1"
                max="10"
                value={level.totalRelics}
                onChange={(e) => setLevel({ ...level, totalRelics: Math.max(1, Number(e.target.value)) })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono-numbers"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2 bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-semibold rounded shadow-lg">
          TD Map Saved Successfully!
        </div>
      )}
    </div>
  );
};
