import * as THREE from 'three';
import { AttackWeightClass } from './cameraShake';

export type SwordStrikeArchetype = 'light' | 'heavy' | 'thrust' | 'overhead';

export type SwordStrikeId =
  | 'light-kesagiri'
  | 'light-rising'
  | 'heavy-cleave'
  | 'thrust-shadowrush'
  | 'overhead-ichimonji';

export type ChoreographyPhase = 'idle' | 'windup' | 'active' | 'follow-through' | 'deflect';

export interface CharacterRigPose {
  leftLegHipX: number;
  leftLegKneeX: number;
  rightLegHipX: number;
  rightLegKneeX: number;
  torsoRot: [number, number, number];
  headRot: [number, number, number];
  leftShoulderRot: [number, number, number];
  rightShoulderRot: [number, number, number];
  swordHandRot: [number, number, number];
  swordPos: [number, number, number];
  swordRot: [number, number, number];
  capePitch: [number, number];
}

export interface SlashPlaneChoreography {
  visible: boolean;
  pos: [number, number, number];
  scaleSignX: number;
  scaleMult: number;
  rotXStart: number;
  rotXEnd: number;
  rotYStart: number;
  rotYEnd: number;
  rotZ: number;
  outerColorHex: string;
  echoColorHex: string;
}

export interface StrikeChoreographySpec {
  id: SwordStrikeId;
  archetype: SwordStrikeArchetype;
  comboSlot: number; // 1..4 in hybrid chain, or 2/special for Heavy Cleave
  name: string;
  subtitle: string;
  keybindHint: string;
  weightClass: AttackWeightClass;
  durationSec: number;
  windupEnd: number; // Normalized [0..1] end of anticipation chamber
  activeEnd: number; // Normalized [0..1] end of high-velocity active whip
  cancelWindowStart: number; // Normalized [0..1] recovery cancel / buffer gate
  snapExponent: number; // Quartic/cubic BlazBlue keyframe snap power (3.4 .. 4.2)
  overshootAmp: number; // Follow-through spring overshoot scalar
  anticipationSquashY: number;
  impactSquashY: number;
  hopHeightY: number;
  spinTurns: number; // e.g. -1 for 360° cyclone spin on Shadowrush Thrust
  lungeSpeed: number; // Step-in velocity impulse (m/s)
  reachBonus: number; // Added to base sword reach
  arcHalfAngleCos: number; // Directional cone filter (-1 = 360°, 0.25 = 150°, 0.72 = narrow thrust lance)
  hitOffset: number; // Forward hitbox center offset (m)
  damageMultiplier: number;
  postureDamage: number; // Stagger / poise damage dealt
  hitstopDurationSec: number;
  baseWeightMultiplier: number;
  smearPeakScale: [number, number, number];
  slashPlane: SlashPlaneChoreography;
  usesThrustLance: boolean;
  usesHeavyEmberWake: boolean;
  usesOverheadShockwave: boolean;
  chamberPose: CharacterRigPose;
  deliveryPose: CharacterRigPose;
}

export interface EvaluatedChoreographyFrame {
  phase: ChoreographyPhase;
  normalizedProgress: number;
  windupT: number;
  rawStrikeT: number;
  snapT: number;
  followT: number;
  overshoot: number;
  smearBell: number;
  glintAlpha: number;
  hopOffsetY: number;
  spinProgress: number;
  spinEase: number;
  canCancelIntoDefense: boolean;
  canBufferNextStrike: boolean;
  pose: CharacterRigPose;
}

/**
 * Declarative Sekiro × BlazBlue Sword Strike Choreography Registry.
 * Defines the exact frame phases, easing exponents, hitbox geometry,
 * smear plane transforms, and 11-joint hierarchical poses for each strike type.
 */
export const STRIKE_CHOREOGRAPHY_REGISTRY: Record<SwordStrikeId, StrikeChoreographySpec> = {
  'light-kesagiri': {
    id: 'light-kesagiri',
    archetype: 'light',
    comboSlot: 1,
    name: 'I · Porter’s Kesagiri',
    subtitle: 'High-Right to Low-Left Diagonal Cut',
    keybindHint: 'J / LMB',
    weightClass: 'light-slash',
    durationSec: 0.32,
    windupEnd: 0.20,
    activeEnd: 0.58,
    cancelWindowStart: 0.62,
    snapExponent: 3.6,
    overshootAmp: 0.11,
    anticipationSquashY: 0.92,
    impactSquashY: 0.96,
    hopHeightY: 0.0,
    spinTurns: 0,
    lungeSpeed: 4.8,
    reachBonus: 0.0,
    arcHalfAngleCos: -0.15, // Wide 195° front diagonal sweep
    hitOffset: 1.08,
    damageMultiplier: 1.0,
    postureDamage: 18,
    hitstopDurationSec: 0.044,
    baseWeightMultiplier: 1.0,
    smearPeakScale: [2.45, 1.0, 1.35],
    slashPlane: {
      visible: true,
      pos: [0, 0.82, 0.24],
      scaleSignX: -1,
      scaleMult: 1.0,
      rotXStart: 0.22,
      rotXEnd: 0.22,
      rotYStart: -0.78,
      rotYEnd: 0.72,
      rotZ: -0.48,
      outerColorHex: '#F97316',
      echoColorHex: '#C8B273',
    },
    usesThrustLance: false,
    usesHeavyEmberWake: false,
    usesOverheadShockwave: false,
    chamberPose: {
      leftLegHipX: 0.12,
      leftLegKneeX: 0.18,
      rightLegHipX: -0.18,
      rightLegKneeX: 0.22,
      torsoRot: [-0.14, -0.68, 0.12],
      headRot: [-0.08, 0.31, 0],
      leftShoulderRot: [-0.18, 0.22, -0.18],
      rightShoulderRot: [-1.15, -1.25, -0.35],
      swordHandRot: [-0.45, -0.65, -0.42],
      swordPos: [0, 0, 0],
      swordRot: [0, 0, 0.25],
      capePitch: [0.32, 0.24],
    },
    deliveryPose: {
      leftLegHipX: -0.52,
      leftLegKneeX: 0.65,
      rightLegHipX: 0.45,
      rightLegKneeX: 0.18,
      torsoRot: [0.32, 0.82, -0.18],
      headRot: [0.12, -0.37, 0],
      leftShoulderRot: [0.35, -0.55, -0.25],
      rightShoulderRot: [0.42, 1.32, 0.48],
      swordHandRot: [0.55, 0.52, -0.42],
      swordPos: [0, 0, 0],
      swordRot: [0, 0, 0.25],
      capePitch: [0.68, 0.48],
    },
  },

  'light-rising': {
    id: 'light-rising',
    archetype: 'light',
    comboSlot: 2,
    name: 'II · Gutter Rising Fang',
    subtitle: 'Low-Left Crouch to High-Right Reverse Slash',
    keybindHint: 'J / LMB (2nd)',
    weightClass: 'cross-slash',
    durationSec: 0.34,
    windupEnd: 0.20,
    activeEnd: 0.58,
    cancelWindowStart: 0.62,
    snapExponent: 3.7,
    overshootAmp: 0.12,
    anticipationSquashY: 0.84,
    impactSquashY: 1.06,
    hopHeightY: 0.05,
    spinTurns: 0,
    lungeSpeed: 5.4,
    reachBonus: 0.12,
    arcHalfAngleCos: -0.15,
    hitOffset: 1.12,
    damageMultiplier: 1.2,
    postureDamage: 24,
    hitstopDurationSec: 0.054,
    baseWeightMultiplier: 1.35,
    smearPeakScale: [2.55, 1.0, 1.38],
    slashPlane: {
      visible: true,
      pos: [0, 0.86, 0.26],
      scaleSignX: 1,
      scaleMult: 1.04,
      rotXStart: -0.26,
      rotXEnd: -0.26,
      rotYStart: -0.82,
      rotYEnd: 0.76,
      rotZ: 0.58,
      outerColorHex: '#F97316',
      echoColorHex: '#9fd8e8',
    },
    usesThrustLance: false,
    usesHeavyEmberWake: false,
    usesOverheadShockwave: false,
    chamberPose: {
      leftLegHipX: 0.45,
      leftLegKneeX: 0.35,
      rightLegHipX: -0.55,
      rightLegKneeX: 0.58,
      torsoRot: [0.34, 0.82, -0.18],
      headRot: [0.16, -0.36, 0],
      leftShoulderRot: [0.22, -0.28, -0.25],
      rightShoulderRot: [0.48, 1.28, 0.55],
      swordHandRot: [0.35, 0.65, 0.52],
      swordPos: [0, 0, 0],
      swordRot: [0, 0, -0.35],
      capePitch: [0.42, 0.32],
    },
    deliveryPose: {
      leftLegHipX: -0.35,
      leftLegKneeX: 0.25,
      rightLegHipX: 0.48,
      rightLegKneeX: 0.58,
      torsoRot: [-0.22, -0.88, 0.24],
      headRot: [-0.12, 0.40, 0],
      leftShoulderRot: [-0.45, 0.48, -0.30],
      rightShoulderRot: [-1.22, -1.38, -0.45],
      swordHandRot: [-0.58, -0.55, 0.52],
      swordPos: [0, 0, 0],
      swordRot: [0, 0, -0.35],
      capePitch: [0.82, 0.58],
    },
  },

  'heavy-cleave': {
    id: 'heavy-cleave',
    archetype: 'heavy',
    comboSlot: 2,
    name: 'Heavy · Combine Wide Cleave',
    subtitle: 'Deep Rear-Hip Torque into 190° Horizontal Crowd Reap',
    keybindHint: 'U / Shift+LMB',
    weightClass: 'heavy-cleave',
    durationSec: 0.46,
    windupEnd: 0.30,
    activeEnd: 0.64,
    cancelWindowStart: 0.70,
    snapExponent: 4.0,
    overshootAmp: 0.16,
    anticipationSquashY: 0.82,
    impactSquashY: 0.88,
    hopHeightY: 0.0,
    spinTurns: 0,
    lungeSpeed: 6.4,
    reachBonus: 0.48,
    arcHalfAngleCos: -0.45, // Massive 230° horizontal crowd-reaping cleave
    hitOffset: 1.22,
    damageMultiplier: 1.75,
    postureDamage: 42,
    hitstopDurationSec: 0.076,
    baseWeightMultiplier: 1.95,
    smearPeakScale: [2.95, 1.25, 1.52],
    slashPlane: {
      visible: true,
      pos: [0, 0.74, 0.28],
      scaleSignX: -1,
      scaleMult: 1.28,
      rotXStart: 0.06,
      rotXEnd: 0.06,
      rotYStart: -1.12,
      rotYEnd: 1.08,
      rotZ: -0.12,
      outerColorHex: '#e5482f',
      echoColorHex: '#e8a020',
    },
    usesThrustLance: false,
    usesHeavyEmberWake: true,
    usesOverheadShockwave: false,
    chamberPose: {
      leftLegHipX: 0.38,
      leftLegKneeX: 0.56,
      rightLegHipX: -0.48,
      rightLegKneeX: 0.68,
      torsoRot: [0.24, -1.08, 0.22],
      headRot: [0.10, 0.52, 0],
      leftShoulderRot: [-0.42, -0.68, -0.32],
      rightShoulderRot: [-0.28, -1.55, -0.62],
      swordHandRot: [-0.25, -0.82, -0.78],
      swordPos: [0, 0, -0.06],
      swordRot: [0, 0, 1.15],
      capePitch: [0.52, 0.38],
    },
    deliveryPose: {
      leftLegHipX: -0.64,
      leftLegKneeX: 0.78,
      rightLegHipX: 0.56,
      rightLegKneeX: 0.34,
      torsoRot: [0.38, 1.18, -0.24],
      headRot: [0.14, -0.48, 0],
      leftShoulderRot: [0.52, 0.74, -0.38],
      rightShoulderRot: [0.22, 1.48, 0.64],
      swordHandRot: [0.48, 0.72, -0.78],
      swordPos: [0, 0, 0.14],
      swordRot: [0, 0, 1.15],
      capePitch: [1.05, 0.76],
    },
  },

  'thrust-shadowrush': {
    id: 'thrust-shadowrush',
    archetype: 'thrust',
    comboSlot: 3,
    name: 'III · Shadowrush Vortex Thrust',
    subtitle: '360° Cyclone Pirouette into Deep Piercing Stinger Lance',
    keybindHint: 'I / W+LMB',
    weightClass: 'cross-slash',
    durationSec: 0.42,
    windupEnd: 0.32,
    activeEnd: 0.72,
    cancelWindowStart: 0.72,
    snapExponent: 3.8,
    overshootAmp: 0.10,
    anticipationSquashY: 0.88,
    impactSquashY: 0.94,
    hopHeightY: 0.0,
    spinTurns: -1.0, // Full 360° cyclone spin
    lungeSpeed: 9.4,
    reachBonus: 0.68,
    arcHalfAngleCos: 0.35, // Focused forward piercing corridor
    hitOffset: 1.48,
    damageMultiplier: 1.55,
    postureDamage: 34,
    hitstopDurationSec: 0.066,
    baseWeightMultiplier: 1.65,
    smearPeakScale: [1.50, 1.0, 2.25],
    slashPlane: {
      visible: true,
      pos: [0, 0.76, 0.15],
      scaleSignX: 1,
      scaleMult: 1.08,
      rotXStart: 0.06,
      rotXEnd: 0.06,
      rotYStart: 0,
      rotYEnd: -Math.PI * 2.2,
      rotZ: 0.08,
      outerColorHex: '#EA580C',
      echoColorHex: '#9fd8e8',
    },
    usesThrustLance: true,
    usesHeavyEmberWake: false,
    usesOverheadShockwave: false,
    chamberPose: {
      leftLegHipX: -0.22,
      leftLegKneeX: 0.35,
      rightLegHipX: 0.28,
      rightLegKneeX: 0.42,
      torsoRot: [0.18, 0, 0],
      headRot: [-0.08, 0, 0],
      leftShoulderRot: [0.15, -0.25, -0.25],
      rightShoulderRot: [-0.35, -0.95, 0],
      swordHandRot: [0, 0, 0],
      swordPos: [0, 0, -0.08],
      swordRot: [0, 0, Math.PI * 0.5],
      capePitch: [1.18, 0.68],
    },
    deliveryPose: {
      leftLegHipX: 0.65,
      leftLegKneeX: 0.22,
      rightLegHipX: -0.78,
      rightLegKneeX: 0.85,
      torsoRot: [0.48, 0.32, 0],
      headRot: [-0.22, -0.24, 0],
      leftShoulderRot: [0.65, -0.65, -0.35],
      rightShoulderRot: [-0.12, -0.18, 0],
      swordHandRot: [0.12, 0.18, 0],
      swordPos: [0, 0, 0.58],
      swordRot: [0, 0, Math.PI * 0.5],
      capePitch: [1.24, 0.78],
    },
  },

  'overhead-ichimonji': {
    id: 'overhead-ichimonji',
    archetype: 'overhead',
    comboSlot: 4,
    name: 'IV · Ichimonji Coffin-Splitter',
    subtitle: 'Two-Handed High Chamber Hop into 90° Vertical Guillotine Slam',
    keybindHint: 'O / Alt+LMB',
    weightClass: 'finisher-strike',
    durationSec: 0.54,
    windupEnd: 0.34,
    activeEnd: 0.62,
    cancelWindowStart: 0.74,
    snapExponent: 4.2,
    overshootAmp: 0.14,
    anticipationSquashY: 1.18,
    impactSquashY: 0.76,
    hopHeightY: 0.26,
    spinTurns: 0,
    lungeSpeed: 6.8,
    reachBonus: 0.48,
    arcHalfAngleCos: 0.0, // Forward 180° stone-splitting impact zone
    hitOffset: 1.32,
    damageMultiplier: 2.1,
    postureDamage: 55,
    hitstopDurationSec: 0.088,
    baseWeightMultiplier: 2.25,
    smearPeakScale: [2.65, 1.85, 1.48],
    slashPlane: {
      visible: true,
      pos: [0, 1.05, 0.38],
      scaleSignX: 1,
      scaleMult: 1.18,
      rotXStart: -0.95,
      rotXEnd: 0.55,
      rotYStart: 0,
      rotYEnd: 0,
      rotZ: Math.PI * 0.5,
      outerColorHex: '#e5482f',
      echoColorHex: '#e8a020',
    },
    usesThrustLance: false,
    usesHeavyEmberWake: false,
    usesOverheadShockwave: true,
    chamberPose: {
      leftLegHipX: -0.25,
      leftLegKneeX: 0.35,
      rightLegHipX: 0.25,
      rightLegKneeX: 0.28,
      torsoRot: [-0.42, -0.18, 0],
      headRot: [-0.28, 0.08, 0],
      leftShoulderRot: [-1.65, 0.32, 0],
      rightShoulderRot: [-2.35, -0.12, 0],
      swordHandRot: [-0.48, 0, 0],
      swordPos: [0, 0.06, 0],
      swordRot: [0, 0, 0],
      capePitch: [0.85, 0.55],
    },
    deliveryPose: {
      leftLegHipX: -0.68,
      leftLegKneeX: 0.82,
      rightLegHipX: 0.58,
      rightLegKneeX: 0.45,
      torsoRot: [0.58, 0.14, 0],
      headRot: [0.22, -0.06, 0],
      leftShoulderRot: [0.35, -0.25, 0],
      rightShoulderRot: [0.48, 0.08, 0],
      swordHandRot: [0.62, 0, 0],
      swordPos: [0, -0.04, 0.08],
      swordRot: [0, 0, 0],
      capePitch: [1.12, 0.84],
    },
  },
};

export const COMBO_STAGE_TO_STRIKE_ID: Record<number, SwordStrikeId> = {
  1: 'light-kesagiri',
  2: 'light-rising',
  3: 'thrust-shadowrush',
  4: 'overhead-ichimonji',
};

export const ARCHETYPE_TO_PRIMARY_STRIKE_ID: Record<SwordStrikeArchetype, SwordStrikeId> = {
  light: 'light-kesagiri',
  heavy: 'heavy-cleave',
  thrust: 'thrust-shadowrush',
  overhead: 'overhead-ichimonji',
};

// Pre-allocated mutable evaluation output to guarantee zero GC in the 60fps loop
const _evalPose: CharacterRigPose = {
  leftLegHipX: 0,
  leftLegKneeX: 0,
  rightLegHipX: 0,
  rightLegKneeX: 0,
  torsoRot: [0, 0, 0],
  headRot: [0, 0, 0],
  leftShoulderRot: [0, 0, 0],
  rightShoulderRot: [0, 0, 0],
  swordHandRot: [0, 0, 0],
  swordPos: [0, 0, 0],
  swordRot: [0, 0, 0],
  capePitch: [0, 0],
};

const _evalFrame: EvaluatedChoreographyFrame = {
  phase: 'idle',
  normalizedProgress: 0,
  windupT: 0,
  rawStrikeT: 0,
  snapT: 0,
  followT: 0,
  overshoot: 0,
  smearBell: 0,
  glintAlpha: 0,
  hopOffsetY: 0,
  spinProgress: 0,
  spinEase: 0,
  canCancelIntoDefense: true,
  canBufferNextStrike: false,
  pose: _evalPose,
};

/**
 * Evaluates the exact Sekiro × BlazBlue 3-phase kinematics and 11-joint pose
 * at normalized progress `p` in [0, 1] without allocating objects.
 */
export function evaluateStrikeChoreographyFrame(
  spec: StrikeChoreographySpec,
  p: number
): EvaluatedChoreographyFrame {
  const clampedP = THREE.MathUtils.clamp(p, 0, 1);
  const { windupEnd, activeEnd, cancelWindowStart, snapExponent, overshootAmp, hopHeightY } =
    spec;

  const isWindup = clampedP < windupEnd;
  const isActive = clampedP >= windupEnd && clampedP <= activeEnd;
  const phase: ChoreographyPhase = isWindup
    ? 'windup'
    : isActive
      ? 'active'
      : 'follow-through';

  // Phase 1: Smoothstep Anticipation Coil [0 .. windupEnd]
  const windupT = isWindup ? THREE.MathUtils.smoothstep(clampedP / windupEnd, 0, 1) : 1.0;

  // Phase 2: Quartic BlazBlue Keyframe Snap [windupEnd .. activeEnd]
  const rawStrikeT = isWindup
    ? 0.0
    : isActive
      ? (clampedP - windupEnd) / Math.max(0.001, activeEnd - windupEnd)
      : 1.0;
  const snapT = 1.0 - Math.pow(1.0 - rawStrikeT, snapExponent);

  // Phase 3: Kinetic Overshoot & Weight Settle [activeEnd .. 1.0]
  const followT =
    clampedP > activeEnd
      ? (clampedP - activeEnd) / Math.max(0.001, 1.0 - activeEnd)
      : 0.0;
  const overshoot =
    clampedP > activeEnd ? Math.sin(followT * Math.PI) * overshootAmp : 0.0;
  const s = snapT + overshoot;

  // Crossguard anticipation telegraph glint & active blade smear bell envelope
  const glintAlpha = isWindup ? Math.sin(windupT * Math.PI) * 0.95 : 0.0;
  const smearBell = isActive ? Math.sin(rawStrikeT * Math.PI) : 0.0;

  // Vertical hop arc (for Ichimonji Overhead Slam & Rising Fang)
  const hopOffsetY =
    hopHeightY > 0
      ? isWindup
        ? Math.sin(windupT * Math.PI * 0.85) * hopHeightY
        : Math.max(0, (1.0 - snapT * 1.8) * (hopHeightY * 0.85))
      : 0.0;

  // Cyclone spin progression (for Shadowrush Vortex Thrust)
  const spinProgress = THREE.MathUtils.clamp(clampedP / activeEnd, 0, 1);
  const spinEase = 1.0 - Math.pow(1.0 - spinProgress, 2.6);

  const c = spec.chamberPose;
  const d = spec.deliveryPose;

  // Interpolate legs from chamber stance (scaled by windupT) to delivery stance (via s)
  _evalPose.leftLegHipX = THREE.MathUtils.lerp(c.leftLegHipX * windupT, d.leftLegHipX, s);
  _evalPose.leftLegKneeX = THREE.MathUtils.lerp(c.leftLegKneeX * windupT, d.leftLegKneeX, s);
  _evalPose.rightLegHipX = THREE.MathUtils.lerp(c.rightLegHipX * windupT, d.rightLegHipX, s);
  _evalPose.rightLegKneeX = THREE.MathUtils.lerp(c.rightLegKneeX * windupT, d.rightLegKneeX, s);

  // Interpolate torso pitch, yaw coil (plus optional 360° cyclone spin), and roll
  const extraSpinY = spec.spinTurns !== 0 ? spinEase * Math.PI * 2.0 * spec.spinTurns : 0.0;
  _evalPose.torsoRot[0] = THREE.MathUtils.lerp(c.torsoRot[0] * windupT, d.torsoRot[0], s);
  _evalPose.torsoRot[1] =
    extraSpinY + THREE.MathUtils.lerp(c.torsoRot[1] * windupT, d.torsoRot[1], s);
  _evalPose.torsoRot[2] = THREE.MathUtils.lerp(c.torsoRot[2] * windupT, d.torsoRot[2], s);

  // Head counter-rotation keeps eyes locked on target during torso torque
  _evalPose.headRot[0] = THREE.MathUtils.lerp(c.headRot[0] * windupT, d.headRot[0], s);
  _evalPose.headRot[1] = THREE.MathUtils.lerp(c.headRot[1] * windupT, d.headRot[1], s);
  _evalPose.headRot[2] = THREE.MathUtils.lerp(c.headRot[2] * windupT, d.headRot[2], s);

  // Left arm (lantern counterbalance or two-handed Ichimonji overhead convergence)
  _evalPose.leftShoulderRot[0] = THREE.MathUtils.lerp(
    c.leftShoulderRot[0] * windupT,
    d.leftShoulderRot[0],
    s
  );
  _evalPose.leftShoulderRot[1] = THREE.MathUtils.lerp(
    c.leftShoulderRot[1] * windupT,
    d.leftShoulderRot[1],
    s
  );
  _evalPose.leftShoulderRot[2] = THREE.MathUtils.lerp(
    c.leftShoulderRot[2] * windupT,
    d.leftShoulderRot[2],
    s
  );

  // Right sword arm & wrist whip
  _evalPose.rightShoulderRot[0] = THREE.MathUtils.lerp(
    c.rightShoulderRot[0] * windupT,
    d.rightShoulderRot[0],
    s
  );
  _evalPose.rightShoulderRot[1] = THREE.MathUtils.lerp(
    c.rightShoulderRot[1] * windupT,
    d.rightShoulderRot[1],
    s
  );
  _evalPose.rightShoulderRot[2] = THREE.MathUtils.lerp(
    c.rightShoulderRot[2] * windupT,
    d.rightShoulderRot[2],
    s
  );

  _evalPose.swordHandRot[0] = THREE.MathUtils.lerp(
    c.swordHandRot[0] * windupT,
    d.swordHandRot[0],
    s
  );
  _evalPose.swordHandRot[1] = THREE.MathUtils.lerp(
    c.swordHandRot[1] * windupT,
    d.swordHandRot[1],
    s
  );
  _evalPose.swordHandRot[2] = THREE.MathUtils.lerp(
    c.swordHandRot[2] * windupT,
    d.swordHandRot[2],
    s
  );

  _evalPose.swordPos[0] = THREE.MathUtils.lerp(c.swordPos[0] * windupT, d.swordPos[0], s);
  _evalPose.swordPos[1] = THREE.MathUtils.lerp(c.swordPos[1] * windupT, d.swordPos[1], s);
  _evalPose.swordPos[2] = THREE.MathUtils.lerp(c.swordPos[2] * windupT, d.swordPos[2], s);

  _evalPose.swordRot[0] = THREE.MathUtils.lerp(c.swordRot[0], d.swordRot[0], snapT);
  _evalPose.swordRot[1] = THREE.MathUtils.lerp(c.swordRot[1], d.swordRot[1], snapT);
  _evalPose.swordRot[2] = THREE.MathUtils.lerp(c.swordRot[2], d.swordRot[2], snapT);

  _evalPose.capePitch[0] = THREE.MathUtils.lerp(c.capePitch[0], d.capePitch[0], snapT);
  _evalPose.capePitch[1] = THREE.MathUtils.lerp(c.capePitch[1], d.capePitch[1], snapT);

  _evalFrame.phase = phase;
  _evalFrame.normalizedProgress = clampedP;
  _evalFrame.windupT = windupT;
  _evalFrame.rawStrikeT = rawStrikeT;
  _evalFrame.snapT = snapT;
  _evalFrame.followT = followT;
  _evalFrame.overshoot = overshoot;
  _evalFrame.smearBell = smearBell;
  _evalFrame.glintAlpha = glintAlpha;
  _evalFrame.hopOffsetY = hopOffsetY;
  _evalFrame.spinProgress = spinProgress;
  _evalFrame.spinEase = spinEase;
  // Sekiro feint-cancel rule: players can cancel into Deflect or Dodge during wind-up or after cancelWindowStart
  _evalFrame.canCancelIntoDefense = isWindup || clampedP >= cancelWindowStart;
  _evalFrame.canBufferNextStrike = clampedP >= cancelWindowStart;

  return _evalFrame;
}
