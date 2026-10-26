import * as THREE from 'three';
import {
  AmbientTriggerZone,
  CitizenId,
  LandmarkPOI,
  LayerToggles,
} from '../types/vignette';
import {
  CircleCollider,
  createContactShadowTexture,
  DestructibleProp,
  GothicCourtyardRig,
  InteractiveProp,
  LOOP_DURATION,
} from './buildGothicCourtyard';
import {
  CitizenProfile,
  evaluateCitizenSchedule,
  VAELENPORT_CITIZENS,
} from './dialogueAndCutscenes';
import { createSeededRng } from './prng';

export type VaelenportWorldEvent =
  | 'ignite-plaza-lanterns'
  | 'open-canal-lock'
  | 'toll-cloister-bell';

export interface VaelenportCityRig extends GothicCourtyardRig {
  getGroundHeight: (x: number, z: number) => number;
  triggerWorldEvent?: (event: VaelenportWorldEvent) => void;
  getCitizenPosition?: (citizenId: CitizenId) => { x: number; z: number } | null;
}

/**
 * Hand-Authored Districts & Landmarks of Vaelenport Sanctuary City.
 */
export const OPEN_WORLD_LANDMARKS: LandmarkPOI[] = [
  {
    id: 'lantern-plaza',
    title: 'Lantern Plaza & Astrolabe Fountain',
    shortLabel: 'Lantern Plaza',
    regionName: 'Central Sanctuary Tier (+0.28m)',
    biome: 'crypt-courtyard',
    x: 0,
    z: 1.2,
    tileX: 0,
    tileZ: 0,
  },
  {
    id: 'clockmaker-guildhall',
    title: "Master Vaelen's Clockmaker Guildhall",
    shortLabel: 'Guildhall',
    regionName: 'West Lantern Plaza (+0.28m)',
    biome: 'ossuary-belltower',
    x: -7.5,
    z: -1.8,
    tileX: -1,
    tileZ: 0,
  },
  {
    id: 'lower-canal-quays',
    title: 'Lower Canal Quays & Gondola Jetty',
    shortLabel: 'Canal Quays',
    regionName: 'Southern Waterway Basin (+0.20m)',
    biome: 'sunken-fen',
    x: -2.0,
    z: 11.2,
    tileX: 0,
    tileZ: 1,
  },
  {
    id: 'eastern-canal-lock',
    title: 'Eastern Canal Lock & Waterwheel',
    shortLabel: 'Canal Lock',
    regionName: 'East Sluice Gate (+0.20m)',
    biome: 'sunken-fen',
    x: 9.5,
    z: 10.4,
    tileX: 1,
    tileZ: 1,
  },
  {
    id: 'scholars-cloister',
    title: "Scholars' Cloister & Rose Window",
    shortLabel: 'Cloister',
    regionName: 'Northern Upper Terrace (+1.15m)',
    biome: 'ossuary-belltower',
    x: -1.8,
    z: -13.5,
    tileX: 0,
    tileZ: -1,
  },
  {
    id: 'apothecary-conservatory',
    title: "Isolde's Apothecary Conservatory",
    shortLabel: 'Conservatory',
    regionName: 'East Cloister Terrace (+1.15m)',
    biome: 'apothecary-stall',
    x: 7.4,
    z: -12.8,
    tileX: 1,
    tileZ: -1,
  },
];

/**
 * Evaluates the hand-crafted multi-tier ground elevation across Vaelenport:
 * - Tier 3 (Northern Scholars' Cloister & Conservatory, z <= -10.6): y = 1.15m
 * - Grand Northern Balustrade Staircase (x in [-3.1, 3.1], z in [-10.6, -6.8]): stepped 0.28m -> 1.15m
 * - Tier 1 (Central Lantern Plaza, Guildhall & Lute Pavilion, z in [-10.6, 5.4]): y = 0.28m
 * - Twin Arched Stone Bridges over the Canal (x around -5.2 or +5.5, z in [5.2, 10.2]): arched 0.28m -> 0.46m -> 0.20m
 * - Canal Water Channel (z in [5.5, 9.8] outside bridges): y = 0.08m
 * - Tier 2 (Southern Lower Canal Quays & Gondola Jetty, z >= 9.8): y = 0.20m
 */
export function getOpenWorldGroundHeight(x: number, z: number): number {
  // 1. Grand Northern Staircase connecting Plaza (z = -6.8, y = 0.28) to Upper Cloister (z = -10.6, y = 1.15)
  if (Math.abs(x) <= 3.2 && z >= -10.6 && z <= -6.8) {
    const t = THREE.MathUtils.clamp((-6.8 - z) / 3.8, 0, 1);
    const steps = 8;
    return 0.28 + Math.round(t * steps) * ((1.15 - 0.28) / steps);
  }

  // 2. Tier 3: Northern Scholars' Cloister & Apothecary Conservatory Upper Terrace
  if (z < -10.6 && Math.abs(x) <= 16.5 && z >= -21.0) {
    return 1.15;
  }

  // 3. Twin Arched Stone Canal Bridges (West Bridge at x = -5.2, East Bridge at x = 5.5)
  const onWestBridge = Math.abs(x - -5.2) <= 1.65 && z >= 5.1 && z <= 10.3;
  const onEastBridge = Math.abs(x - 5.5) <= 1.65 && z >= 5.1 && z <= 10.3;
  if (onWestBridge || onEastBridge) {
    const normZ = (z - 5.1) / 5.2; // 0 at North (Plaza), 1 at South (Quays)
    const baseSlope = THREE.MathUtils.lerp(0.28, 0.2, normZ);
    const archCrown = Math.sin(normZ * Math.PI) * 0.22;
    return Number((baseSlope + archCrown).toFixed(3));
  }

  // 4. Sunken Canal Waterway Channel (z in [5.5, 9.8])
  if (z > 5.4 && z < 9.8 && Math.abs(x) <= 18.0) {
    return 0.08;
  }

  // 5. Tier 2: Southern Lower Canal Quays & Lock-Keeper Promenade
  if (z >= 9.8 && z <= 18.5 && Math.abs(x) <= 18.0) {
    return 0.2;
  }

  // 6. Tier 1: Central Lantern Plaza, Guildhall & Lute Pavilion
  return 0.28;
}

/**
 * Builds the Hand-Crafted Multi-Tier Gothic Canal City of Vaelenport:
 * - District 1: The Lantern Plaza, Astrolabe Fountain, Clockmaker's Guildhall (enterable) & Lute Pavilion
 * - District 2: The Lower Canal Quays, Twin Arched Bridges, Gondola Skiff & Movable Lock Gates
 * - District 3: The Scholars' Cloister, Grand Staircase, Rose Window & Apothecary Conservatory (enterable)
 * - 5 Scheduled Citizens who move and work across the city according to the 24-hour game clock
 */
export function buildContinuousOpenWorld(
  scene: THREE.Scene,
  worldSeed = 4821
): VaelenportCityRig {
  const rng = createSeededRng(worldSeed);
  const root = new THREE.Group();
  root.name = `VaelenportSanctuaryCity_${worldSeed}`;
  scene.add(root);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const colliders: CircleCollider[] = [];
  const interactables: InteractiveProp[] = [];
  const destructibles: DestructibleProp[] = [];

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
          float wx = vWorldPosDapple.x * 0.36 + vWorldPosDapple.y * 0.18;
          float wz = vWorldPosDapple.z * 0.36 - vWorldPosDapple.y * 0.12;
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
    y = 0.29,
    rotY = 0
  ) => {
    const plane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(rx * 2, rz * 2)),
      shadowBaseMat
    );
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.z = rotY;
    plane.position.set(x, y, z);
    plane.renderOrder = 1;
    parent.add(plane);
    return plane;
  };

  // ==========================================================================
  // HAND-CRAFTED ARCHITECTURAL PALETTE MATERIALS
  // ==========================================================================
  const basaltFoundationMat = createDappledMaterial('#262830', 0.45);
  const plazaLimestoneMat = createDappledMaterial('#747066', 0.95);
  const plazaFlagstoneLightMat = createDappledMaterial('#8A8478', 1.0, true);
  const plazaFlagstoneWarmMat = createDappledMaterial('#7F7668', 0.95, true);
  const cloisterMarbleMat = createDappledMaterial('#948E82', 0.92);
  const quayCobbleMat = createDappledMaterial('#565B64', 0.88);
  const ashlarWallMat = createDappledMaterial('#66625B', 0.78);
  const ashlarTrimMat = createDappledMaterial('#857F74', 0.85);
  const darkIronMat = createDappledMaterial('#2A2D36', 0.35);
  const brassMat = createDappledMaterial('#D49B3E', 0.55);
  const timberDarkMat = createDappledMaterial('#4A3222', 0.65);
  const timberWarmMat = createDappledMaterial('#6B472E', 0.7);
  const roofSlateBlueMat = createDappledMaterial('#354356', 0.85);
  const roofCrimsonTileMat = createDappledMaterial('#7B2D28', 0.85);
  const foliageDeepMat = createDappledMaterial('#2D5A44', 0.95);
  const foliageSageMat = createDappledMaterial('#487D5E', 1.0);
  const waterCanalMat = createDappledMaterial('#1E4D58', 0.65, true);
  const waterFountainMat = createDappledMaterial('#2B7280', 0.75, true);

  const glassConservatoryMat = new THREE.MeshLambertMaterial({
    color: '#88D4E8',
    transparent: true,
    opacity: 0.48,
  });
  materials.push(glassConservatoryMat);

  const flameInnerMat = new THREE.MeshBasicMaterial({ color: '#FFF6D6' });
  const flameOuterMat = new THREE.MeshBasicMaterial({ color: '#F59E0B' });
  const roseWindowGlowMat = new THREE.MeshBasicMaterial({ color: '#F59E0B' });
  const emeraldElixirMat = new THREE.MeshBasicMaterial({ color: '#34D399' });
  const waterRippleMat = new THREE.MeshBasicMaterial({
    color: '#7DD3FC',
    transparent: true,
    opacity: 0.42,
  });
  materials.push(
    flameInnerMat,
    flameOuterMat,
    roseWindowGlowMat,
    emeraldElixirMat,
    waterRippleMat
  );

  // Layer Toggle Sub-Groups
  const roofSlabGroup = new THREE.Group();
  const waterFenGroup = new THREE.Group();
  const gravekeeperGroup = new THREE.Group();
  const embersAndMotesGroup = new THREE.Group();
  root.add(roofSlabGroup, waterFenGroup, gravekeeperGroup, embersAndMotesGroup);

  // ==========================================================================
  // 1. MULTI-TIER MASONRY FOUNDATIONS & CANAL BASIN
  // ==========================================================================
  // Deep Basalt Sub-Plinth under the entire Sanctuary
  const basePlinth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(40, 0.8, 42)),
    basaltFoundationMat
  );
  basePlinth.position.set(0, -0.35, -1.0);
  root.add(basePlinth);

  // Tier 1: Central Lantern Plaza Deck (x: -16..16, z: -10.6..5.4, top y = 0.28m)
  const plazaSlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(32, 0.56, 16.0)),
    plazaLimestoneMat
  );
  plazaSlab.position.set(0, 0.0, -2.6);
  root.add(plazaSlab);

  // Herringbone & Radial Flagstone Inlays across the Lantern Plaza
  const tileGeo = trackGeo(new THREE.BoxGeometry(1.35, 0.04, 0.95));
  for (let gx = -12; gx <= 12; gx += 2) {
    for (let gz = -9; gz <= 4; gz += 2) {
      const distCenter = Math.hypot(gx, gz + 0.5);
      if (distCenter < 2.4) continue; // Leave room for Astrolabe Fountain
      const tile = new THREE.Mesh(
        tileGeo,
        (gx + gz) % 4 === 0 ? plazaFlagstoneLightMat : plazaFlagstoneWarmMat
      );
      tile.position.set(gx * 0.95, 0.27, gz * 0.95);
      tile.rotation.y = ((gx * 3 + gz) % 2) * 0.04;
      root.add(tile);
    }
  }

  // Tier 3: Northern Scholars' Cloister Upper Terrace (x: -16..16, z: -20.5..-10.6, top y = 1.15m)
  const cloisterTerrace = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(32, 1.15, 10.0)),
    cloisterMarbleMat
  );
  cloisterTerrace.position.set(0, 0.575, -15.6);
  root.add(cloisterTerrace);

  // Retaining Wall & Balustrade along the Cloister Drop-Off (z = -10.6)
  // Left Retaining Wall (x: -16..-3.2) & Right Retaining Wall (x: 3.2..16)
  [-9.6, 9.6].forEach((wx) => {
    const retainWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(12.8, 0.46, 0.45)),
      ashlarTrimMat
    );
    retainWall.position.set(wx, 1.38, -10.6);
    root.add(retainWall);

    // Colliders along the terrace edge so the player uses the grand staircase
    for (let cx = wx - 5.6; cx <= wx + 5.6; cx += 1.4) {
      colliders.push({ x: cx, z: -10.6, radius: 0.55 });
    }
  });

  // Grand Northern Balustrade Staircase (x: -3.2..3.2, z: -10.6..-6.8, 8 steps from 0.28m to 1.15m)
  for (let s = 0; s < 8; s++) {
    const stepT = s / 7;
    const stepY = THREE.MathUtils.lerp(0.28, 1.15, stepT);
    const stepZ = THREE.MathUtils.lerp(-6.9, -10.5, stepT);
    const tread = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.0, stepY, 0.52)),
      cloisterMarbleMat
    );
    tread.position.set(0, stepY * 0.5, stepZ);
    root.add(tread);
  }
  // Staircase Cheek Balustrades
  [-3.2, 3.2].forEach((bx) => {
    const newelLow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.48, 0.95, 0.48)),
      ashlarTrimMat
    );
    newelLow.position.set(bx, 0.65, -6.8);
    root.add(newelLow);

    const newelHigh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.48, 1.65, 0.48)),
      ashlarTrimMat
    );
    newelHigh.position.set(bx, 1.45, -10.6);
    root.add(newelHigh);
    colliders.push({ x: bx, z: -6.8, radius: 0.45 });
    colliders.push({ x: bx, z: -8.7, radius: 0.45 });
  });

  // ==========================================================================
  // 2. DISTRICT 2: THE LOWER CANAL QUAYS, BRIDGES, WATERWHEEL & LOCK GATES
  // ==========================================================================
  // Canal Water Surface (z: 5.4..9.8, y = 0.08m)
  const canalWaterMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(34.0, 0.14, 4.6)),
    waterCanalMat
  );
  canalWaterMesh.position.set(0, 0.02, 7.6);
  waterFenGroup.add(canalWaterMesh);

  // Tier 2: Southern Lower Canal Quays Promenade (z: 9.8..17.5, top y = 0.20m)
  const southQuaySlab = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(32.0, 0.4, 7.8)),
    quayCobbleMat
  );
  southQuaySlab.position.set(0, 0.0, 13.7);
  root.add(southQuaySlab);

  // Canal Embankment Coping Stones & Low Parapets (with openings at the West & East Bridges)
  const parapetSegments = [
    { x: -11.5, w: 9.0, z: 5.35 },
    { x: 0.15, w: 7.4, z: 5.35 },
    { x: 11.5, w: 8.6, z: 5.35 },
  ];
  parapetSegments.forEach((seg) => {
    const coping = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(seg.w, 0.34, 0.38)),
      ashlarTrimMat
    );
    coping.position.set(seg.x, 0.44, seg.z);
    root.add(coping);

    // Prevent accidental walk-off into the deep canal except at bridges
    for (let cx = seg.x - seg.w * 0.44; cx <= seg.x + seg.w * 0.44; cx += 1.3) {
      colliders.push({ x: cx, z: seg.z, radius: 0.42 });
    }
  });

  // Twin Arched Stone Bridges (West Guild Bridge at x = -5.2, East Lock Bridge at x = 5.5)
  const buildCanalBridge = (bx: number, name: string) => {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = name;
    bridgeGroup.position.set(bx, 0, 7.65);
    root.add(bridgeGroup);

    // 5 Stepped Arch Voussoir Deck Segments
    for (let i = -2; i <= 2; i++) {
      const norm = (i + 2) / 4;
      const deckY =
        THREE.MathUtils.lerp(0.28, 0.2, norm) + Math.sin(norm * Math.PI) * 0.22;
      const seg = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.2, 0.24, 1.12)),
        ashlarTrimMat
      );
      seg.position.set(0, deckY - 0.1, (i / 2) * 2.1);
      bridgeGroup.add(seg);
    }

    // Stone Bridge Parapet Walls & Brass Bridge Lanterns
    [-1.55, 1.55].forEach((sideX) => {
      const rail = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.28, 0.48, 5.2)),
        ashlarWallMat
      );
      rail.position.set(sideX, 0.56, 0);
      bridgeGroup.add(rail);

      const post = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.38, 0.95, 0.38)),
        ashlarTrimMat
      );
      post.position.set(sideX, 0.78, 0);
      bridgeGroup.add(post);

      const lantern = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22, 0.28, 0.22)),
        flameOuterMat
      );
      lantern.position.set(sideX, 1.32, 0);
      bridgeGroup.add(lantern);

      colliders.push({ x: bx + sideX, z: 6.2, radius: 0.32 });
      colliders.push({ x: bx + sideX, z: 7.65, radius: 0.32 });
      colliders.push({ x: bx + sideX, z: 9.1, radius: 0.32 });
    });
  };

  buildCanalBridge(-5.2, 'WestGuildBridge');
  buildCanalBridge(5.5, 'EastLockBridge');

  // Southern Gondola Jetty & Moored Lantern Skiff (x = -2.0, z = 10.6)
  const jettyDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.6, 0.14, 2.2)),
    timberWarmMat
  );
  jettyDeck.position.set(-2.0, 0.22, 9.5);
  waterFenGroup.add(jettyDeck);

  // Moored Lantern Gondola Skiff (bobs harmonically on the canal)
  const gondolaPivot = new THREE.Group();
  gondolaPivot.position.set(-2.0, 0.14, 8.1);
  waterFenGroup.add(gondolaPivot);

  const hullMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 0.26, 0.88)),
    timberDarkMat
  );
  gondolaPivot.add(hullMesh);

  const prowFront = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.42, 0.75, 4)),
    brassMat
  );
  prowFront.rotation.z = -Math.PI / 2;
  prowFront.position.set(1.45, 0.12, 0);
  gondolaPivot.add(prowFront);

  const skiffLanternPost = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6)),
    darkIronMat
  );
  skiffLanternPost.position.set(0.95, 0.45, 0);
  gondolaPivot.add(skiffLanternPost);

  const skiffLanternGlow = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.14, 8, 8)),
    flameInnerMat
  );
  skiffLanternGlow.position.set(0.95, 0.85, 0);
  gondolaPivot.add(skiffLanternGlow);

  // Interactive Canal Fishing Spot on the Gondola Jetty
  interactables.push({
    id: 'canal-jetty-fishing',
    type: 'fishing',
    x: -2.0,
    z: 10.1,
    radius: 2.3,
    isActivated: false,
    getPrompt: () => 'Press [E] to Cast Line from the Lower Canal Gondola Jetty',
    activate: () => 'Cast fishing line into the Lower Canal basin!',
  });

  // Eastern Mechanical Canal Lock Gate & Rotating Waterwheel (x = 11.2, z = 7.6)
  const waterwheelPivot = new THREE.Group();
  waterwheelPivot.position.set(9.2, 0.65, 5.85);
  waterFenGroup.add(waterwheelPivot);

  const wheelRim = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.25, 1.25, 0.38, 12)),
    timberDarkMat
  );
  wheelRim.rotation.x = Math.PI / 2;
  waterwheelPivot.add(wheelRim);

  for (let p = 0; p < 8; p++) {
    const angle = (p / 8) * Math.PI * 2;
    const paddle = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 2.7, 0.48)),
      timberWarmMat
    );
    paddle.rotation.z = angle;
    waterwheelPivot.add(paddle);
  }

  // Lock Gate Masonry Piers & Swinging Iron Sluice Doors
  [-1.9, 1.9].forEach((zOff) => {
    const lockPier = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.1, 1.85, 0.9)),
      ashlarWallMat
    );
    lockPier.position.set(11.4, 0.85, 7.6 + zOff);
    root.add(lockPier);
    colliders.push({ x: 11.4, z: 7.6 + zOff, radius: 0.65 });
  });

  const leftLockGatePivot = new THREE.Group();
  leftLockGatePivot.position.set(11.4, 0.55, 6.1);
  root.add(leftLockGatePivot);
  const leftGateLeaf = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.26, 1.25, 1.55)),
    darkIronMat
  );
  leftGateLeaf.position.set(0, 0, 0.75);
  leftLockGatePivot.add(leftGateLeaf);

  const rightLockGatePivot = new THREE.Group();
  rightLockGatePivot.position.set(11.4, 0.55, 9.1);
  root.add(rightLockGatePivot);
  const rightGateLeaf = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.26, 1.25, 1.55)),
    darkIronMat
  );
  rightGateLeaf.position.set(0, 0, -0.75);
  rightLockGatePivot.add(rightGateLeaf);

  let canalLockOpen = false;
  let lockTargetAngle = 0;

  // Brass Capstan Winch on the Lower Quay (x = 9.8, z = 10.5)
  const capstanMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.32, 0.38, 0.72, 8)),
    brassMat
  );
  capstanMesh.position.set(9.8, 0.56, 10.5);
  root.add(capstanMesh);
  colliders.push({ x: 9.8, z: 10.5, radius: 0.45 });

  const lockInteractable: InteractiveProp = {
    id: 'eastern-canal-lock-winch',
    type: 'gate',
    x: 9.8,
    z: 10.5,
    radius: 2.2,
    isActivated: false,
    getPrompt: () =>
      canalLockOpen
        ? 'Press [E] to Close Eastern Canal Lock Sluice'
        : 'Press [E] to Turn Brass Capstan & Open the Old Canal Lock',
    activate: () => {
      canalLockOpen = !canalLockOpen;
      lockInteractable.isActivated = canalLockOpen;
      lockTargetAngle = canalLockOpen ? 1.18 : 0.0;
      return canalLockOpen
        ? 'Cranked open the Eastern Canal Lock Gates — the canal surges freely!'
        : 'Closed the Eastern Canal Lock Gates.';
    },
  };
  interactables.push(lockInteractable);

  // Expanding Water Ripple Rings along the Canal
  const rippleRings: { mesh: THREE.Mesh; phaseOffset: number }[] = [];
  const rippleRingGeo = trackGeo(new THREE.RingGeometry(0.18, 0.25, 16));
  [
    [-2.0, 8.1],
    [1.8, 7.5],
    [8.8, 6.8],
    [-8.2, 7.6],
  ].forEach(([rx, rz], idx) => {
    const rMesh = new THREE.Mesh(rippleRingGeo, waterRippleMat);
    rMesh.rotation.x = -Math.PI / 2;
    rMesh.position.set(rx, 0.1, rz);
    waterFenGroup.add(rMesh);
    rippleRings.push({ mesh: rMesh, phaseOffset: idx * 0.25 });
  });

  // ==========================================================================
  // 3. DISTRICT 1: THE LANTERN PLAZA, ASTROLABE FOUNTAIN, GUILDHALL & PAVILION
  // ==========================================================================
  // Centerpiece: The Astrolabe Clockwork Fountain (x = 0, z = -0.5)
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0.28, -0.5);
  root.add(fountainGroup);
  addBlobShadow(root, 0, -0.5, 2.7, 2.7, 0.29);

  const basinOuter = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.35, 2.55, 0.52, 8)),
    ashlarTrimMat
  );
  basinOuter.position.y = 0.26;
  fountainGroup.add(basinOuter);

  const basinWater = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.05, 2.05, 0.44, 8)),
    waterFountainMat
  );
  basinWater.position.y = 0.28;
  fountainGroup.add(basinWater);

  const fountainPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.48, 0.68, 1.65, 8)),
    ashlarWallMat
  );
  fountainPedestal.position.y = 0.82;
  fountainGroup.add(fountainPedestal);

  // Counter-rotating Brass Astrolabe Armillary Rings
  const astrolabeOuterRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.95, 0.065, 8, 20)),
    brassMat
  );
  astrolabeOuterRing.position.y = 2.25;
  fountainGroup.add(astrolabeOuterRing);

  const astrolabeInnerRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.68, 0.055, 8, 16)),
    brassMat
  );
  astrolabeInnerRing.position.y = 2.25;
  fountainGroup.add(astrolabeInnerRing);

  const astrolabeCore = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.28, 0)),
    flameInnerMat
  );
  astrolabeCore.position.y = 2.25;
  fountainGroup.add(astrolabeCore);

  colliders.push({ x: 0, z: -0.5, radius: 2.4 });

  // Enterable Building 1: Master Vaelen's Clockmaker Guildhall (West Plaza: x = -7.5, z = -3.2)
  const guildhallGroup = new THREE.Group();
  guildhallGroup.position.set(-7.5, 0.28, -3.2);
  root.add(guildhallGroup);
  addBlobShadow(root, -7.5, -3.2, 4.2, 3.2, 0.29);

  // Interior Warm Wood Floor
  const guildFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(6.4, 0.08, 4.6)),
    timberWarmMat
  );
  guildFloor.position.y = 0.04;
  guildhallGroup.add(guildFloor);

  // Back Wall, North Wall & South Wall (East facade open with arched pillars so player can walk inside)
  const guildBackWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.42, 2.5, 4.6)),
    ashlarWallMat
  );
  guildBackWall.position.set(-3.0, 1.25, 0);
  guildhallGroup.add(guildBackWall);

  [-2.1, 2.1].forEach((zSide) => {
    const sideWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(6.0, 2.5, 0.42)),
      ashlarWallMat
    );
    sideWall.position.set(0, 1.25, zSide);
    guildhallGroup.add(sideWall);
    colliders.push({ x: -7.5 - 1.5, z: -3.2 + zSide, radius: 0.55 });
    colliders.push({ x: -7.5 + 1.5, z: -3.2 + zSide, radius: 0.55 });
  });
  colliders.push({ x: -10.5, z: -3.2, radius: 0.7 });

  // Guildhall Interior Furnishings: Clockwork Workbench, Brass Escapement Gear & Hearth
  const guildBench = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.2, 0.82, 2.6)),
    timberDarkMat
  );
  guildBench.position.set(-1.6, 0.42, 0);
  guildhallGroup.add(guildBench);

  const guildGearWheel = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12)),
    brassMat
  );
  guildGearWheel.position.set(-1.5, 0.92, 0.3);
  guildhallGroup.add(guildGearWheel);

  // Guildhall Overhanging Slate Roof (placed in roofSlabGroup for Automatic Interior Cutaway!)
  const guildRoofPivot = new THREE.Group();
  guildRoofPivot.position.set(-7.5, 2.85, -3.2);
  roofSlabGroup.add(guildRoofPivot);

  const guildRoofLower = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(4.8, 1.65, 4)),
    roofSlateBlueMat
  );
  guildRoofLower.rotation.y = Math.PI / 4;
  guildRoofLower.scale.set(1.15, 1.0, 0.88);
  guildRoofPivot.add(guildRoofLower);

  const guildClockSpire = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.45, 0.58, 1.8, 6)),
    brassMat
  );
  guildClockSpire.position.set(0, 1.35, 0);
  guildRoofPivot.add(guildClockSpire);

  // East Plaza: The Hearthside Lute Pavilion (x = 6.2, z = -2.5)
  const pavilionGroup = new THREE.Group();
  pavilionGroup.position.set(6.2, 0.28, -2.5);
  root.add(pavilionGroup);
  addBlobShadow(root, 6.2, -2.5, 3.0, 2.6, 0.29);

  const pavilionDais = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.4, 2.6, 0.22, 8)),
    ashlarTrimMat
  );
  pavilionDais.position.y = 0.11;
  pavilionGroup.add(pavilionDais);

  for (let p = 0; p < 4; p++) {
    const ang = (p / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(ang) * 1.95;
    const pz = Math.sin(ang) * 1.95;
    const col = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.14, 0.16, 2.3, 6)),
      timberDarkMat
    );
    col.position.set(px, 1.25, pz);
    pavilionGroup.add(col);
    colliders.push({ x: 6.2 + px, z: -2.5 + pz, radius: 0.28 });
  }

  const pavilionCanopy = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(2.85, 1.15, 8)),
    roofCrimsonTileMat
  );
  pavilionCanopy.position.set(6.2, 3.1, -2.5);
  roofSlabGroup.add(pavilionCanopy);

  // ==========================================================================
  // 4. DISTRICT 3: THE SCHOLARS' CLOISTER, ROSE WINDOW & APOTHECARY CONSERVATORY
  // ==========================================================================
  // Gothic Pointed-Arch Colonnade & Rose Window Sanctuary (West/Center Cloister: x = -2.5, z = -17.5, y = 1.15m)
  const cloisterSanctuary = new THREE.Group();
  cloisterSanctuary.position.set(-2.5, 1.15, -17.5);
  root.add(cloisterSanctuary);

  const roseWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(7.2, 4.2, 0.55)),
    ashlarWallMat
  );
  roseWall.position.set(0, 2.1, 0);
  cloisterSanctuary.add(roseWall);
  colliders.push({ x: -2.5, z: -17.5, radius: 1.2 });

  // Glowing Stained-Glass Rose Window
  const roseOuterRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.35, 0.14, 8, 16)),
    ashlarTrimMat
  );
  roseOuterRim.position.set(0, 2.55, 0.3);
  cloisterSanctuary.add(roseOuterRim);

  const roseGlassDisc = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.25, 1.25, 0.08, 16)),
    roseWindowGlowMat
  );
  roseGlassDisc.rotation.x = Math.PI / 2;
  roseGlassDisc.position.set(0, 2.55, 0.28);
  cloisterSanctuary.add(roseGlassDisc);

  // Interactive Sanctuary Cloister Bell under the Colonnade Arch (x = -5.5, z = -16.2)
  const belfryArch = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.6, 3.2, 1.2)),
    ashlarTrimMat
  );
  belfryArch.position.set(-3.2, 1.6, 1.2);
  cloisterSanctuary.add(belfryArch);

  const bellMesh = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.36, 0.52, 8)),
    brassMat
  );
  bellMesh.position.set(-3.2, 2.45, 1.2);
  cloisterSanctuary.add(bellMesh);

  let bellSwingBoost = 0;
  interactables.push({
    id: 'cloister-sanctuary-bell',
    type: 'bell',
    x: -5.7,
    z: -16.3,
    radius: 2.2,
    isActivated: false,
    getPrompt: () => 'Press [E] to Toll the Scholars’ Cloister Sanctuary Bell',
    activate: () => {
      bellSwingBoost = 1.0;
      return 'The Scholars’ Cloister Bell resonates across all three tiers of Vaelenport!';
    },
  });

  // Enterable Building 2: Isolde's Glass-and-Timber Apothecary Conservatory (East Cloister: x = 7.4, z = -14.5, y = 1.15m)
  const conservatoryGroup = new THREE.Group();
  conservatoryGroup.position.set(7.4, 1.15, -14.5);
  root.add(conservatoryGroup);
  addBlobShadow(root, 7.4, -14.5, 3.8, 2.8, 1.16);

  const conservatoryFloor = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.8, 0.08, 4.2)),
    plazaFlagstoneLightMat
  );
  conservatoryFloor.position.y = 0.04;
  conservatoryGroup.add(conservatoryFloor);

  // Conservatory Timber Frame & Glass Walls
  const consBackWall = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(5.8, 2.3, 0.25)),
    glassConservatoryMat
  );
  consBackWall.position.set(0, 1.15, -2.0);
  conservatoryGroup.add(consBackWall);
  colliders.push({ x: 7.4, z: -16.5, radius: 0.7 });

  // Botanical Planter Beds & Glowing Distillation Alembic inside the Conservatory
  const herbBedLeft = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.4, 0.55, 3.2)),
    foliageDeepMat
  );
  herbBedLeft.position.set(-1.9, 0.3, 0);
  conservatoryGroup.add(herbBedLeft);

  const alembicTable = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.2, 0.78, 1.1)),
    timberWarmMat
  );
  alembicTable.position.set(0.8, 0.4, -0.8);
  conservatoryGroup.add(alembicTable);

  const elixirVessel = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.24, 8, 8)),
    emeraldElixirMat
  );
  elixirVessel.position.set(0.8, 0.98, -0.8);
  conservatoryGroup.add(elixirVessel);

  // Conservatory Overhanging Glass-and-Slate Roof (cuts away when inside!)
  const conservatoryRoof = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(4.2, 1.45, 4)),
    roofSlateBlueMat
  );
  conservatoryRoof.position.set(7.4, 4.05, -14.5);
  conservatoryRoof.rotation.y = Math.PI / 4;
  conservatoryRoof.scale.set(1.15, 1.0, 0.85);
  roofSlabGroup.add(conservatoryRoof);

  // Cypress & Silver-Fern Trees framing the Plaza and Cloister
  const treePositions: [number, number, number][] = [
    [-13.2, 0.28, -8.5],
    [12.8, 0.28, -8.2],
    [-13.5, 0.28, 3.2],
    [13.5, 0.28, 3.2],
    [-11.5, 1.15, -18.2],
    [12.5, 1.15, -18.0],
    [-11.8, 0.2, 14.2],
    [13.2, 0.2, 14.2],
  ];
  treePositions.forEach(([tx, ty, tz], idx) => {
    const trunk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.32, 1.4, 6)),
      timberDarkMat
    );
    trunk.position.set(tx, ty + 0.7, tz);
    root.add(trunk);

    const canopy1 = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(1.15, 2.2, 7)),
      idx % 2 === 0 ? foliageDeepMat : foliageSageMat
    );
    canopy1.position.set(tx, ty + 2.1, tz);
    root.add(canopy1);

    const canopy2 = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.85, 1.7, 7)),
      foliageSageMat
    );
    canopy2.position.set(tx, ty + 3.1, tz);
    root.add(canopy2);

    addBlobShadow(root, tx, tz, 1.2, 1.2, ty + 0.01);
    colliders.push({ x: tx, z: tz, radius: 0.45 });
  });

  // ==========================================================================
  // 5. CITY BRAZIERS & SWAYING FESTIVAL LANTERN STRINGS
  // ==========================================================================
  interface BrazierNode {
    id: string;
    x: number;
    y: number;
    z: number;
    isLit: boolean;
    flamePivot: THREE.Group;
    light: THREE.PointLight;
    interactable: InteractiveProp;
  }
  const brazierNodes: BrazierNode[] = [];

  const brazierCoords: { id: string; x: number; y: number; z: number; lit: boolean }[] = [
    { id: 'brazier-plaza-west', x: -3.6, y: 0.28, z: -0.5, lit: true },
    { id: 'brazier-plaza-east', x: 3.6, y: 0.28, z: -0.5, lit: true },
    { id: 'brazier-stairs-south', x: -3.6, y: 0.28, z: -6.2, lit: true },
    { id: 'brazier-stairs-east', x: 3.6, y: 0.28, z: -6.2, lit: false },
    { id: 'brazier-cloister-upper', x: -0.5, y: 1.15, z: -12.8, lit: true },
    { id: 'brazier-canal-quay', x: 1.8, y: 0.2, z: 10.8, lit: false },
  ];

  brazierCoords.forEach((bc) => {
    const pedestal = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32, 0.42, 0.78, 6)),
      darkIronMat
    );
    pedestal.position.set(bc.x, bc.y + 0.39, bc.z);
    root.add(pedestal);
    colliders.push({ x: bc.x, z: bc.z, radius: 0.42 });

    const flamePivot = new THREE.Group();
    flamePivot.position.set(bc.x, bc.y + 0.82, bc.z);
    flamePivot.visible = bc.lit;
    root.add(flamePivot);

    const outerCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.26, 0.58, 6)),
      flameOuterMat
    );
    outerCone.position.y = 0.24;
    flamePivot.add(outerCone);

    const innerCone = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.15, 0.38, 6)),
      flameInnerMat
    );
    innerCone.position.y = 0.18;
    flamePivot.add(innerCone);

    const light = new THREE.PointLight('#F59E0B', bc.lit ? 2.2 : 0, 8.5, 1.7);
    light.position.set(bc.x, bc.y + 1.35, bc.z);
    root.add(light);

    const node: BrazierNode = {
      id: bc.id,
      x: bc.x,
      y: bc.y,
      z: bc.z,
      isLit: bc.lit,
      flamePivot,
      light,
      interactable: null as unknown as InteractiveProp,
    };

    const inter: InteractiveProp = {
      id: bc.id,
      type: 'brazier',
      x: bc.x,
      z: bc.z,
      radius: 1.9,
      isActivated: bc.lit,
      getPrompt: () =>
        node.isLit
          ? 'Press [E] to Douse Sanctuary Brazier'
          : 'Press [E] to Ignite Sanctuary Brazier',
      activate: () => {
        node.isLit = !node.isLit;
        inter.isActivated = node.isLit;
        node.flamePivot.visible = node.isLit;
        node.light.intensity = node.isLit ? 2.4 : 0;
        return node.isLit
          ? 'Ignited Vaelenport Brazier — warm amber light spills across the stone!'
          : 'Doused Vaelenport Brazier.';
      },
    };
    node.interactable = inter;
    interactables.push(inter);
    brazierNodes.push(node);
  });

  // Swaying Overhead Festival Lantern Strings across the Lantern Plaza
  const hangingLanterns: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  const lanternBulbGeo = trackGeo(new THREE.SphereGeometry(0.15, 6, 6));
  const stringSpans: [number, number, number, number][] = [
    [-4.8, -2.5, -1.2, -0.8],
    [1.2, -0.8, 5.2, -2.2],
  ];
  stringSpans.forEach(([x0, z0, x1, z1], sIdx) => {
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const lx = THREE.MathUtils.lerp(x0, x1, t);
      const lz = THREE.MathUtils.lerp(z0, z1, t);
      const sag = Math.sin(t * Math.PI) * 0.35;
      const ly = 2.95 - sag;
      const bulb = new THREE.Mesh(lanternBulbGeo, flameOuterMat);
      bulb.position.set(lx, ly, lz);
      embersAndMotesGroup.add(bulb);
      hangingLanterns.push({ mesh: bulb, baseY: ly, phase: sIdx * 1.5 + i * 0.6 });
    }
  });

  // ==========================================================================
  // 6. FIVE HAND-CRAFTED SCHEDULED CITIZENS OF VAELENPORT
  // ==========================================================================
  interface ScheduledCitizenActor {
    profile: CitizenProfile;
    group: THREE.Group;
    torsoPivot: THREE.Group;
    headPivot: THREE.Group;
    toolPivot: THREE.Group;
    interactable: InteractiveProp;
    phaseOffset: number;
  }

  const citizenActors: ScheduledCitizenActor[] = [];
  const skinCitizenMat = createDappledMaterial('#E2BEA0', 0.6);

  (Object.keys(VAELENPORT_CITIZENS) as CitizenId[]).forEach((cid, idx) => {
    const profile = VAELENPORT_CITIZENS[cid];
    const cloakMat = createDappledMaterial(profile.cloakColorHex, 0.75);
    const trimMat = createDappledMaterial(profile.trimColorHex, 0.65);

    const actorGroup = new THREE.Group();
    actorGroup.name = `Citizen_${profile.id}`;
    gravekeeperGroup.add(actorGroup);

    const shadow = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.1, 1.1)),
      shadowBaseMat
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    actorGroup.add(shadow);

    // Lower Robe / Tunic Skirt
    const skirtMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.24, 0.34, 0.68, 8)),
      cloakMat
    );
    skirtMesh.position.y = 0.34;
    actorGroup.add(skirtMesh);

    const torsoPivot = new THREE.Group();
    torsoPivot.position.y = 0.72;
    actorGroup.add(torsoPivot);

    const torsoMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.26, 0.22, 0.54, 8)),
      cloakMat
    );
    torsoMesh.position.y = 0.22;
    torsoPivot.add(torsoMesh);

    const mantleMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.32, 0.35, 0.16, 8)),
      trimMat
    );
    mantleMesh.position.y = 0.42;
    torsoPivot.add(mantleMesh);

    const headPivot = new THREE.Group();
    headPivot.position.y = 0.56;
    torsoPivot.add(headPivot);

    const headMesh = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.19, 8, 8)),
      skinCitizenMat
    );
    headMesh.position.y = 0.14;
    headPivot.add(headMesh);

    // Signature Hat per Citizen
    const hatCone = new THREE.Mesh(
      trackGeo(
        profile.hatStyle === 'clockmaker' || profile.hatStyle === 'dockmaster'
          ? new THREE.CylinderGeometry(0.28, 0.26, 0.16, 8)
          : new THREE.ConeGeometry(0.26, 0.44, 8)
      ),
      cloakMat
    );
    hatCone.position.y = 0.34;
    headPivot.add(hatCone);

    // Signature Held Artisan Tool
    const toolPivot = new THREE.Group();
    toolPivot.position.set(0.28, 0.18, 0.22);
    torsoPivot.add(toolPivot);

    const toolMesh = new THREE.Mesh(
      trackGeo(
        profile.id === 'isolde'
          ? new THREE.SphereGeometry(0.13, 8, 8)
          : profile.id === 'sera'
            ? new THREE.BoxGeometry(0.18, 0.48, 0.12)
            : new THREE.CylinderGeometry(0.04, 0.04, 0.95, 6)
      ),
      profile.id === 'isolde'
        ? emeraldElixirMat
        : profile.id === 'master-vaelen'
          ? brassMat
          : timberWarmMat
    );
    toolPivot.add(toolMesh);

    // Floating Gold Converse Marker above Citizen
    const promptGem = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.11, 0)),
      flameInnerMat
    );
    promptGem.position.set(0, 1.95, 0);
    actorGroup.add(promptGem);

    const initSlot = evaluateCitizenSchedule(profile, 12.0);
    const groundY = getOpenWorldGroundHeight(initSlot.x, initSlot.z);
    actorGroup.position.set(initSlot.x, groundY, initSlot.z);
    actorGroup.rotation.y = initSlot.facingAngle;

    const npcInteractable: InteractiveProp = {
      id: `citizen-${profile.id}`,
      type: 'npc',
      x: initSlot.x,
      z: initSlot.z,
      radius: 2.35,
      isActivated: false,
      npcDialog: {
        npcId: `citizen-${profile.id}`,
        citizenId: profile.id,
        name: profile.name,
        role: profile.role,
        greeting: profile.nodes[profile.defaultRootNodeId].text,
        loreHint: `${initSlot.districtTitle} · ${initSlot.activityLabel}`,
        scheduleActivity: initSlot.activityLabel,
      },
      getPrompt: () =>
        `Press [E] to Speak with ${profile.name} (${profile.role})`,
      activate: () => `Speaking with ${profile.name}`,
    };

    interactables.push(npcInteractable);
    citizenActors.push({
      profile,
      group: actorGroup,
      torsoPivot,
      headPivot,
      toolPivot,
      interactable: npcInteractable,
      phaseOffset: idx * 0.2,
    });
  });

  // ==========================================================================
  // 7. DESTRUCTIBLE CERAMIC URNS & SHATTER DEBRIS PHYSICS
  // ==========================================================================
  const urnCoords: [number, number][] = [
    [-4.4, -4.5],
    [4.6, -4.2],
    [-9.5, 2.2],
    [9.8, 2.5],
    [-6.2, -13.5],
    [4.2, -13.8],
    [-6.5, 12.2],
    [6.8, 12.5],
  ];
  const urnGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.28, 0.62, 7));
  urnCoords.forEach(([ux, uz], idx) => {
    const uy = getOpenWorldGroundHeight(ux, uz);
    const urnMesh = new THREE.Mesh(urnGeo, roofCrimsonTileMat);
    urnMesh.position.set(ux, uy + 0.31, uz);
    root.add(urnMesh);

    destructibles.push({
      id: `city-urn-${idx}`,
      type: 'urn',
      x: ux,
      z: uz,
      radius: 0.42,
      isBroken: false,
      mesh: urnMesh,
      shardColor: '#9E3D34',
      flashUntil: 0,
    });
  });

  interface DebrisShard {
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
  }
  const activeDebris: DebrisShard[] = [];
  const shardGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.12, 0.12));

  const spawnShatterDebris = (x: number, y: number, z: number, colorHex: string) => {
    const shardMat = createDappledMaterial(colorHex, 0.5);
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(shardGeo, shardMat);
      mesh.position.set(x, y + 0.25, z);
      root.add(mesh);
      const ang = (i / 8) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const spd = rng.range(1.6, 3.6);
      activeDebris.push({
        mesh,
        vx: Math.cos(ang) * spd,
        vy: rng.range(2.2, 4.4),
        vz: Math.sin(ang) * spd,
        life: 0.75,
      });
    }
  };

  const stepDebrisPhysics = (dt: number) => {
    for (let i = activeDebris.length - 1; i >= 0; i--) {
      const d = activeDebris[i];
      d.life -= dt;
      if (d.life <= 0) {
        root.remove(d.mesh);
        activeDebris.splice(i, 1);
        continue;
      }
      d.vy -= 12.0 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      const floorY = getOpenWorldGroundHeight(d.mesh.position.x, d.mesh.position.z);
      if (d.mesh.position.y < floorY + 0.06) {
        d.mesh.position.y = floorY + 0.06;
        d.vy = Math.abs(d.vy) * 0.35;
        d.vx *= 0.65;
        d.vz *= 0.65;
      }
    }
  };

  const respawnDestructibles = () => {
    destructibles.forEach((d) => {
      d.isBroken = false;
      d.mesh.visible = true;
    });
  };

  // Harmonic Embers above Lit Braziers
  const emberGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  const embers: {
    mesh: THREE.Mesh;
    brazierIndex: number;
    baseX: number;
    baseY: number;
    baseZ: number;
    phaseOffset: number;
    driftRadius: number;
    maxHeight: number;
    freqHarmonic: number;
  }[] = [];

  brazierNodes.forEach((bNode, bIdx) => {
    for (let i = 0; i < 5; i++) {
      const eMesh = new THREE.Mesh(emberGeo, i % 2 === 0 ? flameInnerMat : flameOuterMat);
      embersAndMotesGroup.add(eMesh);
      embers.push({
        mesh: eMesh,
        brazierIndex: bIdx,
        baseX: bNode.x + ((i % 3) - 1) * 0.14,
        baseY: bNode.y,
        baseZ: bNode.z + (((i * 2) % 3) - 1) * 0.14,
        phaseOffset: i / 5,
        driftRadius: 0.2 + (i % 3) * 0.07,
        maxHeight: 2.0 + (i % 3) * 0.4,
        freqHarmonic: (i % 2) + 1,
      });
    }
  });

  // Cutscene World Event Hook
  const triggerWorldEvent = (event: VaelenportWorldEvent) => {
    if (event === 'ignite-plaza-lanterns') {
      brazierNodes.forEach((bNode) => {
        bNode.isLit = true;
        bNode.interactable.isActivated = true;
        bNode.flamePivot.visible = true;
        bNode.light.intensity = 2.6;
      });
    } else if (event === 'open-canal-lock') {
      canalLockOpen = true;
      lockInteractable.isActivated = true;
      lockTargetAngle = 1.18;
    } else if (event === 'toll-cloister-bell') {
      bellSwingBoost = 1.25;
    }
  };

  const getCitizenPosition = (citizenId: CitizenId): { x: number; z: number } | null => {
    const found = citizenActors.find((a) => a.profile.id === citizenId);
    if (!found) return null;
    return { x: found.interactable.x, z: found.interactable.z };
  };

  // ==========================================================================
  // 8. DETERMINISTIC 60FPS WORLD ANIMATION & CITIZEN SCHEDULE UPDATE
  // ==========================================================================
  const updateAtTime = (
    timeSeconds: number,
    dappleIntensity: number,
    toggles: LayerToggles,
    brazierIntensityMultiplier = 1.0,
    nightFactor = 0.0,
    dayCycleHour = 12.0
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

    // 1. Rotate Astrolabe Fountain Rings & Canal Waterwheel
    astrolabeOuterRing.rotation.y = u;
    astrolabeOuterRing.rotation.x = Math.sin(u) * 0.35;
    astrolabeInnerRing.rotation.y = -u * 2.0;
    astrolabeInnerRing.rotation.z = Math.cos(u) * 0.45;
    astrolabeCore.position.y = 2.25 + Math.sin(u * 2.0) * 0.08;

    const wheelSpeed = canalLockOpen ? 2.0 : 1.0;
    waterwheelPivot.rotation.z = -u * wheelSpeed;

    // 2. Bob Moored Gondola Skiff on the Canal
    gondolaPivot.position.y = 0.14 + Math.sin(u * 2.0) * 0.035;
    gondolaPivot.rotation.z = Math.cos(u * 2.0) * 0.04;

    // 3. Animate Eastern Canal Lock Sluice Gates
    leftLockGatePivot.rotation.y += (lockTargetAngle - leftLockGatePivot.rotation.y) * 0.12;
    rightLockGatePivot.rotation.y += (-lockTargetAngle - rightLockGatePivot.rotation.y) * 0.12;

    // 4. Toll Cloister Sanctuary Bell
    bellSwingBoost = Math.max(0, bellSwingBoost - 0.015);
    bellMesh.rotation.z = Math.sin(u * 4.0) * (0.05 + bellSwingBoost * 0.48);

    // 5. Sway Overhead Plaza Lanterns
    hangingLanterns.forEach((hl) => {
      hl.mesh.position.y = hl.baseY + Math.sin(u * 2.0 + hl.phase) * 0.04;
    });

    // 6. Animate Braziers & Embers
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
      bNode.light.distance = 7.2 + nightFactor * 5.2;
    });

    embers.forEach((e) => {
      const parentBrazier = brazierNodes[e.brazierIndex];
      if (!parentBrazier || !parentBrazier.isLit) {
        e.mesh.visible = false;
        return;
      }
      e.mesh.visible = true;
      const cyc = (normT * e.freqHarmonic + e.phaseOffset) % 1.0;
      const env = Math.pow(Math.sin(Math.PI * cyc), 1.4);
      const y = e.baseY + 1.15 + cyc * e.maxHeight * (1.0 + nightFactor * 0.35);
      const swirlAngle = u * e.freqHarmonic + e.phaseOffset * Math.PI * 2.0;
      const x = e.baseX + Math.cos(swirlAngle) * e.driftRadius * cyc;
      const z = e.baseZ + Math.sin(swirlAngle) * e.driftRadius * cyc;

      e.mesh.position.set(x, y, z);
      const s = Math.max(0.001, env * (1.1 + nightFactor * 0.45));
      e.mesh.scale.set(s, s, s);
    });

    // 7. Update Scheduled Citizens along their 24-Hour Routines
    citizenActors.forEach((actor) => {
      const slot = evaluateCitizenSchedule(actor.profile, dayCycleHour);
      const targetGroundY = getOpenWorldGroundHeight(slot.x, slot.z);

      // Smoothly glide citizen toward their scheduled post if transitioning between hours
      actor.group.position.x += (slot.x - actor.group.position.x) * 0.12;
      actor.group.position.z += (slot.z - actor.group.position.z) * 0.12;
      actor.group.position.y = getOpenWorldGroundHeight(
        actor.group.position.x,
        actor.group.position.z
      );

      let angleDiff = slot.facingAngle - actor.group.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      actor.group.rotation.y += angleDiff * 0.15;

      // Sync InteractiveProp coordinates so the player can converse with them at any post
      actor.interactable.x = actor.group.position.x;
      actor.interactable.z = actor.group.position.z;
      if (actor.interactable.npcDialog) {
        actor.interactable.npcDialog.scheduleActivity = slot.activityLabel;
        actor.interactable.npcDialog.loreHint = `${slot.districtTitle} · ${slot.activityLabel}`;
      }

      // Expressive Artisan Work-Idle Animation
      const workCycle = (normT * 3.0 + actor.phaseOffset) % 1.0;
      const smoothPhase = workCycle * Math.PI * 2.0;
      const swing = Math.sin(smoothPhase);
      actor.toolPivot.rotation.x = -0.2 + swing * 0.38;
      actor.toolPivot.rotation.z = swing * 0.18;
      actor.torsoPivot.position.y = 0.72 + Math.abs(swing) * 0.03;
      actor.torsoPivot.rotation.y = swing * 0.14;
      actor.headPivot.rotation.y = -swing * 0.1;

      void targetGroundY;
    });

    // 8. Canal Water Ripple Rings
    rippleRings.forEach((r) => {
      const rCyc = (normT * 2.0 + r.phaseOffset) % 1.0;
      const radiusScale = 0.35 + rCyc * 2.4;
      r.mesh.scale.set(radiusScale, radiusScale, 1.0);
      r.mesh.visible = rCyc < 0.86;
    });
  };

  const dispose = () => {
    scene.remove(root);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };

  // Invisible Ambient Trigger Zones tailored to the 3 Districts of Vaelenport
  const triggerZones: AmbientTriggerZone[] = [
    {
      id: 'zone-lower-canal-mist',
      title: 'Lower Canal Quays & Lock Basin',
      subtitle: 'Tidal Canal Mist & Waterwheel Drone',
      x: 2.0,
      z: 9.5,
      radius: 10.5,
      effect: 'fen-mist-bank',
      audioProfile: 'fen',
      mistColorHex: '#7FA8B4',
      mistDensity: 0.82,
      lightTintHex: '#67E8F9',
    },
    {
      id: 'zone-conservatory-incense',
      title: "Isolde's Apothecary Conservatory",
      subtitle: 'Silver-Fern Botanical Vapor & Glass Chimes',
      x: 7.4,
      z: -14.5,
      radius: 6.5,
      effect: 'apothecary-incense',
      audioProfile: 'apothecary',
      mistColorHex: '#6EE7B7',
      mistDensity: 0.62,
      lightTintHex: '#A7F3D0',
    },
    {
      id: 'zone-cloister-rose-window',
      title: "Scholars' Cloister Rose Sanctuary",
      subtitle: 'High Terrace Incense & Belfry Harmonics',
      x: -2.5,
      z: -16.0,
      radius: 7.0,
      effect: 'crypt-chill-veil',
      audioProfile: 'crypt',
      mistColorHex: '#818CF8',
      mistDensity: 0.58,
      lightTintHex: '#C7D2FE',
    },
    {
      id: 'zone-guildhall-hearth',
      title: "Clockmaker's Guildhall Forge",
      subtitle: 'Warm Brass-Forge Updraft & Escapement Pulse',
      x: -7.5,
      z: -3.2,
      radius: 5.5,
      effect: 'ossuary-ash-surge',
      audioProfile: 'ossuary',
      mistColorHex: '#FB923C',
      mistDensity: 0.52,
      lightTintHex: '#FDBA74',
    },
  ];

  return {
    root,
    plateSeedOffset: 0,
    plateBaseRadius: 42.0,
    colliders,
    interactables,
    destructibles,
    exits: [],
    triggerZones,
    groups: {
      roofSlab: roofSlabGroup,
      waterFen: waterFenGroup,
      gravekeeper: gravekeeperGroup,
      embersAndMotes: embersAndMotesGroup,
    },
    getGroundHeight: getOpenWorldGroundHeight,
    triggerWorldEvent,
    getCitizenPosition,
    spawnShatterDebris,
    stepDebrisPhysics,
    respawnDestructibles,
    updateAtTime,
    dispose,
  };
}
