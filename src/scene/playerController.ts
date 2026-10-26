import * as THREE from 'three';
import {
  CardinalDirection,
  FishingMinigameState,
  NpcDialogState,
  PlayerUpgrades,
} from '../types/vignette';
import { createContactShadowTexture, GothicCourtyardRig } from './buildGothicCourtyard';
import { AttackWeightClass, HitstopImpactEvent } from './cameraShake';
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
  lastActionToast: string | null;
  clearToast: () => void;
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
  triggerAttack: (rig: GothicCourtyardRig, combatRig?: SanctuaryCombatAndAtmosphereRig) => void;
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

  // Curated Gothic Hero Palette (high readability under OKLab + Bayer posterization)
  const darkSlateArmorMat = new THREE.MeshLambertMaterial({ color: '#222632' });
  const brigandineTunicMat = new THREE.MeshLambertMaterial({ color: '#363D4E' });
  const leatherStrapMat = new THREE.MeshLambertMaterial({ color: '#5C402E' });
  const crimsonCloakMat = new THREE.MeshLambertMaterial({ color: '#C8422C' });
  const crimsonDarkMat = new THREE.MeshLambertMaterial({ color: '#8F2B1C' });
  const steelPauldronMat = new THREE.MeshLambertMaterial({ color: '#7D8796' });
  const bladeSteelMat = new THREE.MeshLambertMaterial({ color: '#D8E0EB' });
  const brassBuckleMat = new THREE.MeshLambertMaterial({ color: '#D99B38' });
  const skinMat = new THREE.MeshLambertMaterial({ color: '#E2D8C8' });
  const eyeGlowMat = new THREE.MeshBasicMaterial({ color: '#FEF08A' });
  const lanternCoreMat = new THREE.MeshBasicMaterial({ color: '#FBBF24' });
  const lanternFlameMat = new THREE.MeshBasicMaterial({ color: '#F97316' });
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

  // Two-layer Crescent Slash Arc Decal (Core + Fiery Outer Edge)
  const slashGroup = new THREE.Group();
  slashGroup.position.set(0, 0.78, 0.18);
  bodyPivot.add(slashGroup);

  const slashOuter = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.82, 1.56, 20, 1, -Math.PI * 0.55, Math.PI * 1.1)),
    slashEdgeMat
  );
  slashOuter.rotation.x = -Math.PI / 2;
  slashGroup.add(slashOuter);

  const slashInner = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.98, 1.48, 20, 1, -Math.PI * 0.5, Math.PI * 1.0)),
    slashTrailMat
  );
  slashInner.rotation.x = -Math.PI / 2;
  slashInner.position.y = 0.01;
  slashGroup.add(slashInner);

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
  let comboIndex = 0;
  let dodgeTimer = 0;
  let hurtInvulnTimer = 0;
  let hitstopTimer = 0;
  let hitstopEventSeq = 0;
  let hitstopImpactEvent: HitstopImpactEvent | null = null;
  let lastActionToast: string | null = null;
  let clickTarget: { x: number; z: number } | null = null;

  // RPG Stats & Sanctuary Upgrades
  let hp = 100;
  let maxHp = 100;
  let stamina = 100;
  const maxStamina = 100;
  let soulEmbers = 8; // Starting Soul Embers so player can test upgrades right away
  const upgrades: PlayerUpgrades = {
    swordLevel: 1,
    lanternLevel: 1,
    vitalityLevel: 1,
  };

  let activeNpcDialog: NpcDialogState | null = null;

  const FISHING_LOOT_TABLE = [
    { name: 'Pale Fen Eel', embers: 3 },
    { name: 'Gilded Ossuary Carp', embers: 5 },
    { name: 'Sunken Reliquary Chalice', embers: 8 },
    { name: 'Abyssal Lantern Scale', embers: 6 },
    { name: 'Silver Mire Trout', embers: 4 },
  ];

  const fishingState: FishingMinigameState = {
    active: false,
    spotTitle: 'Weeping Fen Jetty',
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
    lastActionToast = `+${amount} Soul Ember${amount > 1 ? 's' : ''} (${soulEmbers} Total)`;
  };

  const takeDamage = (dmg: number, sourceName: string, knockX: number, knockZ: number) => {
    if (dodgeTimer > 0 || hurtInvulnTimer > 0) return;
    hp = Math.max(0, hp - dmg);
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
      // Sanctuary Revival at Citadel Courtyard
      hp = maxHp;
      position.set(0, DEFAULT_GROUND_Y, 1.5);
      velocity.set(0, 0, 0);
      lastActionToast = `Fell to ${sourceName} — Revived at Sanctuary Beacon!`;
    } else {
      lastActionToast = `Struck by ${sourceName} (-${dmg} HP)`;
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
      lastActionToast = `Need ${cost} Soul Embers (Have ${soulEmbers})`;
      return;
    }

    soulEmbers -= cost;
    soundEngine.playEmberCollect();

    if (kind === 'sword') {
      upgrades.swordLevel += 1;
      const arcScale = 1 + (upgrades.swordLevel - 1) * 0.16;
      slashGroup.scale.set(arcScale, 1, arcScale);
      lastActionToast = `Sunfire Blade Lv.${upgrades.swordLevel}! (+Damage & Cleave Reach)`;
    } else if (kind === 'lantern') {
      upgrades.lanternLevel += 1;
      playerLanternLight.distance = 7.2 + (upgrades.lanternLevel - 1) * 3.5;
      lastActionToast = `Astral Lantern Lv.${upgrades.lanternLevel}! (+Light Radius & Magnetism)`;
    } else {
      upgrades.vitalityLevel += 1;
      maxHp += 25;
      hp = maxHp;
      lastActionToast = `Sanctuary Vessel Lv.${upgrades.vitalityLevel}! (Full Heal & ${maxHp} Max HP)`;
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
      lastActionToast = `Caught ${catchItem.name}! (+${catchItem.embers} Soul Embers)`;
    } else {
      fishingState.phase = 'escaped';
      fishingState.active = false;
      lastActionToast = 'Reeled too early — the Fen catch slipped away!';
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

  const triggerDodge = () => {
    if (dodgeTimer > 0 || stamina < 22) return;
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
    lastActionToast = 'Shadowstep Evade! (I-Frames Active)';
  };

  const triggerAttack = (
    rig: GothicCourtyardRig,
    combatRig?: SanctuaryCombatAndAtmosphereRig
  ) => {
    if (fishingState.active) {
      reelFishing(combatRig);
      return;
    }
    if (attackTimer > 0.14) return;
    attackTimer = 0.26;
    comboIndex = (comboIndex + 1) % 3;
    clickTarget = null;
    squashStretchY = 0.9;
    soundEngine.playSwordSwing(comboIndex);

    const reach = 1.85 + (upgrades.swordLevel - 1) * 0.25;
    const damage = upgrades.swordLevel;
    const hitX = position.x + Math.sin(facingAngle) * 1.05;
    const hitZ = position.z + Math.cos(facingAngle) * 1.05;

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
    if (combatRig) {
      const res = combatRig.damageEnemiesInArc(
        hitX,
        hitZ,
        reach,
        damage,
        position.x,
        position.z,
        rig.spawnShatterDebris
      );
      enemyHits = res.hitCount;
      killedNames = res.killedNames;
      bonusDropTriggered = res.bonusDropTriggered;
    }

    if (relicHits > 0 || enemyHits > 0) {
      // Compute Attack Weight Class & Hitstop Duration based on combo step, weapon upgrade & lethality
      const isFinisher = killedNames.length > 0;
      const isHeavyCombo = comboIndex === 0; // 3rd strike in 1 -> 2 -> 0 cycle is the heavy overhead cleave
      const weightClass: AttackWeightClass = isFinisher
        ? 'finisher-strike'
        : isHeavyCombo
          ? 'heavy-cleave'
          : comboIndex === 2
            ? 'cross-slash'
            : 'light-slash';

      const baseComboWeight = isFinisher
        ? 2.45
        : isHeavyCombo
          ? 2.0
          : comboIndex === 2
            ? 1.4
            : 1.0;
      const swordWeightBonus = (upgrades.swordLevel - 1) * 0.22;
      const multiTargetBonus = Math.min(0.45, (relicHits + enemyHits - 1) * 0.18);
      const totalWeight = Number(
        (baseComboWeight + swordWeightBonus + multiTargetBonus).toFixed(2)
      );

      hitstopTimer = isFinisher ? 0.088 : isHeavyCombo ? 0.072 : comboIndex === 2 ? 0.058 : 0.045;
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
          ? `Vanquished ${killedNames[0]}! (BONUS Soul Ember Drop! · ${totalWeight}× Impact)`
          : `Vanquished ${killedNames[0]}! (Cataloged in Bestiary · ${totalWeight}× Impact)`;
      } else if (enemyHits > 0) {
        const strikeName = isHeavyCombo
          ? 'Heavy Cleave'
          : comboIndex === 2
            ? 'Cross Slash'
            : 'Light Slash';
        lastActionToast = `${strikeName} (${damage} DMG · ${totalWeight}× Hitstop Shake)`;
      } else {
        lastActionToast =
          relicHits > 1
            ? `Cleaved ${relicHits} Relics! (${totalWeight}× Hitstop Shake)`
            : `Shattered Relic! (${totalWeight}× Hitstop Shake)`;
      }
    }
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
        ? 'Weeping Fen Dock'
        : 'Sanctuary Canal Jetty';
      fishingState.phase = 'waiting';
      fishingState.bobberProgress = 0;
      fishingWaitDuration = 1.8 + Math.random() * 1.6;
      fishingSpotPos.set(
        closest.x + Math.sin(facingAngle) * 2.2,
        0.08,
        closest.z + Math.cos(facingAngle) * 2.2
      );
      soundEngine.playFishingCue('cast');
      lastActionToast = 'Cast line into the Fen ripples — Wait for the bobber bite!';
      return;
    }

    const msg = closest.activate();
    lastActionToast = msg;

    if (closest.type === 'bell') {
      soundEngine.playBellToll();
    } else if (closest.type === 'brazier') {
      soundEngine.playBrazierIgnite(closest.isActivated);
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
    if (hitstopTimer > 0) {
      hitstopTimer = Math.max(0, hitstopTimer - dt);
      slashTrailMat.opacity = 0.95;
      slashEdgeMat.opacity = 0.85;
      return { triggeredExit: null, nearbyPrompt: null };
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

    // Smooth 60fps velocity acceleration & deceleration damping (preserve burst during dodge)
    if (dodgeTimer <= 0) {
      const accelBlend = 1.0 - Math.exp(-18.0 * dt);
      velocity.x += (moveX * targetMaxSpeed - velocity.x) * accelBlend;
      velocity.z += (moveZ * targetMaxSpeed - velocity.z) * accelBlend;
    }

    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    currentSpeedSmooth += (horizontalSpeed - currentSpeedSmooth) * (1.0 - Math.exp(-14.0 * dt));

    if (horizontalSpeed > 0.25) {
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
    // 4. FLUID 60FPS PROCEDURAL CHARACTER ANIMATION
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

    // Dodge Roll 360° Somersault or Standard Forward Lean
    if (dodgeTimer > 0) {
      const dodgeProgress = 1.0 - dodgeTimer / 0.34;
      torsoPivot.rotation.x = dodgeProgress * Math.PI * 2.0;
      torsoPivot.rotation.y = 0;
    } else {
      torsoPivot.rotation.x = speedRatio * 0.22 + breathOffset;
      torsoPivot.rotation.y = Math.cos(walkPhase) * 0.08 * strideAmp;
    }

    headPivot.rotation.x = -speedRatio * 0.12 + Math.sin(idleBreathPhase * 0.8) * 0.03;

    const fallLift = THREE.MathUtils.clamp(-velocity.y * 0.06, -0.15, 0.55);
    capePivot.rotation.x =
      0.16 + speedRatio * 0.58 + fallLift + Math.sin(walkPhase * 2) * 0.08 * strideAmp;
    capeLowerPivot.rotation.x =
      0.12 + speedRatio * 0.35 + Math.cos(walkPhase * 2 - 0.8) * 0.16 * strideAmp;

    leftShoulderPivot.rotation.x = -leftSwing * 0.45;
    lanternPendulumPivot.rotation.x =
      speedRatio * 0.28 + Math.sin(walkPhase * 2) * 0.18 * strideAmp;
    lanternPendulumPivot.rotation.z = Math.cos(walkPhase) * 0.14 * strideAmp;

    if (attackTimer > 0) {
      attackTimer = Math.max(0, attackTimer - dt);
      const p = 1.0 - attackTimer / 0.26;
      const ease = 1.0 - Math.pow(1.0 - p, 3);

      if (comboIndex === 1) {
        rightShoulderPivot.rotation.y = -1.35 + ease * 2.75;
        rightShoulderPivot.rotation.x = -0.35;
        swordGroup.rotation.z = 1.35;
        slashGroup.rotation.z = 0;
        slashGroup.rotation.y = -0.8 + ease * 1.6;
      } else if (comboIndex === 2) {
        rightShoulderPivot.rotation.y = 1.35 - ease * 2.75;
        rightShoulderPivot.rotation.x = -0.25;
        swordGroup.rotation.z = -1.35;
        slashGroup.rotation.z = 0.18;
        slashGroup.rotation.y = 0.8 - ease * 1.6;
      } else {
        rightShoulderPivot.rotation.x = -1.85 + ease * 2.55;
        rightShoulderPivot.rotation.y = -0.45 + ease * 0.9;
        swordGroup.rotation.z = 0.35;
        slashGroup.rotation.z = -0.45;
        slashGroup.rotation.y = -0.6 + ease * 1.4;
      }

      const env = Math.sin(p * Math.PI);
      slashTrailMat.opacity = env * 0.92;
      slashEdgeMat.opacity = env * 0.78;
    } else {
      rightShoulderPivot.rotation.y = 0.18;
      rightShoulderPivot.rotation.x = -rightSwing * 0.55 - speedRatio * 0.25;
      swordGroup.rotation.z = 0.25;
      slashTrailMat.opacity = 0;
      slashEdgeMat.opacity = 0;
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

  return {
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
      return dodgeTimer > 0 || hurtInvulnTimer > 0;
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
    get lastActionToast() {
      return lastActionToast;
    },
    clearToast: () => {
      lastActionToast = null;
    },
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
    triggerAttack,
    triggerInteract,
    update,
    dispose,
  };
}
