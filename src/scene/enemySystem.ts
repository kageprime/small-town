import * as THREE from 'three';
import { createContactShadowTexture } from './buildGothicCourtyard';
import {
  ActiveZoneTelemetry,
  AmbientTriggerZone,
  BestiaryEntry,
  WeatherPreset,
} from '../types/vignette';
import { soundEngine } from './soundEngine';

export type EnemyArchetype = 'sentinel' | 'wraith' | 'gargoyle';

export const INITIAL_BESTIARY_ENTRIES: BestiaryEntry[] = [
  {
    variantId: 'sentinel-citadel',
    name: 'Hollow Sentinel',
    archetype: 'sentinel',
    title: 'Sworn Warden of the Citadel Flagstones',
    regionName: 'Crypt Citadel Courtyard',
    maxHp: 5,
    attackStyle: 'Heavy Halberd Overhead Cleave',
    baseEmberDrop: 12,
    bonusEmberDrop: 4,
    bonusDropChancePct: 35,
    loreText:
      'Armored in tarnished iron plate, these sleepless wardens still pace the Sunken Crypt flagstones long after the Sanctuary bells fell silent.',
    encountered: false,
    timesEncountered: 0,
    defeatedCount: 0,
    totalEmbersHarvested: 0,
  },
  {
    variantId: 'sentinel-barrow',
    name: 'Barrow Halberdier',
    archetype: 'sentinel',
    title: 'Root-Bound Watchman of the Western Tombs',
    regionName: 'Whispering Barrow Hollow',
    maxHp: 5,
    attackStyle: 'Wide Poleaxe Sweep',
    baseEmberDrop: 12,
    bonusEmberDrop: 6,
    bonusDropChancePct: 40,
    loreText:
      'Draped in pine-stained cloaks, Barrow Halberdiers guard the sunken barrow mounds and carry dense clusters of ancient Soul Embers.',
    encountered: false,
    timesEncountered: 0,
    defeatedCount: 0,
    totalEmbersHarvested: 0,
  },
  {
    variantId: 'wraith-fen-north',
    name: 'Weeping Fen Wraith',
    archetype: 'wraith',
    title: 'Mist-Bound Apparition of the Northern Mire',
    regionName: 'Weeping Fen Mire',
    maxHp: 3,
    attackStyle: 'Swift Spirit-Staff Lunge',
    baseEmberDrop: 8,
    bonusEmberDrop: 4,
    bonusDropChancePct: 45,
    loreText:
      'Drifting weightlessly above the lily-choked peat waters, Fen Wraiths condense cold marsh vapor around their cyan spirit lanterns.',
    encountered: false,
    timesEncountered: 0,
    defeatedCount: 0,
    totalEmbersHarvested: 0,
  },
  {
    variantId: 'wraith-fen-south',
    name: 'Mire Lantern Wraith',
    archetype: 'wraith',
    title: 'Drowned Censer Bearer of the Jetty',
    regionName: 'Southern Fen Canal',
    maxHp: 3,
    attackStyle: 'Phantom Arc & Frost Surge',
    baseEmberDrop: 8,
    bonusEmberDrop: 6,
    bonusDropChancePct: 50,
    loreText:
      'Former ferrymen of the Southern Canal whose drowned censers still burn with high-purity Soul Embers beneath the mist bank.',
    encountered: false,
    timesEncountered: 0,
    defeatedCount: 0,
    totalEmbersHarvested: 0,
  },
  {
    variantId: 'gargoyle-ossuary',
    name: 'Ossuary Gargoyle',
    archetype: 'gargoyle',
    title: 'Winged Stone Chimera of the High Belfry',
    regionName: 'High Ossuary Crag',
    maxHp: 4,
    attackStyle: 'Crushing Obsidian Mace Smash',
    baseEmberDrop: 10,
    bonusEmberDrop: 6,
    bonusDropChancePct: 55,
    loreText:
      'Carved from volcanic crag basalt and animated by thermal ash updrafts, their stone cores frequently fracture into rich ember clusters.',
    encountered: false,
    timesEncountered: 0,
    defeatedCount: 0,
    totalEmbersHarvested: 0,
  },
  {
    variantId: 'gargoyle-crossroads',
    name: 'Crag Prowler',
    archetype: 'gargoyle',
    title: 'Alchemical Stone Stalker of the Eastern Arch',
    regionName: 'Crossroads Apothecary',
    maxHp: 4,
    attackStyle: 'Leaping Iron-Claw Rend',
    baseEmberDrop: 10,
    bonusEmberDrop: 4,
    bonusDropChancePct: 50,
    loreText:
      'Perched near the Apothecary Cloister roofs, Crag Prowlers hoard transmuted ember vials within their winged stone carapaces.',
    encountered: false,
    timesEncountered: 0,
    defeatedCount: 0,
    totalEmbersHarvested: 0,
  },
];

// Persistent session-level Bestiary state so discoveries & kill counts survive plate transitions
const sessionBestiaryMap = new Map<string, BestiaryEntry>(
  INITIAL_BESTIARY_ENTRIES.map((entry) => [entry.variantId, { ...entry }])
);

export function getBestiarySnapshot(): BestiaryEntry[] {
  return INITIAL_BESTIARY_ENTRIES.map((template) => {
    const live = sessionBestiaryMap.get(template.variantId);
    return live ? { ...live } : { ...template };
  });
}

export interface EnemyAgent {
  id: string;
  variantId: string;
  archetype: EnemyArchetype;
  name: string;
  group: THREE.Group;
  bodyPivot: THREE.Group;
  weaponPivot: THREE.Group;
  hpBarGroup: THREE.Group;
  hpFillMesh: THREE.Mesh;
  homeX: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facingAngle: number;
  hp: number;
  maxHp: number;
  isDead: boolean;
  hasTriggeredEncounter: boolean;
  hitFlashTimer: number;
  attackCooldown: number;
  windupTimer: number;
  strikeActiveTimer: number;
  patrolPhase: number;
  meshes: THREE.Mesh[];
  originalMaterials: THREE.Material[];
}

interface SoulEmberOrb {
  group: THREE.Group;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  value: number;
  collected: boolean;
}

interface WeatherParticle {
  mesh: THREE.Mesh;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  speedY: number;
  driftPhase: number;
}

interface MistBillow {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  heightOffset: number;
  baseScale: number;
  speed: number;
}

function createMistBankTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.72)');
  grad.addColorStop(0.55, 'rgba(225, 240, 245, 0.35)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface SanctuaryCombatAndAtmosphereRig {
  root: THREE.Group;
  enemies: EnemyAgent[];
  activeZoneTelemetry: ActiveZoneTelemetry | null;
  bestiaryEntries: BestiaryEntry[];
  spawnSoulEmbers: (x: number, y: number, z: number, count: number, valueEach?: number) => void;
  damageEnemiesInArc: (
    hitX: number,
    hitZ: number,
    reach: number,
    damage: number,
    attackerX: number,
    attackerZ: number,
    spawnDebris: (x: number, y: number, z: number, hex: string) => void
  ) => { hitCount: number; killedNames: string[]; bonusDropTriggered: boolean };
  respawnAllEnemies: () => void;
  setFishingBobberState: (
    active: boolean,
    playerX: number,
    playerY: number,
    playerZ: number,
    bobberX: number,
    bobberY: number,
    bobberZ: number,
    isBiting: boolean,
    timeSec: number
  ) => void;
  update: (
    dt: number,
    timeSec: number,
    playerPos: THREE.Vector3,
    playerInvuln: boolean,
    magnetRadius: number,
    cameraTarget: THREE.Vector3,
    cameraQuat: THREE.Quaternion,
    weatherMode: WeatherPreset,
    triggerZones: AmbientTriggerZone[],
    getGroundHeight?: (x: number, z: number) => number,
    onPlayerDamaged?: (dmg: number, sourceName: string, knockX: number, knockZ: number) => void,
    onEmberCollected?: (amount: number) => void,
    onZoneEntered?: (zone: AmbientTriggerZone) => void
  ) => void;
  dispose: () => void;
}

export function createSanctuaryCombatAndAtmosphereRig(
  scene: THREE.Scene,
  isOpenWorld: boolean,
  getGroundHeight?: (x: number, z: number) => number
): SanctuaryCombatAndAtmosphereRig {
  const root = new THREE.Group();
  root.name = 'SanctuaryCombatAndAtmosphere';
  scene.add(root);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const shadowTex = createContactShadowTexture();
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
  );

  // Shared Enemy Materials
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#2B303C', roughness: 0.65, metalness: 0.35 })
  );
  const tarnishedSteelMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#646E7D', roughness: 0.45, metalness: 0.55 })
  );
  const tatteredCloakMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#4A1E24', roughness: 0.88 })
  );
  const wraithRobeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#1F3A42', roughness: 0.85 })
  );
  const gargoyleStoneMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#525763', roughness: 0.88 })
  );
  const crimsonEyeMat = trackMat(new THREE.MeshBasicMaterial({ color: '#EF4444' }));
  const cyanSpiritMat = trackMat(new THREE.MeshBasicMaterial({ color: '#38BDF8' }));
  const amberEyeMat = trackMat(new THREE.MeshBasicMaterial({ color: '#F59E0B' }));
  const hitFlashMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FFFFFF' }));
  const windupGlowMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FB7185' }));

  const hpBgMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#18181B', side: THREE.DoubleSide })
  );
  const hpFillMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#EF4444', side: THREE.DoubleSide })
  );

  const enemies: EnemyAgent[] = [];

  const evalGround = (x: number, z: number) => (getGroundHeight ? getGroundHeight(x, z) : 0.14);

  const buildEnemy = (
    id: string,
    archetype: EnemyArchetype,
    name: string,
    spawnX: number,
    spawnZ: number,
    patrolPhase: number
  ) => {
    const group = new THREE.Group();
    const gy = evalGround(spawnX, spawnZ);
    group.position.set(spawnX, gy, spawnZ);
    root.add(group);

    // Contact Blob Shadow
    const shadowPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.15, 1.15)), shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    group.add(shadowPlane);

    const bodyPivot = new THREE.Group();
    group.add(bodyPivot);

    const weaponPivot = new THREE.Group();
    const meshes: THREE.Mesh[] = [];
    const originalMaterials: THREE.Material[] = [];

    const regMesh = (m: THREE.Mesh) => {
      meshes.push(m);
      originalMaterials.push(m.material as THREE.Material);
      return m;
    };

    const maxHp = archetype === 'sentinel' ? 5 : archetype === 'gargoyle' ? 4 : 3;

    if (archetype === 'sentinel') {
      // Hollow Sentinel Knight: Armored legs, torso breastplate, cape, horned greathelm, halberd
      const legGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.45, 0.18));
      const leftLeg = regMesh(new THREE.Mesh(legGeo, darkIronMat));
      leftLeg.position.set(-0.14, 0.22, 0);
      bodyPivot.add(leftLeg);

      const rightLeg = regMesh(new THREE.Mesh(legGeo, darkIronMat));
      rightLeg.position.set(0.14, 0.22, 0);
      bodyPivot.add(rightLeg);

      const torso = regMesh(
        new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.22, 0.62, 8)), tarnishedSteelMat)
      );
      torso.position.y = 0.72;
      bodyPivot.add(torso);

      const cape = regMesh(
        new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.72, 0.06)), tatteredCloakMat)
      );
      cape.position.set(0, 0.64, -0.22);
      cape.rotation.x = 0.16;
      bodyPivot.add(cape);

      const pauldronGeo = trackGeo(new THREE.SphereGeometry(0.17, 7, 6));
      const lPauldron = regMesh(new THREE.Mesh(pauldronGeo, tarnishedSteelMat));
      lPauldron.position.set(-0.32, 0.94, 0);
      bodyPivot.add(lPauldron);

      const rPauldron = regMesh(new THREE.Mesh(pauldronGeo, tarnishedSteelMat));
      rPauldron.position.set(0.32, 0.94, 0);
      bodyPivot.add(rPauldron);

      const helm = regMesh(
        new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.19, 0.21, 0.34, 8)), darkIronMat)
      );
      helm.position.y = 1.2;
      bodyPivot.add(helm);

      const visor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.045, 0.08)), crimsonEyeMat);
      visor.position.set(0, 1.22, 0.17);
      bodyPivot.add(visor);

      const hornGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.28, 6));
      const lHorn = regMesh(new THREE.Mesh(hornGeo, tarnishedSteelMat));
      lHorn.position.set(-0.22, 1.38, 0);
      lHorn.rotation.z = 0.45;
      bodyPivot.add(lHorn);

      const rHorn = regMesh(new THREE.Mesh(hornGeo, tarnishedSteelMat));
      rHorn.position.set(0.22, 1.38, 0);
      rHorn.rotation.z = -0.45;
      bodyPivot.add(rHorn);

      // Halberd Weapon Pivot
      weaponPivot.position.set(0.34, 0.85, 0.12);
      bodyPivot.add(weaponPivot);

      const shaft = regMesh(
        new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 1.75, 6)), darkIronMat)
      );
      shaft.position.set(0, 0.25, 0.25);
      shaft.rotation.x = 0.35;
      weaponPivot.add(shaft);

      const axeBlade = regMesh(
        new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.42, 0.36)), tarnishedSteelMat)
      );
      axeBlade.position.set(0, 0.82, 0.62);
      axeBlade.rotation.x = 0.35;
      weaponPivot.add(axeBlade);
    } else if (archetype === 'wraith') {
      // Fen Wraith: Floating tattered robe cone, cowl, cyan spirit eyes, spirit lantern staff
      const robe = regMesh(
        new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.42, 1.05, 8)), wraithRobeMat)
      );
      robe.position.y = 0.68;
      bodyPivot.add(robe);

      const mantle = regMesh(
        new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.36, 0.48, 8)), darkIronMat)
      );
      mantle.position.y = 1.02;
      bodyPivot.add(mantle);

      const hood = regMesh(
        new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.22, 1)), wraithRobeMat)
      );
      hood.position.set(0, 1.26, 0.04);
      bodyPivot.add(hood);

      const eyeGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.03, 0.04));
      const lEye = new THREE.Mesh(eyeGeo, cyanSpiritMat);
      lEye.position.set(-0.06, 1.26, 0.22);
      bodyPivot.add(lEye);
      const rEye = new THREE.Mesh(eyeGeo, cyanSpiritMat);
      rEye.position.set(0.06, 1.26, 0.22);
      bodyPivot.add(rEye);

      weaponPivot.position.set(0.28, 0.92, 0.16);
      bodyPivot.add(weaponPivot);

      const staff = regMesh(
        new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 1.35, 6)), darkIronMat)
      );
      staff.position.set(0, 0.1, 0.22);
      staff.rotation.x = 0.28;
      weaponPivot.add(staff);

      const orb = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), cyanSpiritMat);
      orb.position.set(0, 0.68, 0.46);
      weaponPivot.add(orb);
    } else {
      // Ossuary Gargoyle: Muscular stone crouch, wide wings, horned head, stone claws
      const torso = regMesh(
        new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.34, 1)), gargoyleStoneMat)
      );
      torso.position.y = 0.72;
      bodyPivot.add(torso);

      const wingGeo = trackGeo(new THREE.BoxGeometry(0.62, 0.55, 0.06));
      const lWing = regMesh(new THREE.Mesh(wingGeo, darkIronMat));
      lWing.position.set(-0.44, 0.96, -0.18);
      lWing.rotation.z = 0.38;
      lWing.rotation.y = 0.35;
      bodyPivot.add(lWing);

      const rWing = regMesh(new THREE.Mesh(wingGeo, darkIronMat));
      rWing.position.set(0.44, 0.96, -0.18);
      rWing.rotation.z = -0.38;
      rWing.rotation.y = -0.35;
      bodyPivot.add(rWing);

      const head = regMesh(
        new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 1)), gargoyleStoneMat)
      );
      head.position.set(0, 1.12, 0.12);
      bodyPivot.add(head);

      const lEye = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.03, 0.04)), amberEyeMat);
      lEye.position.set(-0.07, 1.14, 0.3);
      bodyPivot.add(lEye);
      const rEye = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.03, 0.04)), amberEyeMat);
      rEye.position.set(0.07, 1.14, 0.3);
      bodyPivot.add(rEye);

      weaponPivot.position.set(0, 0.78, 0.2);
      bodyPivot.add(weaponPivot);

      const mace = regMesh(
        new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.2, 0)), darkIronMat)
      );
      mace.position.set(0.26, -0.05, 0.32);
      weaponPivot.add(mace);
    }

    // Floating 3D Pixel Health Bar
    const hpBarGroup = new THREE.Group();
    hpBarGroup.position.set(0, 1.72, 0);
    hpBarGroup.visible = false;
    group.add(hpBarGroup);

    const hpBg = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.86, 0.11)), hpBgMat);
    hpBarGroup.add(hpBg);

    const hpFillMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.8, 0.07)), hpFillMat);
    hpFillMesh.position.z = 0.01;
    hpBarGroup.add(hpFillMesh);

    enemies.push({
      id,
      variantId: id,
      archetype,
      name,
      group,
      bodyPivot,
      weaponPivot,
      hpBarGroup,
      hpFillMesh,
      homeX: spawnX,
      homeZ: spawnZ,
      x: spawnX,
      y: gy,
      z: spawnZ,
      vx: 0,
      vz: 0,
      facingAngle: 0,
      hp: maxHp,
      maxHp,
      isDead: false,
      hasTriggeredEncounter: false,
      hitFlashTimer: 0,
      attackCooldown: 1.0,
      windupTimer: 0,
      strikeActiveTimer: 0,
      patrolPhase,
      meshes,
      originalMaterials,
    });
  };

  if (isOpenWorld) {
    buildEnemy('sentinel-citadel', 'sentinel', 'Hollow Sentinel', 8.5, -5.0, 0.0);
    buildEnemy('sentinel-barrow', 'sentinel', 'Barrow Halberdier', -12.5, 11.5, 1.8);
    buildEnemy('wraith-fen-north', 'wraith', 'Weeping Fen Wraith', 11.5, 9.5, 0.9);
    buildEnemy('wraith-fen-south', 'wraith', 'Mire Lantern Wraith', 21.0, 12.5, 2.7);
    buildEnemy('gargoyle-ossuary', 'gargoyle', 'Ossuary Gargoyle', -14.5, -13.5, 1.2);
    buildEnemy('gargoyle-crossroads', 'gargoyle', 'Crag Prowler', 13.5, -16.5, 3.6);
  } else {
    buildEnemy('sentinel-citadel', 'sentinel', 'Hollow Sentinel', 3.4, 2.6, 0.0);
  }

  // ==========================================================================
  // COLLECTIBLE SOUL EMBER ORBS (Dropped on Shatter / Enemy Defeat)
  // ==========================================================================
  const emberCoreMat = trackMat(new THREE.MeshBasicMaterial({ color: '#FEF08A' }));
  const emberHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#F97316',
      transparent: true,
      opacity: 0.65,
    })
  );
  const emberCoreGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
  const emberHaloGeo = trackGeo(new THREE.SphereGeometry(0.19, 7, 6));

  const soulEmberOrbs: SoulEmberOrb[] = [];

  const spawnSoulEmbers = (x: number, y: number, z: number, count: number, valueEach = 1) => {
    for (let i = 0; i < count; i++) {
      const grp = new THREE.Group();
      grp.position.set(x, y + 0.35, z);
      grp.add(new THREE.Mesh(emberCoreGeo, emberCoreMat));
      grp.add(new THREE.Mesh(emberHaloGeo, emberHaloMat));
      root.add(grp);

      const ang = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.8;
      const spd = 1.6 + Math.random() * 1.8;
      soulEmberOrbs.push({
        group: grp,
        x,
        y: y + 0.35,
        z,
        vx: Math.cos(ang) * spd,
        vy: 3.4 + Math.random() * 1.6,
        vz: Math.sin(ang) * spd,
        age: 0,
        value: valueEach,
        collected: false,
      });
    }
  };

  // ==========================================================================
  // 3D FISHING BOBBER & CAST LINE
  // ==========================================================================
  const fishingGroup = new THREE.Group();
  fishingGroup.visible = false;
  root.add(fishingGroup);

  const bobberFloat = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.13, 8, 8)),
    crimsonEyeMat
  );
  fishingGroup.add(bobberFloat);

  const bobberTip = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 6)),
    emberCoreMat
  );
  bobberTip.position.y = 0.14;
  fishingGroup.add(bobberTip);

  const lineGeo = trackGeo(new THREE.BufferGeometry());
  lineGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 1, 0]), 3)
  );
  const lineMat = trackMat(new THREE.LineBasicMaterial({ color: '#E4E4E7' }));
  const fishingLine = new THREE.Line(lineGeo, lineMat);
  root.add(fishingLine);
  fishingLine.visible = false;

  const setFishingBobberState = (
    active: boolean,
    playerX: number,
    playerY: number,
    playerZ: number,
    bobberX: number,
    bobberY: number,
    bobberZ: number,
    isBiting: boolean,
    timeSec: number
  ) => {
    fishingGroup.visible = active;
    fishingLine.visible = active;
    if (!active) return;

    const bobOffset = isBiting
      ? -0.12 + Math.sin(timeSec * 28.0) * 0.09
      : Math.sin(timeSec * 4.5) * 0.035;
    const by = bobberY + bobOffset;
    fishingGroup.position.set(bobberX, by, bobberZ);

    const posAttr = lineGeo.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setXYZ(0, playerX, playerY + 0.95, playerZ);
    posAttr.setXYZ(1, bobberX, by + 0.16, bobberZ);
    posAttr.needsUpdate = true;
  };

  // ==========================================================================
  // REGIONAL WEATHER PARTICLE RIG (Fen Rain, Ossuary Ash, Crypt Mist)
  // ==========================================================================
  const weatherGroup = new THREE.Group();
  root.add(weatherGroup);

  const rainMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#93C5FD', transparent: true, opacity: 0.65 })
  );
  const ashMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#FB923C', transparent: true, opacity: 0.85 })
  );
  const mistMat = trackMat(
    new THREE.MeshBasicMaterial({ color: '#CBD5E1', transparent: true, opacity: 0.45 })
  );

  const particleGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.35, 0.05));
  const weatherParticles: WeatherParticle[] = [];

  for (let i = 0; i < 42; i++) {
    const mesh = new THREE.Mesh(particleGeo, mistMat);
    weatherGroup.add(mesh);
    weatherParticles.push({
      mesh,
      offsetX: (Math.random() - 0.5) * 18.0,
      offsetY: Math.random() * 8.0,
      offsetZ: (Math.random() - 0.5) * 18.0,
      speedY: 1.5 + Math.random() * 1.5,
      driftPhase: Math.random() * Math.PI * 2,
    });
  }

  // ==========================================================================
  // 3D SUDDEN MIST BANK & INVISIBLE TRIGGER ZONE VEIL RIG
  // ==========================================================================
  const mistBankGroup = new THREE.Group();
  mistBankGroup.name = 'TriggerZoneMistBank';
  mistBankGroup.visible = false;
  root.add(mistBankGroup);

  const mistTex = createMistBankTexture();
  const mistBankMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: mistTex,
      color: '#7FA8B4',
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const mistPlaneGeo = trackGeo(new THREE.PlaneGeometry(4.6, 4.6));
  const mistBillows: MistBillow[] = [];

  for (let i = 0; i < 20; i++) {
    const mMesh = new THREE.Mesh(mistPlaneGeo, mistBankMat);
    mMesh.rotation.x = -Math.PI / 2;
    mistBankGroup.add(mMesh);
    mistBillows.push({
      mesh: mMesh,
      angle: (i / 20) * Math.PI * 2,
      radius: 1.2 + (i % 4) * 2.1,
      heightOffset: 0.16 + (i % 3) * 0.24,
      baseScale: 0.85 + (i % 3) * 0.38,
      speed: (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 4) * 0.08),
    });
  }

  let activeZoneTelemetry: ActiveZoneTelemetry | null = null;
  let lastTriggeredZoneId: string | null = null;
  let mistBlendWeight = 0.0;

  // ==========================================================================
  // COMBAT ARC DAMAGE & KNOCKBACK
  // ==========================================================================
  const damageEnemiesInArc = (
    hitX: number,
    hitZ: number,
    reach: number,
    damage: number,
    attackerX: number,
    attackerZ: number,
    spawnDebris: (x: number, y: number, z: number, hex: string) => void
  ) => {
    let hitCount = 0;
    let bonusDropTriggered = false;
    const killedNames: string[] = [];

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Math.hypot(enemy.x - hitX, enemy.z - hitZ);
      if (dist <= reach + 0.35) {
        hitCount++;
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.hitFlashTimer = 0.14;
        enemy.windupTimer = 0;
        enemy.hpBarGroup.visible = true;

        // Ensure Bestiary Log records encounter upon striking
        const bEntry = sessionBestiaryMap.get(enemy.variantId);
        if (bEntry && !enemy.hasTriggeredEncounter) {
          enemy.hasTriggeredEncounter = true;
          bEntry.encountered = true;
          bEntry.timesEncountered += 1;
        }

        const ratio = Math.max(0.001, enemy.hp / enemy.maxHp);
        enemy.hpFillMesh.scale.x = ratio;
        enemy.hpFillMesh.position.x = -0.4 * (1 - ratio);

        const pushAngle = Math.atan2(enemy.x - attackerX, enemy.z - attackerZ);
        enemy.vx = Math.sin(pushAngle) * 5.8;
        enemy.vz = Math.cos(pushAngle) * 5.8;

        spawnDebris(
          enemy.x,
          enemy.y + 0.6,
          enemy.z,
          enemy.archetype === 'wraith' ? '#38BDF8' : '#EF4444'
        );

        if (enemy.hp <= 0) {
          enemy.isDead = true;
          enemy.group.visible = false;
          killedNames.push(enemy.name);

          let baseOrbs = enemy.maxHp + 1;
          let bonusOrbs = 0;
          if (bEntry) {
            bEntry.encountered = true;
            bEntry.defeatedCount += 1;
            const rollPct = Math.random() * 100;
            if (rollPct <= bEntry.bonusDropChancePct) {
              bonusOrbs = Math.max(1, Math.round(bEntry.bonusEmberDrop / 2));
              bonusDropTriggered = true;
            }
            const totalDroppedEmbers = (baseOrbs + bonusOrbs) * 2;
            bEntry.totalEmbersHarvested += totalDroppedEmbers;
          }
          spawnSoulEmbers(enemy.x, enemy.y, enemy.z, baseOrbs + bonusOrbs, 2);
        }
      }
    }

    return { hitCount, killedNames, bonusDropTriggered };
  };

  const respawnAllEnemies = () => {
    for (const enemy of enemies) {
      enemy.isDead = false;
      enemy.hasTriggeredEncounter = false;
      enemy.hp = enemy.maxHp;
      enemy.x = enemy.homeX;
      enemy.z = enemy.homeZ;
      enemy.y = evalGround(enemy.homeX, enemy.homeZ);
      enemy.vx = 0;
      enemy.vz = 0;
      enemy.windupTimer = 0;
      enemy.hpBarGroup.visible = false;
      enemy.hpFillMesh.scale.x = 1;
      enemy.hpFillMesh.position.x = 0;
      enemy.group.visible = true;
      enemy.group.position.set(enemy.x, enemy.y, enemy.z);
    }
  };

  // ==========================================================================
  // 60FPS UPDATE LOOP
  // ==========================================================================
  const update = (
    dt: number,
    timeSec: number,
    playerPos: THREE.Vector3,
    playerInvuln: boolean,
    magnetRadius: number,
    cameraTarget: THREE.Vector3,
    cameraQuat: THREE.Quaternion,
    weatherMode: WeatherPreset,
    triggerZones: AmbientTriggerZone[],
    getGroundHeightFn?: (x: number, z: number) => number,
    onPlayerDamaged?: (dmg: number, sourceName: string, knockX: number, knockZ: number) => void,
    onEmberCollected?: (amount: number) => void,
    onZoneEntered?: (zone: AmbientTriggerZone) => void
  ) => {
    const gFn = getGroundHeightFn || evalGround;

    // 0. Evaluate Invisible Plate Trigger Zones
    let matchedZone: AmbientTriggerZone | null = null;
    let rawPenetration = 0;
    for (const z of triggerZones) {
      const dist = Math.hypot(playerPos.x - z.x, playerPos.z - z.z);
      if (dist <= z.radius) {
        matchedZone = z;
        // Smooth radial ramp: reaches 1.0 well inside the boundary
        rawPenetration = THREE.MathUtils.clamp((z.radius - dist) / (z.radius * 0.45), 0.25, 1.0);
        break;
      }
    }

    if (matchedZone) {
      if (lastTriggeredZoneId !== matchedZone.id) {
        lastTriggeredZoneId = matchedZone.id;
        if (onZoneEntered) {
          onZoneEntered(matchedZone);
        }
      }
      const targetWeight = rawPenetration * matchedZone.mistDensity;
      mistBlendWeight += (targetWeight - mistBlendWeight) * (1.0 - Math.exp(-3.8 * dt));
      mistBankMat.color.set(matchedZone.mistColorHex);

      activeZoneTelemetry = {
        id: matchedZone.id,
        title: matchedZone.title,
        subtitle: matchedZone.subtitle,
        effect: matchedZone.effect,
        audioProfile: matchedZone.audioProfile,
        blendWeight: Number(mistBlendWeight.toFixed(2)),
      };
    } else {
      lastTriggeredZoneId = null;
      mistBlendWeight += (0.0 - mistBlendWeight) * (1.0 - Math.exp(-3.2 * dt));
      if (mistBlendWeight < 0.02) {
        activeZoneTelemetry = null;
      }
    }

    // Drive Procedural WebAudio Ambient Zone Drone & Entry Motif
    soundEngine.updateAmbientZone(
      matchedZone ? matchedZone.audioProfile : null,
      mistBlendWeight
    );

    // Animate 3D Sudden Mist Bank around Player / Zone
    mistBankGroup.visible = mistBlendWeight > 0.015;
    if (mistBankGroup.visible) {
      mistBankMat.opacity = Math.min(0.68, mistBlendWeight * 0.62);
      const centerAnchorX = matchedZone
        ? THREE.MathUtils.lerp(playerPos.x, matchedZone.x, 0.35)
        : playerPos.x;
      const centerAnchorZ = matchedZone
        ? THREE.MathUtils.lerp(playerPos.z, matchedZone.z, 0.35)
        : playerPos.z;
      const baseFloorY = gFn(playerPos.x, playerPos.z);

      for (let i = 0; i < mistBillows.length; i++) {
        const b = mistBillows[i];
        const a = b.angle + timeSec * b.speed;
        const r = b.radius + Math.sin(timeSec * 0.9 + i) * 0.75;
        const bx = centerAnchorX + Math.cos(a) * r;
        const bz = centerAnchorZ + Math.sin(a) * r;
        const by =
          baseFloorY +
          b.heightOffset * mistBlendWeight +
          Math.sin(timeSec * 1.6 + i) * 0.06;

        b.mesh.position.set(bx, by, bz);
        b.mesh.rotation.z = a * 0.5;
        const s = b.baseScale * (0.65 + mistBlendWeight * 0.65);
        b.mesh.scale.set(s, s, 1);
      }
    }

    // 1. Update Enemies
    for (const enemy of enemies) {
      if (enemy.isDead) continue;

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      }
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
      }

      enemy.x += enemy.vx * dt;
      enemy.z += enemy.vz * dt;
      enemy.vx *= Math.exp(-10 * dt);
      enemy.vz *= Math.exp(-10 * dt);

      const distToPlayer = Math.hypot(playerPos.x - enemy.x, playerPos.z - enemy.z);
      const aggroRange = isOpenWorld ? 7.5 : 5.2;
      const leashRange = isOpenWorld ? 13.5 : 7.0;
      const distFromHome = Math.hypot(enemy.x - enemy.homeX, enemy.z - enemy.homeZ);

      // Dynamically catalog encountered Sentinel variants in the Bestiary Log
      if (!enemy.hasTriggeredEncounter && distToPlayer <= aggroRange + 1.5) {
        enemy.hasTriggeredEncounter = true;
        const bEntry = sessionBestiaryMap.get(enemy.variantId);
        if (bEntry) {
          bEntry.encountered = true;
          bEntry.timesEncountered += 1;
        }
      }

      if (enemy.windupTimer > 0) {
        enemy.windupTimer -= dt;
        enemy.weaponPivot.rotation.x = -1.25;
        if (enemy.windupTimer <= 0) {
          enemy.strikeActiveTimer = 0.18;
          enemy.attackCooldown = 1.65;
          if (distToPlayer < 1.95 && !playerInvuln && onPlayerDamaged) {
            const ang = Math.atan2(playerPos.x - enemy.x, playerPos.z - enemy.z);
            onPlayerDamaged(12, enemy.name, Math.sin(ang) * 4.5, Math.cos(ang) * 4.5);
          }
        }
      } else if (enemy.strikeActiveTimer > 0) {
        enemy.strikeActiveTimer -= dt;
        enemy.weaponPivot.rotation.x = 0.85;
      } else {
        enemy.weaponPivot.rotation.x = Math.sin(timeSec * 3.0 + enemy.patrolPhase) * 0.12;

        if (distToPlayer < aggroRange && distFromHome < leashRange) {
          const targetAng = Math.atan2(playerPos.x - enemy.x, playerPos.z - enemy.z);
          enemy.facingAngle = targetAng;

          if (distToPlayer > 1.55) {
            const moveSpd = enemy.archetype === 'wraith' ? 2.15 : 1.75;
            enemy.x += Math.sin(targetAng) * moveSpd * dt;
            enemy.z += Math.cos(targetAng) * moveSpd * dt;
          } else if (enemy.attackCooldown <= 0) {
            enemy.windupTimer = 0.48;
          }
        } else {
          const patAng = timeSec * 0.75 + enemy.patrolPhase;
          const targetX = enemy.homeX + Math.cos(patAng) * 1.8;
          const targetZ = enemy.homeZ + Math.sin(patAng) * 1.8;
          const dx = targetX - enemy.x;
          const dz = targetZ - enemy.z;
          if (Math.hypot(dx, dz) > 0.1) {
            enemy.facingAngle = Math.atan2(dx, dz);
            enemy.x += (dx / Math.hypot(dx, dz)) * 1.1 * dt;
            enemy.z += (dz / Math.hypot(dx, dz)) * 1.1 * dt;
          }
        }
      }

      enemy.y = gFn(enemy.x, enemy.z);
      const hoverY =
        enemy.archetype === 'wraith'
          ? 0.18 + Math.sin(timeSec * 3.5 + enemy.patrolPhase) * 0.1
          : Math.abs(Math.sin(timeSec * 5.0 + enemy.patrolPhase)) * 0.05;

      enemy.group.position.set(enemy.x, enemy.y, enemy.z);
      enemy.bodyPivot.position.y = hoverY;
      enemy.bodyPivot.rotation.y = enemy.facingAngle;

      if (enemy.hpBarGroup.visible) {
        enemy.hpBarGroup.quaternion.copy(cameraQuat);
      }

      for (let i = 0; i < enemy.meshes.length; i++) {
        if (enemy.hitFlashTimer > 0) {
          enemy.meshes[i].material = hitFlashMat;
        } else if (enemy.windupTimer > 0 && i === enemy.meshes.length - 1) {
          enemy.meshes[i].material = windupGlowMat;
        } else {
          enemy.meshes[i].material = enemy.originalMaterials[i];
        }
      }
    }

    // 2. Update Collectible Soul Ember Orbs
    for (let i = soulEmberOrbs.length - 1; i >= 0; i--) {
      const orb = soulEmberOrbs[i];
      if (orb.collected) continue;
      orb.age += dt;

      const groundY = gFn(orb.x, orb.z) + 0.22;
      const distToPlayer = Math.hypot(playerPos.x - orb.x, playerPos.z - orb.z);

      if (orb.age > 0.32 && distToPlayer < magnetRadius) {
        const pullSpeed = 9.5;
        const dx = playerPos.x - orb.x;
        const dy = playerPos.y + 0.65 - orb.y;
        const dz = playerPos.z - orb.z;
        const d3 = Math.max(0.05, Math.hypot(dx, dy, dz));
        orb.x += (dx / d3) * pullSpeed * dt;
        orb.y += (dy / d3) * pullSpeed * dt;
        orb.z += (dz / d3) * pullSpeed * dt;

        if (distToPlayer < 0.55) {
          orb.collected = true;
          root.remove(orb.group);
          soulEmberOrbs.splice(i, 1);
          soundEngine.playEmberCollect();
          if (onEmberCollected) {
            onEmberCollected(orb.value);
          }
          continue;
        }
      } else {
        orb.vy -= 14.0 * dt;
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        orb.z += orb.vz * dt;
        orb.vx *= 0.95;
        orb.vz *= 0.95;

        if (orb.y < groundY) {
          orb.y = groundY;
          orb.vy = Math.abs(orb.vy) * 0.42;
        }
      }

      const bob = Math.sin(timeSec * 6.0 + i) * 0.04;
      orb.group.position.set(orb.x, orb.y + bob, orb.z);
      orb.group.rotation.y += dt * 3.5;
    }

    // 3. Update Regional Weather Particles (automatically reacts to Trigger Zones too!)
    let resolvedWeather: Exclude<WeatherPreset, 'auto-regional'> = 'crypt-mist';
    if (weatherMode !== 'auto-regional') {
      resolvedWeather = weatherMode;
    } else if (matchedZone?.effect === 'fen-mist-bank' || (playerPos.x > 6 && playerPos.z > 6)) {
      resolvedWeather = 'fen-rain';
    } else if (
      matchedZone?.effect === 'ossuary-ash-surge' ||
      (playerPos.x < -8 && playerPos.z < -8)
    ) {
      resolvedWeather = 'ash-embers';
    } else {
      resolvedWeather = 'crypt-mist';
    }

    weatherGroup.visible = resolvedWeather !== 'clear';
    if (weatherGroup.visible) {
      for (const wp of weatherParticles) {
        if (resolvedWeather === 'fen-rain') {
          wp.mesh.material = rainMat;
          wp.mesh.scale.set(0.45, 2.2, 0.45);
          wp.offsetY -= wp.speedY * 4.5 * dt;
          if (wp.offsetY < 0.2) wp.offsetY = 8.5;
        } else if (resolvedWeather === 'ash-embers') {
          wp.mesh.material = ashMat;
          wp.mesh.scale.set(0.85, 0.35, 0.85);
          wp.offsetY += wp.speedY * 0.55 * dt;
          if (wp.offsetY > 7.5) wp.offsetY = 0.3;
        } else {
          wp.mesh.material = mistMat;
          wp.mesh.scale.set(1.2, 0.35, 1.2);
          wp.offsetY = 0.55 + Math.sin(timeSec * 1.4 + wp.driftPhase) * 0.35;
        }

        const swayX = Math.sin(timeSec * 1.2 + wp.driftPhase) * 0.6;
        const swayZ = Math.cos(timeSec * 1.1 + wp.driftPhase) * 0.6;
        wp.mesh.position.set(
          cameraTarget.x + wp.offsetX + swayX,
          cameraTarget.y + wp.offsetY,
          cameraTarget.z + wp.offsetZ + swayZ
        );
      }
    }
  };

  const dispose = () => {
    scene.remove(root);
    shadowTex.dispose();
    mistTex.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  };

  return {
    root,
    enemies,
    get activeZoneTelemetry() {
      return activeZoneTelemetry;
    },
    get bestiaryEntries() {
      return getBestiarySnapshot();
    },
    spawnSoulEmbers,
    damageEnemiesInArc,
    respawnAllEnemies,
    setFishingBobberState,
    update,
    dispose,
  };
}
