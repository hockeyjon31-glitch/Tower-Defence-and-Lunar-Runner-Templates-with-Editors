import React from 'react';
import { RoverLevel } from '../games/rover/types';
import { TDLevel } from '../games/cursed_outpost/types';
import { 
  Play, Edit3, Plus, Compass, Shield, Award, 
  Sparkles, Layers, BookOpen, Rocket, Disc, HelpCircle
} from 'lucide-react';

interface StudioDashboardProps {
  roverLevels: RoverLevel[];
  tdLevels: TDLevel[];
  onPlayRover: (level: RoverLevel) => void;
  onEditRover: (level: RoverLevel) => void;
  onCreateRover: () => void;
  onPlayTD: (level: TDLevel) => void;
  onEditTD: (level: TDLevel) => void;
  onCreateTD: () => void;
  onOpenDocs: () => void;
}

export const StudioDashboard: React.FC<StudioDashboardProps> = ({
  roverLevels,
  tdLevels,
  onPlayRover,
  onEditRover,
  onCreateRover,
  onPlayTD,
  onEditTD,
  onCreateTD,
  onOpenDocs,
}) => {
  return (
    <div className="w-full h-full overflow-y-auto bg-slate-950 p-8 space-y-10 max-w-7xl mx-auto">
      {/* Studio Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/80 to-cyan-950/40 border border-slate-800 p-8 overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/70 border border-cyan-800 rounded-full text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5" />
            Specialized Dual-Template Game Studio
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Build, Edit & Play Lunar Sci-Fi Games
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            AstraCraft Studio delivers two production-ready game templates with integrated visual level editors: a 2D lunar rover physics balance platformer and an authentic Cursed Treasure style alien tower defence.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onPlayRover(roverLevels[0])}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Quick Play Rover Trials
            </button>
            <button
              onClick={() => onPlayTD(tdLevels[0])}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all flex items-center gap-2"
            >
              <Shield className="w-3.5 h-3.5" />
              Quick Play Tower Defence
            </button>
            <button
              onClick={onOpenDocs}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Engine Docs
            </button>
          </div>
        </div>

        {/* Ambient background orbital graphic */}
        <div className="absolute -right-10 -bottom-10 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Two Specialized Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Template 1: 2D Lunar Rover Trials */}
        <div className="flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">
          <div className="p-6 border-b border-slate-800/80 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Moon Rover Trials</h3>
                  <p className="text-xs text-cyan-400 font-mono-numbers">2D Physics Balance & Platformer</p>
                </div>
              </div>
              <button
                onClick={onCreateRover}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/50 border border-cyan-800 hover:bg-cyan-900 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Track
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Drive a lunar vehicle to the finish line over craters, springboards, and low-G anomalies. Tilt to balance in mid-air and avoid turning the vehicle over—crushing the roll cage results in an instant crash.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Suspension Physics</span>
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Rollover Detection</span>
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Helium-3 Boosters</span>
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Terrain Heightfield Editor</span>
            </div>
          </div>

          {/* Level List */}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Playable Campaign & Custom Tracks ({roverLevels.length})
            </span>
            <div className="space-y-2">
              {roverLevels.map((lvl) => (
                <div
                  key={lvl.id}
                  className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:bg-slate-950 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">{lvl.name}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-numbers">
                      <span>{lvl.difficulty}</span>
                      <span>·</span>
                      <span>Par: {lvl.parTime}s</span>
                      <span>·</span>
                      <span>{lvl.totalCrystals} Crystals</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditRover(lvl)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
                      title="Edit Track in Level Editor"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onPlayRover(lvl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Template 2: Cursed Relic Outpost TD */}
        <div className="flex flex-col bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">
          <div className="p-6 border-b border-slate-800/80 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700/60 flex items-center justify-center text-purple-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cursed Relic: Outpost Siege</h3>
                  <p className="text-xs text-purple-400 font-mono-numbers">Cursed Treasure Style Lunar TD</p>
                </div>
              </div>
              <button
                onClick={onCreateTD}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-400 bg-purple-950/50 border border-purple-800 hover:bg-purple-900 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Map
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Defend 5 ancient power relic cores from alien invader swarms. Invaders steal relics and carry them toward the exit. Slay carriers to drop relics in the dust, build terrain-restricted towers, and call down orbital strikes.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Relic Steal & Drop Mechanic</span>
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Basalt / Geode Restrictions</span>
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Orbital Spells</span>
              <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded">Grid Wave Configurator</span>
            </div>
          </div>

          {/* Level List */}
          <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Playable Campaign & Custom Maps ({tdLevels.length})
            </span>
            <div className="space-y-2">
              {tdLevels.map((lvl) => (
                <div
                  key={lvl.id}
                  className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:bg-slate-950 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white">{lvl.name}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono-numbers">
                      <span>{lvl.waves.length} Waves</span>
                      <span>·</span>
                      <span>{lvl.totalRelics} Relics</span>
                      <span>·</span>
                      <span>{lvl.startingMinerals} 🪙</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditTD(lvl)}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
                      title="Edit Map in Level Editor"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onPlayTD(lvl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
