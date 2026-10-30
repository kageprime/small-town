import * as THREE from 'three';
import {
  ActiveStrikeTelemetry,
  CardinalDirection,
  FishingMinigameState,
  NpcDialogState,
  PlayerUpgrades,
} from '../types/vignette';
import { createContactShadowTexture, GothicCourtyardRig } from './buildGothicCourtyard';
import { AttackWeightClass, HitstopImpactEvent } from './cameraShake';
import {
  ARCHETYPE_TO_PRIMARY_STRIKE_ID,
  COMBO_STAGE_TO_STRIKE_ID,
  evaluateStrikeChoreographyFrame,
  STRIKE_CHOREOGRAPHY_REGISTRY,
  StrikeChoreographySpec,
  SwordStrikeArchetype,
  SwordStrikeId,
} from './combatChoreography';
import { SanctuaryCombatAndAtmosphereRig } from './enemySystem';
import { evaluatePolarBlobRadius } from './prng';
import { soundEngine } from './soundEngine';

export interface PlayerController {
  root: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  facingAngle: number;
  isGrounded: boolean;
  isInsideInterior: boolean;
  isInvulnerable: boolean;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  soulEmbers: number;
  upgrades: PlayerUpgrades;
  activeNpcDialog: NpcDialogState | null;
  fishingState: FishingMinigameState;
  lanternLight: THREE.PointLight;
  hitstopTimer: number;
  hitstopImpactEvent: HitstopImpactEvent | null;
  activeStrikeTelemetry: ActiveStrikeTelemetry;
  lastActionToast: string | null;
  clearToast: () => void;
  setToast: (msg: string) => void;
  setHp: (newHp: number) => void;
  setSoulEmbers: (newEmbers: number) => void;
  setScarfRotRatio: (rotPct: number) => void;
  setBloodwageActive: (active: boolean) => void;
  setSummonedEchoVisuals: (
    activeEchoes: { id: string; name: string; fsmState: string }[]
  ) => void;
  triggerRespectBow: (combatRig?: SanctuaryCombatAndAtmosphereRig) => number;
  onEnemyKilled?: (enemy: {
    id: string;
    variantId: string;
    name: string;
    archetype: string;
  }) => void;
  onPlayerDeathIntercept?: (sourceName: string) => boolean;
  onBellRung?: () => void;
  onShrineLit?: () => void;
  onDeflectSuccess?: (parriedCount: number) => void;
  addSoulEmbers: (amount: number) => void;
  takeDamage: (dmg: number, sourceName: string, knockX: number, knockZ: number) => void;
  purchaseUpgrade: (kind: 'sword' | 'lantern' | 'vitality') => void;
  closeNpcDialog: () => void;
  reelFishing: (combatRig?: SanctuaryCombatAndAtmosphereRig) => void;
  teleportTo: (x: number, z: number, getGroundHeight?: (x: number, z: number) => number) => void;
  setSpawnForDirection: (fromDir?: CardinalDirection) => void;
  setMoveTarget: (worldX: number, worldZ: number) => void;
  triggerJump: () => void;
  triggerDodge: () => void;
  triggerDeflect: (
    rig: GothicCourtyardRig,
    combatRig?: SanctuaryCombatAndAtmosphereRig
  ) => void;
  triggerAttack: (
    rig: GothicCourtyardRig,
    combatRig?: SanctuaryCombatAndAtmosphereRig,
    explicitArchetype?: SwordStrikeArchetype
  ) => void;
  triggerInteract: (rig: GothicCourtyardRig, combatRig?: SanctuaryCombatAndAtmosphereRig) => void;
  update: (
    dt: number,
    keys: Set<string>,
    rig: GothicCourtyardRig & { getGroundHeight?: (x: number, z: number) => number },
    cameraAzimuthRad: number,
    isOpenWorld: boolean,
    combatRig?: SanctuaryCombatAndAtmosphereRig,
    timeSec?: number
  ) => {
    triggeredExit: CardinalDirection | null;
    nearbyPrompt: string | null;
  };
  dispose: () => void;
}

const GRAVITY = -24.0;
const JUMP_VELOCITY = 8.6;
const WALK_SPEED = 5.4;
const SPRINT_SPEED = 8.5;
const DEFAULT_GROUND_Y = 0.14;
const PLAYER_RADIUS = 0.42;

/**
 * Builds an articulated, multi-part Gothic Wayfarer hero character model
 * with 60fps fluid procedural animation (two-joint limbs, billowing cloak,
 * wide-brimmed pointed gothic hat/cowl, glowing eyes, swinging chain lantern,
 * steel broadsword with crossguard & fuller, and squash-and-stretch jump physics).
 */
export function createPlayerController(scene: THREE.Scene): PlayerController {
  const root = new THREE.Group();
  root.name = 'WayfarerPlayerRoot';
  scene.add(root);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // 1. Grounded Contact Blob Shadow (tracks exact terrain height y beneath player)
  const shadowTex = createContactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  materials.push(shadowMat);

  const shadowMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.45, 1.45)), shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.085, 0);
  shadowMesh.renderOrder = 2;
  root.add(shadowMesh);

  // 2. Main Character Body Pivot (handles facing rotation, jump elevation, and squash/stretch)
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Curated Gothic Hero Palette (grounded dark-fantasy tones)
  const darkSlateArmorMat = new THREE.MeshLambertMaterial({ color: '#1F2024' });
  const brigandineTunicMat = new THREE.MeshLambertMaterial({ color: '#2E3036' });
  const leatherStrapMat = new THREE.MeshLambertMaterial({ color: '#4A3728' });
  const crimsonCloakMat = new THREE.MeshLambertMaterial({ color: '#6E2D26' });
  const crimsonDarkMat = new THREE.MeshLambertMaterial({ color: '#4D1F1A' });
  const steelPauldronMat = new THREE.MeshLambertMaterial({ color: '#78756E' });
  const bladeSteelMat = new THREE.MeshLambertMaterial({ color: '#C8C3B8' });
  const brassBuckleMat = new THREE.MeshLambertMaterial({ color: '#B89A58' });
  const skinMat = new THREE.MeshLambertMaterial({ color: '#D4C5B0' });
  const eyeGlowMat = new THREE.MeshBasicMaterial({ color: '#E5D099' });
  const lanternCoreMat = new THREE.MeshBasicMaterial({ color: '#E8C574' });
  const lanternFlameMat = new THREE.MeshBasicMaterial({ color: '#C88A3B' });
  const slashTrailMat = new THREE.MeshBasicMaterial({
    color: '#FFFBEB',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const slashEdgeMat = new THREE.MeshBasicMaterial({
    color: '#F97316',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(
    darkSlateArmorMat,
    brigandineTunicMat,
    leatherStrapMat,
    crimsonCloakMat,
    crimsonDarkMat,
    steelPauldronMat,
    bladeSteelMat,
    brassBuckleMat,
    skinMat,
    eyeGlowMat,
    lanternCoreMat,
    lanternFlameMat,
    slashTrailMat,
    slashEdgeMat
  );

  // ==========================================================================
  // ARTICULATED LEGS (Left & Right Hip -> Thigh -> Knee -> Greave + Boot)
  // ==========================================================================
  const buildLeg = (sideSign: number) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(sideSign * 0.15, 0.52, 0);
    bodyPivot.add(hipPivot);

    const thigh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.11, 0.095, 0.28, 7)),
      darkSlateArmorMat
    );
    thigh.position.y = -0.13;
    hipPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.26, 0);
    hipPivot.add(kneePivot);

    const kneeGuard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.11, 0.15)),
      steelPauldronMat
    );
    kneeGuard.position.set(0, 0, 0.03);
    kneePivot.add(kneeGuard);

    const shinBoot = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.095, 0.085, 0.26, 7)),
      leatherStrapMat
    );
    shinBoot.position.y = -0.13;
    kneePivot.add(shinBoot);

    const bootToe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.16, 0.11, 0.26)),
      darkSlateArmorMat
    );
    bootToe.position.set(0, -0.22, 0.05);
    kneePivot.add(bootToe);

    return { hipPivot, kneePivot };
  };

  const leftLegRig = buildLeg(-1);
  const rightLegRig = buildLeg(1);

  // ==========================================================================
  // TORSO, BRIGANDINE COAT, BALDRIC BELT & PAULDRONS
  // ==========================================================================
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 0.52;
  bodyPivot.add(torsoPivot);

  // Split coat tails / lower brigandine skirt
  const coatSkirt = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.24, 0.36, 0.36, 8)),
    brigandineTunicMat
  );
  coatSkirt.position.y = 0.12;
  torsoPivot.add(coatSkirt);

  // Upper armored chest
  const chestMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.29, 0.23, 0.44, 8)),
    darkSlateArmorMat
  );
  chestMesh.position.y = 0.42;
  torsoPivot.add(chestMesh);

  // Leather waist belt + brass buckle + cross-chest baldric
  const beltMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.255, 0.255, 0.09, 8)),
    leatherStrapMat
  );
  beltMesh.position.y = 0.24;
  torsoPivot.add(beltMesh);

  const buckleMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.14, 0.11, 0.08)),
    brassBuckleMat
  );
  buckleMesh.position.set(0, 0.24, 0.24);
  torsoPivot.add(buckleMesh);

  const baldricStrap = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.1, 0.52, 0.34)),
    leatherStrapMat
  );
  baldricStrap.position.set(0, 0.42, 0.02);
  baldricStrap.rotation.z = 0.55;
  torsoPivot.add(baldricStrap);

  // Crimson Wayfarer Scarf + Layered Shoulder Mantle
  const scarfRing = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.28, 0.33, 0.18, 8)),
    crimsonCloakMat
  );
  scarfRing.position.y = 0.62;
  torsoPivot.add(scarfRing);

  // Left & Right Steel Shoulder Pauldrons
  const pauldronGeo = trackGeo(new THREE.SphereGeometry(0.17, 7, 6, 0, Math.PI * 2, 0, Math.PI * 0.6));
  const leftPauldron = new THREE.Mesh(pauldronGeo, steelPauldronMat);
  leftPauldron.position.set(-0.31, 0.56, 0);
  leftPauldron.rotation.z = 0.45;
  torsoPivot.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(pauldronGeo, steelPauldronMat);
  rightPauldron.position.set(0.31, 0.56, 0);
  rightPauldron.rotation.z = -0.45;
  torsoPivot.add(rightPauldron);

  // ==========================================================================
  // BILLOWING MULTI-SEGMENT TRAVELING CLOAK / CAPE (60fps Cloth Wave)
  // ==========================================================================
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.64, -0.16);
  torsoPivot.add(capePivot);

  const capeUpper = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.56, 0.44, 0.07)),
    crimsonCloakMat
  );
  capeUpper.position.set(0, -0.2, -0.04);
  capeUpper.rotation.x = 0.18;
  capePivot.add(capeUpper);

  const capeLowerPivot = new THREE.Group();
  capeLowerPivot.position.set(0, -0.4, -0.08);
  capePivot.add(capeLowerPivot);

  const capeLower = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.64, 0.42, 0.06)),
    crimsonDarkMat
  );
  capeLower.position.set(0, -0.18, -0.03);
  capeLowerPivot.add(capeLower);

  // ==========================================================================
  // SCULPTED HEAD, GLOWING EYES & WIDE-BRIMMED POINTED WAYFARER HAT / COWL
  // ==========================================================================
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.72, 0.02);
  torsoPivot.add(headPivot);

  const headSkull = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(0.19, 1)),
    darkSlateArmorMat
  );
  headSkull.position.y = 0.14;
  headPivot.add(headSkull);

  // Glowing Amber Eyes under the hat shadow
  const eyeGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.035, 0.04));
  const leftEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
  leftEye.position.set(-0.065, 0.14, 0.165);
  headPivot.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeGlowMat);
  rightEye.position.set(0.065, 0.14, 0.165);
  headPivot.add(rightEye);

  // Wide-brimmed Gothic Wayfarer Hat + Pointed Crown
  const hatBrim = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.46, 0.48, 0.045, 10)),
    darkSlateArmorMat
  );
  hatBrim.position.set(0, 0.24, 0.01);
  hatBrim.rotation.x = -0.12;
  headPivot.add(hatBrim);

  const hatBand = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.22, 0.24, 0.07, 8)),
    crimsonCloakMat
  );
  hatBand.position.set(0, 0.28, 0);
  hatBand.rotation.x = -0.12;
  headPivot.add(hatBand);

  const hatCrown = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.23, 0.48, 8)),
    brigandineTunicMat
  );
  hatCrown.position.set(0, 0.5, -0.05);
  hatCrown.rotation.x = -0.32;
  headPivot.add(hatCrown);

  // ==========================================================================
  // LEFT ARM + SWINGING PENDULUM EMBER LANTERN
  // ==========================================================================
  const leftShoulderPivot = new THREE.Group();
  leftShoulderPivot.position.set(-0.34, 0.54, 0.04);
  torsoPivot.add(leftShoulderPivot);

  const leftUpperArm = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.075, 0.065, 0.26, 6)),
    brigandineTunicMat
  );
  leftUpperArm.position.set(0, -0.11, 0.06);
  leftUpperArm.rotation.x = -0.55;
  leftShoulderPivot.add(leftUpperArm);

  const leftForearm = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.065, 0.06, 0.24, 6)),
    leatherStrapMat
  );
  leftForearm.position.set(0, -0.2, 0.22);
  leftForearm.rotation.x = -1.15;
  leftShoulderPivot.add(leftForearm);

  const leftHand = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.065, 6, 6)),
    skinMat
  );
  leftHand.position.set(0, -0.24, 0.34);
  leftShoulderPivot.add(leftHand);

  // Pendulum Lantern Pivot (swings dynamically with acceleration)
  const lanternPendulumPivot = new THREE.Group();
  lanternPendulumPivot.position.set(0, -0.24, 0.36);
  leftShoulderPivot.add(lanternPendulumPivot);

  const lanternChain = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5)),
    steelPauldronMat
  );
  lanternChain.position.y = -0.07;
  lanternPendulumPivot.add(lanternChain);

  const lanternCap = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.14, 0.1, 6)),
    darkSlateArmorMat
  );
  lanternCap.position.y = -0.16;
  lanternPendulumPivot.add(lanternCap);

  const lanternGlass = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.1, 0.08, 0.22, 6)),
    lanternCoreMat
  );
  lanternGlass.position.y = -0.28;
  lanternPendulumPivot.add(lanternGlass);

  const lanternBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.11, 0.12, 0.05, 6)),
    darkSlateArmorMat
  );
  lanternBase.position.y = -0.4;
  lanternPendulumPivot.add(lanternBase);

  const playerLanternLight = new THREE.PointLight('#F59E0B', 1.65, 7.2, 1.7);
  playerLanternLight.position.set(0, -0.25, 0.1);
  lanternPendulumPivot.add(playerLanternLight);

  // ==========================================================================
  // RIGHT ARM + GOTHIC BROADSWORD (Pommel, Grip, Winged Crossguard, Blade)
  // ==========================================================================
  const rightShoulderPivot = new THREE.Group();
  rightShoulderPivot.position.set(0.34, 0.54, 0.04);
  torsoPivot.add(rightShoulderPivot);

  const rightUpperArm = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.07, 0.26, 6)),
    brigandineTunicMat
  );
  rightUpperArm.position.set(0, -0.12, 0.04);
  rightUpperArm.rotation.x = -0.35;
  rightShoulderPivot.add(rightUpperArm);

  const swordHandPivot = new THREE.Group();
  swordHandPivot.position.set(0, -0.22, 0.16);
  rightShoulderPivot.add(swordHandPivot);

  const rightHand = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.07, 6, 6)),
    skinMat
  );
  swordHandPivot.add(rightHand);

  // Detailed Gothic Broadsword Group
  const swordGroup = new THREE.Group();
  swordHandPivot.add(swordGroup);

  const pommel = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.065, 0)),
    brassBuckleMat
  );
  pommel.position.set(0, 0, -0.14);
  swordGroup.add(pommel);

  const grip = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.032, 0.036, 0.24, 6)),
    leatherStrapMat
  );
  grip.rotation.x = Math.PI / 2;
  grip.position.set(0, 0, 0.0);
  swordGroup.add(grip);

  const crossguard = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.34, 0.055, 0.065)),
    brassBuckleMat
  );
  crossguard.position.set(0, 0, 0.13);
  swordGroup.add(crossguard);

  const bladeCore = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.095, 0.028, 0.92)),
    bladeSteelMat
  );
  bladeCore.position.set(0, 0, 0.61);
  swordGroup.add(bladeCore);

  const bladeTip = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.068, 0.24, 4)),
    bladeSteelMat
  );
  bladeTip.rotation.x = Math.PI / 2;
  bladeTip.rotation.z = Math.PI / 4;
  bladeTip.position.set(0, 0, 1.18);
  swordGroup.add(bladeTip);

  // ==========================================================================
  // SEKIRO × BLAZBLUE TAPERED CRESCENT SLASH ARCS, THRUST LANCE & SHOCKWAVE
  // ==========================================================================
  const createTaperedCrescentGeometry = (
    outerRadius: number,
    maxThickness: number,
    sweepRad: number,
    segments = 28
  ): THREE.BufferGeometry => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    const startAng = -sweepRad * 0.5;

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      // Asymmetric BlazBlue smear envelope: razor-thin tail (u=0), wide belly at u=0.68, sharp point at u=1
      const bellyEnv = Math.sin(Math.pow(u, 0.72) * Math.PI);
      const rOut = outerRadius * (0.86 + 0.16 * Math.sin(u * Math.PI));
      const rIn = Math.max(0.22, rOut - maxThickness * bellyEnv);
      const ang = startAng + u * sweepRad;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);

      // Map onto XZ plane with +Z as forward strike center (ang = 0 -> +Z, ang > 0 -> +X)
      positions.push(sinA * rIn, 0, cosA * rIn);
      positions.push(sinA * rOut, 0, cosA * rOut);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return trackGeo(geo);
  };

  const slashEchoMat = new THREE.MeshBasicMaterial({
    color: '#C8B273',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const thrustCoreMat = new THREE.MeshBasicMaterial({
    color: '#FFFBEB',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const thrustEdgeMat = new THREE.MeshBasicMaterial({
    color: '#EA580C',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const shockwaveMat = new THREE.MeshBasicMaterial({
    color: '#F59E0B',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glintMat = new THREE.MeshBasicMaterial({
    color: '#FFFBEB',
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  materials.push(slashEchoMat, thrustCoreMat, thrustEdgeMat, shockwaveMat, glintMat);

  // Anticipation Crossguard Telegraph Glint (flashes on wind-up like Sekiro / BlazBlue)
  const glintStarGroup = new THREE.Group();
  glintStarGroup.position.set(0, 0, 0.16);
  swordGroup.add(glintStarGroup);

  const glintSpikeH = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), glintMat);
  glintSpikeH.scale.set(4.5, 0.55, 0.55);
  glintStarGroup.add(glintSpikeH);

  const glintSpikeV = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), glintMat);
  glintSpikeV.scale.set(0.55, 4.5, 0.55);
  glintStarGroup.add(glintSpikeV);

  // 3D Multi-Plane Crescent Slash Rig (tilts dynamically per combo strike plane)
  const slashGroup = new THREE.Group();
  slashGroup.position.set(0, 0.78, 0.18);
  bodyPivot.add(slashGroup);

  const slashOuter = new THREE.Mesh(
    createTaperedCrescentGeometry(1.78, 0.82, Math.PI * 1.24, 28),
    slashEdgeMat
  );
  slashGroup.add(slashOuter);

  const slashInner = new THREE.Mesh(
    createTaperedCrescentGeometry(1.68, 0.44, Math.PI * 1.14, 28),
    slashTrailMat
  );
  slashInner.position.y = 0.012;
  slashGroup.add(slashInner);

  const slashEcho = new THREE.Mesh(
    createTaperedCrescentGeometry(1.88, 0.24, Math.PI * 1.32, 24),
    slashEchoMat
  );
  slashEcho.position.y = -0.012;
  slashEcho.rotation.y = -0.22;
  slashGroup.add(slashEcho);

  // Strike 3: Piercing Shadowrush Thrust Lance & Vortex Ring
  const thrustLanceGroup = new THREE.Group();
  thrustLanceGroup.position.set(0, 0.76, 0.35);
  thrustLanceGroup.visible = false;
  bodyPivot.add(thrustLanceGroup);

  const thrustOuterCone = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.32, 2.45, 8, 1, true)),
    thrustEdgeMat
  );
  thrustOuterCone.rotation.x = Math.PI / 2;
  thrustOuterCone.position.z = 1.22;
  thrustLanceGroup.add(thrustOuterCone);

  const thrustInnerSpike = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.14, 2.75, 6)),
    thrustCoreMat
  );
  thrustInnerSpike.rotation.x = Math.PI / 2;
  thrustInnerSpike.position.z = 1.38;
  thrustLanceGroup.add(thrustInnerSpike);

  const thrustSonicRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.28, 0.56, 16)),
    slashEchoMat
  );
  thrustSonicRing.position.z = 0.55;
  thrustLanceGroup.add(thrustSonicRing);

  // Strike 4 (Ichimonji Finisher): Ground Cleave Shockwave Ring & Stone-Split Plume
  const cleaveShockwaveGroup = new THREE.Group();
  cleaveShockwaveGroup.position.set(0, 0.06, 1.38);
  cleaveShockwaveGroup.visible = false;
  bodyPivot.add(cleaveShockwaveGroup);

  const cleaveRingOuter = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.45, 0.92, 24)),
    shockwaveMat
  );
  cleaveRingOuter.rotation.x = -Math.PI / 2;
  cleaveShockwaveGroup.add(cleaveRingOuter);

  const cleaveFissureLine = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.16, 0.05, 1.95)),
    thrustCoreMat
  );
  cleaveFissureLine.position.set(0, 0.02, -0.2);
  cleaveShockwaveGroup.add(cleaveFissureLine);

  // Heavy Strike (Combine Wide Cleave): Double-Bellied Horizontal Ember Wake Arc
  const heavyWakeMat = new THREE.MeshBasicMaterial({
    color: '#e5482f',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const deflectSparkMat = new THREE.MeshBasicMaterial({
    color: '#e8a020',
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(heavyWakeMat, deflectSparkMat);

  const heavyWakeGroup = new THREE.Group();
  heavyWakeGroup.position.set(0, 0.68, 0.22);
  heavyWakeGroup.visible = false;
  bodyPivot.add(heavyWakeGroup);

  const heavyWakeOuter = new THREE.Mesh(
    createTaperedCrescentGeometry(2.15, 1.05, Math.PI * 1.48, 30),
    heavyWakeMat
  );
  heavyWakeGroup.add(heavyWakeOuter);

  const heavyWakeRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(1.35, 2.08, 28, 1, -Math.PI * 0.72, Math.PI * 1.44)),
    shockwaveMat
  );
  heavyWakeRing.rotation.x = -Math.PI / 2;
  heavyWakeRing.position.y = -0.02;
  heavyWakeGroup.add(heavyWakeRing);

  // Sekiro Crossguard Deflect / Parry Spark Star & Shockwave Ring
  const deflectSparkGroup = new THREE.Group();
  deflectSparkGroup.position.set(0.08, 0.92, 0.62);
  deflectSparkGroup.visible = false;
  bodyPivot.add(deflectSparkGroup);

  const deflectStarA = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.09, 0)),
    deflectSparkMat
  );
  deflectStarA.scale.set(5.8, 0.65, 0.65);
  deflectSparkGroup.add(deflectStarA);

  const deflectStarB = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.09, 0)),
    deflectSparkMat
  );
  deflectStarB.scale.set(0.65, 5.8, 0.65);
  deflectSparkGroup.add(deflectStarB);

  const deflectRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.28, 0.52, 20)),
    glintMat
  );
  deflectSparkGroup.add(deflectRing);

  // ==========================================================================
  // 3D SUMMONED BOUND ECHO RETAINERS (Bram · Shield, Mercy · Lantern, Hush · Blade)
  // ==========================================================================
  const echoCompanionGroup = new THREE.Group();
  echoCompanionGroup.name = 'BoundEchoCompanions';
  root.add(echoCompanionGroup);

  const echoSpiritMat = new THREE.MeshBasicMaterial({
    color: '#9fd8e8',
    transparent: true,
    opacity: 0.72,
  });
  const echoGoldMat = new THREE.MeshBasicMaterial({
    color: '#e8a020',
    transparent: true,
    opacity: 0.85,
  });
  const echoBloodMat = new THREE.MeshBasicMaterial({
    color: '#e5482f',
    transparent: true,
    opacity: 0.85,
  });
  materials.push(echoSpiritMat, echoGoldMat, echoBloodMat);

  const echoOrbNodes: { group: THREE.Group; core: THREE.Mesh; ring: THREE.Mesh }[] = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.18, 0)),
      i === 0 ? echoSpiritMat : i === 1 ? echoGoldMat : echoBloodMat
    );
    core.position.y = 0.85;
    g.add(core);

    const shroud = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.22, 0.58, 6)),
      echoSpiritMat
    );
    shroud.position.y = 0.45;
    g.add(shroud);

    const ring = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.26, 0.018, 6, 12)),
      echoGoldMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.65;
    g.add(ring);

    echoCompanionGroup.add(g);
    echoOrbNodes.push({ group: g, core, ring });
  }

  let activeSummonedEchoes: { id: string; name: string; fsmState: string }[] = [
    { id: '01', name: 'Bram', fsmState: 'FOLLOW' },
    { id: '02', name: 'Mercy', fsmState: 'FOLLOW' },
    { id: '03', name: 'Hush', fsmState: 'FIGHT' },
  ];

  // ==========================================================================
  // 60FPS KINEMATICS, VITALITY, UPGRADES, FISHING & COMBAT STATE
  // ==========================================================================
  const position = new THREE.Vector3(0.0, DEFAULT_GROUND_Y, 1.25);
  const velocity = new THREE.Vector3(0, 0, 0);
  let facingAngle = Math.PI;
  let isGrounded = true;
  let isInsideInterior = false;
  let walkPhase = 0;
  let prevStrideSin = 0;
  let idleBreathPhase = 0;
  let currentSpeedSmooth = 0;
  let squashStretchY = 1.0;
  let attackTimer = 0;
  let attackDuration = 0.32;
  let activeStrikeId: SwordStrikeId = 'light-kesagiri';
  let activeStrikeSpec: StrikeChoreographySpec = STRIKE_CHOREOGRAPHY_REGISTRY['light-kesagiri'];
  let bowTimer = 0;
  let deflectTimer = 0;
  const DEFLECT_DURATION = 0.28;
  let bloodwageActive = false;
  let comboIndex = 0; // 1: Kesagiri, 2: Rising Fang, 3: Shadowrush Vortex Thrust, 4: Ichimonji Overhead Cleave
  let comboResetTimer = 0;
  let hasTriggeredActiveStrike = false;
  let pendingAttackRig: GothicCourtyardRig | null = null;
  let pendingCombatRig: SanctuaryCombatAndAtmosphereRig | undefined = undefined;
  let dodgeTimer = 0;
  let hurtInvulnTimer = 0;
  let hitstopTimer = 0;
  let hitstopEventSeq = 0;
  let hitstopImpactEvent: HitstopImpactEvent | null = null;
  let lastActionToast: string | null = null;
  let clickTarget: { x: number; z: number } | null = null;

  // RPG Stats & Combine Kit Upgrades
  let hp = 100;
  let maxHp = 100;
  let stamina = 100;
  const maxStamina = 100;
  let soulEmbers = 18; // Starting Unbanked Spire Scrip pockets
  const upgrades: PlayerUpgrades = {
    swordLevel: 1,
    lanternLevel: 1,
    vitalityLevel: 1,
  };

  let activeNpcDialog: NpcDialogState | null = null;

  const FISHING_LOOT_TABLE = [
    { name: 'Waterlogged Combine Ledger', embers: 4 },
    { name: 'Brass Gate-Valve Wheel', embers: 6 },
    { name: 'Sealed Ward-C Breath Ampoule', embers: 9 },
    { name: 'Drowned Carrier Tag #088', embers: 5 },
    { name: 'Gilded Table Assay Ingot', embers: 8 },
  ];

  const fishingState: FishingMinigameState = {
    active: false,
    spotTitle: 'B13 Black-Water Sump Dredge',
    phase: 'waiting',
    bobberProgress: 0,
    lastCatchName: null,
    lastCatchEmbers: 0,
    totalCaught: 0,
  };
  const fishingSpotPos = new THREE.Vector3(16.5, 0.08, 17.5);
  let fishingWaitDuration = 2.4;

  const addSoulEmbers = (amount: number) => {
    soulEmbers += amount;
    lastActionToast = `+${amount} Unbanked Scrip (${soulEmbers} in Coat, +${(amount * 1250).toLocaleString()} toward Wren's Fund)`;
  };

  const setToast = (msg: string) => {
    lastActionToast = msg;
  };

  const setHp = (newHp: number) => {
    hp = Math.max(0, Math.min(maxHp, Math.round(newHp)));
  };

  const setSoulEmbers = (newEmbers: number) => {
    soulEmbers = Math.max(0, Math.round(newEmbers));
  };

  const setScarfRotRatio = (rotPct: number) => {
    // Darkens Joss's crimson scarf toward VESTIGE ink-black as Sync/Rot % climbs past 50..100%
    const t = THREE.MathUtils.clamp((rotPct - 20) / 80, 0, 1);
    const baseColor = new THREE.Color('#6E2D26');
    const rotColor = new THREE.Color('#141114');
    crimsonCloakMat.color.copy(baseColor).lerp(rotColor, t * 0.85);
  };

  const setBloodwageActive = (active: boolean) => {
    bloodwageActive = active;
    slashEdgeMat.color.set(active ? '#e5482f' : '#F97316');
  };

  const setSummonedEchoVisuals = (
    activeEchoes: { id: string; name: string; fsmState: string }[]
  ) => {
    activeSummonedEchoes = activeEchoes;
  };

  const triggerRespectBow = (combatRig?: SanctuaryCombatAndAtmosphereRig): number => {
    bowTimer = 0.75;
    squashStretchY = 0.84;
    const pacified = combatRig
      ? combatRig.stunNearbyPalls(position.x, position.z, 7.5)
      : 0;
    if (pacified > 0) {
      lastActionToast = `Bowed [G] in Respect — ${pacified} Pall Shroud${pacified > 1 ? 's' : ''} pacified for 4s! (+Mercy & Stitch Loyalty)`;
    } else {
      lastActionToast = 'Bowed [G] to the Dead of Floor Zero (+Bound Echo Respect)';
    }
    return pacified;
  };

  const takeDamage = (dmg: number, sourceName: string, knockX: number, knockZ: number) => {
    if (dodgeTimer > 0 || hurtInvulnTimer > 0) return;
    // If Bram (01) is summoned in HOLD-DOOR or FOLLOW, reduce incoming damage by 25%
    const bramActive = activeSummonedEchoes.some(
      (e) => e.id === '01' && e.fsmState !== 'REFUSE'
    );
    const finalDmg = bramActive ? Math.max(1, Math.round(dmg * 0.75)) : dmg;
    hp = Math.max(0, hp - finalDmg);
    hurtInvulnTimer = 0.65;
    hitstopTimer = 0.048;
    hitstopEventSeq += 1;
    hitstopImpactEvent = {
      id: hitstopEventSeq,
      weightClass: 'player-stagger',
      weightMultiplier: 1.9,
      hitstopDuration: 0.048,
      dirX: knockX,
      dirZ: knockZ,
    };
    velocity.x += knockX;
    velocity.z += knockZ;
    squashStretchY = 0.76;
    soundEngine.playImpactShatter();

    if (hp <= 0) {
      if (controllerApi.onPlayerDeathIntercept && controllerApi.onPlayerDeathIntercept(sourceName)) {
        // Intercepted by VESTIGE's Memory Tithe modal!
        hp = 1;
        hurtInvulnTimer = 2.5;
        velocity.set(0, 0, 0);
        lastActionToast = `FATAL BLOW FROM ${sourceName.toUpperCase()} — VESTIGE OFFERS THE MEMORY TITHE`;
        return;
      }
      hp = maxHp;
      position.set(0, DEFAULT_GROUND_Y, 1.5);
      velocity.set(0, 0, 0);
      lastActionToast = `Fell to ${sourceName} — Dragged back to The Hold Muster Beacon!`;
    } else {
      lastActionToast = bramActive
        ? `Bram's Shield absorbed impact from ${sourceName} (-${finalDmg} HP)`
        : `Struck by ${sourceName} (-${finalDmg} HP)`;
    }
  };

  const purchaseUpgrade = (kind: 'sword' | 'lantern' | 'vitality') => {
    const cost =
      kind === 'sword'
        ? upgrades.swordLevel * 4
        : kind === 'lantern'
        ? upgrades.lanternLevel * 4
        : upgrades.vitalityLevel * 3;

    if (soulEmbers < cost) {
      lastActionToast = `Need ${cost} Unbanked Scrip Pockets (Have ${soulEmbers})`;
      return;
    }

    soulEmbers -= cost;
    soundEngine.playEmberCollect();

    if (kind === 'sword') {
      upgrades.swordLevel += 1;
      const arcScale = 1 + (upgrades.swordLevel - 1) * 0.16;
      slashGroup.scale.set(arcScale, 1, arcScale);
      lastActionToast = `Combine Cleaver Tempered Lv.${upgrades.swordLevel}! (+Damage & Cleave Reach)`;
    } else if (kind === 'lantern') {
      upgrades.lanternLevel += 1;
      playerLanternLight.distance = 7.2 + (upgrades.lanternLevel - 1) * 3.5;
      lastActionToast = `Mercy's Tally-Lamp Lv.${upgrades.lanternLevel}! (+Light Radius & Scrip Pull)`;
    } else {
      upgrades.vitalityLevel += 1;
      maxHp += 25;
      hp = maxHp;
      lastActionToast = `Doc Sable's Breath-Rig Lv.${upgrades.vitalityLevel}! (Full Heal & ${maxHp} Max HP)`;
    }
  };

  const closeNpcDialog = () => {
    activeNpcDialog = null;
  };

  const reelFishing = (combatRig?: SanctuaryCombatAndAtmosphereRig) => {
    if (!fishingState.active) return;
    if (fishingState.phase === 'bite') {
      const catchItem =
        FISHING_LOOT_TABLE[Math.floor(Math.random() * FISHING_LOOT_TABLE.length)];
      fishingState.phase = 'caught';
      fishingState.lastCatchName = catchItem.name;
      fishingState.lastCatchEmbers = catchItem.embers;
      fishingState.totalCaught += 1;
      fishingState.active = false;
      soulEmbers += catchItem.embers;
      soundEngine.playFishingCue('catch');
      if (combatRig) {
        combatRig.spawnSoulEmbers(
          fishingSpotPos.x,
          position.y + 0.4,
          fishingSpotPos.z,
          catchItem.embers,
          1
        );
      }
      lastActionToast = `Dredged ${catchItem.name}! (+${catchItem.embers} Scrip Pockets)`;
    } else {
      fishingState.phase = 'escaped';
      fishingState.active = false;
      lastActionToast = 'Hauled dredge-hook too early — salvage slipped back into the Sump!';
    }
  };

  const teleportTo = (
    x: number,
    z: number,
    getGroundHeight?: (x: number, z: number) => number
  ) => {
    const gy = getGroundHeight ? getGroundHeight(x, z) : DEFAULT_GROUND_Y;
    position.set(x, gy, z);
    velocity.set(0, 0, 0);
    clickTarget = null;
    fishingState.active = false;
    activeNpcDialog = null;
    isGrounded = true;
    root.position.set(x, 0, z);
    bodyPivot.position.y = gy;
    shadowMesh.position.y = gy + 0.015;
  };

  const setSpawnForDirection = (fromDir?: CardinalDirection) => {
    velocity.set(0, 0, 0);
    clickTarget = null;
    fishingState.active = false;
    activeNpcDialog = null;
    isGrounded = true;
    if (fromDir === 'N') {
      position.set(0.0, DEFAULT_GROUND_Y, 5.65);
      facingAngle = Math.PI;
    } else if (fromDir === 'S') {
      position.set(-1.1, DEFAULT_GROUND_Y, -3.55);
      facingAngle = 0;
    } else if (fromDir === 'E') {
      position.set(-5.85, DEFAULT_GROUND_Y, 0.0);
      facingAngle = Math.PI / 2;
    } else if (fromDir === 'W') {
      position.set(4.15, DEFAULT_GROUND_Y, 4.05);
      facingAngle = -Math.PI / 2;
    } else {
      position.set(0.0, DEFAULT_GROUND_Y, 1.25);
      facingAngle = Math.PI;
    }
  };

  const setMoveTarget = (worldX: number, worldZ: number) => {
    clickTarget = { x: worldX, z: worldZ };
  };

  const triggerJump = () => {
    if (isGrounded) {
      velocity.y = JUMP_VELOCITY;
      isGrounded = false;
      squashStretchY = 1.24;
      soundEngine.playFootstep('stone');
    }
  };

  const resetAllSmearVisuals = () => {
    slashGroup.visible = false;
    heavyWakeGroup.visible = false;
    thrustLanceGroup.visible = false;
    cleaveShockwaveGroup.visible = false;
    slashTrailMat.opacity = 0;
    slashEdgeMat.opacity = 0;
    slashEchoMat.opacity = 0;
    heavyWakeMat.opacity = 0;
    thrustCoreMat.opacity = 0;
    thrustEdgeMat.opacity = 0;
    shockwaveMat.opacity = 0;
    glintMat.opacity = 0;
  };

  const triggerDodge = () => {
    if (dodgeTimer > 0 || stamina < 22) return;
    // Sekiro feint-cancel gate: allow dodging out of wind-up or late recovery
    if (attackTimer > 0) {
      const p = THREE.MathUtils.clamp(1.0 - attackTimer / attackDuration, 0, 1);
      const canCancel = p < activeStrikeSpec.windupEnd || p >= activeStrikeSpec.cancelWindowStart;
      if (!canCancel) return;
      attackTimer = 0;
      hasTriggeredActiveStrike = false;
      resetAllSmearVisuals();
    }
    deflectTimer = 0;
    deflectSparkGroup.visible = false;
    stamina = Math.max(0, stamina - 25);
    dodgeTimer = 0.34;
    fishingState.active = false;
    activeNpcDialog = null;
    clickTarget = null;
    const burstSpeed = 12.8;
    velocity.x = Math.sin(facingAngle) * burstSpeed;
    velocity.z = Math.cos(facingAngle) * burstSpeed;
    squashStretchY = 0.82;
    soundEngine.playDodgeRoll();
    lastActionToast = 'Shadowstep Evade! (Feint-Cancel / I-Frames Active)';
  };

  const triggerDeflect = (
    rig: GothicCourtyardRig,
    combatRig?: SanctuaryCombatAndAtmosphereRig
  ) => {
    if (deflectTimer > DEFLECT_DURATION * 0.55) return;
    // Sekiro feint-cancel rule: cancel any active wind-up or recovery frame into instant Crossguard Deflect
    if (attackTimer > 0) {
      const p = THREE.MathUtils.clamp(1.0 - attackTimer / attackDuration, 0, 1);
      const canCancel = p < activeStrikeSpec.windupEnd || p >= activeStrikeSpec.cancelWindowStart;
      if (!canCancel) return;
      attackTimer = 0;
      hasTriggeredActiveStrike = false;
      resetAllSmearVisuals();
    }

    deflectTimer = DEFLECT_DURATION;
    hurtInvulnTimer = Math.max(hurtInvulnTimer, DEFLECT_DURATION);
    squashStretchY = 0.91;
    clickTarget = null;

    let parriedCount = 0;
    let parriedNames: string[] = [];
    if (combatRig) {
      const res = combatRig.parryEnemyStrikesInRadius(
        position.x,
        position.z,
        2.75,
        rig.spawnShatterDebris
      );
      parriedCount = res.parriedCount;
      parriedNames = res.parriedNames;
    }

    if (parriedCount > 0) {
      soundEngine.playDeflectParry(true);
      stamina = Math.min(maxStamina, stamina + 18);
      hitstopTimer = 0.058;
      hitstopEventSeq += 1;
      hitstopImpactEvent = {
        id: hitstopEventSeq,
        weightClass: 'cross-slash',
        weightMultiplier: 1.75,
        hitstopDuration: 0.058,
        dirX: Math.sin(facingAngle),
        dirZ: Math.cos(facingAngle),
      };
      if (controllerApi.onDeflectSuccess) {
        controllerApi.onDeflectSuccess(parriedCount);
      }
      lastActionToast = `SEKIRO DEFLECT [K]! Parried ${parriedNames[0]} — Posture Staggered (2.6s)!`;
    } else {
      soundEngine.playDeflectParry(false);
      lastActionToast = 'Crossguard Deflect Stance [K] — Timed Parry Window Active (280ms)';
    }
  };

  const executeActiveStrikeHitbox = (
    rig: GothicCourtyardRig,
    combatRig?: SanctuaryCombatAndAtmosphereRig
  ) => {
    const spec = activeStrikeSpec;
    // Forward step-in momentum lunge on the active snap frame (Sekiro kinetic weight transfer)
    velocity.x = Math.sin(facingAngle) * spec.lungeSpeed;
    velocity.z = Math.cos(facingAngle) * spec.lungeSpeed;
    squashStretchY = spec.impactSquashY;

    const baseReach = 1.9 + (upgrades.swordLevel - 1) * 0.25;
    const reach = baseReach + spec.reachBonus;
    const damageMultiplier = spec.damageMultiplier * (bloodwageActive ? 1.65 : 1.0);
    const damage = Math.max(1, Math.round(upgrades.swordLevel * damageMultiplier));
    const hitX = position.x + Math.sin(facingAngle) * spec.hitOffset;
    const hitZ = position.z + Math.cos(facingAngle) * spec.hitOffset;

    // On Overhead Ichimonji or Heavy Cleave, kick up stone / ember sparks on active delivery
    if (spec.usesOverheadShockwave || spec.usesHeavyEmberWake) {
      rig.spawnShatterDebris(
        hitX,
        position.y + 0.05,
        hitZ,
        spec.usesOverheadShockwave ? '#e8a020' : '#e5482f'
      );
    }

    let relicHits = 0;
    rig.destructibles.forEach((d) => {
      if (d.isBroken) return;
      const dist = Math.hypot(d.x - hitX, d.z - hitZ);
      if (dist <= reach) {
        d.isBroken = true;
        d.mesh.visible = false;
        rig.spawnShatterDebris(d.x, position.y, d.z, d.shardColor);
        if (combatRig) {
          combatRig.spawnSoulEmbers(d.x, position.y, d.z, 2, 1);
        }
        relicHits++;
      }
    });

    let enemyHits = 0;
    let killedNames: string[] = [];
    let bonusDropTriggered = false;
    const postureStunSec =
      spec.archetype === 'overhead'
        ? 1.45
        : spec.archetype === 'heavy'
          ? 1.15
          : spec.archetype === 'thrust'
            ? 0.75
            : 0.32;
    const knockbackSpeed =
      spec.archetype === 'thrust'
        ? 8.4
        : spec.archetype === 'heavy'
          ? 7.6
          : spec.archetype === 'overhead'
            ? 7.2
            : 5.4;

    if (combatRig) {
      const res = combatRig.damageEnemiesInArc(
        hitX,
        hitZ,
        reach,
        damage,
        position.x,
        position.z,
        rig.spawnShatterDebris,
        postureStunSec,
        knockbackSpeed
      );
      enemyHits = res.hitCount;
      killedNames = res.killedNames;
      bonusDropTriggered = res.bonusDropTriggered;
      if (res.killedEnemies.length > 0 && controllerApi.onEnemyKilled) {
        controllerApi.onEnemyKilled(res.killedEnemies[0]);
      }
    }

    if (relicHits > 0 || enemyHits > 0) {
      const isFinisher = killedNames.length > 0;
      const weightClass: AttackWeightClass = isFinisher
        ? 'finisher-strike'
        : spec.weightClass;

      const baseComboWeight = isFinisher ? 2.55 : spec.baseWeightMultiplier;
      const swordWeightBonus = (upgrades.swordLevel - 1) * 0.22;
      const multiTargetBonus = Math.min(0.45, (relicHits + enemyHits - 1) * 0.18);
      const totalWeight = Number(
        (baseComboWeight + swordWeightBonus + multiTargetBonus).toFixed(2)
      );

      // Authentic Sekiro / BlazBlue frame-freeze hitstop on active blade connection
      hitstopTimer = isFinisher ? 0.095 : spec.hitstopDurationSec;
      hitstopEventSeq += 1;
      hitstopImpactEvent = {
        id: hitstopEventSeq,
        weightClass,
        weightMultiplier: totalWeight,
        hitstopDuration: hitstopTimer,
        dirX: Math.sin(facingAngle),
        dirZ: Math.cos(facingAngle),
      };

      soundEngine.playImpactShatter();
      if (killedNames.length > 0) {
        lastActionToast = bonusDropTriggered
          ? `Felled ${killedNames[0]} with ${spec.name}! (73% BIND Ready · Bonus Scrip!)`
          : `Felled ${killedNames[0]} with ${spec.name}! (73% BIND Ready · ${totalWeight}× Impact)`;
      } else if (enemyHits > 0) {
        lastActionToast = `${spec.name} (${damage} DMG · +${spec.postureDamage} Posture${bloodwageActive ? ' · BLOODWAGE' : ''} · ${Math.round(hitstopTimer * 1000)}ms Hitstop)`;
      } else {
        lastActionToast =
          relicHits > 1
            ? `${spec.name} — Cleaved ${relicHits} Relics! (${totalWeight}× Hitstop)`
            : `${spec.name} — Shattered Relic! (${totalWeight}× Hitstop)`;
      }
    }
  };

  const triggerAttack = (
    rig: GothicCourtyardRig,
    combatRig?: SanctuaryCombatAndAtmosphereRig,
    explicitArchetype?: SwordStrikeArchetype
  ) => {
    if (fishingState.active) {
      reelFishing(combatRig);
      return;
    }

    // Check Sekiro / BlazBlue combo cancel window during an active swing
    if (attackTimer > 0) {
      const p = THREE.MathUtils.clamp(1.0 - attackTimer / attackDuration, 0, 1);
      if (p < activeStrikeSpec.cancelWindowStart) {
        return;
      }
    }

    deflectTimer = 0;
    deflectSparkGroup.visible = false;

    if (explicitArchetype) {
      if (explicitArchetype === 'light') {
        // Alternate between Light 1 (Kesagiri) and Light 2 (Rising Fang) when spamming Light
        if (
          comboResetTimer > 0 &&
          activeStrikeId === 'light-kesagiri'
        ) {
          activeStrikeId = 'light-rising';
          comboIndex = 2;
        } else {
          activeStrikeId = 'light-kesagiri';
          comboIndex = 1;
        }
      } else {
        activeStrikeId = ARCHETYPE_TO_PRIMARY_STRIKE_ID[explicitArchetype];
        comboIndex = STRIKE_CHOREOGRAPHY_REGISTRY[activeStrikeId].comboSlot;
      }
    } else {
      if (comboResetTimer <= 0) {
        comboIndex = 1;
      } else {
        comboIndex = (comboIndex % 4) + 1;
      }
      activeStrikeId = COMBO_STAGE_TO_STRIKE_ID[comboIndex] || 'light-kesagiri';
    }

    activeStrikeSpec = STRIKE_CHOREOGRAPHY_REGISTRY[activeStrikeId];
    attackDuration = activeStrikeSpec.durationSec;
    attackTimer = attackDuration;
    comboResetTimer = 1.25;
    hasTriggeredActiveStrike = false;
    pendingAttackRig = rig;
    pendingCombatRig = combatRig;
    clickTarget = null;

    // Distinct anticipation squash/stretch silhouette per strike spec
    squashStretchY = activeStrikeSpec.anticipationSquashY;
    soundEngine.playSwordSwingById(activeStrikeId);
  };

  const triggerInteract = (
    rig: GothicCourtyardRig,
    combatRig?: SanctuaryCombatAndAtmosphereRig
  ) => {
    if (fishingState.active) {
      reelFishing(combatRig);
      return;
    }

    let closest: (typeof rig.interactables)[0] | null = null;
    let bestDist = Infinity;
    for (const item of rig.interactables) {
      const d = Math.hypot(item.x - position.x, item.z - position.z);
      if (d <= item.radius && d < bestDist) {
        bestDist = d;
        closest = item;
      }
    }
    if (!closest) return;

    squashStretchY = 1.12;

    if (closest.type === 'npc' && closest.npcDialog) {
      activeNpcDialog = closest.npcDialog;
      lastActionToast = `Speaking with ${closest.npcDialog.name}`;
      return;
    }

    if (closest.type === 'fishing') {
      activeNpcDialog = null;
      fishingState.active = true;
      fishingState.spotTitle = closest.id.includes('fen')
        ? 'B13 Sump Dredge-Line'
        : 'Lower Hold Sluice Jetty';
      fishingState.phase = 'waiting';
      fishingState.bobberProgress = 0;
      fishingWaitDuration = 1.8 + Math.random() * 1.6;
      fishingSpotPos.set(
        closest.x + Math.sin(facingAngle) * 2.2,
        0.08,
        closest.z + Math.cos(facingAngle) * 2.2
      );
      soundEngine.playFishingCue('cast');
      lastActionToast = 'Dropped dredge-hook into the B13 Sump — Wait for salvage tension!';
      return;
    }

    const msg = closest.activate();
    lastActionToast = msg;

    if (closest.type === 'bell') {
      soundEngine.playBellToll();
      if (controllerApi.onBellRung) {
        controllerApi.onBellRung();
      }
    } else if (closest.type === 'brazier') {
      soundEngine.playBrazierIgnite(closest.isActivated);
      if (closest.isActivated && controllerApi.onShrineLit) {
        controllerApi.onShrineLit();
      }
    } else if (closest.type === 'chest' && closest.isActivated && combatRig) {
      combatRig.spawnSoulEmbers(closest.x, position.y + 0.3, closest.z, 5, 2);
      soundEngine.playEmberCollect();
    }
  };

  const update = (
    dt: number,
    keys: Set<string>,
    rig: GothicCourtyardRig & { getGroundHeight?: (x: number, z: number) => number },
    cameraAzimuthRad: number,
    isOpenWorld: boolean,
    combatRig?: SanctuaryCombatAndAtmosphereRig,
    timeSec = 0
  ) => {
    // Sekiro / BlazBlue Hitstop Freeze: holds current keyframe & blazes active smear arc
    if (hitstopTimer > 0) {
      hitstopTimer = Math.max(0, hitstopTimer - dt);
      slashTrailMat.opacity = 0.98;
      slashEdgeMat.opacity = 0.92;
      slashEchoMat.opacity = 0.65;
      return { triggeredExit: null, nearbyPrompt: null };
    }

    if (comboResetTimer > 0) {
      comboResetTimer = Math.max(0, comboResetTimer - dt);
    }
    if (dodgeTimer > 0) {
      dodgeTimer = Math.max(0, dodgeTimer - dt);
    }
    if (hurtInvulnTimer > 0) {
      hurtInvulnTimer = Math.max(0, hurtInvulnTimer - dt);
    }

    // Regenerate Stamina
    stamina = Math.min(maxStamina, stamina + 24.0 * dt);

    rig.stepDebrisPhysics(dt);
    idleBreathPhase += dt * 3.2;

    // Update Active Fishing Minigame Timer
    if (fishingState.active) {
      fishingState.bobberProgress += dt;
      if (
        fishingState.phase === 'waiting' &&
        fishingState.bobberProgress >= fishingWaitDuration
      ) {
        fishingState.phase = 'bite';
        fishingState.bobberProgress = 0;
        soundEngine.playFishingCue('bite');
        lastActionToast = 'BITE! Press [E] or Left-Click NOW to Reel In!';
      } else if (fishingState.phase === 'bite' && fishingState.bobberProgress >= 1.35) {
        fishingState.phase = 'escaped';
        fishingState.active = false;
        lastActionToast = 'Too slow — the Fen catch escaped!';
      }
    }

    if (combatRig) {
      combatRig.setFishingBobberState(
        fishingState.active,
        position.x,
        position.y,
        position.z,
        fishingSpotPos.x,
        fishingSpotPos.y,
        fishingSpotPos.z,
        fishingState.phase === 'bite',
        timeSec
      );
    }

    // 1. Read WASD / Arrow Keys in Camera-Aligned Basis
    let inputRight = 0;
    let inputUp = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) inputUp += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) inputUp -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) inputRight += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) inputRight -= 1;

    const isSprinting =
      (keys.has('ShiftLeft') || keys.has('ShiftRight')) && stamina > 5;
    if (isSprinting && (inputRight !== 0 || inputUp !== 0)) {
      stamina = Math.max(0, stamina - 14.0 * dt);
    }
    const targetMaxSpeed = isSprinting ? SPRINT_SPEED : WALK_SPEED;

    let moveX = 0;
    let moveZ = 0;

    if (inputRight !== 0 || inputUp !== 0) {
      clickTarget = null;
      if (fishingState.active) {
        fishingState.active = false;
      }
      if (activeNpcDialog && Math.hypot(velocity.x, velocity.z) > 1.8) {
        activeNpcDialog = null;
      }
      const fwdX = -Math.sin(cameraAzimuthRad);
      const fwdZ = -Math.cos(cameraAzimuthRad);
      const rightX = Math.cos(cameraAzimuthRad);
      const rightZ = -Math.sin(cameraAzimuthRad);

      moveX = inputRight * rightX + inputUp * fwdX;
      moveZ = inputRight * rightZ + inputUp * fwdZ;
      const len = Math.hypot(moveX, moveZ);
      if (len > 0.001) {
        moveX /= len;
        moveZ /= len;
      }
    } else if (clickTarget) {
      const dx = clickTarget.x - position.x;
      const dz = clickTarget.z - position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.25) {
        clickTarget = null;
      } else {
        moveX = dx / dist;
        moveZ = dz / dist;
      }
    }

    // Smooth 60fps velocity acceleration & deceleration damping (preserve lunge burst during dodge or active attack snap)
    if (dodgeTimer <= 0 && attackTimer <= attackDuration * 0.45) {
      const accelBlend = 1.0 - Math.exp(-18.0 * dt);
      velocity.x += (moveX * targetMaxSpeed - velocity.x) * accelBlend;
      velocity.z += (moveZ * targetMaxSpeed - velocity.z) * accelBlend;
    } else if (attackTimer > 0) {
      // Decelerate step-in lunge smoothly during follow-through
      const lungeDrag = Math.exp(-10.0 * dt);
      velocity.x *= lungeDrag;
      velocity.z *= lungeDrag;
    }

    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    currentSpeedSmooth += (horizontalSpeed - currentSpeedSmooth) * (1.0 - Math.exp(-14.0 * dt));

    if (horizontalSpeed > 0.25 && attackTimer <= 0) {
      const targetAngle = Math.atan2(velocity.x, velocity.z);
      let diff = targetAngle - facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facingAngle += diff * (1.0 - Math.exp(-18.0 * dt));
      walkPhase += dt * (2.2 + horizontalSpeed * 1.45);

      // Trigger surface-aware footstep SFX on stride zero-crossings
      const currStrideSin = Math.sin(walkPhase);
      if (
        isGrounded &&
        dodgeTimer <= 0 &&
        ((prevStrideSin <= 0 && currStrideSin > 0) ||
          (prevStrideSin >= 0 && currStrideSin < 0))
      ) {
        const surface: 'stone' | 'wood' | 'water' =
          position.x > 6 && position.z > 6
            ? position.y > 0.26
              ? 'wood'
              : 'water'
            : 'stone';
        soundEngine.playFootstep(surface);
      }
      prevStrideSin = currStrideSin;
    }

    // 2. Terrain Height & Gravity Kinematics
    const nextX = position.x + velocity.x * dt;
    const nextZ = position.z + velocity.z * dt;
    const nextFloorY = rig.getGroundHeight
      ? rig.getGroundHeight(nextX, nextZ)
      : DEFAULT_GROUND_Y;

    if (nextFloorY - position.y <= 0.48) {
      position.x = nextX;
      position.z = nextZ;
    }

    const groundBeneath = rig.getGroundHeight
      ? rig.getGroundHeight(position.x, position.z)
      : DEFAULT_GROUND_Y;

    const wasGrounded = isGrounded;
    if (isGrounded && Math.abs(groundBeneath - position.y) <= 0.42) {
      position.y = groundBeneath;
      velocity.y = 0;
    } else {
      isGrounded = false;
      velocity.y += GRAVITY * dt;
      position.y += velocity.y * dt;
      if (position.y <= groundBeneath) {
        position.y = groundBeneath;
        velocity.y = 0;
        isGrounded = true;
        if (!wasGrounded) {
          squashStretchY = 0.78;
          soundEngine.playFootstep('stone');
        }
      }
    }

    // Check if player is underneath an overhanging interior roof (Guildhall, Conservatory, or Cutout Gatehouse)
    const inGatehouseInterior =
      !isOpenWorld && Math.abs(position.x - -1.1) < 3.4 && Math.abs(position.z - -4.8) < 2.3;
    const inGuildhallInterior =
      isOpenWorld && Math.abs(position.x - -7.5) < 3.4 && Math.abs(position.z - -3.2) < 2.4;
    const inConservatoryInterior =
      isOpenWorld && Math.abs(position.x - 7.4) < 3.1 && Math.abs(position.z - -14.5) < 2.2;
    isInsideInterior = inGatehouseInterior || inGuildhallInterior || inConservatoryInterior;

    // Recover squash & stretch smoothly at 60fps
    squashStretchY += (1.0 - squashStretchY) * (1.0 - Math.exp(-16.0 * dt));

    // 3. Circle Collision Against Props & Intact Destructibles
    for (const col of rig.colliders) {
      const dx = position.x - col.x;
      const dz = position.z - col.z;
      const dist = Math.hypot(dx, dz);
      const minDist = PLAYER_RADIUS + col.radius;
      if (dist < minDist && dist > 0.0001) {
        const push = minDist - dist;
        position.x += (dx / dist) * push;
        position.z += (dz / dist) * push;
      }
    }

    for (const dest of rig.destructibles) {
      if (dest.isBroken) continue;
      const dx = position.x - dest.x;
      const dz = position.z - dest.z;
      const dist = Math.hypot(dx, dz);
      const minDist = PLAYER_RADIUS + dest.radius * 0.75;
      if (dist < minDist && dist > 0.0001) {
        const push = minDist - dist;
        position.x += (dx / dist) * push;
        position.z += (dz / dist) * push;
      }
    }

    let triggeredExit: CardinalDirection | null = null;
    if (!isOpenWorld) {
      for (const exit of rig.exits) {
        const d = Math.hypot(position.x - exit.x, position.z - exit.z);
        if (d < exit.radius) {
          if (exit.requiresGateOpen) {
            const gateProp = rig.interactables.find((i) => i.type === 'gate');
            if (gateProp && !gateProp.isActivated) {
              continue;
            }
          }
          triggeredExit = exit.dir;
          break;
        }
      }

      const theta = Math.atan2(position.z / 0.96, position.x / 1.04);
      let maxPolarRadius = evaluatePolarBlobRadius(
        theta,
        rig.plateBaseRadius - 0.65,
        rig.plateSeedOffset,
        0.075
      );
      if (position.x > 2.5 && position.z > 2.5) {
        maxPolarRadius += 1.45;
      }
      const currentRadial = Math.hypot(position.x / 1.04, position.z / 0.96);
      if (currentRadial > maxPolarRadius && !triggeredExit) {
        const clampRatio = maxPolarRadius / currentRadial;
        position.x *= clampRatio;
        position.z *= clampRatio;
      }
    } else {
      const radial = Math.hypot(position.x, position.z);
      if (radial > 46.0) {
        position.x *= 46.0 / radial;
        position.z *= 46.0 / radial;
      }
    }

    let nearbyPrompt: string | null = null;
    if (fishingState.active) {
      nearbyPrompt =
        fishingState.phase === 'bite'
          ? 'BITE! Press [E] or Left-Click to Reel In!'
          : 'Fishing... Wait for bobber bite ([E] to cancel)';
    } else {
      let bestPromptDist = Infinity;
      for (const item of rig.interactables) {
        const d = Math.hypot(item.x - position.x, item.z - position.z);
        if (d <= item.radius && d < bestPromptDist) {
          bestPromptDist = d;
          nearbyPrompt = item.getPrompt();
        }
      }
    }

    // ==========================================================================
    // 4. FLUID 60FPS PROCEDURAL CHARACTER & SEKIRO × BLAZBLUE COMBAT ANIMATION
    // ==========================================================================
    root.position.set(position.x, 0, position.z);
    bodyPivot.rotation.y = facingAngle;

    const speedRatio = THREE.MathUtils.clamp(currentSpeedSmooth / SPRINT_SPEED, 0, 1);
    const strideAmp = THREE.MathUtils.clamp(currentSpeedSmooth / WALK_SPEED, 0, 1.25);

    const leftSwing = Math.sin(walkPhase) * 0.68 * strideAmp;
    const rightSwing = -Math.sin(walkPhase) * 0.68 * strideAmp;

    if (isGrounded) {
      leftLegRig.hipPivot.rotation.x = leftSwing;
      rightLegRig.hipPivot.rotation.x = rightSwing;
      leftLegRig.kneePivot.rotation.x = Math.max(0, -Math.cos(walkPhase) * 0.65 * strideAmp);
      rightLegRig.kneePivot.rotation.x = Math.max(0, Math.cos(walkPhase) * 0.65 * strideAmp);
    } else {
      leftLegRig.hipPivot.rotation.x = -0.45;
      leftLegRig.kneePivot.rotation.x = 0.65;
      rightLegRig.hipPivot.rotation.x = 0.35;
      rightLegRig.kneePivot.rotation.x = 0.45;
    }

    const strideBounce = isGrounded
      ? Math.abs(Math.sin(walkPhase)) * 0.075 * strideAmp
      : 0;
    const breathOffset = Math.sin(idleBreathPhase) * 0.015;
    bodyPivot.position.y = position.y + strideBounce;

    const invSquash = 1.0 / Math.sqrt(squashStretchY);
    bodyPivot.scale.set(invSquash, squashStretchY, invSquash);

    // Default Torso, Cape, Head & Left Arm before Combat Override
    if (dodgeTimer > 0) {
      const dodgeProgress = 1.0 - dodgeTimer / 0.34;
      torsoPivot.rotation.x = dodgeProgress * Math.PI * 2.0;
      torsoPivot.rotation.y = 0;
      torsoPivot.rotation.z = 0;
    } else if (bowTimer > 0) {
      bowTimer = Math.max(0, bowTimer - dt);
      const bowEnv = Math.sin((bowTimer / 0.75) * Math.PI);
      torsoPivot.rotation.x = bowEnv * 0.78;
      torsoPivot.rotation.y = 0;
      torsoPivot.rotation.z = 0;
    } else {
      torsoPivot.rotation.x = speedRatio * 0.22 + breathOffset;
      torsoPivot.rotation.y = Math.cos(walkPhase) * 0.08 * strideAmp;
      torsoPivot.rotation.z = 0;
    }

    headPivot.rotation.x =
      bowTimer > 0
        ? 0.45
        : -speedRatio * 0.12 + Math.sin(idleBreathPhase * 0.8) * 0.03;
    headPivot.rotation.y = 0;

    // Update Orbiting 3D Bound Echo Retainers (Bram, Mercy, Hush)
    for (let i = 0; i < echoOrbNodes.length; i++) {
      const node = echoOrbNodes[i];
      const echoMeta = activeSummonedEchoes[i];
      if (!echoMeta) {
        node.group.visible = false;
        continue;
      }
      node.group.visible = true;
      const baseAng =
        facingAngle + Math.PI + (i - 1) * 0.95 + Math.sin(timeSec * 1.4 + i) * 0.22;
      const dist =
        echoMeta.fsmState === 'HOLD-DOOR'
          ? 0.85
          : echoMeta.fsmState === 'FIGHT' && attackTimer > 0
            ? 1.65
            : 1.25;
      const ox = Math.sin(baseAng) * dist;
      const oz = Math.cos(baseAng) * dist;
      const oy = position.y + Math.sin(timeSec * 3.2 + i * 1.7) * 0.09;
      node.group.position.set(ox, oy, oz);
      node.core.rotation.y = timeSec * 2.4 + i;
      node.ring.rotation.z = timeSec * 1.8 - i;
    }

    const fallLift = THREE.MathUtils.clamp(-velocity.y * 0.06, -0.15, 0.55);
    capePivot.rotation.x =
      0.16 + speedRatio * 0.58 + fallLift + Math.sin(walkPhase * 2) * 0.08 * strideAmp;
    capeLowerPivot.rotation.x =
      0.12 + speedRatio * 0.35 + Math.cos(walkPhase * 2 - 0.8) * 0.16 * strideAmp;

    leftShoulderPivot.rotation.set(-leftSwing * 0.45, 0, 0);
    lanternPendulumPivot.rotation.x =
      speedRatio * 0.28 + Math.sin(walkPhase * 2) * 0.18 * strideAmp;
    lanternPendulumPivot.rotation.z = Math.cos(walkPhase) * 0.14 * strideAmp;

    if (deflectTimer > 0) {
      deflectTimer = Math.max(0, deflectTimer - dt);
    }

    if (attackTimer > 0) {
      attackTimer = Math.max(0, attackTimer - dt);
      const p = THREE.MathUtils.clamp(1.0 - attackTimer / attackDuration, 0, 1);
      const arcScale = 1 + (upgrades.swordLevel - 1) * 0.16;
      const spec = activeStrikeSpec;

      if (!hasTriggeredActiveStrike && p >= spec.windupEnd && pendingAttackRig) {
        hasTriggeredActiveStrike = true;
        executeActiveStrikeHitbox(pendingAttackRig, pendingCombatRig);
      }

      // Evaluate declarative Sekiro × BlazBlue 3-phase kinematics & 11-joint pose
      const frame = evaluateStrikeChoreographyFrame(spec, p);
      const {
        phase,
        snapT,
        followT,
        smearBell,
        glintAlpha,
        hopOffsetY,
        spinProgress,
        spinEase,
        pose,
      } = frame;
      const isWindup = phase === 'windup';

      // Apply vertical hop offset (Ichimonji Overhead Slam & Rising Fang)
      bodyPivot.position.y += hopOffsetY;

      // Apply articulated leg stance
      leftLegRig.hipPivot.rotation.x = pose.leftLegHipX;
      leftLegRig.kneePivot.rotation.x = pose.leftLegKneeX;
      rightLegRig.hipPivot.rotation.x = pose.rightLegHipX;
      rightLegRig.kneePivot.rotation.x = pose.rightLegKneeX;

      // Apply torso coil, pitch & roll
      torsoPivot.rotation.set(pose.torsoRot[0], pose.torsoRot[1], pose.torsoRot[2]);
      headPivot.rotation.set(pose.headRot[0], pose.headRot[1], pose.headRot[2]);

      // Apply billowing cloak response
      capePivot.rotation.x = pose.capePitch[0];
      capeLowerPivot.rotation.x = pose.capePitch[1];

      // Apply left shoulder & right sword arm poses
      leftShoulderPivot.rotation.set(
        pose.leftShoulderRot[0],
        pose.leftShoulderRot[1],
        pose.leftShoulderRot[2]
      );
      rightShoulderPivot.rotation.set(
        pose.rightShoulderRot[0],
        pose.rightShoulderRot[1],
        pose.rightShoulderRot[2]
      );
      swordHandPivot.rotation.set(
        pose.swordHandRot[0],
        pose.swordHandRot[1],
        pose.swordHandRot[2]
      );
      swordGroup.position.set(pose.swordPos[0], pose.swordPos[1], pose.swordPos[2]);
      swordGroup.rotation.set(pose.swordRot[0], pose.swordRot[1], pose.swordRot[2]);

      // Non-uniform BlazBlue blade smear elongation during active delivery frames
      swordGroup.scale.set(
        1.0 + smearBell * (spec.smearPeakScale[0] - 1.0),
        1.0 + smearBell * (spec.smearPeakScale[1] - 1.0),
        1.0 + smearBell * (spec.smearPeakScale[2] - 1.0) +
          (spec.usesThrustLance ? snapT * 0.55 : 0.0)
      );

      // Crossguard anticipation telegraph glint during wind-up phase
      glintMat.opacity = glintAlpha;
      glintStarGroup.rotation.z = p * 12.0;

      // Configure 3D Crescent Slash Plane
      const sp = spec.slashPlane;
      slashGroup.visible = sp.visible && (spec.usesThrustLance || !isWindup);
      if (slashGroup.visible) {
        slashGroup.position.set(sp.pos[0], sp.pos[1], sp.pos[2]);
        const effScale = arcScale * sp.scaleMult;
        slashGroup.scale.set(sp.scaleSignX * effScale, 1, effScale);
        const rotX = THREE.MathUtils.lerp(sp.rotXStart, sp.rotXEnd, snapT);
        const rotY =
          spec.spinTurns !== 0
            ? sp.rotYEnd * spinEase
            : THREE.MathUtils.lerp(sp.rotYStart, sp.rotYEnd, snapT);
        slashGroup.rotation.set(rotX, rotY, sp.rotZ);

        slashEdgeMat.color.set(bloodwageActive ? '#e5482f' : sp.outerColorHex);
        slashEchoMat.color.set(sp.echoColorHex);

        const slashAlpha = spec.usesThrustLance
          ? Math.sin(spinProgress * Math.PI) * 0.88
          : isWindup
            ? 0
            : Math.pow(1.0 - followT * 0.88, 1.45);
        slashTrailMat.opacity = slashAlpha * 0.96;
        slashEdgeMat.opacity = slashAlpha * 0.88;
        slashEchoMat.opacity = slashAlpha * 0.62;
      }

      // Heavy Strike: Double-Bellied Horizontal Ember Wake Arc
      heavyWakeGroup.visible = spec.usesHeavyEmberWake && !isWindup;
      if (heavyWakeGroup.visible) {
        const wakeScale = arcScale * (0.92 + snapT * 0.36);
        heavyWakeGroup.scale.set(-wakeScale, 1, wakeScale);
        heavyWakeGroup.rotation.set(
          0.05,
          THREE.MathUtils.lerp(-1.05, 1.05, snapT),
          -0.08
        );
        const wakeAlpha = Math.pow(1.0 - followT * 0.82, 1.35);
        heavyWakeMat.opacity = wakeAlpha * 0.88;
        shockwaveMat.opacity = wakeAlpha * 0.72;
      }

      // Thrust Strike: Piercing Shadowrush Lance & Sonic Vortex Ring
      thrustLanceGroup.visible = spec.usesThrustLance && !isWindup;
      if (thrustLanceGroup.visible) {
        const thrustAlpha = Math.pow(1.0 - followT * 0.85, 1.4);
        thrustCoreMat.opacity = thrustAlpha * 0.96;
        thrustEdgeMat.opacity = thrustAlpha * 0.84;
        thrustLanceGroup.scale.set(
          0.75 + snapT * 0.45,
          0.75 + snapT * 0.45,
          0.45 + snapT * 0.85 * arcScale
        );
        thrustSonicRing.position.z = 0.35 + snapT * 1.35;
        thrustSonicRing.scale.setScalar(0.65 + snapT * 0.75);
      }

      // Overhead Strike (Ichimonji Finisher): Ground Shockwave Ring & Stone Fissure
      cleaveShockwaveGroup.visible =
        spec.usesOverheadShockwave && p >= spec.windupEnd + 0.06;
      if (cleaveShockwaveGroup.visible) {
        const waveP = THREE.MathUtils.clamp(
          (p - (spec.windupEnd + 0.06)) / (1.0 - (spec.windupEnd + 0.06)),
          0,
          1
        );
        const waveScale = 0.45 + (1.0 - Math.pow(1.0 - waveP, 2.2)) * 1.85 * arcScale;
        cleaveRingOuter.scale.set(waveScale, waveScale, 1);
        cleaveFissureLine.scale.set(1.0 - waveP * 0.5, 1, 0.5 + waveP * 0.85);
        const waveAlpha = Math.pow(1.0 - waveP, 1.5);
        shockwaveMat.opacity = waveAlpha * 0.9;
        thrustCoreMat.opacity = waveAlpha * 0.95;
      }
      deflectSparkGroup.visible = false;
    } else if (deflectTimer > 0) {
      // Sekiro Crossguard Deflect Stance (Two-handed diagonal guard across chest + Spire Gold spark star)
      const dp = 1.0 - deflectTimer / DEFLECT_DURATION;
      const sparkEnv = Math.sin(dp * Math.PI);
      torsoPivot.rotation.set(-0.12, -0.28, 0.08);
      leftShoulderPivot.rotation.set(-0.95, 0.42, -0.25);
      rightShoulderPivot.rotation.set(-1.12, -0.58, 0.78);
      swordHandPivot.rotation.set(0.22, -0.35, 0.88);
      swordGroup.position.set(-0.08, 0.06, 0.08);
      swordGroup.rotation.set(0, 0, 0.85);
      swordGroup.scale.set(1, 1, 1);

      deflectSparkGroup.visible = true;
      deflectSparkGroup.rotation.z = dp * 9.5;
      deflectSparkMat.opacity = sparkEnv * 0.96;
      glintMat.opacity = sparkEnv * 0.92;
      deflectRing.scale.setScalar(0.65 + dp * 1.25);
    } else {
      rightShoulderPivot.rotation.set(-rightSwing * 0.55 - speedRatio * 0.25, 0.18, 0);
      swordHandPivot.rotation.set(0, 0, 0);
      swordGroup.position.set(0, 0, 0);
      swordGroup.rotation.set(0, 0, 0.25);
      swordGroup.scale.set(1, 1, 1);
      deflectSparkGroup.visible = false;
      resetAllSmearVisuals();
    }

    shadowMesh.position.y = groundBeneath + 0.015;
    const jumpHeight = Math.max(0, position.y - groundBeneath);
    const shadowScale = Math.max(0.45, 1.0 - jumpHeight * 0.22);
    shadowMesh.scale.set(shadowScale, shadowScale, 1.0);

    return { triggeredExit, nearbyPrompt };
  };

  const dispose = () => {
    scene.remove(root);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    shadowTex.dispose();
  };

  const getActiveStrikeTelemetry = (): ActiveStrikeTelemetry => {
    const spec = activeStrikeSpec;
    const p =
      attackTimer > 0
        ? THREE.MathUtils.clamp(1.0 - attackTimer / attackDuration, 0, 1)
        : 0;
    const phase =
      deflectTimer > 0
        ? 'deflect'
        : attackTimer <= 0
          ? 'idle'
          : p < spec.windupEnd
            ? 'windup'
            : p <= spec.activeEnd
              ? 'active'
              : 'follow-through';
    return {
      strikeId: activeStrikeId,
      archetype: spec.archetype,
      strikeName: spec.name,
      subtitle: spec.subtitle,
      phase,
      normalizedProgress: Number(p.toFixed(2)),
      windupEnd: spec.windupEnd,
      activeEnd: spec.activeEnd,
      cancelWindowStart: spec.cancelWindowStart,
      comboStep: comboIndex || 1,
      durationSec: spec.durationSec,
      hitstopMs: Math.round(spec.hitstopDurationSec * 1000),
      postureDamage: spec.postureDamage,
      lungeSpeed: spec.lungeSpeed,
      canCancelIntoDefense:
        attackTimer <= 0 || p < spec.windupEnd || p >= spec.cancelWindowStart,
      canBufferNextStrike: attackTimer <= 0 || p >= spec.cancelWindowStart,
      isDeflecting: deflectTimer > 0,
    };
  };

  const controllerApi: PlayerController = {
    root,
    position,
    velocity,
    lanternLight: playerLanternLight,
    get facingAngle() {
      return facingAngle;
    },
    get isGrounded() {
      return isGrounded;
    },
    get isInsideInterior() {
      return isInsideInterior;
    },
    get isInvulnerable() {
      return dodgeTimer > 0 || hurtInvulnTimer > 0 || deflectTimer > 0;
    },
    get hp() {
      return hp;
    },
    get maxHp() {
      return maxHp;
    },
    get stamina() {
      return stamina;
    },
    get maxStamina() {
      return maxStamina;
    },
    get soulEmbers() {
      return soulEmbers;
    },
    get upgrades() {
      return upgrades;
    },
    get activeNpcDialog() {
      return activeNpcDialog;
    },
    get fishingState() {
      return fishingState;
    },
    get hitstopTimer() {
      return hitstopTimer;
    },
    get hitstopImpactEvent() {
      return hitstopImpactEvent;
    },
    get activeStrikeTelemetry() {
      return getActiveStrikeTelemetry();
    },
    get lastActionToast() {
      return lastActionToast;
    },
    clearToast: () => {
      lastActionToast = null;
    },
    setToast,
    setHp,
    setSoulEmbers,
    setScarfRotRatio,
    setBloodwageActive,
    setSummonedEchoVisuals,
    triggerRespectBow,
    addSoulEmbers,
    takeDamage,
    purchaseUpgrade,
    closeNpcDialog,
    reelFishing,
    teleportTo,
    setSpawnForDirection,
    setMoveTarget,
    triggerJump,
    triggerDodge,
    triggerDeflect,
    triggerAttack,
    triggerInteract,
    update,
    dispose,
  };

  return controllerApi;
}
