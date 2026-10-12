/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RoverLevel } from './games/rover/types';
import { TDLevel } from './games/cursed_outpost/types';
import { DEFAULT_ROVER_LEVELS } from './games/rover/defaultLevels';
import { DEFAULT_TD_LEVELS } from './games/cursed_outpost/defaultLevels';
import { RoverGameView } from './games/rover/RoverGameView';
import { RoverEditorView } from './games/rover/RoverEditorView';
import { TDGameView } from './games/cursed_outpost/TDGameView';
import { TDEditorView } from './games/cursed_outpost/TDEditorView';
import { StudioDashboard } from './components/StudioDashboard';
import { DocumentationModal } from './components/DocumentationModal';
import { audio } from './utils/audio';
import { Volume2, VolumeX, Radio, Music } from 'lucide-react';

type StudioView = 'DASHBOARD' | 'ROVER_PLAY' | 'ROVER_EDIT' | 'TD_PLAY' | 'TD_EDIT';

export default function App() {
  const [currentView, setCurrentView] = useState<StudioView>('DASHBOARD');
  const [roverLevels, setRoverLevels] = useState<RoverLevel[]>(() => {
    const saved = localStorage.getItem('astracraft_rover_levels');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_ROVER_LEVELS;
  });

  const [tdLevels, setTdLevels] = useState<TDLevel[]>(() => {
    const saved = localStorage.getItem('astracraft_td_levels');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_TD_LEVELS;
  });

  const [activeRoverLevel, setActiveRoverLevel] = useState<RoverLevel>(roverLevels[0]);
  const [activeTDLevel, setActiveTDLevel] = useState<TDLevel>(tdLevels[0]);
  const [showDocs, setShowDocs] = useState(false);
  const [isAmbientMusicOn, setIsAmbientMusicOn] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('astracraft_rover_levels', JSON.stringify(roverLevels));
  }, [roverLevels]);

  useEffect(() => {
    localStorage.setItem('astracraft_td_levels', JSON.stringify(tdLevels));
  }, [tdLevels]);

  // Audio handlers
  const handleToggleAmbient = () => {
    const nextState = audio.toggleAmbientMusic();
    setIsAmbientMusicOn(!!nextState);
  };

  const handleToggleMute = () => {
    const nextMuted = !isAudioMuted;
    audio.setMuted(nextMuted);
    setIsAudioMuted(nextMuted);
  };

  // Level saving
  const handleSaveRoverLevel = (updated: RoverLevel) => {
    setRoverLevels((prev) => {
      const idx = prev.findIndex((l) => l.id === updated.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setActiveRoverLevel(updated);
  };

  const handleSaveTDLevel = (updated: TDLevel) => {
    setTdLevels((prev) => {
      const idx = prev.findIndex((l) => l.id === updated.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setActiveTDLevel(updated);
  };

  // Create new Rover level template
  const handleCreateNewRoverLevel = () => {
    const newLvl: RoverLevel = {
      id: `custom_rover_${Date.now()}`,
      name: `Custom Lunar Track #${roverLevels.length + 1}`,
      description: 'Custom sculpted lunar proving track created in AstraCraft Studio.',
      difficulty: 'Standard',
      parTime: 30,
      totalCrystals: 6,
      config: {
        enginePower: 300,
        suspensionSpring: 210,
        suspensionDamping: 17,
        wheelFriction: 1.5,
        boostForce: 480,
        maxFuel: 100,
        gravity: 330,
      },
      terrain: [
        { x: 0, y: 450 },
        { x: 300, y: 450 },
        { x: 600, y: 400 },
        { x: 900, y: 490 },
        { x: 1200, y: 420 },
        { x: 1500, y: 460 },
        { x: 1800, y: 450 },
        { x: 2100, y: 450 },
      ],
      objects: [
        { id: `st_${Date.now()}`, type: 'start', x: 100, y: 410 },
        { id: `c_${Date.now()}_1`, type: 'crystal', x: 600, y: 360 },
        { id: `f_${Date.now()}`, type: 'fuel', x: 900, y: 440, amount: 45 },
        { id: `c_${Date.now()}_2`, type: 'crystal', x: 1200, y: 380 },
        { id: `fn_${Date.now()}`, type: 'finish', x: 1950, y: 420 },
      ],
    };
    handleSaveRoverLevel(newLvl);
    setActiveRoverLevel(newLvl);
    setCurrentView('ROVER_EDIT');
  };

  // Create new TD level template
  const handleCreateNewTDLevel = () => {
    const defaultGrid: TDLevel['tiles'] = [];
    for (let y = 0; y < 11; y++) {
      const row: TDLevel['tiles'][0] = [];
      for (let x = 0; x < 16; x++) {
        if (y === 0 || y === 10 || x === 0 || x === 15) row.push('OBSIDIAN');
        else row.push('REGOLITH');
      }
      defaultGrid.push(row);
    }
    // Set default path
    defaultGrid[5][1] = 'SPAWN';
    for (let x = 2; x <= 13; x++) defaultGrid[5][x] = 'PATH';
    defaultGrid[5][14] = 'VAULT';
    for (let x = 2; x <= 13; x++) defaultGrid[2][x] = 'PATH';
    defaultGrid[2][1] = 'EXIT';
    for (let y = 2; y <= 5; y++) defaultGrid[y][13] = 'PATH';

    // Add initial basalt
    defaultGrid[4][6] = 'BASALT';
    defaultGrid[6][6] = 'BASALT';
    defaultGrid[4][10] = 'CRYSTAL_GEODE';

    const newLvl: TDLevel = {
      id: `custom_td_${Date.now()}`,
      name: `Custom Outpost Sector #${tdLevels.length + 1}`,
      description: 'Custom lunar defence sector created in AstraCraft Studio.',
      gridWidth: 16,
      gridHeight: 11,
      tiles: defaultGrid,
      spawnPos: { x: 1, y: 5 },
      vaultPos: { x: 14, y: 5 },
      exitPos: { x: 1, y: 2 },
      startingMinerals: 280,
      startingEnergy: 70,
      totalRelics: 5,
      waves: [
        {
          waveNumber: 1,
          bonusMinerals: 40,
          squads: [{ enemyType: 'SCOUT', count: 6, spawnInterval: 1.0 }],
        },
        {
          waveNumber: 2,
          bonusMinerals: 55,
          squads: [
            { enemyType: 'MECH', count: 3, spawnInterval: 2.0 },
            { enemyType: 'SWARM_DRONE', count: 10, spawnInterval: 0.5 },
          ],
        },
      ],
    };
    handleSaveTDLevel(newLvl);
    setActiveTDLevel(newLvl);
    setCurrentView('TD_EDIT');
  };

  // Next level navigation
  const roverIndex = roverLevels.findIndex((l) => l.id === activeRoverLevel.id);
  const hasNextRover = roverIndex !== -1 && roverIndex < roverLevels.length - 1;
  const handleNextRover = () => {
    if (hasNextRover) {
      setActiveRoverLevel(roverLevels[roverIndex + 1]);
    }
  };

  const tdIndex = tdLevels.findIndex((l) => l.id === activeTDLevel.id);
  const hasNextTD = tdIndex !== -1 && tdIndex < tdLevels.length - 1;
  const handleNextTD = () => {
    if (hasNextTD) {
      setActiveTDLevel(tdLevels[tdIndex + 1]);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 antialiased overflow-hidden select-none">
      {/* 3-Zone Top Bar Contract */}
      {currentView === 'DASHBOARD' && (
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md z-30 shrink-0">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => setCurrentView('DASHBOARD')}
            className="text-base font-bold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
            AstraCraft Studio
          </button>

          {/* Zone 2: 4-5 clean single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <button
              onClick={() => setCurrentView('DASHBOARD')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                currentView === 'DASHBOARD' ? 'text-cyan-400' : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveRoverLevel(roverLevels[0]);
                setCurrentView('ROVER_PLAY');
              }}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Moon Rover Trials
            </button>
            <button
              onClick={() => {
                setActiveTDLevel(tdLevels[0]);
                setCurrentView('TD_PLAY');
              }}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Cursed Relic TD
            </button>
            <button
              onClick={() => setShowDocs(true)}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Engineering Docs
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleAmbient}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isAmbientMusicOn
                  ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle Procedural Sci-Fi Ambient Synth"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Ambient Synth</span>
            </button>
            <button
              onClick={handleToggleMute}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg"
              title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full h-full relative overflow-hidden">
        {currentView === 'DASHBOARD' && (
          <StudioDashboard
            roverLevels={roverLevels}
            tdLevels={tdLevels}
            onPlayRover={(lvl) => {
              setActiveRoverLevel(lvl);
              setCurrentView('ROVER_PLAY');
            }}
            onEditRover={(lvl) => {
              setActiveRoverLevel(lvl);
              setCurrentView('ROVER_EDIT');
            }}
            onCreateRover={handleCreateNewRoverLevel}
            onPlayTD={(lvl) => {
              setActiveTDLevel(lvl);
              setCurrentView('TD_PLAY');
            }}
            onEditTD={(lvl) => {
              setActiveTDLevel(lvl);
              setCurrentView('TD_EDIT');
            }}
            onCreateTD={handleCreateNewTDLevel}
            onOpenDocs={() => setShowDocs(true)}
          />
        )}

        {currentView === 'ROVER_PLAY' && (
          <RoverGameView
            level={activeRoverLevel}
            onEditLevel={() => setCurrentView('ROVER_EDIT')}
            onNextLevel={handleNextRover}
            hasNextLevel={hasNextRover}
            onBackToStudio={() => setCurrentView('DASHBOARD')}
          />
        )}

        {currentView === 'ROVER_EDIT' && (
          <RoverEditorView
            initialLevel={activeRoverLevel}
            onSaveLevel={handleSaveRoverLevel}
            onTestDrive={(lvl) => {
              handleSaveRoverLevel(lvl);
              setActiveRoverLevel(lvl);
              setCurrentView('ROVER_PLAY');
            }}
            onBackToStudio={() => setCurrentView('DASHBOARD')}
          />
        )}

        {currentView === 'TD_PLAY' && (
          <TDGameView
            level={activeTDLevel}
            onEditLevel={() => setCurrentView('TD_EDIT')}
            onNextLevel={handleNextTD}
            hasNextLevel={hasNextTD}
            onBackToStudio={() => setCurrentView('DASHBOARD')}
          />
        )}

        {currentView === 'TD_EDIT' && (
          <TDEditorView
            initialLevel={activeTDLevel}
            onSaveLevel={handleSaveTDLevel}
            onTestDefense={(lvl) => {
              handleSaveTDLevel(lvl);
              setActiveTDLevel(lvl);
              setCurrentView('TD_PLAY');
            }}
            onBackToStudio={() => setCurrentView('DASHBOARD')}
          />
        )}
      </main>

      {/* Engineering Docs Modal */}
      <DocumentationModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
    </div>
  );
}
