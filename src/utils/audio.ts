/**
 * Web Audio API procedural sound synthesizer for AstraCraft Studio
 * Clean, zero-external-asset audio generator for sci-fi rover & tower defence games.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isAmbientPlaying: boolean = false;
  private ambientOscillators: OscillatorNode[] = [];
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private boostOsc: OscillatorNode | null = null;
  private boostGain: GainNode | null = null;

  constructor() {
    // Initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.25;
      this.ambientGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // ---- ROVER ENGINE SOUND LOOP ----
  public startRoverEngine() {
    this.initCtx();
    if (!this.ctx || this.engineOsc) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.04;
    this.engineGain.connect(this.sfxGain!);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 65;
    this.engineOsc.connect(this.engineGain);
    this.engineOsc.start();
  }

  public updateRoverEngine(speedRatio: number, throttle: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const targetFreq = 50 + speedRatio * 130 + (throttle ? 30 : 0);
    const targetVol = throttle ? 0.07 : 0.03;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.08);
  }

  public stopRoverEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {
        // ignore
      }
      this.engineOsc = null;
      this.engineGain = null;
    }
    this.stopRoverBoost();
  }

  public startRoverBoost() {
    this.initCtx();
    if (!this.ctx || this.boostOsc) return;

    this.boostGain = this.ctx.createGain();
    this.boostGain.gain.value = 0.12;
    this.boostGain.connect(this.sfxGain!);

    this.boostOsc = this.ctx.createOscillator();
    this.boostOsc.type = 'triangle';
    this.boostOsc.frequency.value = 240;
    this.boostOsc.connect(this.boostGain);
    this.boostOsc.start();
  }

  public stopRoverBoost() {
    if (this.boostOsc) {
      try {
        this.boostOsc.stop();
        this.boostOsc.disconnect();
      } catch {
        // ignore
      }
      this.boostOsc = null;
      this.boostGain = null;
    }
  }

  // ---- SFX ONE-SHOTS ----
  public playJump() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playCrystalPickup() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);

      gain.gain.setValueAtTime(0.12, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.2);
    });
  }

  public playFuelPickup() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playCrash() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Noise blast for explosion
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.45);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.5);
  }

  public playSpringPad() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playWin() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      gain.gain.setValueAtTime(0.2, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.4);
    });
  }

  // ---- TOWER DEFENCE SFX ----
  public playPlasmaShot() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }

  public playRailgunShot() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  public playCryoPulse() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playTeslaZap() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc.frequency.setValueAtTime(350, this.ctx.currentTime + 0.04);
    osc.frequency.setValueAtTime(1100, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  public playRelicStolen() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    [400, 300, 250].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + idx * 0.09);

      gain.gain.setValueAtTime(0.2, t + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.09);
      osc.stop(t + idx * 0.09 + 0.13);
    });
  }

  public playRelicSaved() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    [350, 520, 700].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.15, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.16);
    });
  }

  public playEnemyKilled() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }

  public playBuildTower() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.14);
  }

  public playOrbitalStrike() {
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    // Siren sweep down then huge boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.45);

    setTimeout(() => this.playCrash(), 250);
  }

  // ---- AMBIENT SCI-FI BACKGROUND MUSIC ----
  public toggleAmbientMusic(enable?: boolean) {
    this.initCtx();
    const shouldPlay = enable !== undefined ? enable : !this.isAmbientPlaying;
    
    if (shouldPlay && !this.isAmbientPlaying) {
      if (!this.ctx || !this.ambientGain) return;
      this.isAmbientPlaying = true;
      
      const freqs = [110, 164.81, 220, 261.63]; // A minor space chord
      this.ambientOscillators = freqs.map((f, i) => {
        const osc = this.ctx!.createOscillator();
        const pGain = this.ctx!.createGain();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        
        pGain.gain.value = 0.035;
        osc.connect(pGain);
        pGain.connect(this.ambientGain!);
        osc.start();
        return osc;
      });
    } else if (!shouldPlay && this.isAmbientPlaying) {
      this.isAmbientPlaying = false;
      this.ambientOscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      });
      this.ambientOscillators = [];
    }
    return this.isAmbientPlaying;
  }

  public isAmbientOn(): boolean {
    return this.isAmbientPlaying;
  }
}

export const audio = new SoundEngine();
