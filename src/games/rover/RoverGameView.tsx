import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RoverLevel, RoverState, RoverLevelObject } from './types';
import { createInitialRoverState, updateRoverPhysics, RoverInputs } from './physics';
import { audio } from '../../utils/audio';
import { 
  RotateCcw, Play, Pause, ChevronRight, Edit3, 
  Sparkles, Gauge, Compass, Fuel, Award, ArrowLeft,
  ChevronLeft, Rocket, Volume2, VolumeX
} from 'lucide-react';

interface RoverGameViewProps {
  level: RoverLevel;
  onEditLevel?: () => void;
  onNextLevel?: () => void;
  onBackToStudio: () => void;
  hasNextLevel?: boolean;
}

export const RoverGameView: React.FC<RoverGameViewProps> = ({
  level,
  onEditLevel,
  onNextLevel,
  onBackToStudio,
  hasNextLevel = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameState, setGameState] = useState<'PLAYING' | 'CRASHED' | 'VICTORY'>('PLAYING');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [collectedCrystals, setCollectedCrystals] = useState(0);
  const [fuelRatio, setFuelRatio] = useState(1);
  const [tiltAngleDeg, setTiltAngleDeg] = useState(0);
  const [speedMs, setSpeedMs] = useState(0);
  const [stars, setStars] = useState(0);

  // Active inputs
  const inputsRef = useRef<RoverInputs>({
    accelerate: false,
    reverse: false,
    tiltLeft: false,
    tiltRight: false,
    boost: false,
  });

  // State refs for animation loop
  const roverStateRef = useRef<RoverState | null>(null);
  const levelObjectsRef = useRef<RoverLevelObject[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const cameraRef = useRef<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 1 });
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }[]>([]);

  // Find start object
  const startObj = level.objects.find((o) => o.type === 'start') || { x: 100, y: 400 };

  // Reset / init level run
  const resetRun = useCallback(() => {
    // Clone objects so collected flags reset
    levelObjectsRef.current = level.objects.map((o) => ({ ...o, collected: false }));
    const initial = createInitialRoverState(startObj.x, startObj.y, level.config);
    roverStateRef.current = initial;
    cameraRef.current = { x: startObj.x, y: startObj.y, zoom: 1 };
    particlesRef.current = [];
    setGameState('PLAYING');
    setIsPaused(false);
    setElapsedTime(0);
    setCollectedCrystals(0);
    setFuelRatio(1);
    setTiltAngleDeg(0);
    setSpeedMs(0);
    setStars(0);
    audio.startRoverEngine();
  }, [level, startObj.x, startObj.y]);

  useEffect(() => {
    resetRun();
    return () => {
      audio.stopRoverEngine();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [resetRun]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputsRef.current.accelerate = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputsRef.current.reverse = true;
      }
      if (e.key === 'q' || e.key === 'Q') {
        inputsRef.current.tiltLeft = true;
      }
      if (e.key === 'e' || e.key === 'E') {
        inputsRef.current.tiltRight = true;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        inputsRef.current.boost = true;
        audio.startRoverBoost();
      }
      if (e.key === 'r' || e.key === 'R') {
        resetRun();
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputsRef.current.accelerate = false;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputsRef.current.reverse = false;
      }
      if (e.key === 'q' || e.key === 'Q') {
        inputsRef.current.tiltLeft = false;
      }
      if (e.key === 'e' || e.key === 'E') {
        inputsRef.current.tiltRight = false;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        inputsRef.current.boost = false;
        audio.stopRoverBoost();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetRun]);

  // Main Game Loop
  useEffect(() => {
    let active = true;

    const gameLoop = (currentTime: number) => {
      if (!active) return;
      const rawDt = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;
      const dt = Math.min(rawDt, 0.05); // cap lag spikes

      const canvas = canvasRef.current;
      if (canvas && roverStateRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // --- 1. Physics update if playing ---
          if (!isPaused && gameState === 'PLAYING') {
            setElapsedTime((prev) => prev + dt);

            const nextRover = updateRoverPhysics(
              roverStateRef.current,
              inputsRef.current,
              level.terrain,
              levelObjectsRef.current,
              level.config,
              dt,
              (type) => {
                if (type === 'crystal') audio.playCrystalPickup();
                if (type === 'fuel') audio.playFuelPickup();
              },
              () => audio.playSpringPad(),
              () => audio.playCrash()
            );

            roverStateRef.current = nextRover;

            // Audio engine update
            const spd = Math.hypot(nextRover.vx, nextRover.vy);
            audio.updateRoverEngine(
              Math.min(1, spd / 350),
              inputsRef.current.accelerate || inputsRef.current.reverse
            );

            // Particles for boost
            if (nextRover.isBoosting) {
              const cosA = Math.cos(nextRover.angle);
              const sinA = Math.sin(nextRover.angle);
              // Rear nozzle
              const nozzleX = nextRover.x - 30 * cosA;
              const nozzleY = nextRover.y - 30 * sinA;
              for (let i = 0; i < 3; i++) {
                particlesRef.current.push({
                  x: nozzleX + (Math.random() - 0.5) * 6,
                  y: nozzleY + (Math.random() - 0.5) * 6,
                  vx: -cosA * (120 + Math.random() * 80) + (Math.random() - 0.5) * 30,
                  vy: -sinA * (120 + Math.random() * 80) + (Math.random() - 0.5) * 30,
                  life: 0.35,
                  maxLife: 0.35,
                  color: Math.random() > 0.4 ? '#38bdf8' : '#818cf8',
                  size: 3 + Math.random() * 3,
                });
              }
            }

            // Wheel ground dust
            if (nextRover.rearWheel.isGrounded && Math.abs(nextRover.rearWheel.angularVel) > 2) {
              particlesRef.current.push({
                x: nextRover.rearWheel.x,
                y: nextRover.rearWheel.y + 8,
                vx: -nextRover.vx * 0.3 + (Math.random() - 0.5) * 20,
                vy: -Math.random() * 25,
                life: 0.4,
                maxLife: 0.4,
                color: '#94a3b8',
                size: 2,
              });
            }

            // Check game over or finish
            if (nextRover.crashed) {
              setGameState('CRASHED');
              audio.stopRoverEngine();
              audio.playCrash();
              // Spawn explosion particles
              for (let i = 0; i < 40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const sp = 40 + Math.random() * 180;
                particlesRef.current.push({
                  x: nextRover.x,
                  y: nextRover.y,
                  vx: Math.cos(angle) * sp,
                  vy: Math.sin(angle) * sp,
                  life: 0.8,
                  maxLife: 0.8,
                  color: i % 2 === 0 ? '#f97316' : '#ef4444',
                  size: 3 + Math.random() * 4,
                });
              }
            } else if (nextRover.finished) {
              setGameState('VICTORY');
              audio.stopRoverEngine();
              audio.playWin();

              // Calculate star rating
              let earnedStars = 1; // Completed
              if (elapsedTime <= level.parTime) earnedStars++;
              if (nextRover.crystalsCollected >= Math.ceil(level.totalCrystals * 0.75)) earnedStars++;
              setStars(earnedStars);
            }

            // Sync React UI metrics
            setFuelRatio(nextRover.fuel / level.config.maxFuel);
            setCollectedCrystals(nextRover.crystalsCollected);
            const deg = (nextRover.angle * 180) / Math.PI;
            setTiltAngleDeg(Math.round(deg % 360));
            setSpeedMs(Math.round(spd / 10));
          }

          // Update particles
          particlesRef.current = particlesRef.current.filter((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            return p.life > 0;
          });

          // --- 2. Camera Smooth Follow ---
          const targetCamX = roverStateRef.current.x + 100;
          const targetCamY = roverStateRef.current.y - 40;
          cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.08;
          cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.08;

          // --- 3. Render Canvas ---
          renderCanvas(ctx, canvas.width, canvas.height);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(gameLoop);
    return () => {
      active = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [gameState, isPaused, level, elapsedTime]);

  // Canvas Drawing
  const renderCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const rover = roverStateRef.current;
    if (!rover) return;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Deep space sky
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Parallax stars
    const camX = cameraRef.current.x;
    const camY = cameraRef.current.y;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137.5 - camX * 0.05) % width + width) % width;
      const sy = ((i * 89.3 - camY * 0.05) % height + height) % height;
      ctx.fillRect(sx, sy, (i % 3 === 0) ? 2 : 1, (i % 3 === 0) ? 2 : 1);
    }

    // Distant Earth in sky
    const earthX = width * 0.8 - (camX * 0.02) % 400;
    const earthY = 90 - (camY * 0.02);
    const earthGrad = ctx.createRadialGradient(earthX - 8, earthY - 8, 4, earthX, earthY, 32);
    earthGrad.addColorStop(0, '#38bdf8');
    earthGrad.addColorStop(0.7, '#1e3a8a');
    earthGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(earthX, earthY, 32, 0, Math.PI * 2);
    ctx.fill();

    // World transform
    ctx.save();
    ctx.translate(width / 2 - camX, height / 2 - camY);

    // Render Terrain
    const terrain = level.terrain;
    if (terrain.length >= 2) {
      // Background terrain shadow
      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y + 12);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y + 12);
      }
      ctx.lineTo(terrain[terrain.length - 1].x, 1200);
      ctx.lineTo(terrain[0].x, 1200);
      ctx.closePath();
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Foreground lunar crust
      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
      }
      ctx.lineTo(terrain[terrain.length - 1].x, 1200);
      ctx.lineTo(terrain[0].x, 1200);
      ctx.closePath();

      const crustGrad = ctx.createLinearGradient(0, 300, 0, 900);
      crustGrad.addColorStop(0, '#1e293b');
      crustGrad.addColorStop(0.3, '#0f172a');
      crustGrad.addColorStop(1, '#020617');
      ctx.fillStyle = crustGrad;
      ctx.fill();

      // Surface line glow
      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
      }
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
      }
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Render Objects
    for (const obj of levelObjectsRef.current) {
      if (obj.collected) continue;

      if (obj.type === 'finish') {
        // Landing pad base
        ctx.fillStyle = '#334155';
        ctx.fillRect(obj.x - 45, obj.y - 6, 90, 12);
        // Checker stripe
        ctx.fillStyle = '#38bdf8';
        for (let s = 0; s < 5; s++) {
          ctx.fillRect(obj.x - 45 + s * 18, obj.y - 6, 9, 12);
        }
        // Vertical beacon beam
        const beamGrad = ctx.createLinearGradient(obj.x, obj.y, obj.x, obj.y - 300);
        beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        beamGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(obj.x - 8, obj.y - 300, 16, 300);

        // Beacon antenna
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y - 6);
        ctx.lineTo(obj.x, obj.y - 45);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(obj.x, obj.y - 48, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.type === 'crystal') {
        // Glowing cyan crystal
        const pulse = Math.sin(performance.now() * 0.005) * 3;
        const cy = obj.y + pulse;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(obj.x, cy - 14);
        ctx.lineTo(obj.x + 9, cy);
        ctx.lineTo(obj.x, cy + 14);
        ctx.lineTo(obj.x - 9, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (obj.type === 'fuel') {
        // Helium-3 Fuel canister
        const fy = obj.y + Math.sin(performance.now() * 0.004) * 2;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(obj.x - 8, fy - 14, 16, 26);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(obj.x - 5, fy - 18, 10, 4);
        // Canister band
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(obj.x - 8, fy - 2, 16, 5);
      } else if (obj.type === 'mine') {
        // Plasma mine
        const mr = obj.radius || 18;
        ctx.fillStyle = '#dc2626';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, mr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Spikes
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        for (let a = 0; a < 6; a++) {
          const ang = a * (Math.PI / 3) + performance.now() * 0.002;
          ctx.beginPath();
          ctx.moveTo(obj.x + Math.cos(ang) * (mr - 2), obj.y + Math.sin(ang) * (mr - 2));
          ctx.lineTo(obj.x + Math.cos(ang) * (mr + 6), obj.y + Math.sin(ang) * (mr + 6));
          ctx.stroke();
        }
      } else if (obj.type === 'jumpPad') {
        // Springboard
        ctx.fillStyle = '#eab308';
        ctx.fillRect(obj.x - 22, obj.y - 6, 44, 10);
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(obj.x - 14, obj.y - 6);
        ctx.lineTo(obj.x, obj.y - 14);
        ctx.lineTo(obj.x + 14, obj.y - 6);
        ctx.stroke();
      } else if (obj.type === 'lowGZone' && obj.width && obj.height) {
        // Anti-G Field
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      }
    }

    // Render Particles
    for (const p of particlesRef.current) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Render Rover (if not destroyed or when destroyed showing fragments)
    if (!rover.crashed) {
      drawRover(ctx, rover);
    }

    ctx.restore(); // end world transform
    ctx.restore();
  };

  const drawRover = (ctx: CanvasRenderingContext2D, rover: RoverState) => {
    ctx.save();
    ctx.translate(rover.x, rover.y);
    ctx.rotate(rover.angle);

    // Headlight cone
    const lightGrad = ctx.createRadialGradient(28, -6, 4, 160, -6, 140);
    lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.moveTo(28, -10);
    ctx.lineTo(170, -45);
    ctx.lineTo(170, 25);
    ctx.closePath();
    ctx.fill();

    // Suspension struts from mounts to wheels
    const cosA = Math.cos(rover.angle);
    const sinA = Math.sin(rover.angle);

    // Convert wheel world positions to local chassis space
    const toLocal = (wx: number, wy: number) => {
      const dx = wx - rover.x;
      const dy = wy - rover.y;
      return {
        x: dx * cosA + dy * sinA,
        y: -dx * sinA + dy * cosA,
      };
    };

    const rearLocal = toLocal(rover.rearWheel.x, rover.rearWheel.y);
    const frontLocal = toLocal(rover.frontWheel.x, rover.frontWheel.y);

    // Strut metal beams
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    // Rear strut
    ctx.beginPath();
    ctx.moveTo(-26, 14);
    ctx.lineTo(rearLocal.x, rearLocal.y);
    ctx.stroke();

    // Front strut
    ctx.beginPath();
    ctx.moveTo(26, 14);
    ctx.lineTo(frontLocal.x, frontLocal.y);
    ctx.stroke();

    // Springs
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-26, 14);
    ctx.lineTo(rearLocal.x, rearLocal.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(26, 14);
    ctx.lineTo(frontLocal.x, frontLocal.y);
    ctx.stroke();

    // Chassis body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;

    // Lower armor tub
    ctx.beginPath();
    ctx.moveTo(-32, 12);
    ctx.lineTo(32, 12);
    ctx.lineTo(36, 0);
    ctx.lineTo(24, -12);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-34, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cabin / Roll cage (THE VITAL STRUCTURE)
    ctx.beginPath();
    ctx.moveTo(-18, -12);
    ctx.lineTo(-12, -24); // Roll cage apex
    ctx.lineTo(12, -24);  // Roll cage apex
    ctx.lineTo(20, -12);
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Tinted windshield visor
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(8, -14);
    ctx.lineTo(14, -22);
    ctx.lineTo(-4, -22);
    ctx.closePath();
    ctx.fill();

    // Thruster exhaust nozzle
    ctx.fillStyle = '#475569';
    ctx.fillRect(-34, -4, 8, 8);

    ctx.restore();

    // Render Wheels in World Space (independent rotation)
    const drawWheel = (w: RoverState['rearWheel']) => {
      ctx.save();
      ctx.translate(w.x, w.y);
      // Wheel rim
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, w.radius, 0, Math.PI * 2);
      ctx.fill();
      // Tire outer tread
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Rotating spokes
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (let s = 0; s < 3; s++) {
        const spokeA = w.angularVel * 0.1 + s * (Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(spokeA) * (w.radius - 2), Math.sin(spokeA) * (w.radius - 2));
        ctx.stroke();
      }
      ctx.restore();
    };

    drawWheel(rover.rearWheel);
    drawWheel(rover.frontWheel);
  };

  // Flip danger status calculation
  const absTilt = Math.abs(tiltAngleDeg);
  const isRolloverRisk = absTilt > 65;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden">
      {/* Top HUD Strip */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
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
              Par: {level.parTime}s · Best: 3★
            </span>
          </div>
        </div>

        {/* Realtime Telemetry HUD */}
        <div className="flex items-center gap-6 font-mono-numbers text-xs">
          {/* Roll Angle Meter */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
            <Compass className={`w-3.5 h-3.5 ${isRolloverRisk ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="text-slate-400">TILT:</span>
            <span className={`font-bold ${isRolloverRisk ? 'text-rose-400' : 'text-white'}`}>
              {tiltAngleDeg}° {isRolloverRisk ? '⚠️ CRITICAL' : ''}
            </span>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">SPEED:</span>
            <span className="font-bold text-white">{speedMs} m/s</span>
          </div>

          {/* Helium-3 Fuel Bar */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded min-w-[140px]">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-75"
                style={{ width: `${Math.round(fuelRatio * 100)}%` }}
              />
            </div>
            <span className="text-amber-400 font-bold">{Math.round(fuelRatio * 100)}%</span>
          </div>

          {/* Crystals */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">CRYSTALS:</span>
            <span className="font-bold text-cyan-400">
              {collectedCrystals}/{level.totalCrystals}
            </span>
          </div>

          {/* Elapsed Time */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded">
            <span className="text-slate-400">TIME:</span>
            <span className="font-bold text-white">{elapsedTime.toFixed(1)}s</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => audio.setMuted(!audio.getMuted())}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded"
            title="Toggle Sound"
          >
            {audio.getMuted() ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded"
            title="Pause / Resume"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={resetRun}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart (R)
          </button>
          {onEditLevel && (
            <button
              onClick={onEditLevel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800 hover:bg-cyan-900/50 rounded"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Level Editor
            </button>
          )}
        </div>
      </div>

      {/* Main Simulation Viewport */}
      <div className="flex-1 relative w-full h-full">
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full block bg-slate-950"
        />

        {/* On-Screen Touch / Click Game Controls (Mobile & Accessibility Friendly) */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3">
          <button
            onPointerDown={() => { inputsRef.current.reverse = true; }}
            onPointerUp={() => { inputsRef.current.reverse = false; }}
            onPointerLeave={() => { inputsRef.current.reverse = false; }}
            className="w-14 h-14 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-200 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-[10px] text-slate-400">REV / A</span>
          </button>
          <button
            onPointerDown={() => { inputsRef.current.accelerate = true; }}
            onPointerUp={() => { inputsRef.current.accelerate = false; }}
            onPointerLeave={() => { inputsRef.current.accelerate = false; }}
            className="w-14 h-14 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-200 active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
            <span className="text-[10px] text-slate-400">GAS / D</span>
          </button>
        </div>

        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          <button
            onPointerDown={() => { inputsRef.current.tiltLeft = true; }}
            onPointerUp={() => { inputsRef.current.tiltLeft = false; }}
            onPointerLeave={() => { inputsRef.current.tiltLeft = false; }}
            className="w-14 h-14 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-200 active:scale-95"
          >
            <span className="text-xs font-bold">↺</span>
            <span className="text-[10px] text-slate-400">TILT L (Q)</span>
          </button>
          <button
            onPointerDown={() => { inputsRef.current.tiltRight = true; }}
            onPointerUp={() => { inputsRef.current.tiltRight = false; }}
            onPointerLeave={() => { inputsRef.current.tiltRight = false; }}
            className="w-14 h-14 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-200 active:scale-95"
          >
            <span className="text-xs font-bold">↻</span>
            <span className="text-[10px] text-slate-400">TILT R (E)</span>
          </button>
          <button
            onPointerDown={() => {
              inputsRef.current.boost = true;
              audio.startRoverBoost();
            }}
            onPointerUp={() => {
              inputsRef.current.boost = false;
              audio.stopRoverBoost();
            }}
            onPointerLeave={() => {
              inputsRef.current.boost = false;
              audio.stopRoverBoost();
            }}
            className="w-14 h-14 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-lg flex flex-col items-center justify-center text-amber-300 active:scale-95"
          >
            <Rocket className="w-5 h-5" />
            <span className="text-[10px] text-amber-300">BOOST</span>
          </button>
        </div>

        {/* Controls legend at bottom center */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 bg-slate-950/70 border border-slate-800 rounded text-[11px] text-slate-400">
          Drive: <kbd className="px-1 bg-slate-800 rounded text-slate-200">A / D</kbd> · In-Air Balance: <kbd className="px-1 bg-slate-800 rounded text-slate-200">Q / E</kbd> · Thruster Boost: <kbd className="px-1 bg-slate-800 rounded text-slate-200">W / Space</kbd> · Do Not Flip Over!
        </div>

        {/* Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-80 p-6 bg-slate-900 border border-slate-800 rounded-xl text-center">
              <h2 className="text-lg font-bold text-white mb-2">Simulation Paused</h2>
              <p className="text-xs text-slate-400 mb-6">Take a breather, check your route, or restart.</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsPaused(false)}
                  className="w-full py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                >
                  Resume Run
                </button>
                <button
                  onClick={resetRun}
                  className="w-full py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Restart (R)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Crash / Rollover Modal */}
        {gameState === 'CRASHED' && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-96 p-6 bg-slate-900 border border-rose-900/60 rounded-xl text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-950/80 border border-rose-700 flex items-center justify-center text-rose-400">
                ⚠️
              </div>
              <h2 className="text-xl font-bold text-rose-400 mb-1">Rover Destroyed!</h2>
              <p className="text-sm font-medium text-slate-300 mb-2">
                {roverStateRef.current?.crashReason || 'Vehicle turned upside down! Roll cage crushed.'}
              </p>
              <p className="text-xs text-slate-400 mb-6">
                Keep the wheels facing the lunar dust. Use <kbd className="px-1 bg-slate-800 rounded text-slate-200">Q / E</kbd> in mid-air to level out before landing.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetRun}
                  className="flex-1 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again (R)
                </button>
                {onEditLevel && (
                  <button
                    onClick={onEditLevel}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Tweak in Editor
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Victory Modal */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-96 p-6 bg-slate-900 border border-cyan-800/80 rounded-xl text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-950/80 border border-cyan-500 flex items-center justify-center text-cyan-400">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Extraction Complete!</h2>
              <p className="text-xs text-cyan-400 mb-4 font-mono-numbers">
                Finished in {elapsedTime.toFixed(1)}s (Par: {level.parTime}s)
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

              {/* Stats breakdown */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 mb-6 text-xs text-left font-mono-numbers space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Crystals Extracted:</span>
                  <span className="text-cyan-400 font-bold">{collectedCrystals} / {level.totalCrystals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Helium-3 Preserved:</span>
                  <span className="text-amber-400 font-bold">{Math.round(fuelRatio * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle Hull Status:</span>
                  <span className="text-emerald-400 font-bold">100% Intact</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={resetRun}
                  className="flex-1 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Replay
                </button>
                {hasNextLevel && onNextLevel ? (
                  <button
                    onClick={onNextLevel}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    Next Sector
                    <ChevronRight className="w-4 h-4" />
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
      </div>
    </div>
  );
};
