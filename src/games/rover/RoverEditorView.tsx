import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RoverLevel, RoverLevelObject, RoverObjectType } from './types';
import { 
  Play, Save, RotateCcw, Plus, Trash2, ArrowLeft, 
  Settings2, Download, Upload, ZoomIn, ZoomOut, Move,
  Sparkles, Fuel, Bomb, ArrowUpRight, Globe, Flag, MapPin
} from 'lucide-react';

interface RoverEditorViewProps {
  initialLevel: RoverLevel;
  onSaveLevel: (level: RoverLevel) => void;
  onTestDrive: (level: RoverLevel) => void;
  onBackToStudio: () => void;
}

type EditorTool =
  | 'SELECT'
  | 'ADD_TERRAIN'
  | 'CRATER_BRUSH'
  | 'SMOOTH_BRUSH'
  | 'PLACE_START'
  | 'PLACE_FINISH'
  | 'PLACE_CRYSTAL'
  | 'PLACE_FUEL'
  | 'PLACE_MINE'
  | 'PLACE_JUMP_PAD'
  | 'PLACE_LOW_G';

export const RoverEditorView: React.FC<RoverEditorViewProps> = ({
  initialLevel,
  onSaveLevel,
  onTestDrive,
  onBackToStudio,
}) => {
  const [level, setLevel] = useState<RoverLevel>(() => JSON.parse(JSON.stringify(initialLevel)));
  const [activeTool, setActiveTool] = useState<EditorTool>('SELECT');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedTerrainIdx, setSelectedTerrainIdx] = useState<number | null>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const panRef = useRef<{ x: number; y: number }>({ x: 100, y: 150 });
  const zoomRef = useRef<number>(0.9);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggingItemRef = useRef<{ type: 'object' | 'terrain' | 'pan'; id?: string; idx?: number } | null>(null);

  // Sync to canvas size
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 700 });

  useEffect(() => {
    const updateSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setCanvasSize({ width: container.clientWidth, height: container.clientHeight });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Screen to World coords
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const wx = (sx - panRef.current.x) / zoomRef.current;
    const wy = (sy - panRef.current.y) / zoomRef.current;
    return { x: wx, y: wy };
  }, []);

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep grid space background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    // Grid lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1 / zoomRef.current;
    const startGridX = Math.floor(-panRef.current.x / zoomRef.current / 100) * 100 - 200;
    const endGridX = startGridX + (canvas.width / zoomRef.current) + 500;
    const startGridY = Math.floor(-panRef.current.y / zoomRef.current / 100) * 100 - 200;
    const endGridY = startGridY + (canvas.height / zoomRef.current) + 500;

    for (let gx = startGridX; gx <= endGridX; gx += 100) {
      ctx.beginPath();
      ctx.moveTo(gx, startGridY);
      ctx.lineTo(gx, endGridY);
      ctx.stroke();
    }
    for (let gy = startGridY; gy <= endGridY; gy += 100) {
      ctx.beginPath();
      ctx.moveTo(startGridX, gy);
      ctx.lineTo(endGridX, gy);
      ctx.stroke();
    }

    // Origin axis
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2 / zoomRef.current;
    ctx.beginPath();
    ctx.moveTo(0, startGridY);
    ctx.lineTo(0, endGridY);
    ctx.moveTo(startGridX, 450);
    ctx.lineTo(endGridX, 450);
    ctx.stroke();

    // 1. Draw Terrain
    const terrain = level.terrain;
    if (terrain.length >= 2) {
      // Solid fill
      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
      }
      ctx.lineTo(terrain[terrain.length - 1].x, 1200);
      ctx.lineTo(terrain[0].x, 1200);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Glowing surface line
      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3 / zoomRef.current;
      ctx.stroke();

      // Editable Terrain Vertices
      for (let i = 0; i < terrain.length; i++) {
        const pt = terrain[i];
        const isSel = selectedTerrainIdx === i;
        ctx.fillStyle = isSel ? '#f43f5e' : '#0284c7';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (isSel ? 8 : 5) / zoomRef.current, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / zoomRef.current;
        ctx.stroke();
      }
    }

    // 2. Draw Placed Objects
    for (const obj of level.objects) {
      const isSel = selectedObjectId === obj.id;
      ctx.save();
      ctx.translate(obj.x, obj.y);

      if (obj.type === 'start') {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-20, -10, 40, 10);
        ctx.strokeStyle = '#059669';
        ctx.strokeRect(-20, -10, 40, 10);
        // Flag
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2 / zoomRef.current;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, -35);
        ctx.stroke();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(0, -35);
        ctx.lineTo(16, -28);
        ctx.lineTo(0, -20);
        ctx.closePath();
        ctx.fill();
      } else if (obj.type === 'finish') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-35, -8, 70, 12);
        ctx.strokeStyle = '#0284c7';
        ctx.strokeRect(-35, -8, 70, 12);
        // Vertical beacon
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2 / zoomRef.current;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, -60);
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -64, 6 / zoomRef.current, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.type === 'crystal') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(9, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();
      } else if (obj.type === 'fuel') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-8, -14, 16, 26);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-5, -18, 10, 4);
      } else if (obj.type === 'mine') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius || 18, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.type === 'jumpPad') {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-22, -6, 44, 10);
      } else if (obj.type === 'lowGZone') {
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(0, 0, obj.width || 300, obj.height || 200);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.fillRect(0, 0, obj.width || 300, obj.height || 200);
      }

      // Selection ring
      if (isSel) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2 / zoomRef.current;
        ctx.setLineDash([4 / zoomRef.current, 4 / zoomRef.current]);
        ctx.strokeRect(-24, -24, 48, 48);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }

    ctx.restore();
  }, [level, selectedObjectId, selectedTerrainIdx, zoomRef]);

  useEffect(() => {
    render();
  }, [render]);

  // Pointer interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    dragStartRef.current = { x: sx, y: sy };
    isDraggingRef.current = true;

    // Middle click or space or Move tool triggers pan
    if (e.button === 1 || activeTool === 'SELECT' && e.altKey) {
      draggingItemRef.current = { type: 'pan' };
      return;
    }

    if (activeTool === 'SELECT') {
      // Check object selection first
      const clickedObj = [...level.objects].reverse().find((obj) => {
        const dx = obj.x - world.x;
        const dy = obj.y - world.y;
        return Math.hypot(dx, dy) < 25 / zoomRef.current;
      });

      if (clickedObj) {
        setSelectedObjectId(clickedObj.id);
        setSelectedTerrainIdx(null);
        draggingItemRef.current = { type: 'object', id: clickedObj.id };
        render();
        return;
      }

      // Check terrain vertex selection
      const clickedVertIdx = level.terrain.findIndex((pt) => {
        return Math.hypot(pt.x - world.x, pt.y - world.y) < 18 / zoomRef.current;
      });

      if (clickedVertIdx !== -1) {
        setSelectedTerrainIdx(clickedVertIdx);
        setSelectedObjectId(null);
        draggingItemRef.current = { type: 'terrain', idx: clickedVertIdx };
        render();
        return;
      }

      // Clicked empty space -> deselect or pan
      setSelectedObjectId(null);
      setSelectedTerrainIdx(null);
      draggingItemRef.current = { type: 'pan' };
      render();
    } else if (activeTool === 'ADD_TERRAIN') {
      // Add terrain vertex sorted by x
      const newTerrain = [...level.terrain, { x: Math.round(world.x), y: Math.round(world.y) }];
      newTerrain.sort((a, b) => a.x - b.x);
      setLevel((prev) => ({ ...prev, terrain: newTerrain }));
    } else if (activeTool === 'CRATER_BRUSH') {
      // Stamp crater depression
      const craterRadius = 140;
      const craterDepth = 90;
      const modified = level.terrain.map((pt) => {
        const dist = Math.abs(pt.x - world.x);
        if (dist < craterRadius) {
          const factor = Math.cos((dist / craterRadius) * (Math.PI / 2));
          return { ...pt, y: pt.y + craterDepth * factor };
        }
        return pt;
      });
      setLevel((prev) => ({ ...prev, terrain: modified }));
    } else if (activeTool === 'SMOOTH_BRUSH') {
      // Smooth slopes near click
      const smoothRadius = 220;
      const modified = level.terrain.map((pt, idx, arr) => {
        if (Math.abs(pt.x - world.x) < smoothRadius && idx > 0 && idx < arr.length - 1) {
          const avgY = (arr[idx - 1].y + pt.y + arr[idx + 1].y) / 3;
          return { ...pt, y: Math.round(avgY) };
        }
        return pt;
      });
      setLevel((prev) => ({ ...prev, terrain: modified }));
    } else if (activeTool.startsWith('PLACE_')) {
      const typeMap: Record<string, RoverObjectType> = {
        PLACE_START: 'start',
        PLACE_FINISH: 'finish',
        PLACE_CRYSTAL: 'crystal',
        PLACE_FUEL: 'fuel',
        PLACE_MINE: 'mine',
        PLACE_JUMP_PAD: 'jumpPad',
        PLACE_LOW_G: 'lowGZone',
      };
      const objType = typeMap[activeTool];
      if (objType) {
        // If start or finish, replace existing
        let currentObjects = [...level.objects];
        if (objType === 'start' || objType === 'finish') {
          currentObjects = currentObjects.filter((o) => o.type !== objType);
        }

        const newObj: RoverLevelObject = {
          id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: objType,
          x: Math.round(world.x),
          y: Math.round(world.y),
          amount: objType === 'fuel' ? 40 : undefined,
          radius: objType === 'mine' ? 18 : undefined,
          power: objType === 'jumpPad' ? 490 : undefined,
          width: objType === 'lowGZone' ? 350 : undefined,
          height: objType === 'lowGZone' ? 250 : undefined,
        };

        const updated = [...currentObjects, newObj];
        const newTotalCrystals = updated.filter((o) => o.type === 'crystal').length;

        setLevel((prev) => ({
          ...prev,
          objects: updated,
          totalCrystals: newTotalCrystals > 0 ? newTotalCrystals : prev.totalCrystals,
        }));
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const dx = sx - dragStartRef.current.x;
    const dy = sy - dragStartRef.current.y;
    dragStartRef.current = { x: sx, y: sy };

    const item = draggingItemRef.current;
    if (!item) return;

    if (item.type === 'pan') {
      panRef.current.x += dx;
      panRef.current.y += dy;
      render();
    } else if (item.type === 'object' && item.id) {
      const worldDx = dx / zoomRef.current;
      const worldDy = dy / zoomRef.current;
      setLevel((prev) => ({
        ...prev,
        objects: prev.objects.map((o) => {
          if (o.id === item.id) {
            return { ...o, x: Math.round(o.x + worldDx), y: Math.round(o.y + worldDy) };
          }
          return o;
        }),
      }));
    } else if (item.type === 'terrain' && item.idx !== undefined) {
      const worldDx = dx / zoomRef.current;
      const worldDy = dy / zoomRef.current;
      setLevel((prev) => {
        const nextT = [...prev.terrain];
        const current = nextT[item.idx!];
        if (current) {
          nextT[item.idx!] = {
            x: Math.round(current.x + worldDx),
            y: Math.round(current.y + worldDy),
          };
          nextT.sort((a, b) => a.x - b.x);
        }
        return { ...prev, terrain: nextT };
      });
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    draggingItemRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomRef.current = Math.max(0.3, Math.min(2.5, zoomRef.current * factor));
    render();
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (selectedObjectId) {
      setLevel((prev) => ({
        ...prev,
        objects: prev.objects.filter((o) => o.id !== selectedObjectId),
      }));
      setSelectedObjectId(null);
    } else if (selectedTerrainIdx !== null && level.terrain.length > 2) {
      setLevel((prev) => ({
        ...prev,
        terrain: prev.terrain.filter((_, idx) => idx !== selectedTerrainIdx),
      }));
      setSelectedTerrainIdx(null);
    }
  };

  // Keyboard shortcut for Delete
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  // Export JSON Level
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(level, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${level.name.toLowerCase().replace(/\s+/g, '_')}_level.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Level
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (imported.terrain && imported.objects && imported.config) {
          setLevel(imported);
          alert('Level imported successfully!');
        } else {
          alert('Invalid Rover Level format.');
        }
      } catch {
        alert('Failed to parse JSON level file.');
      }
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    onSaveLevel(level);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden">
      {/* Top Studio Toolbar */}
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
              Rover Track Editor
            </span>
            <span className="text-sm font-bold text-white">{level.name}</span>
          </div>
        </div>

        {/* Center Mode Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTestDrive(level)}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded shadow-sm shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Test Drive Track
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded"
          >
            <Save className="w-3.5 h-3.5" />
            Save Level
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`p-1.5 rounded border text-xs flex items-center gap-1.5 px-2.5 ${
              showSettingsDrawer
                ? 'bg-cyan-950 border-cyan-800 text-cyan-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Physics & Settings
          </button>
          <button
            onClick={handleExportJson}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded"
            title="Export JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <label className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded cursor-pointer" title="Import JSON">
            <Upload className="w-4 h-4" />
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Vertical Tool Palette */}
        <div className="w-14 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 gap-2 z-10">
          <button
            onClick={() => setActiveTool('SELECT')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'SELECT'
                ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Select & Move (Click & Drag)"
          >
            <Move className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-slate-800 my-1" />

          {/* Terrain Tools */}
          <button
            onClick={() => setActiveTool('ADD_TERRAIN')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'ADD_TERRAIN'
                ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Add Terrain Vertex (Click to insert)"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTool('CRATER_BRUSH')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors text-xs font-bold ${
              activeTool === 'CRATER_BRUSH'
                ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Crater Stamp (Stamp depression)"
          >
            🕳️
          </button>
          <button
            onClick={() => setActiveTool('SMOOTH_BRUSH')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors text-xs font-bold ${
              activeTool === 'SMOOTH_BRUSH'
                ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Smooth Slopes"
          >
            〰️
          </button>

          <div className="w-8 h-px bg-slate-800 my-1" />

          {/* Object Placement Tools */}
          <button
            onClick={() => setActiveTool('PLACE_START')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'PLACE_START'
                ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Place Spawn Point"
          >
            <MapPin className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTool('PLACE_FINISH')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'PLACE_FINISH'
                ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Place Finish Beacon Pad"
          >
            <Flag className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTool('PLACE_CRYSTAL')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'PLACE_CRYSTAL'
                ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Place Alien Power Crystal"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTool('PLACE_FUEL')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'PLACE_FUEL'
                ? 'bg-amber-500/20 border border-amber-500 text-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Place Helium-3 Canister"
          >
            <Fuel className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTool('PLACE_MINE')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'PLACE_MINE'
                ? 'bg-rose-500/20 border border-rose-500 text-rose-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Place Plasma Mine"
          >
            <Bomb className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTool('PLACE_JUMP_PAD')}
            className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
              activeTool === 'PLACE_JUMP_PAD'
                ? 'bg-amber-500/20 border border-amber-500 text-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Place Springboard / Jump Pad"
          >
            <ArrowUpRight className="w-5 h-5" />
          </button>

          {(selectedObjectId || selectedTerrainIdx !== null) && (
            <>
              <div className="w-8 h-px bg-slate-800 my-1" />
              <button
                onClick={handleDeleteSelected}
                className="w-10 h-10 rounded bg-rose-950/60 border border-rose-800 text-rose-400 hover:bg-rose-900 flex items-center justify-center"
                title="Delete Selected Item (Del)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Viewport Canvas */}
        <div className="flex-1 relative h-full">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            className="w-full h-full block cursor-crosshair bg-slate-950"
          />

          {/* Bottom Viewport Overlay (Zoom & Status) */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded text-xs font-mono-numbers text-slate-400">
            <span>TOOL: {activeTool}</span>
            <span className="text-slate-600">|</span>
            <span>NODES: {level.terrain.length}</span>
            <span className="text-slate-600">|</span>
            <span>OBJECTS: {level.objects.length}</span>
            <span className="text-slate-600">|</span>
            <button
              onClick={() => {
                zoomRef.current = Math.max(0.3, zoomRef.current * 0.85);
                render();
              }}
              className="p-1 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span>{Math.round(zoomRef.current * 100)}%</span>
            <button
              onClick={() => {
                zoomRef.current = Math.min(2.5, zoomRef.current * 1.15);
                render();
              }}
              className="p-1 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Settings & Physics Inspector Drawer */}
        {showSettingsDrawer && (
          <div className="w-80 bg-slate-950 border-l border-slate-800 p-5 overflow-y-auto z-10 flex flex-col gap-6 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-white uppercase tracking-wider">Level & Physics Inspector</span>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Level metadata */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Level Profile</h4>
              <div>
                <label className="text-slate-400 block mb-1">Track Name</label>
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => setLevel({ ...level, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Target Par Time (seconds)</label>
                <input
                  type="number"
                  value={level.parTime}
                  onChange={(e) => setLevel({ ...level, parTime: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono-numbers"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Difficulty Classification</label>
                <select
                  value={level.difficulty}
                  onChange={(e) => setLevel({ ...level, difficulty: e.target.value as RoverLevel['difficulty'] })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                >
                  <option value="Training">Training</option>
                  <option value="Standard">Standard</option>
                  <option value="Hazard">Hazard</option>
                </select>
              </div>
            </div>

            {/* Rover Vehicle Physics Configuration */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Rover Physics Dynamics</h4>
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Lunar Gravity</span>
                  <span className="font-mono-numbers text-white">{level.config.gravity}</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="600"
                  value={level.config.gravity}
                  onChange={(e) =>
                    setLevel({
                      ...level,
                      config: { ...level.config, gravity: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Engine Drive Torque</span>
                  <span className="font-mono-numbers text-white">{level.config.enginePower}</span>
                </div>
                <input
                  type="range"
                  min="180"
                  max="450"
                  value={level.config.enginePower}
                  onChange={(e) =>
                    setLevel({
                      ...level,
                      config: { ...level.config, enginePower: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Suspension Spring Stiffness</span>
                  <span className="font-mono-numbers text-white">{level.config.suspensionSpring}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="350"
                  value={level.config.suspensionSpring}
                  onChange={(e) =>
                    setLevel({
                      ...level,
                      config: { ...level.config, suspensionSpring: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Suspension Damping</span>
                  <span className="font-mono-numbers text-white">{level.config.suspensionDamping}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={level.config.suspensionDamping}
                  onChange={(e) =>
                    setLevel({
                      ...level,
                      config: { ...level.config, suspensionDamping: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Rocket Booster Thrust</span>
                  <span className="font-mono-numbers text-white">{level.config.boostForce}</span>
                </div>
                <input
                  type="range"
                  min="250"
                  max="650"
                  value={level.config.boostForce}
                  onChange={(e) =>
                    setLevel({
                      ...level,
                      config: { ...level.config, boostForce: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Notification Toast */}
      {saveToast && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2 bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-semibold rounded shadow-lg">
          Level Saved Successfully!
        </div>
      )}
    </div>
  );
};
