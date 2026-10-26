import * as THREE from 'three';

export type AttackWeightClass =
  | 'light-slash'
  | 'cross-slash'
  | 'heavy-cleave'
  | 'finisher-strike'
  | 'player-stagger';

export interface HitstopImpactEvent {
  id: number;
  weightClass: AttackWeightClass;
  weightMultiplier: number; // 1.0 (light) -> 2.8 (heavy finisher)
  hitstopDuration: number;
  dirX: number;
  dirZ: number;
}

export interface ScreenSpaceCameraShake {
  /**
   * Triggers a screen-space camera shake impulse from a hitstop physics event.
   * Intensity, frequency, and decay duration scale with the attack weight.
   */
  triggerFromHitstop: (
    event: HitstopImpactEvent,
    cameraAzimuthRad: number
  ) => void;
  /**
   * Evaluates the current frame's screen-space offset in low-res pixel texels.
   */
  evaluate: (dt: number, timeSec: number) => THREE.Vector2;
  /**
   * Current normalized shake trauma [0..1] for telemetry or HUD feedback.
   */
  readonly currentIntensity: number;
}

/**
 * Creates a screen-space camera shake utility driven by hitstop combat physics events.
 * Combines a directional punch along the attack vector with a high-frequency damped
 * harmonic oscillation in screen-space texel coordinates.
 */
export function createScreenSpaceCameraShake(): ScreenSpaceCameraShake {
  let trauma = 0.0;
  let maxAmplitudeTexels = 0.0;
  let decayRate = 6.5;
  let oscFreq = 42.0;
  let impulseDirScreenX = 0.0;
  let impulseDirScreenY = 0.0;
  let phase = 0.0;

  const offsetOut = new THREE.Vector2(0, 0);

  const triggerFromHitstop = (
    event: HitstopImpactEvent,
    cameraAzimuthRad: number
  ) => {
    const w = THREE.MathUtils.clamp(event.weightMultiplier, 0.5, 3.5);

    // Project world-space strike direction (dirX, dirZ) into camera screen-space (right, up)
    const camRightX = Math.cos(cameraAzimuthRad);
    const camRightZ = -Math.sin(cameraAzimuthRad);
    const camUpX = -Math.sin(cameraAzimuthRad);
    const camUpZ = -Math.cos(cameraAzimuthRad);

    const projX = event.dirX * camRightX + event.dirZ * camRightZ;
    const projY = event.dirX * camUpX + event.dirZ * camUpZ;
    const len = Math.hypot(projX, projY);

    if (len > 0.001) {
      impulseDirScreenX = projX / len;
      impulseDirScreenY = projY / len;
    } else {
      impulseDirScreenX = 0.707;
      impulseDirScreenY = 0.707;
    }

    // Weight-tiered amplitude (in low-res pixel texels), frequency, and decay rate
    if (event.weightClass === 'finisher-strike') {
      maxAmplitudeTexels = 3.8 * (0.85 + w * 0.25);
      decayRate = 4.2;
      oscFreq = 48.0;
      trauma = 1.0;
    } else if (event.weightClass === 'heavy-cleave') {
      maxAmplitudeTexels = 3.1 * (0.85 + w * 0.22);
      decayRate = 4.8;
      oscFreq = 44.0;
      trauma = Math.min(1.0, trauma + 0.92);
    } else if (event.weightClass === 'cross-slash') {
      maxAmplitudeTexels = 2.1 * (0.85 + w * 0.18);
      decayRate = 5.8;
      oscFreq = 40.0;
      trauma = Math.min(1.0, trauma + 0.76);
    } else if (event.weightClass === 'player-stagger') {
      maxAmplitudeTexels = 3.4;
      decayRate = 4.5;
      oscFreq = 50.0;
      trauma = 1.0;
    } else {
      // 'light-slash'
      maxAmplitudeTexels = 1.45 * (0.85 + w * 0.15);
      decayRate = 6.8;
      oscFreq = 38.0;
      trauma = Math.min(1.0, trauma + 0.62);
    }

    phase = 0.0;
  };

  const evaluate = (dt: number, timeSec: number): THREE.Vector2 => {
    if (trauma <= 0.001) {
      trauma = 0.0;
      offsetOut.set(0, 0);
      return offsetOut;
    }

    phase += dt * oscFreq;
    trauma = Math.max(0.0, trauma - decayRate * dt);

    // Non-linear quadratic/cubic trauma curve for snappy initial hitstop jolt and smooth tail
    const shakePower = trauma * trauma * maxAmplitudeTexels;

    // Directional punch along the strike vector + orthogonal shudder
    const primaryWave = Math.cos(phase);
    const orthoWave = Math.sin(phase * 1.37 + timeSec * 13.0) * 0.55;

    const orthoX = -impulseDirScreenY;
    const orthoY = impulseDirScreenX;

    const dx = (impulseDirScreenX * primaryWave + orthoX * orthoWave) * shakePower;
    const dy = (impulseDirScreenY * primaryWave + orthoY * orthoWave) * shakePower;

    offsetOut.set(dx, dy);
    return offsetOut;
  };

  return {
    triggerFromHitstop,
    evaluate,
    get currentIntensity() {
      return Number(trauma.toFixed(2));
    },
  };
}
