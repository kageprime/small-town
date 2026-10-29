export type CameraProjectionAngle = 'dimetric-26.5' | 'isometric-30';

export type RenderPassMode = 'final' | 'raw' | 'dapple-mask' | 'outlines-shadows';

export type CutoutBackgroundTone = 'ivory' | 'parchment' | 'obsidian';

export type WorldExplorationMode = 'open-world' | 'cutout-plate';

export type CameraZoomPreset = 'close' | 'standard' | 'wide';

export type TimeOfDayPreset = 'noon-dapple' | 'golden-dusk' | 'blood-moon' | 'torch-midnight';

export type WeatherPreset = 'auto-regional' | 'clear' | 'fen-rain' | 'ash-embers' | 'crypt-mist';

export type AmbientZoneEffect =
  | 'fen-mist-bank'
  | 'ossuary-ash-surge'
  | 'crypt-chill-veil'
  | 'apothecary-incense'
  | 'barrow-wind-gust';

export type AmbientAudioProfile = 'fen' | 'ossuary' | 'crypt' | 'apothecary' | 'barrow';

export interface AmbientTriggerZone {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
  effect: AmbientZoneEffect;
  audioProfile: AmbientAudioProfile;
  mistColorHex: string;
  mistDensity: number; // 0..1 target mist bank thickness
  lightTintHex: string;
}

export interface ActiveZoneTelemetry {
  id: string;
  title: string;
  subtitle: string;
  effect: AmbientZoneEffect;
  audioProfile: AmbientAudioProfile;
  blendWeight: number; // 0..1 smooth entry/exit weight
}

export type BiomeArchetype =
  | 'crypt-courtyard'
  | 'sunken-fen'
  | 'apothecary-stall'
  | 'ossuary-belltower';

export type CardinalDirection = 'N' | 'S' | 'E' | 'W';

export interface PlateCoordinate {
  gx: number;
  gz: number;
}

export interface LandmarkPOI {
  id: string;
  title: string;
  shortLabel: string;
  regionName: string;
  biome: BiomeArchetype;
  x: number;
  z: number;
  tileX: number;
  tileZ: number;
}

export interface LayerToggles {
  roofSlab: boolean;
  waterFen: boolean;
  gravekeeper: boolean;
  cloudDapple: boolean;
  embersAndMotes: boolean;
}

export interface VignetteConfig {
  worldMode: WorldExplorationMode;
  cameraAngle: CameraProjectionAngle;
  cameraZoom: CameraZoomPreset;
  cameraYawIndex: number; // 0 = 45°, 1 = 135°, 2 = 225°, 3 = 315°
  timeOfDay: TimeOfDayPreset;
  dayNightCycleEnabled: boolean;
  dayCycleSpeed: number; // Game hours per real second (e.g. 0.45 = ~53s full 24h cycle)
  dayCycleHour: number; // 0.0 .. 24.0 synced game clock hour
  weatherMode: WeatherPreset;
  soundEnabled: boolean;
  autoRoofCutaway: boolean;
  oklabLevels: number;
  bayerStrength: number;
  outlineStrength: number;
  dappleIntensity: number;
  internalWidth: number;
  internalHeight: number;
  pixelScale: number;
  renderPassMode: RenderPassMode;
  backgroundTone: CutoutBackgroundTone;
  layerToggles: LayerToggles;
  worldSeed: number;
  plateCoord: PlateCoordinate;
  forcedBiome: BiomeArchetype | 'auto';
}

export type CitizenId =
  | 'master-vaelen'
  | 'isolde'
  | 'oswin'
  | 'sera'
  | 'brother-corvus';

export type ReactivePortraitFrame =
  | 'neutral'
  | 'happy'
  | 'stern'
  | 'thinking';

export type PortraitExpression =
  | ReactivePortraitFrame
  | 'warm'
  | 'thoughtful'
  | 'surprised'
  | 'solemn';

export type CutsceneId =
  | 'arrival-intro'
  | 'dusk-lantern-awakening'
  | 'canal-lock-opening';

export interface ActiveCutsceneState {
  id: CutsceneId;
  title: string;
  subtitle: string;
  speakerName?: string;
  speakerRole?: string;
  speakerId?: CitizenId;
  expression?: PortraitExpression;
  progress: number; // 0..1 overall sequence progress
  keyframeIndex: number;
  totalKeyframes: number;
}

export interface NpcDialogState {
  npcId: string;
  citizenId?: CitizenId;
  name: string;
  role: string;
  greeting: string;
  loreHint: string;
  scheduleActivity?: string;
}

export interface FishingMinigameState {
  active: boolean;
  spotTitle: string;
  phase: 'waiting' | 'bite' | 'caught' | 'escaped';
  bobberProgress: number; // 0..1 timer
  lastCatchName: string | null;
  lastCatchEmbers: number;
  totalCaught: number;
}

export interface PlayerUpgrades {
  swordLevel: number;
  lanternLevel: number;
  vitalityLevel: number;
}

export type SentinelArchetype = 'sentinel' | 'wraith' | 'gargoyle';

export interface BestiaryEntry {
  variantId: string;
  name: string;
  archetype: SentinelArchetype;
  title: string;
  regionName: string;
  maxHp: number;
  attackStyle: string;
  baseEmberDrop: number;
  bonusEmberDrop: number;
  bonusDropChancePct: number;
  loreText: string;
  encountered: boolean;
  timesEncountered: number;
  defeatedCount: number;
  totalEmbersHarvested: number;
}

export interface PlayerTelemetry {
  x: number;
  y: number;
  z: number;
  facingAngle: number;
  tileX: number;
  tileZ: number;
  isGrounded: boolean;
  isInsideInterior: boolean;
  activeTriggerZone: ActiveZoneTelemetry | null;
  dayCycleHour: number;
  formattedClock: string;
  dayPhaseLabel: string;
  brazierIntensityMultiplier: number;
  cameraShakeIntensity: number;
  bestiary: BestiaryEntry[];
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  soulEmbers: number;
  enemiesDefeated: number;
  totalEnemies: number;
  upgrades: PlayerUpgrades;
  activeNpcDialog: NpcDialogState | null;
  activeCutscene: ActiveCutsceneState | null;
  fishingState: FishingMinigameState;
  nearbyPrompt: string | null;
  litBraziers: number;
  totalBraziers: number;
  shatteredCount: number;
  totalDestructibles: number;
  activeBiome: BiomeArchetype;
  activeBiomeTitle: string;
  nearestLandmarkTitle: string;
  nearestLandmarkDist: number;
  plateSeedHex: string;
  lastActionToast: string | null;
}

export interface ContactSheetFrame {
  frameIndex: number;
  time: number;
  phaseRad: number;
  label: string;
  dataUrl: string;
  deltaFromStart: number;
}

export interface LoopSeamMetrics {
  seamDeltaF0ToF359: number;
  lifeDeltaF0ToF180: number;
  quantizedColorCount: number;
  paletteSwatches: string[];
  f0DataUrl: string;
  f180DataUrl: string;
  f359DataUrl: string;
}

export interface VignetteEnvApi {
  seek: (timeSeconds: number) => void;
  setLevels: (levels: number) => void;
  capture: () => string;
  rgb: () => Uint8Array;
  measureLoopMetrics: () => LoopSeamMetrics;
  generateContactSheet: (frameCount?: number) => ContactSheetFrame[];
  debugRay: (
    ndcX: number,
    ndcY: number
  ) => { hit: boolean; objectName: string; point: [number, number, number] | null };
  triggerAttack: () => void;
  triggerDodge: () => void;
  triggerInteract: () => void;
  purchaseUpgrade: (kind: 'sword' | 'lantern' | 'vitality') => void;
  grantSoulEmbers: (amount: number) => void;
  closeNpcDialog: () => void;
  triggerCutscene: (id: CutsceneId) => void;
  skipCutscene: () => void;
  reelFishing: () => void;
  respawnPlateProps: () => void;
  teleportTo: (x: number, z: number) => void;
}

declare global {
  interface Window {
    __env?: VignetteEnvApi;
  }
}
