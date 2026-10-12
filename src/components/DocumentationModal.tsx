import React from 'react';
import { BookOpen, X, Rocket, Shield, Key } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-300 text-xs">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">AstraCraft Studio Engineering Guide</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:text-white text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Template 1 Guide */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
              <Rocket className="w-4 h-4" />
              <h3>Template 1: Moon Rover Trials (2D Physics Platformer)</h3>
            </div>
            <p className="leading-relaxed">
              Drive a lunar exploration vehicle across rough craters and hazardous chasms to the finish extraction beacon. 
              The physics model simulates independent wheel suspensions, torque, friction, and low gravity.
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Core Rules & Controls:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-white">A / D or Left / Right:</strong> Accelerate / Drive forward and reverse.</li>
                <li><strong className="text-white">Q / E:</strong> Apply angular balance torque while airborne to orient your rover flat before touchdown.</li>
                <li><strong className="text-white">W / Space / Up:</strong> Fire rocket boosters to leap across mine chasms (consumes Helium-3 fuel).</li>
                <li><strong className="text-white">AVOID TURNING THE VEHICLE OVER:</strong> If the cabin roll cage contacts the lunar surface or the chassis angle flips upside down, the vehicle is destroyed!</li>
              </ul>
            </div>
          </div>

          {/* Template 2 Guide */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-400">
              <Shield className="w-4 h-4" />
              <h3>Template 2: Cursed Relic: Lunar Outpost (Cursed Treasure Style TD)</h3>
            </div>
            <p className="leading-relaxed">
              Alien swarms enter through lunar trenches to extract 5 sacred alien power relics stored inside the Monolith Vault.
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Cursed Treasure Mechanics:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li><strong className="text-white">Relic Theft & Drops:</strong> When an invader reaches the vault, it grabs a relic and retreats toward the exit. If killed, the relic drops onto the lunar dust!</li>
                <li><strong className="text-white">Relic Pickup by Allies:</strong> Passing alien invaders will pick up dropped relics and continue escaping.</li>
                <li><strong className="text-white">Dematerialization Return:</strong> Undisturbed dropped relics slowly dematerialize back into the vault, or you can use the Relic Recall Drone spell.</li>
                <li><strong className="text-white">Terrain Restrictions:</strong> Plasma Blasters must be built on Lunar Basalt; Tesla Arc Spires on Crystalline Geodes; Cryo Spires on Lunar Regolith. Meteor debris can be cleared for minerals.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 font-bold text-white rounded-lg text-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
