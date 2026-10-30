import { AmbientAudioProfile } from '../types/vignette';

/**
 * Zero-Asset Procedural WebAudio Synthesizer for Gothic Sanctuary
 * Generates tactile low-latency sound effects for footsteps, sword combos,
 * dodge rolls, shatter hitstop, soul embers, braziers, bells, fishing,
 * AND continuous ambient zone soundscape shifts when entering trigger zones.
 */

const ZONE_DRONE_FREQS: Record<
  AmbientAudioProfile,
  { root: number; fifth: number; filterHz: number; entryNotes: number[] }
> = {
  fen: {
    root: 110.0, // A2 deep mire drone
    fifth: 164.81, // E3
    filterHz: 340,
    entryNotes: [220.0, 293.66, 329.63, 493.88], // Watery suspended mist chord
  },
  ossuary: {
    root: 98.0, // G2 crag wind & bronze resonance
    fifth: 146.83, // D3
    filterHz: 480,
    entryNotes: [196.0, 293.66, 392.0, 587.33],
  },
  crypt: {
    root: 82.41, // E2 subterranean catacomb hum
    fifth: 123.47, // B2
    filterHz: 260,
    entryNotes: [164.81, 246.94, 329.63],
  },
  apothecary: {
    root: 146.83, // D3 warm hearth & glass resonance
    fifth: 220.0, // A3
    filterHz: 560,
    entryNotes: [293.66, 440.0, 554.37, 659.25],
  },
  barrow: {
    root: 123.47, // B2 hollow pine wind
    fifth: 185.0, // F#3
    filterHz: 390,
    entryNotes: [246.94, 369.99, 493.88],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentZoneProfile: AmbientAudioProfile | null = null;
  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private _enabled = true;

  public get enabled(): boolean {
    return this._enabled;
  }

  public set enabled(val: boolean) {
    this._enabled = val;
    if (!val && this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this._enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private ensureAmbientDroneNodes(ctx: AudioContext) {
    if (this.droneOscA && this.droneOscB && this.droneFilter && this.droneGain) return;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 2.4;

    const gain = ctx.createGain();
    gain.gain.value = 0.0;

    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 110;

    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.value = 164.81;

    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    oscA.start();
    oscB.start();

    this.droneOscA = oscA;
    this.droneOscB = oscB;
    this.droneFilter = filter;
    this.droneGain = gain;
  }

  /**
   * Shifts the continuous ambient drone and plays an atmospheric entry motif
   * when the Wayfarer crosses into an invisible plate trigger zone (e.g., Weeping Fen).
   */
  public updateAmbientZone(profile: AmbientAudioProfile | null, blendWeight: number) {
    if (!this._enabled) return;
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') {
      // Only modulate continuous drone once user has interacted and unlocked AudioContext
      this.currentZoneProfile = profile;
      return;
    }

    this.ensureAmbientDroneNodes(ctx);
    const now = ctx.currentTime;

    if (profile !== this.currentZoneProfile) {
      this.currentZoneProfile = profile;
      if (profile) {
        this.playZoneEntryMotif(ctx, profile);
      }
    }

    if (!profile || blendWeight <= 0.01) {
      this.droneGain?.gain.setTargetAtTime(0.0, now, 0.25);
      return;
    }

    const spec = ZONE_DRONE_FREQS[profile];
    this.droneOscA?.frequency.setTargetAtTime(spec.root, now, 0.35);
    this.droneOscB?.frequency.setTargetAtTime(spec.fifth, now, 0.35);
    this.droneFilter?.frequency.setTargetAtTime(
      spec.filterHz + Math.sin(now * 1.5) * 45,
      now,
      0.2
    );
    this.droneGain?.gain.setTargetAtTime(0.024 * Math.min(1, blendWeight), now, 0.25);
  }

  private playZoneEntryMotif(ctx: AudioContext, profile: AmbientAudioProfile) {
    const now = ctx.currentTime;
    const spec = ZONE_DRONE_FREQS[profile];

    spec.entryNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = profile === 'fen' || profile === 'crypt' ? 'sine' : 'triangle';
      filter.type = 'lowpass';
      filter.frequency.value = spec.filterHz * 2.2;

      const t0 = now + idx * 0.09;
      osc.frequency.setValueAtTime(freq, t0);
      if (profile === 'fen') {
        // Subtle watery pitch bend on Weeping Fen entry
        osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t0 + 0.9);
      }

      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.032 / (idx * 0.35 + 1), t0 + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0006, t0 + 1.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 1.2);
    });
  }

  public playFootstep(surface: 'stone' | 'wood' | 'water' = 'stone') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (surface === 'water') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240 + Math.random() * 60, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    } else if (surface === 'wood') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(135 + Math.random() * 25, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.045);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(175 + Math.random() * 35, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.038);
      gain.gain.setValueAtTime(0.038, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.042);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSwordSwing(comboStep: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const metal = ctx.createOscillator();
    const gain = ctx.createGain();
    const metalGain = ctx.createGain();

    if (comboStep === 3) {
      // Strike 3: Ashina Shadowrush Spin + Piercing Thrust Stinger (double whoosh + high steel needle ring)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.22);

      metal.type = 'sine';
      metal.frequency.setValueAtTime(1320, now + 0.04);
      metal.frequency.exponentialRampToValueAtTime(680, now + 0.24);

      gain.gain.setValueAtTime(0.065, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

      metalGain.gain.setValueAtTime(0.032, now + 0.04);
      metalGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.25);

      osc.connect(gain);
      metal.connect(metalGain);
      gain.connect(ctx.destination);
      metalGain.connect(ctx.destination);

      osc.start(now);
      metal.start(now + 0.04);
      osc.stop(now + 0.24);
      metal.stop(now + 0.26);
      return;
    }

    if (comboStep === 0 || comboStep === 4) {
      // Strike 4: Ichimonji Overhead Guillotine Finisher (heavy wind-up whoosh + deep sub-bass cleave boom)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);

      metal.type = 'triangle';
      metal.frequency.setValueAtTime(740, now + 0.06);
      metal.frequency.exponentialRampToValueAtTime(190, now + 0.3);

      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);

      metalGain.gain.setValueAtTime(0.04, now + 0.06);
      metalGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.31);

      osc.connect(gain);
      metal.connect(metalGain);
      gain.connect(ctx.destination);
      metalGain.connect(ctx.destination);

      osc.start(now);
      metal.start(now + 0.06);
      osc.stop(now + 0.3);
      metal.stop(now + 0.32);
      return;
    }

    // Strike 1 (Kesagiri downward cut) vs Strike 2 (Gyaku-Kesagiri rising reverse fang)
    const isRising = comboStep === 2;
    const startFreq = isRising ? 185 : 265;
    const endFreq = isRising ? 340 : 92;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);

    metal.type = 'sine';
    metal.frequency.setValueAtTime(isRising ? 780 : 960, now);
    metal.frequency.exponentialRampToValueAtTime(isRising ? 1180 : 540, now + 0.17);

    gain.gain.setValueAtTime(0.058, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    metalGain.gain.setValueAtTime(0.024, now);
    metalGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.18);

    osc.connect(gain);
    metal.connect(metalGain);
    gain.connect(ctx.destination);
    metalGain.connect(ctx.destination);

    osc.start(now);
    metal.start(now);
    osc.stop(now + 0.17);
    metal.stop(now + 0.19);
  }

  public playSwordSwingById(
    strikeId:
      | 'light-kesagiri'
      | 'light-rising'
      | 'heavy-cleave'
      | 'thrust-shadowrush'
      | 'overhead-ichimonji'
  ) {
    if (strikeId === 'heavy-cleave') {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const metal = ctx.createOscillator();
      const gain = ctx.createGain();
      const metalGain = ctx.createGain();

      // Heavy Cleave: deep rear-hip coil into broad horizontal cleaver roar + bronze harmonic wake
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.27);

      metal.type = 'triangle';
      metal.frequency.setValueAtTime(620, now + 0.05);
      metal.frequency.exponentialRampToValueAtTime(260, now + 0.28);

      gain.gain.setValueAtTime(0.078, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      metalGain.gain.setValueAtTime(0.038, now + 0.05);
      metalGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.29);

      osc.connect(gain);
      metal.connect(metalGain);
      gain.connect(ctx.destination);
      metalGain.connect(ctx.destination);

      osc.start(now);
      metal.start(now + 0.05);
      osc.stop(now + 0.29);
      metal.stop(now + 0.3);
      return;
    }

    const stepMap = {
      'light-kesagiri': 1,
      'light-rising': 2,
      'thrust-shadowrush': 3,
      'overhead-ichimonji': 4,
    } as const;
    this.playSwordSwing(stepMap[strikeId]);
  }

  public playDeflectParry(perfectParry = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = perfectParry ? [1174.66, 1760.0, 2637.02] : [880.0, 1318.51];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t0 = now + idx * 0.012;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t0 + 0.22);
      gain.gain.setValueAtTime((perfectParry ? 0.068 : 0.044) / (idx * 0.5 + 1), t0);
      gain.gain.exponentialRampToValueAtTime(0.0007, t0 + (perfectParry ? 0.28 : 0.16));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  }

  public playDodgeRoll() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.18);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playImpactShatter() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.16);
    subGain.gain.setValueAtTime(0.11, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + 0.19);

    [620, 890, 1180].forEach((freq, idx) => {
      const shard = ctx.createOscillator();
      const sGain = ctx.createGain();
      shard.type = 'triangle';
      const t0 = now + idx * 0.022;
      shard.frequency.setValueAtTime(freq + Math.random() * 80, t0);
      shard.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + 0.09);
      sGain.gain.setValueAtTime(0.032, t0);
      sGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
      shard.connect(sGain);
      sGain.connect(ctx.destination);
      shard.start(t0);
      shard.stop(t0 + 0.11);
    });
  }

  public playEmberCollect() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.04;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.035, t0);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  public playBrazierIgnite(lit: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    if (lit) {
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.28);
    } else {
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);
    }
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playBellToll() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [196.0, 392.0, 587.33, 784.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const amp = 0.075 / (idx + 1);
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.8 - idx * 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.85);
    });
  }

  public playFishingCue(stage: 'cast' | 'bite' | 'catch') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (stage === 'cast') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.14);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (stage === 'bite') {
      [740, 987.77].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t0 = now + idx * 0.07;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.06, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.13);
      });
    } else {
      [440, 554.37, 659.25, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t0 = now + idx * 0.065;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.05, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.36);
      });
    }
  }

  /**
   * Synthesizes a character-specific speech blip per revealed syllable in the typewriter dialogue box.
   */
  public playVoiceBlip(
    baseFreqHz: number,
    timbre: 'bellwright' | 'botanist' | 'dockmaster' | 'lutenist' | 'archivist' = 'bellwright'
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const jitter = (Math.random() - 0.5) * 28;
    const f0 = Math.max(90, baseFreqHz + jitter);

    if (timbre === 'bellwright') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.12, now + 0.042);
    } else if (timbre === 'botanist') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.18, now + 0.046);
    } else if (timbre === 'dockmaster') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0 * 0.85, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.96, now + 0.048);
    } else if (timbre === 'lutenist') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f0 * 1.05, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.24, now + 0.05);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0 * 0.92, now);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.86, now + 0.052);
    }

    const peakGain = timbre === 'dockmaster' ? 0.022 : 0.032;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.054);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.058);
  }

  /**
   * Plays a warm gothic chord chime during cutscene transitions and story revelations.
   */
  public playCutsceneCue(kind: 'start' | 'keyframe' | 'complete') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes =
      kind === 'start'
        ? [220.0, 277.18, 329.63, 440.0]
        : kind === 'keyframe'
          ? [293.66, 369.99, 440.0]
          : [261.63, 329.63, 392.0, 523.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const t0 = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.036 / (idx * 0.4 + 1), t0);
      gain.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.68);
    });
  }
}

export const soundEngine = new SoundEngine();
