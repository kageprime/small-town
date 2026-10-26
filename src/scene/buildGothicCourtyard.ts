import * as THREE from 'three';
import {
  AmbientTriggerZone,
  BiomeArchetype,
  CardinalDirection,
  LayerToggles,
  NpcDialogState,
} from '../types/vignette';
import { createSeededRng, evaluatePolarBlobRadius, SeededRng } from './prng';

export const LOOP_DURATION = 6.0;

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface InteractiveProp {
  id: string;
  type: 'brazier' | 'gate' | 'bell' | 'counter' | 'npc' | 'fishing' | 'chest';
  x: number;
  z: number;
  radius: number;
  isActivated: boolean;
  npcDialog?: NpcDialogState;
  getPrompt: () => string;
  activate: () => string;
}

export interface DestructibleProp {
  id: string;
  type: 'urn' | 'bones' | 'totem';
  x: number;
  z: number;
  radius: number;
  isBroken: boolean;
  mesh: THREE.Object3D;
  shardColor: string;
  flashUntil: number;
}

export interface ExitPortal {
  dir: CardinalDirection;
  x: number;
  z: number;
  radius: number;
  label: string;
  requiresGateOpen?: boolean;
}

export interface GothicCourtyardRig {
  root: THREE.Group;
  plateSeedOffset: number;
  plateBaseRadius: number;
  colliders: CircleCollider[];
  interactables: InteractiveProp[];
  destructibles: DestructibleProp[];
  exits: ExitPortal[];
  triggerZones: AmbientTriggerZone[];
  groups: {
    roofSlab: THREE.Group;
    waterFen: THREE.Group;
    gravekeeper: THREE.Group;
    embersAndMotes: THREE.Group;
  };
  spawnShatterDebris: (x: number, y: number, z: number, colorHex: string) => void;
  stepDebrisPhysics: (dt: number) => void;
  respawnDestructibles: () => void;
  updateAtTime: (
    timeSeconds: number,
    dappleIntensity: number,
    toggles: LayerToggles,
    brazierIntensityMultiplier?: number,
    nightFactor?: number,
    dayCycleHour?: number
  ) => void;
  dispose: () => void;
}

interface EmberParticle {
  mesh: THREE.Mesh;
  brazierIndex: number;
  baseX: number;
  baseZ: number;
  phaseOffset: number;
  driftRadius: number;
  maxHeight: number;
  freqHarmonic: number;
}

interface DriftMote {
  mesh: THREE.Mesh;
  centerX: number;
  centerY: number;
  centerZ: number;
  rx: number;
  rz: number;
  harmonic: number;
  phase: number;
}

interface RippleRing {
  mesh: THREE.Mesh;
  phaseOffset: number;
}

interface DebrisShard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rotSpeedX: number;
  rotSpeedZ: number;
  life: number;
  maxLife: number;
}

function createPolarBlobShape(
  baseRadius: number,
  seedOffset: number,
  scallopAmp = 0.06,
  segments = 96
): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const r = evaluatePolarBlobRadius(theta, baseRadius, seedOffset, scallopAmp);
    const x = Math.cos(theta) * r * 1.04;
    const y = Math.sin(theta) * r * 0.96;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(15, 14, 20, 0.80)');
  grad.addColorStop(0.55, 'rgba(15, 14, 20, 0.45)');
  grad.addColorStop(1.0, 'rgba(15, 14, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCalligraphyBannerTexture(rng: SeededRng): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#EAE4D7';
  ctx.fillRect(0, 0, 32, 96);

  ctx.fillStyle = '#A63A2B';
  ctx.fillRect(0, 0, 32, 10);

  ctx.fillStyle = '#18161C';
  for (let y = 16; y < 82; y += 20) {
    const w = rng.int(10, 16);
    const x0 = Math.floor((32 - w) / 2);
    ctx.fillRect(14, y, 4, 13);
    ctx.fillRect(x0, y + rng.int(2, 5), w, 3);
    if (rng.chance(0.65)) {
      ctx.fillRect(x0 + 2, y + 9, w - 4, 3);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

export function buildGothicCourtyard(
  scene: THREE.Scene,
  plateSeed = 4821,
  biome: BiomeArchetype = 'crypt-courtyard'
): GothicCourtyardRig {
  const rng = createSeededRng(plateSeed);
  const root = new THREE.Group();
  root.name = `GothicPlate_${biome}_${plateSeed}`;
  scene.add(root);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const colliders: CircleCollider[] = [];
  const interactables: InteractiveProp[] = [];
  const destructibles: DestructibleProp[] = [];
  const exits: ExitPortal[] = [];

  const dappleUniforms = {
    uLoopPhase: { value: 0.0 },
    uDappleStrength: { value: 0.68 },
  };

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const createDappledMaterial = (
    hexColor: string,
    dappleWeight = 1.0,
    polygonOffset = false
  ): THREE.MeshLambertMaterial => {
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(hexColor),
      polygonOffset,
      polygonOffsetFactor: polygonOffset ? -1 : 0,
      polygonOffsetUnits: polygonOffset ? -1 : 0,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uLoopPhase = dappleUniforms.uLoopPhase;
      shader.uniforms.uDappleStrength = dappleUniforms.uDappleStrength;
      shader.uniforms.uMatDappleWeight = { value: dappleWeight };

      shader.vertexShader =
        `
        varying vec3 vWorldPosDapple;
        ` +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vWorldPosDapple = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `
        );

      shader.fragmentShader =
        `
        uniform float uLoopPhase;
        uniform float uDappleStrength;
        uniform float uMatDappleWeight;
        varying vec3 vWorldPosDapple;
        ` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float wx = vWorldPosDapple.x * 0.42 + vWorldPosDapple.y * 0.18;
          float wz = vWorldPosDapple.z * 0.42 - vWorldPosDapple.y * 0.12;
          float w1 = sin(wx * 1.35 + wz * 1.15 - uLoopPhase);
          float w2 = cos(wx * 0.95 - wz * 1.65 + uLoopPhase * 2.0);
          float w3 = sin((wx - wz) * 2.1 + uLoopPhase);
          float cloudVal = 0.5 * w1 + 0.35 * w2 + 0.15 * w3;
          float dappleBand = floor(smoothstep(-0.55, 0.55, cloudVal) * 3.0) / 2.0 - 0.5;
          float shift = dappleBand * 0.24 * uDappleStrength * uMatDappleWeight;
          diffuseColor.rgb = clamp(diffuseColor.rgb * (1.0 + shift), 0.0, 1.0);
          `
        );
    };

    materials.push(mat);
    return mat;
  };

  const shadowTex = createContactShadowTexture();
  textures.push(shadowTex);
  const shadowBaseMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  materials.push(shadowBaseMat);

  const addBlobShadow = (
    parent: THREE.Object3D,
    x: number,
    z: number,
    rx: number,
    rz: number,
    y = 0.03,
    rotY = 0
  ) => {
    const plane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(rx * 2, rz * 2)), shadowBaseMat);
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.z = rotY;
    plane.position.set(x, y, z);
    plane.renderOrder = 1;
    parent.add(plane);
    return plane;
  };

  // Biome-tuned foliage & dirt palette (always restrained, OKLab-friendly)
  const grassPalette =
    biome === 'sunken-fen'
      ? { base: '#374C43', light: '#486357', dark: '#283831', dirt: '#54483C', rim: '#705D47' }
      : biome === 'apothecary-stall'
      ? { base: '#46583E', light: '#5A704E', dark: '#34422E', dirt: '#63513F', rim: '#826A4F' }
      : biome === 'ossuary-belltower'
      ? { base: '#3D4842', light: '#4E5C54', dark: '#2C3630', dirt: '#574B40', rim: '#75624D' }
      : { base: '#415342', light: '#536951', dark: '#314033', dirt: '#5D4D3D', rim: '#7E674C' };

  const plateSeedOffset = rng.range(0.2, 5.8);
  const plateBaseRadius = 8.95;

  // ============================================================================
  // 1. SEEDED POLAR-BLOB GRASS PLATE & DIRT COURT ("Plate, not block" rule)
  // ============================================================================
  const plateGroup = new THREE.Group();
  root.add(plateGroup);

  const underSoilShape = createPolarBlobShape(9.45, plateSeedOffset * 0.4, 0.055);
  const underSoilGeo = trackGeo(
    new THREE.ExtrudeGeometry(underSoilShape, { depth: 0.18, bevelEnabled: false })
  );
  underSoilGeo.rotateX(Math.PI / 2);
  const underSoilMesh = new THREE.Mesh(underSoilGeo, createDappledMaterial('#3A2E25', 0.35));
  underSoilMesh.position.y = -0.08;
  plateGroup.add(underSoilMesh);

  const dirtRimShape = createPolarBlobShape(9.28, plateSeedOffset * 0.7, 0.065);
  const dirtRimGeo = trackGeo(
    new THREE.ExtrudeGeometry(dirtRimShape, { depth: 0.11, bevelEnabled: false })
  );
  dirtRimGeo.rotateX(Math.PI / 2);
  const dirtRimMesh = new THREE.Mesh(dirtRimGeo, createDappledMaterial(grassPalette.rim, 0.65));
  dirtRimMesh.position.y = 0.0;
  plateGroup.add(dirtRimMesh);

  const grassPlateShape = createPolarBlobShape(plateBaseRadius, plateSeedOffset, 0.075);
  const grassPlateGeo = trackGeo(
    new THREE.ExtrudeGeometry(grassPlateShape, { depth: 0.09, bevelEnabled: false })
  );
  grassPlateGeo.rotateX(Math.PI / 2);
  const grassPlateMesh = new THREE.Mesh(
    grassPlateGeo,
    createDappledMaterial(grassPalette.base, 1.15)
  );
  grassPlateMesh.position.y = 0.06;
  plateGroup.add(grassPlateMesh);

  const innerDirtShape = createPolarBlobShape(7.25, plateSeedOffset + 1.5, 0.045);
  const innerDirtGeo = trackGeo(new THREE.ShapeGeometry(innerDirtShape));
  innerDirtGeo.rotateX(-Math.PI / 2);
  const innerDirtMesh = new THREE.Mesh(
    innerDirtGeo,
    createDappledMaterial(grassPalette.dirt, 0.85, true)
  );
  innerDirtMesh.position.y = 0.072;
  plateGroup.add(innerDirtMesh);

  const grassLightMat = createDappledMaterial(grassPalette.light, 1.25);
  const grassDarkMat = createDappledMaterial(grassPalette.dark, 1.1);
  const clumpGeo = trackGeo(new THREE.CylinderGeometry(0.45, 0.58, 0.08, 7));

  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2 + rng.range(-0.08, 0.08);
    if (ang > 0.35 && ang < 1.25) continue; // Keep front-right fen water open
    const rad = 7.25 + rng.range(0.0, 0.85);
    const cx = Math.cos(ang) * rad;
    const cz = Math.sin(ang) * rad;
    const clump = new THREE.Mesh(clumpGeo, i % 2 === 0 ? grassLightMat : grassDarkMat);
    clump.position.set(cx, 0.08, cz);
    clump.scale.set(rng.range(0.85, 1.45), 1.0, rng.range(0.85, 1.35));
    clump.rotation.y = ang;
    plateGroup.add(clump);
  }

  // Worn-path dirt discs
  const wornDiscMat = createDappledMaterial('#6E5B47', 0.75, true);
  for (let i = 0; i < 4; i++) {
    const wx = rng.range(-2.6, 2.4);
    const wz = rng.range(-2.4, 2.2);
    const wr = rng.range(0.85, 1.35);
    const disc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(wr, 12)), wornDiscMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(wx, 0.078, wz);
    plateGroup.add(disc);
  }

  // ============================================================================
  // 2. PARAMETRIC FLAGSTONE FIELD (Open Center Court)
  // ============================================================================
  const flagstoneGroup = new THREE.Group();
  root.add(flagstoneGroup);

  const slateMats = [
    createDappledMaterial('#565B64', 0.9),
    createDappledMaterial('#656A73', 0.95),
    createDappledMaterial('#494D55', 0.85),
  ];
  const crackMat = createDappledMaterial('#26282E', 0.4);

  const N = 7;
  const TILE = 1.52;
  const GAP = 0.14;
  const STEP = TILE + GAP;
  const HALF = ((N - 1) * STEP) / 2;

  for (let gx = 0; gx < N; gx++) {
    for (let gz = 0; gz < N; gz++) {
      const tx = gx * STEP - HALF;
      const tz = gz * STEP - HALF;
      const distFromOrigin = Math.hypot(tx, tz);
      if (distFromOrigin > 5.75) continue;
      if (tx > 1.8 && tz > 1.8) continue;

      const hash = rng.next();
      if (distFromOrigin > 4.1 && hash > 0.68) continue;
      if (biome === 'sunken-fen' && distFromOrigin > 3.2 && hash > 0.5) continue;

      const tileScale = 0.91 + (hash % 0.1);
      const tileH = 0.09 + (hash % 0.03);
      const tileGeo = trackGeo(new THREE.BoxGeometry(TILE * tileScale, tileH, TILE * tileScale));
      const tileMesh = new THREE.Mesh(tileGeo, slateMats[Math.floor(hash * 3) % 3]);

      tileMesh.position.set(
        tx + (hash - 0.5) * 0.06,
        0.07 + tileH * 0.5,
        tz + (rng.next() - 0.5) * 0.06
      );
      tileMesh.rotation.y = (hash - 0.5) * 0.07;
      flagstoneGroup.add(tileMesh);

      if (hash > 0.64) {
        const crackGeo = trackGeo(new THREE.BoxGeometry(TILE * 0.65, 0.02, 0.05));
        const crack = new THREE.Mesh(crackGeo, crackMat);
        crack.position.set(
          tileMesh.position.x,
          tileMesh.position.y + tileH * 0.5 + 0.005,
          tileMesh.position.z
        );
        crack.rotation.y = hash * 2.4;
        flagstoneGroup.add(crack);
      }
    }
  }

  // Shared Architectural Materials
  const cryptStoneMat = createDappledMaterial('#6B707B', 0.9);
  const cryptDarkStoneMat = createDappledMaterial('#4B4F58', 0.8);
  const timberMat = createDappledMaterial('#573E2C', 0.65);
  const ironBandMat = createDappledMaterial('#2B2E36', 0.5);
  const thatchBaseMat = createDappledMaterial('#7A684B', 1.25);
  const thatchStreakMat = createDappledMaterial('#917D5B', 1.3);
  const thatchDarkMat = createDappledMaterial('#594B35', 1.15);
  const crimsonAccentMat = createDappledMaterial('#C84630', 0.6);
  const boneSkinMat = createDappledMaterial('#D4CBB8', 0.5);
  const voidBackMat = new THREE.MeshBasicMaterial({ color: '#121117' });
  const grooveMat = new THREE.MeshBasicMaterial({ color: '#1E1612' });
  materials.push(voidBackMat, grooveMat);

  // ============================================================================
  // 3. PARAMETRIC BACK-EDGE HERO LANDMARK & OVERHANGING "HAT SLAB" ROOF
  //    Varies by Biome Grammar (Crypt Gate, Apothecary Stall, Ossuary Belfry, Fen Gate)
  // ============================================================================
  const cryptGroup = new THREE.Group();
  cryptGroup.position.set(-1.25, 0.08, -5.35);
  cryptGroup.rotation.y = 0.1;
  root.add(cryptGroup);

  const roofSlabGroup = new THREE.Group();
  roofSlabGroup.name = 'OverhangingHeroRoofSlab';
  cryptGroup.add(roofSlabGroup);

  let leftDoorPivot: THREE.Group | null = null;
  let rightDoorPivot: THREE.Group | null = null;
  let isGateOpen = biome === 'sunken-fen';
  let gateTargetAngle = isGateOpen ? 1.25 : 0.0;
  let bellMeshRef: THREE.Mesh | null = null;
  let bellSwingBoost = 0.0;

  addBlobShadow(cryptGroup, 0, 0.35, 3.5, 1.5, 0.01);

  if (biome === 'apothecary-stall') {
    // SUMMER STALL LESSON HERO: Red Counter + Fat Straw "Hat Slab" Roof + Void Underneath
    const backWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.1, 3.1, 0.45)),
      cryptDarkStoneMat
    );
    backWall.position.set(0.2, 1.55, -0.35);
    cryptGroup.add(backWall);

    // Saturated Crimson Counter (Primary Story Block from Summer Stall)
    const redCounter = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.4, 1.05, 1.15)),
      crimsonAccentMat
    );
    redCounter.position.set(0.2, 0.525, 1.05);
    cryptGroup.add(redCounter);

    const counterTop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.6, 0.14, 1.32)),
      timberMat
    );
    counterTop.position.set(0.2, 1.08, 1.05);
    cryptGroup.add(counterTop);

    // Potion bottles & ceramic jars on counter
    for (let bx = -1.4; bx <= 1.8; bx += 0.65) {
      const bottle = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.34, 7)),
        Math.abs(Math.round(bx * 2)) % 2 === 0 ? boneSkinMat : crimsonAccentMat
      );
      bottle.position.set(bx, 1.32, 1.05 + rng.range(-0.15, 0.15));
      cryptGroup.add(bottle);
    }

    colliders.push(
      { x: -2.4, z: -4.4, radius: 1.1 },
      { x: -1.0, z: -4.3, radius: 1.1 },
      { x: 0.5, z: -4.2, radius: 1.1 }
    );

    interactables.push({
      id: 'apothecary-counter',
      type: 'counter',
      x: -1.0,
      z: -3.6,
      radius: 2.1,
      isActivated: false,
      getPrompt: () => '[E] Inspect Apothecary Relic Counter',
      activate: function () {
        this.isActivated = !this.isActivated;
        return 'Sampled Ember-Root Draught (+Warmth)';
      },
    });
  } else {
    // SINGLE-OUTLINE ARCH BIGHT GATE (Crypt Courtyard, Ossuary Belltower, Sunken Fen)
    const gw = rng.range(2.55, 2.85);
    const gh = biome === 'ossuary-belltower' ? 4.45 : rng.range(3.45, 3.75);
    const archRadius = 1.08;
    const archWallTop = 1.68;

    const gateWallShape = new THREE.Shape();
    gateWallShape.moveTo(-gw, 0);
    gateWallShape.lineTo(-gw, gh);
    gateWallShape.lineTo(-gw * 0.45, gh + 0.38);
    gateWallShape.lineTo(gw * 0.45, gh + 0.38);
    gateWallShape.lineTo(gw, gh);
    gateWallShape.lineTo(gw, 0);
    gateWallShape.lineTo(archRadius, 0);
    gateWallShape.lineTo(archRadius, archWallTop);
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      gateWallShape.lineTo(
        Math.cos(a) * archRadius,
        archWallTop + Math.sin(a) * (archRadius * 1.12)
      );
    }
    gateWallShape.lineTo(-archRadius, 0);
    gateWallShape.closePath();

    const gateExtrude = trackGeo(
      new THREE.ExtrudeGeometry(gateWallShape, { depth: 0.78, bevelEnabled: false })
    );
    const gateWallMesh = new THREE.Mesh(gateExtrude, cryptStoneMat);
    gateWallMesh.position.set(0, 0, -0.39);
    cryptGroup.add(gateWallMesh);

    // Dark void back panel (top 3.0+) so bare background never peeks over the door
    const backVoidPanel = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.5, 3.25, 0.16)),
      voidBackMat
    );
    backVoidPanel.position.set(0, 1.62, -0.34);
    cryptGroup.add(backVoidPanel);

    // Double Hinged Timber Doors inside the recess (can swing open when unbarred!)
    leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-1.02, 0, -0.14);
    cryptGroup.add(leftDoorPivot);

    rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(1.02, 0, -0.14);
    cryptGroup.add(rightDoorPivot);

    const buildDoorLeaf = (pivot: THREE.Group, dirSign: number) => {
      const leaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.04, 2.7, 0.16)), timberMat);
      leaf.position.set(dirSign * 0.52, 1.35, 0);
      pivot.add(leaf);

      for (const gxOffset of [0.26, 0.52, 0.78]) {
        const groove = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.035, 2.66, 0.18)),
          grooveMat
        );
        groove.position.set(dirSign * gxOffset, 1.35, 0.01);
        pivot.add(groove);
      }

      for (const by of [0.55, 1.35, 2.05]) {
        const band = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(1.02, 0.12, 0.2)),
          ironBandMat
        );
        band.position.set(dirSign * 0.51, by, 0.02);
        pivot.add(band);
      }
    };

    buildDoorLeaf(leftDoorPivot, 1);
    buildDoorLeaf(rightDoorPivot, -1);

    // Colliders for left & right stone gate piers
    colliders.push(
      { x: -3.1, z: -5.2, radius: 1.05 },
      { x: 0.65, z: -5.4, radius: 1.05 },
      { x: 2.05, z: -5.1, radius: 0.85 }
    );

    interactables.push({
      id: 'crypt-gate-door',
      type: 'gate',
      x: -1.2,
      z: -4.5,
      radius: 1.95,
      isActivated: isGateOpen,
      getPrompt: () =>
        isGateOpen ? '[E] Close Crypt Threshold Doors' : '[E] Unbar Sealed Crypt Doors (Opens North)',
      activate: function () {
        isGateOpen = !isGateOpen;
        this.isActivated = isGateOpen;
        gateTargetAngle = isGateOpen ? 1.32 : 0.0;
        return isGateOpen
          ? 'Unbarred Crypt Gate — Walk North through the arch to travel!'
          : 'Sealed Crypt Gate';
      },
    });

    // If Ossuary Belltower biome, add cantilevered belfry + interactive bronze bell
    if (biome === 'ossuary-belltower') {
      const bellBeam = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28, 0.28, 2.2)),
        timberMat
      );
      bellBeam.position.set(0, 4.35, 0.65);
      cryptGroup.add(bellBeam);

      const bronzeMat = createDappledMaterial('#B8893E', 0.8);
      bellMeshRef = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.52, 0.78, 9)),
        bronzeMat
      );
      bellMeshRef.position.set(0, 3.85, 1.35);
      cryptGroup.add(bellMeshRef);

      interactables.push({
        id: 'ossuary-bell',
        type: 'bell',
        x: -1.1,
        z: -3.6,
        radius: 1.9,
        isActivated: false,
        getPrompt: () => '[E] Toll Ossuary Bronze Bell',
        activate: function () {
          this.isActivated = true;
          bellSwingBoost = 1.0;
          return 'Tolled the Ossuary Bell — Resonant shockwave released!';
        },
      });
    }
  }

  // Parametric Overhanging "Hat Slab" Roof + Deep Under-Void + Tally Banner
  const roofWidth = biome === 'apothecary-stall' ? 6.95 : rng.range(6.15, 6.65);
  const roofDepth = biome === 'apothecary-stall' ? 3.45 : rng.range(2.95, 3.35);

  const underRoofVoid = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(roofWidth * 0.9, 0.36, roofDepth * 0.82)),
    voidBackMat
  );
  underRoofVoid.position.set(0.28, 3.22, 0.75);
  roofSlabGroup.add(underRoofVoid);

  const postGeo = trackGeo(new THREE.BoxGeometry(0.26, 3.25, 0.26));
  const leftPost = new THREE.Mesh(postGeo, timberMat);
  leftPost.position.set(-2.35, 1.62, 1.55);
  roofSlabGroup.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, timberMat);
  rightPost.position.set(2.85, 1.62, 1.55);
  roofSlabGroup.add(rightPost);

  addBlobShadow(roofSlabGroup, -2.35, 1.55, 0.55, 0.55, 0.015);
  addBlobShadow(roofSlabGroup, 2.85, 1.55, 0.55, 0.55, 0.015);
  addBlobShadow(roofSlabGroup, 0.25, 0.95, 3.35, 1.5, 0.012);

  const mainHatSlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(roofWidth, 0.58, roofDepth)),
    thatchBaseMat
  );
  mainHatSlab.position.set(0.28, 3.62, 0.74);
  mainHatSlab.rotation.x = 0.16;
  roofSlabGroup.add(mainHatSlab);

  const upperCrownSlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(roofWidth * 0.85, 0.42, roofDepth * 0.72)),
    thatchStreakMat
  );
  upperCrownSlab.position.set(0.28, 3.98, 0.56);
  upperCrownSlab.rotation.x = 0.16;
  roofSlabGroup.add(upperCrownSlab);

  // Parametric streaky straw/plank bundles across top of Hat Slab
  for (let sx = -roofWidth * 0.43; sx <= roofWidth * 0.48; sx += 0.42) {
    const bundle = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.14, roofDepth * 1.03)),
      Math.abs(Math.round(sx * 3)) % 2 === 0 ? thatchStreakMat : thatchDarkMat
    );
    bundle.position.set(sx, 3.88 + Math.sin(sx * 4.0) * 0.03, 0.75);
    bundle.rotation.x = 0.16;
    roofSlabGroup.add(bundle);
  }

  // Parametric ragged fringe overhangs along front eaves
  for (let fx = -roofWidth * 0.44; fx <= roofWidth * 0.49; fx += 0.32) {
    const jut = rng.range(0.16, 0.44);
    const drop = rng.range(0.12, 0.28);
    const fringe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.25, drop, jut)),
      thatchDarkMat
    );
    fringe.position.set(fx, 3.24 - drop * 0.3, 0.74 + roofDepth * 0.48 + jut * 0.35);
    fringe.rotation.x = 0.24;
    roofSlabGroup.add(fringe);
  }

  // Seeded Vertical Calligraphy Tally Banner
  const bannerTex = createCalligraphyBannerTexture(rng);
  textures.push(bannerTex);
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide });
  materials.push(bannerMat);
  const bannerMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.58, 1.55)), bannerMat);
  bannerMesh.position.set(2.52, 2.25, 1.72);
  bannerMesh.rotation.y = -0.18;
  roofSlabGroup.add(bannerMesh);

  // ============================================================================
  // 4. PARAMETRIC STACKED DARK-FEN WATER BLOBS, CORNER JETTY & RIPPLE RINGS
  // ============================================================================
  const waterFenGroup = new THREE.Group();
  waterFenGroup.name = 'DarkFenWaterCorner';
  waterFenGroup.position.set(4.55, 0.02, 4.35);
  root.add(waterFenGroup);

  const waterScale = biome === 'sunken-fen' ? 1.25 : rng.range(0.92, 1.1);
  const darkWaterShape = createPolarBlobShape(3.55 * waterScale, plateSeedOffset + 2.1, 0.08, 64);
  const darkWaterGeo = trackGeo(
    new THREE.ExtrudeGeometry(darkWaterShape, { depth: 0.12, bevelEnabled: false })
  );
  darkWaterGeo.rotateX(Math.PI / 2);
  const darkWaterMesh = new THREE.Mesh(darkWaterGeo, createDappledMaterial('#1E3138', 0.75));
  darkWaterMesh.position.y = 0.04;
  waterFenGroup.add(darkWaterMesh);

  const lightWaterShape = createPolarBlobShape(3.05 * waterScale, plateSeedOffset + 3.4, 0.09, 64);
  const lightWaterGeo = trackGeo(new THREE.ShapeGeometry(lightWaterShape));
  lightWaterGeo.rotateX(-Math.PI / 2);
  const lightWaterMesh = new THREE.Mesh(
    lightWaterGeo,
    createDappledMaterial('#35545C', 1.15, true)
  );
  lightWaterMesh.position.y = 0.068;
  waterFenGroup.add(lightWaterMesh);

  const waterPatchMat = createDappledMaterial('#486E75', 1.25, true);
  const waterPatch1 = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.95, 10)), waterPatchMat);
  waterPatch1.rotation.x = -Math.PI / 2;
  waterPatch1.position.set(-0.45, 0.074, 0.35);
  waterFenGroup.add(waterPatch1);

  const waterPatch2 = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.65, 9)), waterPatchMat);
  waterPatch2.rotation.x = -Math.PI / 2;
  waterPatch2.position.set(0.85, 0.074, -0.55);
  waterFenGroup.add(waterPatch2);

  // Parametric Timber Jetty Dock breaking the outer blob silhouette
  const jettyGroup = new THREE.Group();
  jettyGroup.position.set(-0.95, 0.08, -0.85);
  jettyGroup.rotation.y = Math.PI / 4;
  waterFenGroup.add(jettyGroup);

  addBlobShadow(jettyGroup, 1.5, 0.0, 2.2, 0.85, -0.002);

  const pilingGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.12, 0.65, 6));
  [
    [0.4, -0.48],
    [0.4, 0.48],
    [1.8, -0.48],
    [1.8, 0.48],
    [3.1, -0.48],
    [3.1, 0.48],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(pilingGeo, timberMat);
    post.position.set(px, 0.16, pz);
    jettyGroup.add(post);
  });

  const plankCount = rng.int(10, 12);
  for (let i = 0; i < plankCount; i++) {
    const plank = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.08, 1.18)),
      i % 2 === 0 ? thatchBaseMat : timberMat
    );
    plank.position.set(0.15 + i * 0.31, 0.35, (i % 3 - 1) * 0.02);
    plank.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.025;
    jettyGroup.add(plank);
  }

  const bollard = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.15, 0.55, 7)),
    ironBandMat
  );
  bollard.position.set(3.05, 0.62, 0.42);
  jettyGroup.add(bollard);

  interactables.push({
    id: 'courtyard-jetty-fishing',
    type: 'fishing',
    x: 3.15,
    z: 2.35,
    radius: 2.1,
    isActivated: false,
    getPrompt: () => '[E] Cast Fishing Line into Canal Ripples',
    activate: () => 'Cast fishing line into the sunken canal!',
  });

  const rippleRings: RippleRing[] = [];
  const rippleSpecs: [number, number, number][] = [
    [0.75, 0.95, 0.0],
    [0.75, 0.95, 0.5],
    [-0.85, 1.15, 0.25],
    [1.45, -0.45, 0.75],
  ];
  rippleSpecs.forEach(([rx, rz, phaseOffset]) => {
    const rMat = new THREE.MeshBasicMaterial({
      color: '#9EC5C9',
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    materials.push(rMat);
    const rMesh = new THREE.Mesh(trackGeo(new THREE.RingGeometry(0.22, 0.31, 20)), rMat);
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.set(rx, 0.082, rz);
    waterFenGroup.add(rMesh);
    rippleRings.push({ mesh: rMesh, phaseOffset });
  });

  // ============================================================================
  // 5. AMBIENT WORK-IDLE CARETAKER (Smooth 60fps Sweeping Cycle & Upgraded Rig)
  // ============================================================================
  const gravekeeperGroup = new THREE.Group();
  gravekeeperGroup.name = 'WorkIdleGravekeeper';
  const keeperX = biome === 'apothecary-stall' ? 0.25 : -2.55;
  const keeperZ = biome === 'apothecary-stall' ? -4.75 : -2.15;
  gravekeeperGroup.position.set(keeperX, 0.14, keeperZ);
  gravekeeperGroup.rotation.y = biome === 'apothecary-stall' ? 0.05 : 0.55;
  root.add(gravekeeperGroup);

  addBlobShadow(gravekeeperGroup, 0, 0, 0.76, 0.76, 0.005);

  const cloakMat = createDappledMaterial('#2E333D', 0.65);
  const mantleMat = createDappledMaterial('#434957', 0.75);
  const leatherMat = createDappledMaterial('#523A28', 0.75);
  const keeperEyeMat = new THREE.MeshBasicMaterial({ color: '#FDE68A' });
  materials.push(keeperEyeMat);

  const bootGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.16, 0.22));
  const leftBoot = new THREE.Mesh(bootGeo, leatherMat);
  leftBoot.position.set(-0.11, 0.08, 0.03);
  gravekeeperGroup.add(leftBoot);
  const rightBoot = new THREE.Mesh(bootGeo, leatherMat);
  rightBoot.position.set(0.11, 0.08, -0.02);
  gravekeeperGroup.add(rightBoot);

  const robeSkirt = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.22, 0.42, 0.78, 8)),
    cloakMat
  );
  robeSkirt.position.y = 0.44;
  gravekeeperGroup.add(robeSkirt);

  const keeperTorsoPivot = new THREE.Group();
  keeperTorsoPivot.position.y = 0.78;
  gravekeeperGroup.add(keeperTorsoPivot);

  const shoulderMantle = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.41, 0.54, 8)),
    mantleMat
  );
  shoulderMantle.position.y = 0.19;
  keeperTorsoPivot.add(shoulderMantle);

  const pauldronGeo = trackGeo(new THREE.SphereGeometry(0.14, 7, 6));
  const leftPauldron = new THREE.Mesh(pauldronGeo, ironBandMat);
  leftPauldron.scale.set(1.1, 0.75, 1.1);
  leftPauldron.position.set(-0.26, 0.3, 0);
  keeperTorsoPivot.add(leftPauldron);

  const rightPauldron = new THREE.Mesh(pauldronGeo, ironBandMat);
  rightPauldron.scale.set(1.1, 0.75, 1.1);
  rightPauldron.position.set(0.26, 0.3, 0);
  keeperTorsoPivot.add(rightPauldron);

  const keeperScarf = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.2, 0.23, 0.13, 8)),
    crimsonAccentMat
  );
  keeperScarf.position.set(0, 0.35, 0.02);
  keeperTorsoPivot.add(keeperScarf);

  const keeperHeadPivot = new THREE.Group();
  keeperHeadPivot.position.set(0, 0.44, 0.03);
  keeperTorsoPivot.add(keeperHeadPivot);

  const hoodMesh = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.2, 1)), cloakMat);
  hoodMesh.position.set(0, 0.06, 0);
  keeperHeadPivot.add(hoodMesh);

  const eyeGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.028, 0.03));
  const leftEye = new THREE.Mesh(eyeGeo, keeperEyeMat);
  leftEye.position.set(-0.065, 0.05, 0.17);
  keeperHeadPivot.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, keeperEyeMat);
  rightEye.position.set(0.065, 0.05, 0.17);
  keeperHeadPivot.add(rightEye);

  const hatBrim = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.42, 0.44, 0.035, 10)),
    cloakMat
  );
  hatBrim.position.set(0, 0.16, 0);
  hatBrim.rotation.x = -0.08;
  keeperHeadPivot.add(hatBrim);

  const hatCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.22, 0.4, 8)), cloakMat);
  hatCone.position.set(0, 0.35, -0.02);
  hatCone.rotation.x = -0.18;
  keeperHeadPivot.add(hatCone);

  const broomRigPivot = new THREE.Group();
  broomRigPivot.position.set(0.0, 0.22, 0.18);
  keeperTorsoPivot.add(broomRigPivot);

  const armGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.048, 0.42, 6));
  const leftArm = new THREE.Mesh(armGeo, mantleMat);
  leftArm.position.set(-0.18, -0.12, 0.14);
  leftArm.rotation.x = -0.68;
  leftArm.rotation.z = -0.26;
  broomRigPivot.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, mantleMat);
  rightArm.position.set(0.16, -0.16, 0.2);
  rightArm.rotation.x = -0.78;
  rightArm.rotation.z = 0.22;
  broomRigPivot.add(rightArm);

  const broomShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 1.38, 6)),
    timberMat
  );
  broomShaft.position.set(0.0, -0.42, 0.38);
  broomShaft.rotation.x = 0.38;
  broomRigPivot.add(broomShaft);

  const broomHead = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.23, 0.46, 8)),
    thatchBaseMat
  );
  broomHead.position.set(0.0, -0.88, 0.56);
  broomHead.rotation.x = Math.PI + 0.38;
  broomRigPivot.add(broomHead);

  interactables.push({
    id: 'courtyard-caretaker-npc',
    type: 'npc',
    x: keeperX,
    z: keeperZ,
    radius: 2.0,
    isActivated: false,
    npcDialog: {
      npcId: 'courtyard-caretaker',
      name: 'Brother Corvus, Sanctuary Caretaker',
      role: 'Keeper of the Sunfire Beacons & Blade Smith',
      greeting:
        '“Still sweeping the ash from these flagstones, Wayfarer. Bring me Soul Embers culled from Hollow Sentinels or dredged from the Fen, and I shall temper your Sunfire Blade and Astral Lantern.”',
      loreHint:
        'Tip: Press [Q] to Shadowstep Evade enemy cleaves, or cast your line at the timber jetty [E].',
    },
    getPrompt: () => '[E] Speak & Barter with Caretaker Corvus',
    activate: () => 'Opened Sanctuary Barter with Caretaker Corvus',
  });

  // ============================================================================
  // 6. INTERACTIVE BRAZIERS (Ignite/Stoke with [E]), BENCH & GRAVES
  // ============================================================================
  const propsGroup = new THREE.Group();
  root.add(propsGroup);

  const emberBedMat = new THREE.MeshBasicMaterial({ color: '#D9481E' });
  const flameOuterMat = new THREE.MeshBasicMaterial({ color: '#F26422' });
  const flameInnerMat = new THREE.MeshBasicMaterial({ color: '#FBBF24' });
  materials.push(emberBedMat, flameOuterMat, flameInnerMat);

  interface BrazierNode {
    flamePivot: THREE.Group;
    emberBed: THREE.Mesh;
    light: THREE.PointLight;
    isLit: boolean;
    x: number;
    z: number;
  }

  const brazierNodes: BrazierNode[] = [];
  const brazierCoords: [number, number, boolean][] = [
    [-4.15, 0.45, true], // Primary focal brazier starts lit
    [2.85, -1.85, biome === 'ossuary-belltower'], // Secondary courtyard brazier (player can ignite!)
  ];

  brazierCoords.forEach(([bx, bz, startsLit], bIdx) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, 0.14, bz);
    propsGroup.add(bGroup);

    addBlobShadow(bGroup, 0, 0, 1.1, 1.1, 0.005);
    colliders.push({ x: bx, z: bz, radius: 0.72 });

    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.66, 0.76, 0.22, 8)),
      cryptDarkStoneMat
    );
    plinth.position.y = 0.11;
    bGroup.add(plinth);

    const stem = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.36, 0.68, 8)),
      ironBandMat
    );
    stem.position.y = 0.52;
    bGroup.add(stem);

    const bowl = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.7, 0.36, 0.42, 9)),
      ironBandMat
    );
    bowl.position.y = 0.96;
    bGroup.add(bowl);

    const emberBed = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.56, 0.44, 0.14, 8)),
      emberBedMat
    );
    emberBed.position.y = 1.14;
    emberBed.visible = startsLit;
    bGroup.add(emberBed);

    const flamePivot = new THREE.Group();
    flamePivot.position.set(0, 1.18, 0);
    flamePivot.visible = startsLit;
    bGroup.add(flamePivot);

    const flameOuter = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.44, 1.05, 7)),
      flameOuterMat
    );
    flameOuter.position.y = 0.48;
    flamePivot.add(flameOuter);

    const flameInner = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.26, 0.68, 6)),
      flameInnerMat
    );
    flameInner.position.set(0.04, 0.36, 0.04);
    flamePivot.add(flameInner);

    const ptLight = new THREE.PointLight('#F97316', startsLit ? 2.4 : 0.0, 9.5, 1.6);
    ptLight.position.set(0, 1.85, 0);
    bGroup.add(ptLight);

    const node: BrazierNode = {
      flamePivot,
      emberBed,
      light: ptLight,
      isLit: startsLit,
      x: bx,
      z: bz,
    };
    brazierNodes.push(node);

    interactables.push({
      id: `brazier-${bIdx}`,
      type: 'brazier',
      x: bx,
      z: bz,
      radius: 1.75,
      isActivated: startsLit,
      getPrompt: () => (node.isLit ? '[E] Extinguish / Bank Brazier' : '[E] Ignite Dormant Brazier'),
      activate: function () {
        node.isLit = !node.isLit;
        this.isActivated = node.isLit;
        node.flamePivot.visible = node.isLit;
        node.emberBed.visible = node.isLit;
        node.light.intensity = node.isLit ? 2.4 : 0.0;
        return node.isLit ? 'Ignited Courtyard Brazier!' : 'Banked Brazier Embers';
      },
    });
  });

  // Stone bench along back-right edge
  const benchGroup = new THREE.Group();
  benchGroup.position.set(4.15, 0.14, -2.85);
  benchGroup.rotation.y = -0.62;
  propsGroup.add(benchGroup);
  addBlobShadow(benchGroup, 0, 0, 1.55, 0.85, 0.005);
  colliders.push({ x: 4.15, z: -2.85, radius: 0.95 });

  const benchSeat = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.25, 0.16, 0.72)),
    cryptStoneMat
  );
  benchSeat.position.y = 0.52;
  benchGroup.add(benchSeat);

  const benchBack = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.18, 0.62, 0.14)),
    cryptDarkStoneMat
  );
  benchBack.position.set(0, 0.88, -0.28);
  benchBack.rotation.x = -0.1;
  benchGroup.add(benchBack);

  [-0.85, 0.85].forEach((lx) => {
    const leg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.48, 0.64)),
      cryptDarkStoneMat
    );
    leg.position.set(lx, 0.24, 0);
    benchGroup.add(leg);
  });

  // Parametric Headstones around perimeter
  const gravesSpec: [number, number, number, number][] = [
    [2.85, -4.55, -0.22, rng.range(0.9, 1.15)],
    [4.75, -0.75, -0.48, rng.range(0.82, 1.02)],
    [-4.65, 2.95, 0.35, rng.range(0.88, 1.08)],
    [-2.45, 4.75, 0.15, rng.range(0.8, 0.98)],
  ];
  gravesSpec.forEach(([gx, gz, rotY, sc], idx) => {
    const gGroup = new THREE.Group();
    gGroup.position.set(gx, 0.08, gz);
    gGroup.rotation.y = rotY;
    gGroup.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.06;
    propsGroup.add(gGroup);

    addBlobShadow(gGroup, 0, 0, 0.72 * sc, 0.52 * sc, 0.005);
    colliders.push({ x: gx, z: gz, radius: 0.55 * sc });

    const base = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.92 * sc, 0.24 * sc, 0.44 * sc)),
      cryptDarkStoneMat
    );
    base.position.y = 0.12 * sc;
    gGroup.add(base);

    const tablet = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.74 * sc, 1.18 * sc, 0.26 * sc)),
      cryptStoneMat
    );
    tablet.position.y = 0.78 * sc;
    gGroup.add(tablet);

    const cap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.37 * sc, 0.37 * sc, 0.26 * sc, 8)),
      cryptStoneMat
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.y = 1.37 * sc;
    gGroup.add(cap);
  });

  // ============================================================================
  // 7. DESTRUCTIBLE PROPS (Strike with [J] / Click for Hitstop + Gravity Debris!)
  // ============================================================================
  const destructiblesGroup = new THREE.Group();
  root.add(destructiblesGroup);

  const destructibleSpawns: {
    type: 'urn' | 'bones' | 'totem';
    x: number;
    z: number;
    color: string;
  }[] = [
    { type: 'urn', x: -3.15, z: -2.95, color: '#C84630' },
    { type: 'urn', x: -2.65, z: -3.25, color: '#C84630' },
    { type: 'urn', x: 1.75, z: -3.45, color: '#C84630' },
    { type: 'bones', x: -3.25, z: 1.95, color: '#D4CBB8' },
    { type: 'bones', x: 2.35, z: 1.55, color: '#D4CBB8' },
    { type: 'totem', x: 0.85, z: 3.15, color: '#7A684B' },
    { type: 'urn', x: -0.95, z: 3.45, color: '#C84630' },
  ];

  destructibleSpawns.forEach((sp, idx) => {
    const dGroup = new THREE.Group();
    dGroup.position.set(sp.x, 0.12, sp.z);
    destructiblesGroup.add(dGroup);

    addBlobShadow(dGroup, 0, 0, 0.48, 0.48, 0.005);

    if (sp.type === 'urn') {
      const body = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28, 0.21, 0.58, 8)),
        crimsonAccentMat
      );
      body.position.y = 0.29;
      dGroup.add(body);

      const neck = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.22, 0.16, 0.16, 8)),
        thatchBaseMat
      );
      neck.position.y = 0.62;
      dGroup.add(neck);
    } else if (sp.type === 'bones') {
      for (let b = 0; b < 4; b++) {
        const bone = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 0.58, 5)),
          boneSkinMat
        );
        bone.position.set((b - 1.5) * 0.09, 0.12 + (b % 2) * 0.08, ((b * 3) % 2 - 0.5) * 0.1);
        bone.rotation.z = Math.PI / 2 - (b % 2) * 0.35;
        bone.rotation.y = b * 0.85;
        dGroup.add(bone);
      }
      const skull = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(0.19, 0)),
        boneSkinMat
      );
      skull.position.set(0, 0.26, 0);
      dGroup.add(skull);
    } else {
      // Cursed Effigy Totem (Practice target for melee hitstop)
      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.11, 0.13, 1.15, 6)),
        timberMat
      );
      post.position.y = 0.58;
      dGroup.add(post);

      const cross = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.78, 0.14, 0.14)),
        thatchBaseMat
      );
      cross.position.y = 0.86;
      dGroup.add(cross);

      const head = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(0.24, 0)),
        crimsonAccentMat
      );
      head.position.y = 1.18;
      dGroup.add(head);
    }

    destructibles.push({
      id: `destructible-${idx}`,
      type: sp.type,
      x: sp.x,
      z: sp.z,
      radius: 0.58,
      isBroken: false,
      mesh: dGroup,
      shardColor: sp.color,
      flashUntil: 0,
    });
  });

  // Debris Physics Pool for Shattered Props (Real gravity -24 m/s^2)
  const debrisGroup = new THREE.Group();
  root.add(debrisGroup);
  const activeDebris: DebrisShard[] = [];
  const shardGeo = trackGeo(new THREE.DodecahedronGeometry(0.12, 0));

  const spawnShatterDebris = (x: number, y: number, z: number, colorHex: string) => {
    const shardMat = createDappledMaterial(colorHex, 0.6);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
      const spd = 2.2 + Math.random() * 2.8;
      const sMesh = new THREE.Mesh(shardGeo, shardMat);
      sMesh.position.set(x, y + 0.25, z);
      const sc = 0.65 + Math.random() * 0.75;
      sMesh.scale.set(sc, sc * 0.7, sc);
      debrisGroup.add(sMesh);

      activeDebris.push({
        mesh: sMesh,
        vx: Math.cos(ang) * spd,
        vy: 3.8 + Math.random() * 3.4,
        vz: Math.sin(ang) * spd,
        rotSpeedX: (Math.random() - 0.5) * 14,
        rotSpeedZ: (Math.random() - 0.5) * 14,
        life: 0,
        maxLife: 2.2 + Math.random() * 0.8,
      });
    }
  };

  const stepDebrisPhysics = (dt: number) => {
    const GRAVITY = -24.0;
    for (let i = activeDebris.length - 1; i >= 0; i--) {
      const d = activeDebris[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        debrisGroup.remove(d.mesh);
        activeDebris.splice(i, 1);
        continue;
      }
      d.vy += GRAVITY * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.mesh.rotation.x += d.rotSpeedX * dt;
      d.mesh.rotation.z += d.rotSpeedZ * dt;

      if (d.mesh.position.y < 0.14) {
        d.mesh.position.y = 0.14;
        d.vy = Math.abs(d.vy) * 0.42;
        d.vx *= 0.68;
        d.vz *= 0.68;
      }

      if (d.life > d.maxLife - 0.45) {
        const fade = Math.max(0.01, (d.maxLife - d.life) / 0.45);
        d.mesh.scale.setScalar(fade);
      }
    }
  };

  const respawnDestructibles = () => {
    destructibles.forEach((d) => {
      d.isBroken = false;
      d.mesh.visible = true;
    });
  };

  // ============================================================================
  // 8. PERIMETER CARDINAL EXIT THRESHOLDS (Connected Pocket-World Exploration)
  // ============================================================================
  const exitMarkerMat = createDappledMaterial('#8D7B62', 1.1);
  const addSteppingStones = (x: number, z: number, rotY: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.085, z);
    g.rotation.y = rotY;
    plateGroup.add(g);
    const s1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 0.08, 0.52)), exitMarkerMat);
    g.add(s1);
    const s2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.08, 0.44)), exitMarkerMat);
    s2.position.set(0, 0.01, 0.62);
    g.add(s2);
  };

  addSteppingStones(0.0, 7.65, 0); // South Causeway
  addSteppingStones(-7.75, 0.0, Math.PI / 2); // West Rim Path

  exits.push(
    {
      dir: 'N',
      x: -1.25,
      z: -5.45,
      radius: 1.35,
      label: 'North Crypt Threshold',
      requiresGateOpen: biome !== 'apothecary-stall',
    },
    {
      dir: 'E',
      x: 6.15,
      z: 5.95,
      radius: 1.55,
      label: 'East Fen Jetty Crossing',
    },
    {
      dir: 'S',
      x: 0.0,
      z: 7.75,
      radius: 1.5,
      label: 'South Stone Causeway',
    },
    {
      dir: 'W',
      x: -7.85,
      z: 0.0,
      radius: 1.5,
      label: 'West Flagstone Rim',
    }
  );

  // ============================================================================
  // 9. HARMONIC EMBER ENVELOPE & DRIFT MOTES
  // ============================================================================
  const embersAndMotesGroup = new THREE.Group();
  embersAndMotesGroup.name = 'EmbersAndDriftMotes';
  root.add(embersAndMotesGroup);

  const emberGeo = trackGeo(new THREE.BoxGeometry(0.11, 0.11, 0.11));
  const embers: EmberParticle[] = [];
  brazierNodes.forEach((bNode, bIdx) => {
    for (let i = 0; i < 10; i++) {
      const eMat = i % 2 === 0 ? flameInnerMat : flameOuterMat;
      const eMesh = new THREE.Mesh(emberGeo, eMat);
      embersAndMotesGroup.add(eMesh);
      embers.push({
        mesh: eMesh,
        brazierIndex: bIdx,
        baseX: bNode.x + ((i % 3) - 1) * 0.16,
        baseZ: bNode.z + (((i * 2) % 3) - 1) * 0.16,
        phaseOffset: i / 10,
        driftRadius: 0.22 + (i % 4) * 0.09,
        maxHeight: 2.1 + (i % 3) * 0.55,
        freqHarmonic: (i % 2) + 1,
      });
    }
  });

  const moteMat = new THREE.MeshBasicMaterial({ color: '#D6D1C4' });
  materials.push(moteMat);
  const moteGeo = trackGeo(new THREE.BoxGeometry(0.09, 0.09, 0.09));
  const driftMotes: DriftMote[] = [];
  const moteSeeds: [number, number, number][] = [
    [-1.8, 1.35, -1.2],
    [1.6, 1.15, -2.1],
    [2.4, 1.55, 0.8],
    [-0.6, 1.85, 2.4],
    [0.2, 1.25, -0.4],
    [-2.9, 1.65, -0.8],
    [3.1, 1.05, 2.5],
  ];
  moteSeeds.forEach(([mx, my, mz], idx) => {
    const mMesh = new THREE.Mesh(moteGeo, moteMat);
    embersAndMotesGroup.add(mMesh);
    driftMotes.push({
      mesh: mMesh,
      centerX: mx,
      centerY: my,
      centerZ: mz,
      rx: 0.38 + (idx % 3) * 0.12,
      rz: 0.34 + ((idx + 1) % 3) * 0.12,
      harmonic: (idx % 2) + 1,
      phase: idx * 0.9,
    });
  });

  // ============================================================================
  // DETERMINISTIC UPDATE AT TIME t
  // ============================================================================
  const updateAtTime = (
    timeSeconds: number,
    dappleIntensity: number,
    toggles: LayerToggles,
    brazierIntensityMultiplier = 1.0,
    nightFactor = 0.0
  ) => {
    const wrappedT = ((timeSeconds % LOOP_DURATION) + LOOP_DURATION) % LOOP_DURATION;
    const normT = wrappedT / LOOP_DURATION;
    const u = normT * Math.PI * 2.0;

    roofSlabGroup.visible = toggles.roofSlab;
    waterFenGroup.visible = toggles.waterFen;
    gravekeeperGroup.visible = toggles.gravekeeper;
    embersAndMotesGroup.visible = toggles.embersAndMotes;

    dappleUniforms.uLoopPhase.value = u;
    dappleUniforms.uDappleStrength.value = toggles.cloudDapple ? dappleIntensity : 0.0;

    // Smoothly swing crypt doors when unbarred
    if (leftDoorPivot && rightDoorPivot) {
      leftDoorPivot.rotation.y += (gateTargetAngle - leftDoorPivot.rotation.y) * 0.18;
      rightDoorPivot.rotation.y += (-gateTargetAngle - rightDoorPivot.rotation.y) * 0.18;
    }

    // Ringing ossuary bell animation
    if (bellMeshRef) {
      bellSwingBoost = Math.max(0, bellSwingBoost - 0.015);
      bellMeshRef.rotation.z =
        Math.sin(u * 4.0) * (0.06 + bellSwingBoost * 0.45);
    }

    // Brazier flame harmonic flicker & Night-Day Cycle Intensity Surge
    const flameScale =
      (0.86 + 0.1 * Math.sin(7.0 * u) + 0.06 * Math.sin(17.0 * u + 2.1)) *
      (0.88 + nightFactor * 0.42);
    const widthScale = 0.92 + nightFactor * 0.22;
    brazierNodes.forEach((bNode) => {
      if (!bNode.isLit) return;
      bNode.flamePivot.scale.set(
        widthScale + 0.08 * Math.cos(5.0 * u),
        flameScale,
        widthScale + 0.08 * Math.sin(5.0 * u)
      );
      bNode.flamePivot.rotation.z = 0.07 * Math.sin(6.0 * u);
      const baseFlicker = 2.1 + 0.55 * (flameScale - 0.86) * 4.0;
      bNode.light.intensity = baseFlicker * brazierIntensityMultiplier;
      bNode.light.distance = 6.5 + nightFactor * 4.8;
    });

    // Ember envelope
    embers.forEach((e) => {
      const parentBrazier = brazierNodes[e.brazierIndex];
      if (!parentBrazier || !parentBrazier.isLit) {
        e.mesh.visible = false;
        return;
      }
      e.mesh.visible = true;
      const cyc = (normT * e.freqHarmonic + e.phaseOffset) % 1.0;
      const env = Math.pow(Math.sin(Math.PI * cyc), 1.4);
      const y = 1.22 + cyc * e.maxHeight * (1.0 + nightFactor * 0.35);
      const swirlAngle = u * e.freqHarmonic + e.phaseOffset * Math.PI * 2.0;
      const x = e.baseX + Math.cos(swirlAngle) * e.driftRadius * cyc;
      const z = e.baseZ + Math.sin(swirlAngle) * e.driftRadius * cyc;

      e.mesh.position.set(x, y, z);
      const s = Math.max(0.001, env * (1.1 + nightFactor * 0.45));
      e.mesh.scale.set(s, s, s);
    });

    // Ambient drift motes
    driftMotes.forEach((m) => {
      const ang = u * m.harmonic + m.phase;
      m.mesh.position.set(
        m.centerX + Math.cos(ang) * m.rx,
        m.centerY + Math.sin(ang * 2.0) * 0.16,
        m.centerZ + Math.sin(ang) * m.rz
      );
    });

    // Work-Idle Caretaker (Smooth 60fps sweeping cycle)
    const sweepCycle = (normT * 3.0) % 1.0;
    const smoothPhase = sweepCycle * Math.PI * 2.0;
    const sweepSwing = Math.sin(smoothPhase);
    const sweepLift = Math.max(0, Math.cos(smoothPhase));
    broomRigPivot.rotation.y = sweepSwing * 0.52;
    broomRigPivot.rotation.z = sweepSwing * 0.18;
    broomRigPivot.rotation.x = -0.08 + sweepLift * 0.16;
    keeperTorsoPivot.position.y = 0.78 + Math.abs(sweepSwing) * 0.035;
    keeperTorsoPivot.rotation.y = sweepSwing * 0.18;
    keeperHeadPivot.rotation.y = -sweepSwing * 0.08;
    keeperHeadPivot.rotation.z = sweepSwing * 0.05;

    bannerMesh.rotation.z = 0.045 * Math.sin(2.0 * u + 0.6);
    bannerMesh.rotation.x = 0.035 * Math.cos(u);

    // Water Ripple Rings & Drifting Patches
    waterPatch1.position.x = -0.45 + 0.14 * Math.sin(u);
    waterPatch1.position.z = 0.35 + 0.12 * Math.cos(u);
    waterPatch2.position.x = 0.85 - 0.12 * Math.cos(u);
    waterPatch2.position.z = -0.55 + 0.14 * Math.sin(u);

    rippleRings.forEach((r) => {
      const rCyc = (normT * 2.0 + r.phaseOffset) % 1.0;
      const radiusScale = 0.35 + rCyc * 2.25;
      r.mesh.scale.set(radiusScale, radiusScale, 1.0);
      r.mesh.visible = rCyc < 0.86;
      r.mesh.position.y = 0.08 + (1.0 - rCyc) * 0.004;
    });
  };

  const dispose = () => {
    scene.remove(root);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  const triggerZones: AmbientTriggerZone[] = [
    {
      id: 'plate-fen-canal',
      title: 'Weeping Fen Canal Basin',
      subtitle: 'Sudden Mist Bank & Peat Drone',
      x: 3.6,
      z: 3.1,
      radius: 4.2,
      effect: 'fen-mist-bank',
      audioProfile: 'fen',
      mistColorHex: '#7FA8B4',
      mistDensity: 0.92,
      lightTintHex: '#67E8F9',
    },
    {
      id: 'plate-north-arch',
      title:
        biome === 'apothecary-stall'
          ? 'Apothecary Incense Overhang'
          : biome === 'ossuary-belltower'
          ? 'Ossuary Belfry Updraft'
          : 'Sunken Crypt Threshold',
      subtitle:
        biome === 'apothecary-stall'
          ? 'Warm Herbal Incense & Glass Chimes'
          : biome === 'ossuary-belltower'
          ? 'Thermal Ash Surge & Bronze Resonance'
          : 'Catacomb Chill Veil & Choir Drone',
      x: -1.2,
      z: -4.2,
      radius: 3.5,
      effect:
        biome === 'apothecary-stall'
          ? 'apothecary-incense'
          : biome === 'ossuary-belltower'
          ? 'ossuary-ash-surge'
          : 'crypt-chill-veil',
      audioProfile:
        biome === 'apothecary-stall'
          ? 'apothecary'
          : biome === 'ossuary-belltower'
          ? 'ossuary'
          : 'crypt',
      mistColorHex:
        biome === 'apothecary-stall'
          ? '#FBBF24'
          : biome === 'ossuary-belltower'
          ? '#FB923C'
          : '#818CF8',
      mistDensity: 0.75,
      lightTintHex:
        biome === 'apothecary-stall'
          ? '#FDE68A'
          : biome === 'ossuary-belltower'
          ? '#FDBA74'
          : '#A5B4FC',
    },
  ];

  return {
    root,
    plateSeedOffset,
    plateBaseRadius,
    colliders,
    interactables,
    destructibles,
    exits,
    triggerZones,
    groups: {
      roofSlab: roofSlabGroup,
      waterFen: waterFenGroup,
      gravekeeper: gravekeeperGroup,
      embersAndMotes: embersAndMotesGroup,
    },
    spawnShatterDebris,
    stepDebrisPhysics,
    respawnDestructibles,
    updateAtTime,
    dispose,
  };
}
