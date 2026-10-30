import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ActiveCutsceneState,
  CameraZoomPreset,
  CardinalDirection,
  ContactSheetFrame,
  CutoutBackgroundTone,
  CutsceneId,
  LoopSeamMetrics,
  PendingBindOffer,
  PlayerTelemetry,
  RenderPassMode,
  VignetteConfig,
  VignetteEnvApi,
} from '../types/vignette';
import {
  BoundEchoEntry,
  EchoFsmState,
  INITIAL_BOUND_ECHOES,
  INITIAL_JOSS_MEMORIES,
  JossMemoryEntry,
  NullspireFloorZone,
  ParasiteTechId,
  VESTIGE_WHISPER_DEALS,
  VestigeWhisperDeal,
  WARDEN_ACCORDS,
  WardenAccordEntry,
} from '../data/nullspireData';
import {
  buildGothicCourtyard,
  GothicCourtyardRig,
  LOOP_DURATION,
} from '../scene/buildGothicCourtyard';
import {
  buildContinuousOpenWorld,
  OPEN_WORLD_LANDMARKS,
  VaelenportCityRig,
} from '../scene/buildOpenWorld';
import { VAELENPORT_CUTSCENES } from '../scene/dialogueAndCutscenes';
import { createPostProcessMaterial } from '../scene/postProcessShader';
import { createPlayerController, PlayerController } from '../scene/playerController';
import {
  createSanctuaryCombatAndAtmosphereRig,
  SanctuaryCombatAndAtmosphereRig,
} from '../scene/enemySystem';
import { soundEngine } from '../scene/soundEngine';
import { BIOME_TITLES, computePlateSeed, resolvePlateBiome } from '../scene/prng';
import { evaluateDayNightCycle } from '../scene/dayNightCycle';
import { createScreenSpaceCameraShake } from '../scene/cameraShake';
import {
  createPixelFxWorldManager,
  PixelFxId,
  STRIKE_ID_TO_PIXELFX,
} from '../scene/pixelFxEngine';
import { STRIKE_CHOREOGRAPHY_REGISTRY } from '../scene/combatChoreography';
import { worldPosToTile } from './MiniMap';

interface VignetteCanvasProps {
  config: VignetteConfig;
  isPlaying: boolean;
  currentTime: number;
  onTimeUpdate: (timeSeconds: number) => void;
  onTelemetryUpdate: (telemetry: PlayerTelemetry) => void;
  onSyncDayNightConfig: (partial: Partial<VignetteConfig>) => void;
  onTravelPlate: (dir: CardinalDirection) => void;
  onEnvReady: (api: VignetteEnvApi) => void;
}

const BG_HEX_MAP: Record<CutoutBackgroundTone, string> = {
  ivory: '#F4F1EA',
  parchment: '#EAE2D3',
  obsidian: '#121216',
};

const PASS_MODE_INDEX: Record<RenderPassMode, number> = {
  final: 0,
  raw: 1,
  'dapple-mask': 2,
  'outlines-shadows': 3,
};

const ZOOM_FRUSTUM_HALF_H: Record<CameraZoomPreset, number> = {
  close: 5.8,
  standard: 8.45,
  wide: 13.5,
};

export const VignetteCanvas: React.FC<VignetteCanvasProps> = ({
  config,
  isPlaying,
  currentTime,
  onTimeUpdate,
  onTelemetryUpdate,
  onSyncDayNightConfig,
  onTravelPlate,
  onEnvReady,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<VignetteConfig>(config);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const currentTimeRef = useRef<number>(currentTime);
  const dayCycleHourRef = useRef<number>(config.dayCycleHour);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onTelemetryUpdateRef = useRef(onTelemetryUpdate);
  const onSyncDayNightConfigRef = useRef(onSyncDayNightConfig);
  const onTravelPlateRef = useRef(onTravelPlate);

  configRef.current = config;
  isPlayingRef.current = isPlaying;
  currentTimeRef.current = currentTime;
  onTimeUpdateRef.current = onTimeUpdate;
  onTelemetryUpdateRef.current = onTelemetryUpdate;
  onSyncDayNightConfigRef.current = onSyncDayNightConfig;
  onTravelPlateRef.current = onTravelPlate;

  const renderImmediateRef = useRef<((t: number) => void) | null>(null);
  const rebuildWorldRef = useRef<((fromDir?: CardinalDirection) => void) | null>(null);
  const lastEntryDirRef = useRef<CardinalDirection | undefined>(undefined);

  useEffect(() => {
    if (Math.abs(config.dayCycleHour - dayCycleHourRef.current) > 0.05) {
      dayCycleHourRef.current = config.dayCycleHour;
    }
  }, [config.dayCycleHour]);

  useEffect(() => {
    if (rebuildWorldRef.current) {
      rebuildWorldRef.current(lastEntryDirRef.current);
      lastEntryDirRef.current = undefined;
    }
  }, [
    config.worldMode,
    config.worldSeed,
    config.plateCoord.gx,
    config.plateCoord.gz,
    config.forcedBiome,
  ]);

  useEffect(() => {
    if (!isPlaying && renderImmediateRef.current) {
      renderImmediateRef.current(currentTime);
    }
  }, [config, currentTime, isPlaying]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const initCfg = configRef.current;

    // Compute fullscreen aspect-matched pixel dimensions from active config.internalHeight
    const computePixelDimensions = () => {
      const viewW = Math.max(320, window.innerWidth);
      const viewH = Math.max(240, window.innerHeight);
      const aspect = viewW / viewH;
      const targetH = Math.max(240, configRef.current.internalHeight || 540);
      const lowH = Math.min(viewH, targetH);
      const lowW = Math.max(200, Math.round(lowH * aspect));
      return { viewW, viewH, lowW, lowH, aspect };
    };

    let dims = computePixelDimensions();

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.setSize(dims.viewW, dims.viewH, false);
    renderer.domElement.className = 'pixelated-canvas w-full h-full block cursor-crosshair';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgHex = BG_HEX_MAP[initCfg.backgroundTone];
    scene.background = new THREE.Color(bgHex);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight('#FFFDF9', '#5A6270', 1.55);
    scene.add(hemiLight);

    const sunKeyLight = new THREE.DirectionalLight('#FFF5E0', 1.15);
    sunKeyLight.position.set(12.0, 20.0, 10.0);
    scene.add(sunKeyLight);

    const rimLight = new THREE.DirectionalLight('#93A8C4', 0.45);
    rimLight.position.set(-12.0, 10.0, -12.0);
    scene.add(rimLight);

    const orthoCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 180.0);

    // Smooth camera follow state with Texel-Grid Snapping
    const cameraFollowTarget = new THREE.Vector3(0, 0.55, 0);
    const camRightVec = new THREE.Vector3();
    const camUpVec = new THREE.Vector3();
    const camFwdVec = new THREE.Vector3();

    // In-Engine Cutscene Director State
    let activeCutsceneId: CutsceneId | null = null;
    let cutsceneElapsed = 0;
    let lastCutsceneKeyframeIdx = -1;
    let activeCutsceneTelemetry: ActiveCutsceneState | null = null;

    const startCutscene = (id: CutsceneId) => {
      activeCutsceneId = id;
      cutsceneElapsed = 0;
      lastCutsceneKeyframeIdx = -1;
      player.closeNpcDialog();
    };

    const stopCutscene = () => {
      activeCutsceneId = null;
      cutsceneElapsed = 0;
      lastCutsceneKeyframeIdx = -1;
      activeCutsceneTelemetry = null;
      soundEngine.playCutsceneCue('complete');
    };

    const updateCameraFollowAndProjection = (
      cfg: VignetteConfig,
      playerPos: THREE.Vector3,
      dt: number
    ) => {
      let activeZoomPreset: CameraZoomPreset = cfg.cameraZoom;

      if (activeCutsceneId) {
        const def = VAELENPORT_CUTSCENES[activeCutsceneId];
        let accum = 0;
        let currentIdx = def.keyframes.length - 1;
        for (let i = 0; i < def.keyframes.length; i++) {
          const kf = def.keyframes[i];
          if (cutsceneElapsed < accum + kf.durationSec) {
            currentIdx = i;
            break;
          }
          accum += kf.durationSec;
        }
        const totalDuration = def.keyframes.reduce((s, k) => s + k.durationSec, 0);
        const kf = def.keyframes[currentIdx];
        activeZoomPreset = kf.zoom;

        if (currentIdx !== lastCutsceneKeyframeIdx) {
          lastCutsceneKeyframeIdx = currentIdx;
          if (kf.worldEvent && worldRig.triggerWorldEvent) {
            worldRig.triggerWorldEvent(kf.worldEvent);
          }
          if (kf.overrideHour !== undefined) {
            dayCycleHourRef.current = kf.overrideHour;
          }
        }

        const damp = dt > 0 ? 1.0 - Math.exp(-3.6 * dt) : 1.0;
        cameraFollowTarget.x += (kf.targetX - cameraFollowTarget.x) * damp;
        cameraFollowTarget.y += (kf.targetY - cameraFollowTarget.y) * damp;
        cameraFollowTarget.z += (kf.targetZ - cameraFollowTarget.z) * damp;

        activeCutsceneTelemetry = {
          id: def.id,
          title: def.title,
          subtitle: kf.subtitle,
          speakerId: kf.speakerId,
          speakerName: kf.speakerName,
          speakerRole: kf.speakerRole,
          expression: kf.expression,
          progress: Math.min(1, cutsceneElapsed / Math.max(0.1, totalDuration)),
          keyframeIndex: currentIdx,
          totalKeyframes: def.keyframes.length,
        };
      } else if (cfg.worldMode === 'open-world') {
        const dampFactor = dt > 0 ? 1.0 - Math.exp(-8.5 * dt) : 1.0;
        cameraFollowTarget.x += (playerPos.x - cameraFollowTarget.x) * dampFactor;
        cameraFollowTarget.y += (playerPos.y + 0.45 - cameraFollowTarget.y) * dampFactor;
        cameraFollowTarget.z += (playerPos.z - cameraFollowTarget.z) * dampFactor;
      } else {
        cameraFollowTarget.set(0, 0.55, 0);
      }

      const frustumHalfH = ZOOM_FRUSTUM_HALF_H[activeZoomPreset];
      const frustumHalfW = frustumHalfH * dims.aspect;

      orthoCamera.left = -frustumHalfW;
      orthoCamera.right = frustumHalfW;
      orthoCamera.top = frustumHalfH;
      orthoCamera.bottom = -frustumHalfH;

      const dist = 42.0;
      const azimuth = Math.PI / 4 + (cfg.cameraYawIndex % 4) * (Math.PI / 2);
      const elevationDeg = cfg.cameraAngle === 'dimetric-26.5' ? 26.565 : 30.0;
      const elevation = THREE.MathUtils.degToRad(elevationDeg);

      const offsetY = Math.sin(elevation) * dist;
      const horiz = Math.cos(elevation) * dist;
      const offsetX = Math.sin(azimuth) * horiz;
      const offsetZ = Math.cos(azimuth) * horiz;

      orthoCamera.position.set(
        cameraFollowTarget.x + offsetX,
        cameraFollowTarget.y + offsetY,
        cameraFollowTarget.z + offsetZ
      );
      orthoCamera.lookAt(cameraFollowTarget);
      orthoCamera.updateMatrixWorld();

      // Snap 3D camera pan in view-space (right, up) to exact low-res texel increments
      // and pass the fractional remainder to the fullscreen post-process quad for 60fps sub-pixel gliding
      orthoCamera.matrixWorld.extractBasis(camRightVec, camUpVec, camFwdVec);
      const texelWorldW = (frustumHalfW * 2.0) / dims.lowW;
      const texelWorldH = (frustumHalfH * 2.0) / dims.lowH;

      const projRight = cameraFollowTarget.dot(camRightVec);
      const projUp = cameraFollowTarget.dot(camUpVec);
      const snappedRight = Math.round(projRight / texelWorldW) * texelWorldW;
      const snappedUp = Math.round(projUp / texelWorldH) * texelWorldH;

      const deltaRight = snappedRight - projRight;
      const deltaUp = snappedUp - projUp;

      // Sub-texel remainder in [-0.5, 0.5] low-res texels + Hitstop Screen-Space Camera Shake offset
      const subpixelX = (projRight - snappedRight) / texelWorldW;
      const subpixelY = (projUp - snappedUp) / texelWorldH;
      const shakeOffset = cameraShake.evaluate(dt, currentTimeRef.current);
      postMaterial.uniforms.uSubpixelOffset.value.set(
        subpixelX + shakeOffset.x,
        subpixelY + shakeOffset.y
      );

      orthoCamera.position.addScaledVector(camRightVec, deltaRight);
      orthoCamera.position.addScaledVector(camUpVec, deltaUp);
      orthoCamera.updateProjectionMatrix();
    };

    const cameraShake = createScreenSpaceCameraShake();
    let lastHandledHitstopId = 0;

    // Build World Rig (Continuous Open World or Cutout Plate)
    let currentPlateSeed = computePlateSeed(initCfg.worldSeed, initCfg.plateCoord);
    let currentBiome = resolvePlateBiome(
      initCfg.worldSeed,
      initCfg.plateCoord,
      initCfg.forcedBiome
    );
    let worldRig: GothicCourtyardRig & Partial<VaelenportCityRig> =
      initCfg.worldMode === 'open-world'
        ? buildContinuousOpenWorld(scene, initCfg.worldSeed)
        : buildGothicCourtyard(scene, currentPlateSeed, currentBiome);

    const player: PlayerController = createPlayerController(scene);
    if (initCfg.worldMode === 'open-world') {
      player.teleportTo(0, 2.2, worldRig.getGroundHeight);
      cameraFollowTarget.set(0, 0.75, 2.2);
    }
    const prevPlayerPos = player.position.clone();
    const currPlayerPos = player.position.clone();
    const interpPlayerPos = player.position.clone();

    let combatRig: SanctuaryCombatAndAtmosphereRig = createSanctuaryCombatAndAtmosphereRig(
      scene,
      initCfg.worldMode === 'open-world',
      worldRig.getGroundHeight
    );

    const pixelFxManager = createPixelFxWorldManager(scene);

    const spawnStrikePixelFx = () => {
      const tel = player.activeStrikeTelemetry;
      const spec = STRIKE_CHOREOGRAPHY_REGISTRY[tel.strikeId];
      const fxId = STRIKE_ID_TO_PIXELFX[tel.strikeId];
      const offsetDist = spec.archetype === 'overhead' ? 1.15 : spec.archetype === 'thrust' ? 1.05 : 0.65;
      const fxX = player.position.x + Math.sin(player.facingAngle) * offsetDist;
      const fxZ = player.position.z + Math.cos(player.facingAngle) * offsetDist;
      const fxY =
        spec.archetype === 'overhead'
          ? player.position.y + 0.08
          : player.position.y + 0.76;
      pixelFxManager.spawnFx(fxId, fxX, fxY, fxZ, {
        facingAngle: player.facingAngle,
        planeTiltX: spec.slashPlane.rotXEnd * 0.45,
        planeRollZ: spec.slashPlane.rotZ * 0.65,
      });
    };

    // ========================================================================
    // NULLSPIRE: LEVEL ZERO — VESTIGE, ECHOES, WREN FUND & RACING CLOCKS STATE
    // ========================================================================
    let jossLevel = 11;
    const scanReadout = 'E · 11 · FLAT';
    let syncRotPct = 18;
    let wrenScripFund = 145000;
    const wrenScripGoal = 2000000;
    let tableClock = 2; // Gilded Table "Find the Door-Breaker" 0..8
    let returnedClock = 2; // The Returned "Recruit the Door-Breaker" 0..6
    let redSecondRemaining = 0;
    let bloodwageRemaining = 0;
    let boundEchoes: BoundEchoEntry[] = INITIAL_BOUND_ECHOES.map((e) => ({ ...e }));
    let wardenAccords: WardenAccordEntry[] = WARDEN_ACCORDS.map((w) => ({ ...w }));
    let memories: JossMemoryEntry[] = INITIAL_JOSS_MEMORIES.map((m) => ({ ...m }));
    let whisperDeals: VestigeWhisperDeal[] = VESTIGE_WHISPER_DEALS.map((d) => ({ ...d }));
    let activeWhisperDeal: VestigeWhisperDeal | null = null;
    let pendingBindOffer: PendingBindOffer | null = null;
    let memoryTithePending = false;
    let truhoundEarState: 'idle' | 'perked-truth' | 'drooped-lie' = 'idle';

    const syncSummonedEchoVisuals = () => {
      const summoned = boundEchoes
        .filter((e) => e.isSummoned && e.isBound)
        .slice(0, 3)
        .map((e) => ({ id: e.id, name: e.name, fsmState: e.fsmState }));
      player.setSummonedEchoVisuals(summoned);
    };
    syncSummonedEchoVisuals();

    const adjustSyncRot = (delta: number) => {
      syncRotPct = Math.max(0, Math.min(100, Math.round(syncRotPct + delta)));
      player.setScarfRotRatio(syncRotPct);
      if (syncRotPct >= 75) {
        // High Rot makes Gilded Table & Returned clocks tick faster
        tableClock = Math.min(8, tableClock + 1);
      }
    };

    // Hook player combat & world events to NULLSPIRE systems
    player.onEnemyKilled = (killedEnemy) => {
      wrenScripFund = Math.min(wrenScripGoal, wrenScripFund + 8500);
      jossLevel += 1;
      // Pick an unbound Echo (or a bound Echo to rank up) for 73% BIND Offer
      const unboundPool = boundEchoes.filter((e) => !e.isBound);
      const targetEcho =
        unboundPool.length > 0
          ? unboundPool[Math.floor(Math.random() * unboundPool.length)]
          : boundEchoes[Math.floor(Math.random() * boundEchoes.length)];

      pendingBindOffer = {
        enemyId: killedEnemy.id,
        enemyName: killedEnemy.name,
        echoId: targetEcho.id,
        echoName: targetEcho.name,
        echoEpithet: targetEcho.epithet,
        chancePct: 73,
      };
      pixelFxManager.spawnFx(
        'pickups/bind-remnant-burst',
        player.position.x + Math.sin(player.facingAngle) * 1.1,
        player.position.y + 0.85,
        player.position.z + Math.cos(player.facingAngle) * 1.1
      );
      emitTelemetry(latestNearbyPrompt);
    };

    player.onPlayerDeathIntercept = () => {
      if (!memoryTithePending) {
        memoryTithePending = true;
        emitTelemetry(latestNearbyPrompt);
        return true;
      }
      return false;
    };

    player.onBellRung = () => {
      const nextDeal =
        whisperDeals.find((d) => !d.accepted && !d.refused) || whisperDeals[0];
      if (nextDeal) {
        activeWhisperDeal = { ...nextDeal };
        truhoundEarState = nextDeal.isLie ? 'drooped-lie' : 'perked-truth';
        emitTelemetry(latestNearbyPrompt);
      }
    };

    player.onShrineLit = () => {
      boundEchoes = boundEchoes.map((e) =>
        e.isBound ? { ...e, loyalty: Math.min(100, e.loyalty + 6) } : e
      );
      emitTelemetry(latestNearbyPrompt);
    };

    player.onDeflectSuccess = (parriedCount) => {
      boundEchoes = boundEchoes.map((e) =>
        e.id === '01' || e.id === '03'
          ? { ...e, loyalty: Math.min(100, e.loyalty + (parriedCount > 0 ? 5 : 2)) }
          : e
      );
      pixelFxManager.spawnFx(
        'combat/sekiro-deflect',
        player.position.x + Math.sin(player.facingAngle) * 0.75,
        player.position.y + 0.95,
        player.position.z + Math.cos(player.facingAngle) * 0.75,
        { scaleMultiplier: parriedCount > 0 ? 1.25 : 0.95 }
      );
      emitTelemetry(latestNearbyPrompt);
    };

    const executeParasiteTech = (techId: ParasiteTechId) => {
      if (techId === 'gapstep') {
        if (player.stamina < 18) {
          player.setToast('Need 18 Stamina for Gapstep [1]');
          emitTelemetry(latestNearbyPrompt);
          return;
        }
        const blinkDist = 3.6;
        const targetX = player.position.x + Math.sin(player.facingAngle) * blinkDist;
        const targetZ = player.position.z + Math.cos(player.facingAngle) * blinkDist;
        pixelFxManager.spawnFx(
          'shadow/gapstep-sigil',
          player.position.x,
          player.position.y + 0.06,
          player.position.z,
          { facingAngle: player.facingAngle }
        );
        player.teleportTo(targetX, targetZ, worldRig.getGroundHeight);
        pixelFxManager.spawnFx(
          'shadow/gapstep-sigil',
          player.position.x,
          player.position.y + 0.06,
          player.position.z,
          { facingAngle: player.facingAngle }
        );
        adjustSyncRot(2);
        soundEngine.playDodgeRoll();
        player.setToast('GAPSTEP [1] — Blinked 3.6m through the seam (+2% Sync/Rot)');
      } else if (techId === 'bloodwage') {
        if (player.hp <= 15) {
          player.setToast('HP too low for Bloodwage [2] (Requires >15 HP)');
          emitTelemetry(latestNearbyPrompt);
          return;
        }
        player.setHp(player.hp - 12);
        bloodwageRemaining = 6.0;
        player.setBloodwageActive(true);
        pixelFxManager.spawnFx(
          'status/bloodwage-burn',
          player.position.x,
          player.position.y + 0.88,
          player.position.z
        );
        adjustSyncRot(3);
        soundEngine.playBrazierIgnite(true);
        player.setToast('BLOODWAGE [2] — Paid 12 HP for 1.65× Crimson Cleave (6s · +3% Sync/Rot)');
      } else if (techId === 'crosspull') {
        const pulled = combatRig.pullEnemiesToward(player.position.x, player.position.z, 7.8);
        pixelFxManager.spawnFx(
          'shadow/crosspull-grasp',
          player.position.x,
          player.position.y + 0.06,
          player.position.z,
          { facingAngle: player.facingAngle }
        );
        adjustSyncRot(3);
        soundEngine.playImpactShatter();
        player.setToast(
          pulled > 0
            ? `CROSSPULL [3] — Yanked ${pulled} foe${pulled > 1 ? 's' : ''} into cleaver range! (+3% Sync/Rot)`
            : 'CROSSPULL [3] — Lashed spatial seam (+3% Sync/Rot)'
        );
      } else if (techId === 'call-bound') {
        const orderCycle: EchoFsmState[] = ['FOLLOW', 'FIGHT', 'HOLD-DOOR'];
        const currentOrder = boundEchoes.find((e) => e.isSummoned)?.fsmState || 'FOLLOW';
        const nextOrder =
          orderCycle[(orderCycle.indexOf(currentOrder) + 1) % orderCycle.length] || 'FIGHT';
        boundEchoes = boundEchoes.map((e) =>
          e.isSummoned && e.fsmState !== 'REFUSE' ? { ...e, fsmState: nextOrder } : e
        );
        syncSummonedEchoVisuals();
        adjustSyncRot(2);
        soundEngine.playEmberCollect();
        player.setToast(`CALL THE BOUND [4] — Retainers shifted to [${nextOrder}] (+2% Sync/Rot)`);
      } else if (techId === 'red-second') {
        redSecondRemaining = 2.4;
        adjustSyncRot(6);
        soundEngine.playBellToll();
        player.setToast('THE RED SECOND [F] — 2.4s Spire Time Dilation Active! (+6% Sync/Rot)');
      }
      emitTelemetry(latestNearbyPrompt);
    };

    const resolveZoneFromLandmark = (poiId: string): NullspireFloorZone => {
      if (poiId === 'apothecary-plaza') return 'clinic';
      if (poiId === 'gilded-bazaar') return 'gilt-bazaar';
      if (poiId === 'weeping-fen-dock') return 'floor-1-sump';
      if (poiId === 'ossuary-belfry') return 'floor-2-gala';
      if (poiId === 'barrow-hollow') return 'floor-0-muster';
      return 'the-hold';
    };

    const emitTelemetry = (nearbyPrompt: string | null) => {
      const braziers = worldRig.interactables.filter((i) => i.type === 'brazier');
      const litCount = braziers.filter((b) => b.isActivated).length;
      const brokenCount = worldRig.destructibles.filter((d) => d.isBroken).length;
      const defeatedEnemies = combatRig.enemies.filter((e) => e.isDead).length;

      let nearestPoi = OPEN_WORLD_LANDMARKS[0];
      let nearestDist = Infinity;
      for (const poi of OPEN_WORLD_LANDMARKS) {
        const d = Math.hypot(player.position.x - poi.x, player.position.z - poi.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestPoi = poi;
        }
      }

      const activeTitle =
        configRef.current.worldMode === 'open-world'
          ? nearestPoi.title
          : BIOME_TITLES[currentBiome];

      const tileCoord = worldPosToTile(player.position.x, player.position.z);
      const dayNight = evaluateDayNightCycle(
        dayCycleHourRef.current,
        configRef.current.backgroundTone
      );

      onTelemetryUpdateRef.current({
        x: Number(player.position.x.toFixed(1)),
        y: Number(player.position.y.toFixed(2)),
        z: Number(player.position.z.toFixed(1)),
        facingAngle: player.facingAngle,
        tileX: tileCoord.gx,
        tileZ: tileCoord.gz,
        isGrounded: player.isGrounded,
        isInsideInterior: player.isInsideInterior,
        dayCycleHour: Number(dayNight.hour.toFixed(2)),
        formattedClock: dayNight.formattedClock,
        dayPhaseLabel: dayNight.phaseLabel,
        brazierIntensityMultiplier: dayNight.brazierIntensityMultiplier,
        cameraShakeIntensity: cameraShake.currentIntensity,
        bestiary: combatRig.bestiaryEntries,
        npcStates: worldRig.getCitizenStateSnapshots
          ? worldRig.getCitizenStateSnapshots()
          : [],
        hp: player.hp,
        maxHp: player.maxHp,
        stamina: Math.round(player.stamina),
        maxStamina: player.maxStamina,
        soulEmbers: player.soulEmbers,
        enemiesDefeated: defeatedEnemies,
        totalEnemies: combatRig.enemies.length,
        upgrades: { ...player.upgrades },
        activeNpcDialog: player.activeNpcDialog ? { ...player.activeNpcDialog } : null,
        activeCutscene: activeCutsceneTelemetry ? { ...activeCutsceneTelemetry } : null,
        fishingState: { ...player.fishingState },
        nearbyPrompt,
        litBraziers: litCount,
        totalBraziers: braziers.length,
        shatteredCount: brokenCount,
        totalDestructibles: worldRig.destructibles.length,
        activeBiome:
          configRef.current.worldMode === 'open-world' ? nearestPoi.biome : currentBiome,
        activeBiomeTitle: activeTitle,
        nearestLandmarkTitle: nearestPoi.shortLabel,
        nearestLandmarkDist: Math.round(nearestDist),
        plateSeedHex:
          '#' + (currentPlateSeed & 0xffff).toString(16).toUpperCase().padStart(4, '0'),
        lastActionToast: player.lastActionToast,
        activeTriggerZone: combatRig.activeZoneTelemetry
          ? { ...combatRig.activeZoneTelemetry }
          : null,
        // NULLSPIRE: LEVEL ZERO Telemetry
        jossLevel,
        scanReadout,
        syncRotPct,
        wrenScripFund,
        wrenScripGoal,
        tableClock,
        returnedClock,
        activeZoneId: resolveZoneFromLandmark(nearestPoi.id),
        redSecondRemaining: Number(redSecondRemaining.toFixed(1)),
        bloodwageRemaining: Number(bloodwageRemaining.toFixed(1)),
        deflectWindowActive:
          player.activeStrikeTelemetry.isDeflecting || player.isInvulnerable,
        activeStrike: player.activeStrikeTelemetry,
        boundEchoes: boundEchoes.map((e) => ({ ...e })),
        activeWhisperDeal: activeWhisperDeal ? { ...activeWhisperDeal } : null,
        pendingBindOffer: pendingBindOffer ? { ...pendingBindOffer } : null,
        memoryTithePending,
        memories: memories.map((m) => ({ ...m })),
        wardenAccords: wardenAccords.map((w) => ({ ...w })),
        truhoundEarState,
      });
    };

    const rebuildWorld = (fromDir?: CardinalDirection) => {
      const cfg = configRef.current;
      currentPlateSeed = computePlateSeed(cfg.worldSeed, cfg.plateCoord);
      currentBiome = resolvePlateBiome(cfg.worldSeed, cfg.plateCoord, cfg.forcedBiome);
      worldRig.dispose();
      combatRig.dispose();

      if (cfg.worldMode === 'open-world') {
        worldRig = buildContinuousOpenWorld(scene, cfg.worldSeed);
        player.teleportTo(0, 1.5, worldRig.getGroundHeight);
        cameraFollowTarget.set(0, 0.55, 1.5);
      } else {
        worldRig = buildGothicCourtyard(scene, currentPlateSeed, currentBiome);
        player.setSpawnForDirection(fromDir);
        cameraFollowTarget.set(0, 0.55, 0);
      }
      combatRig = createSanctuaryCombatAndAtmosphereRig(
        scene,
        cfg.worldMode === 'open-world',
        worldRig.getGroundHeight
      );
      prevPlayerPos.copy(player.position);
      currPlayerPos.copy(player.position);
      emitTelemetry(null);
      if (renderImmediateRef.current) {
        renderImmediateRef.current(currentTimeRef.current);
      }
    };
    rebuildWorldRef.current = rebuildWorld;

    // Fullscreen Aspect-Matched Low-Res RenderTarget + Post-Process Quad
    const depthTexture = new THREE.DepthTexture(dims.lowW, dims.lowH);
    depthTexture.type = THREE.UnsignedShortType;
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;

    const lowResTarget = new THREE.WebGLRenderTarget(dims.lowW, dims.lowH, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthTexture,
      depthBuffer: true,
    });

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const postMaterial = createPostProcessMaterial(
      lowResTarget.texture,
      depthTexture,
      new THREE.Vector2(dims.lowW, dims.lowH)
    );
    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    postScene.add(postQuad);

    const handleResize = () => {
      dims = computePixelDimensions();
      renderer.setSize(dims.viewW, dims.viewH, false);
      lowResTarget.setSize(dims.lowW, dims.lowH);
      postMaterial.uniforms.uResolution.value.set(dims.lowW, dims.lowH);
      if (renderImmediateRef.current) {
        renderImmediateRef.current(currentTimeRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, orthoCamera);
    }

    const pressedKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      pressedKeys.add(e.code);

      if (e.code === 'Space') {
        e.preventDefault();
        player.triggerJump();
      } else if (e.code === 'KeyQ') {
        e.preventDefault();
        player.triggerDodge();
      } else if (e.code === 'KeyJ') {
        e.preventDefault();
        player.triggerAttack(worldRig, combatRig);
        spawnStrikePixelFx();
        emitTelemetry(latestNearbyPrompt);
      } else if (e.code === 'KeyU') {
        e.preventDefault();
        player.triggerAttack(worldRig, combatRig, 'heavy');
        spawnStrikePixelFx();
        emitTelemetry(latestNearbyPrompt);
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        player.triggerAttack(worldRig, combatRig, 'thrust');
        spawnStrikePixelFx();
        emitTelemetry(latestNearbyPrompt);
      } else if (e.code === 'KeyO') {
        e.preventDefault();
        player.triggerAttack(worldRig, combatRig, 'overhead');
        spawnStrikePixelFx();
        emitTelemetry(latestNearbyPrompt);
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        player.triggerDeflect(worldRig, combatRig);
        pixelFxManager.spawnFx(
          'combat/sekiro-deflect',
          player.position.x + Math.sin(player.facingAngle) * 0.72,
          player.position.y + 0.92,
          player.position.z + Math.cos(player.facingAngle) * 0.72
        );
        emitTelemetry(latestNearbyPrompt);
      } else if (e.code === 'KeyE') {
        e.preventDefault();
        player.triggerInteract(worldRig, combatRig);
      } else if (e.code === 'Digit1') {
        e.preventDefault();
        executeParasiteTech('gapstep');
      } else if (e.code === 'Digit2') {
        e.preventDefault();
        executeParasiteTech('bloodwage');
      } else if (e.code === 'Digit3') {
        e.preventDefault();
        executeParasiteTech('crosspull');
      } else if (e.code === 'Digit4') {
        e.preventDefault();
        executeParasiteTech('call-bound');
      } else if (e.code === 'KeyF' || e.code === 'KeyV') {
        e.preventDefault();
        executeParasiteTech('red-second');
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        player.triggerRespectBow(combatRig);
        pixelFxManager.spawnFx(
          'holy/pacify-halo',
          player.position.x,
          player.position.y + 0.08,
          player.position.z,
          { facingAngle: player.facingAngle }
        );
        boundEchoes = boundEchoes.map((ec) =>
          ec.id === '02' || ec.id === '06'
            ? { ...ec, loyalty: Math.min(100, ec.loyalty + 4) }
            : ec
        );
        emitTelemetry(latestNearbyPrompt);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    const raycaster = new THREE.Raycaster();
    const pointerVec = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.14);
    const hitPoint = new THREE.Vector3();

    const handleCanvasPointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerVec.set(ndcX, ndcY);
      raycaster.setFromCamera(pointerVec, orthoCamera);

      groundPlane.constant = -player.position.y;

      if (e.button === 2) {
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          player.setMoveTarget(hitPoint.x, hitPoint.z);
        }
      } else if (e.button === 0) {
        if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
          const dx = hitPoint.x - player.position.x;
          const dz = hitPoint.z - player.position.z;
          const clickedInteractable = worldRig.interactables.find(
            (item) =>
              Math.hypot(hitPoint.x - item.x, hitPoint.z - item.z) < 1.35 &&
              Math.hypot(player.position.x - item.x, player.position.z - item.z) <=
                item.radius + 0.8
          );
          if (clickedInteractable) {
            player.triggerInteract(worldRig, combatRig);
          } else {
            if (Math.hypot(dx, dz) > 0.25) {
              player.setMoveTarget(
                player.position.x + (dx / Math.hypot(dx, dz)) * 0.35,
                player.position.z + (dz / Math.hypot(dx, dz)) * 0.35
              );
            }
            const explicitArchetype = e.shiftKey
              ? 'heavy'
              : e.altKey
                ? 'overhead'
                : pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')
                  ? 'thrust'
                  : undefined;
            player.triggerAttack(worldRig, combatRig, explicitArchetype);
            spawnStrikePixelFx();
            emitTelemetry(latestNearbyPrompt);
          }
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('mousedown', handleCanvasPointerDown);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);

    const renderAtTime = (timeSeconds: number, dt = 0) => {
      const cfg = configRef.current;
      soundEngine.enabled = cfg.soundEnabled;

      const desiredLowH = Math.min(dims.viewH, Math.max(240, cfg.internalHeight || 540));
      if (desiredLowH !== dims.lowH) {
        dims = computePixelDimensions();
        lowResTarget.setSize(dims.lowW, dims.lowH);
        postMaterial.uniforms.uResolution.value.set(dims.lowW, dims.lowH);
      }

      const wrappedT = ((timeSeconds % LOOP_DURATION) + LOOP_DURATION) % LOOP_DURATION;
      const phaseRad = (wrappedT / LOOP_DURATION) * Math.PI * 2.0;

      updateCameraFollowAndProjection(cfg, player.position, dt);

      // Continuous 24-Hour Night-Day Cycle Lighting, Global Tint, Lantern & Brazier Modulation
      const dayNight = evaluateDayNightCycle(dayCycleHourRef.current, cfg.backgroundTone);
      const bgColorHex = dayNight.bgColorHex;
      const lanternBase = 1.65 + (player.upgrades.lanternLevel - 1) * 0.85;

      hemiLight.color.set(dayNight.hemiSkyHex);
      hemiLight.groundColor.set(dayNight.hemiGroundHex);
      hemiLight.intensity = dayNight.hemiIntensity;

      sunKeyLight.color.set(dayNight.sunColorHex);
      sunKeyLight.intensity = dayNight.sunIntensity;
      sunKeyLight.position.set(
        dayNight.sunPosition[0],
        dayNight.sunPosition[1],
        dayNight.sunPosition[2]
      );

      rimLight.color.set(dayNight.rimColorHex);
      rimLight.intensity = dayNight.rimIntensity;
      player.lanternLight.intensity = lanternBase * dayNight.lanternIntensityMultiplier;

      // Subtle atmospheric rim-light response when inside an AmbientTriggerZone
      if (combatRig.activeZoneTelemetry) {
        const zWeight = combatRig.activeZoneTelemetry.blendWeight;
        const zoneTint =
          combatRig.activeZoneTelemetry.effect === 'fen-mist-bank'
            ? '#9E9585'
            : combatRig.activeZoneTelemetry.effect === 'ossuary-ash-surge'
              ? '#C89B54'
              : combatRig.activeZoneTelemetry.effect === 'apothecary-incense'
                ? '#9BA896'
                : combatRig.activeZoneTelemetry.effect === 'barrow-wind-gust'
                  ? '#A89F91'
                  : '#B5A689';
        rimLight.color.lerp(new THREE.Color(zoneTint), zWeight * 0.25);
        rimLight.intensity += zWeight * 0.12;
      }

      (scene.background as THREE.Color).set(bgColorHex);

      // Automatic Roof Cutaway when stepping inside the Gatehouse or Apothecary interior
      const effectiveToggles = {
        ...cfg.layerToggles,
        roofSlab: cfg.layerToggles.roofSlab && !(cfg.autoRoofCutaway && player.isInsideInterior),
      };

      const effectiveDapple = cfg.dappleIntensity * dayNight.dappleMultiplier;
      worldRig.updateAtTime(
        wrappedT,
        effectiveDapple,
        effectiveToggles,
        dayNight.brazierIntensityMultiplier,
        dayNight.nightFactor,
        dayCycleHourRef.current,
        {
          dt,
          playerX: player.position.x,
          playerZ: player.position.z,
          activeDialogNpcId: player.activeNpcDialog?.npcId ?? null,
          isCutsceneActive: Boolean(activeCutsceneId),
        }
      );

      postMaterial.uniforms.uOklabLevels.value = cfg.oklabLevels;
      postMaterial.uniforms.uBayerStrength.value = cfg.bayerStrength;
      postMaterial.uniforms.uOutlineStrength.value = cfg.outlineStrength;
      postMaterial.uniforms.uRenderPassMode.value = PASS_MODE_INDEX[cfg.renderPassMode];
      postMaterial.uniforms.uBgColor.value.set(bgColorHex);
      postMaterial.uniforms.uTimePhase.value = phaseRad;
      postMaterial.uniforms.uDappleIntensity.value = effectiveDapple;
      postMaterial.uniforms.uGlobalTint.value.set(dayNight.globalTintHex);
      postMaterial.uniforms.uGlobalTintStrength.value = dayNight.globalTintStrength;

      renderer.setRenderTarget(lowResTarget);
      renderer.render(scene, orthoCamera);

      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    };

    renderImmediateRef.current = (t: number) => renderAtTime(t, 0);

    const readLowResPixels = (): Uint8Array => {
      const inspectTarget = new THREE.WebGLRenderTarget(dims.lowW, dims.lowH, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      renderer.setRenderTarget(inspectTarget);
      renderer.render(postScene, postCamera);
      const buffer = new Uint8Array(dims.lowW * dims.lowH * 4);
      renderer.readRenderTargetPixels(inspectTarget, 0, 0, dims.lowW, dims.lowH, buffer);
      renderer.setRenderTarget(null);
      inspectTarget.dispose();
      return buffer;
    };

    const computeFrameDelta = (bufA: Uint8Array, bufB: Uint8Array): number => {
      let diffSum = 0;
      const totalChannels = (bufA.length / 4) * 3;
      for (let i = 0; i < bufA.length; i += 4) {
        diffSum += Math.abs(bufA[i] - bufB[i]) / 255;
        diffSum += Math.abs(bufA[i + 1] - bufB[i + 1]) / 255;
        diffSum += Math.abs(bufA[i + 2] - bufB[i + 2]) / 255;
      }
      return Number(((diffSum / totalChannels) * 100).toFixed(3));
    };

    const envApi: VignetteEnvApi = {
      seek: (t: number) => {
        const wrapped = ((t % LOOP_DURATION) + LOOP_DURATION) % LOOP_DURATION;
        currentTimeRef.current = wrapped;
        onTimeUpdateRef.current(wrapped);
        renderAtTime(wrapped, 0);
      },
      setLevels: (levels: number) => {
        configRef.current = { ...configRef.current, oklabLevels: levels };
        renderAtTime(currentTimeRef.current, 0);
      },
      capture: () => {
        renderAtTime(currentTimeRef.current, 0);
        return renderer.domElement.toDataURL('image/png');
      },
      rgb: () => {
        renderAtTime(currentTimeRef.current, 0);
        return readLowResPixels();
      },
      measureLoopMetrics: (): LoopSeamMetrics => {
        const savedTime = currentTimeRef.current;

        renderAtTime(0.0, 0);
        const f0Url = renderer.domElement.toDataURL('image/png');
        const buf0 = readLowResPixels();

        renderAtTime(3.0, 0);
        const f180Url = renderer.domElement.toDataURL('image/png');
        const buf180 = readLowResPixels();

        renderAtTime(359 / 60, 0);
        const f359Url = renderer.domElement.toDataURL('image/png');
        const buf359 = readLowResPixels();

        const colorCounts = new Map<string, number>();
        for (let i = 0; i < buf0.length; i += 16) {
          const r = Math.round(buf0[i] / 4) * 4;
          const g = Math.round(buf0[i + 1] / 4) * 4;
          const b = Math.round(buf0[i + 2] / 4) * 4;
          const hex =
            '#' +
            [r, g, b]
              .map((v) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0'))
              .join('')
              .toUpperCase();
          colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
        }

        const sortedColors = Array.from(colorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 28)
          .map(([hex]) => hex);

        renderAtTime(savedTime, 0);

        return {
          seamDeltaF0ToF359: computeFrameDelta(buf0, buf359),
          lifeDeltaF0ToF180: computeFrameDelta(buf0, buf180),
          quantizedColorCount: Math.min(colorCounts.size, 32),
          paletteSwatches: sortedColors,
          f0DataUrl: f0Url,
          f180DataUrl: f180Url,
          f359DataUrl: f359Url,
        };
      },
      generateContactSheet: (frameCount = 8): ContactSheetFrame[] => {
        const savedTime = currentTimeRef.current;
        const frames: ContactSheetFrame[] = [];

        renderAtTime(0.0, 0);
        const buf0 = readLowResPixels();

        for (let i = 0; i < frameCount; i++) {
          const frameIdx = Math.round((i / frameCount) * 360);
          const t = (frameIdx / 360) * LOOP_DURATION;
          renderAtTime(t, 0);
          const bufT = i === 0 ? buf0 : readLowResPixels();
          frames.push({
            frameIndex: frameIdx,
            time: Number(t.toFixed(2)),
            phaseRad: Number(((t / LOOP_DURATION) * Math.PI * 2).toFixed(2)),
            label: `f${String(frameIdx).padStart(3, '0')}`,
            dataUrl: renderer.domElement.toDataURL('image/png'),
            deltaFromStart: i === 0 ? 0 : computeFrameDelta(buf0, bufT),
          });
        }

        renderAtTime(savedTime, 0);
        return frames;
      },
      debugRay: (ndcX: number, ndcY: number) => {
        pointerVec.set(ndcX, ndcY);
        raycaster.setFromCamera(pointerVec, orthoCamera);
        const hits = raycaster.intersectObjects(worldRig.root.children, true);
        if (hits.length === 0) {
          return { hit: false, objectName: 'none', point: null };
        }
        const first = hits[0];
        return {
          hit: true,
          objectName: first.object.name || first.object.parent?.name || 'Mesh',
          point: [
            Number(first.point.x.toFixed(2)),
            Number(first.point.y.toFixed(2)),
            Number(first.point.z.toFixed(2)),
          ],
        };
      },
      triggerAttack: (archetype) => {
        player.triggerAttack(worldRig, combatRig, archetype);
        spawnStrikePixelFx();
        emitTelemetry(latestNearbyPrompt);
      },
      triggerStrikeArchetype: (archetype) => {
        player.triggerAttack(worldRig, combatRig, archetype);
        spawnStrikePixelFx();
        emitTelemetry(latestNearbyPrompt);
      },
      triggerDeflect: () => {
        player.triggerDeflect(worldRig, combatRig);
        pixelFxManager.spawnFx(
          'combat/sekiro-deflect',
          player.position.x + Math.sin(player.facingAngle) * 0.72,
          player.position.y + 0.92,
          player.position.z + Math.cos(player.facingAngle) * 0.72
        );
        emitTelemetry(latestNearbyPrompt);
      },
      triggerPixelFx: (fxId: PixelFxId) => {
        const isGround =
          fxId === 'combat/ichimonji-fissure' ||
          fxId === 'shadow/gapstep-sigil' ||
          fxId === 'shadow/crosspull-grasp' ||
          fxId === 'holy/pacify-halo';
        const fwd = fxId.startsWith('combat/') ? 0.75 : 0.0;
        pixelFxManager.spawnFx(
          fxId,
          player.position.x + Math.sin(player.facingAngle) * fwd,
          player.position.y + (isGround ? 0.08 : 0.85),
          player.position.z + Math.cos(player.facingAngle) * fwd,
          { facingAngle: player.facingAngle }
        );
        player.setToast(`PIXELFX [${fxId}] — Spawned 12-Frame Procedural Pixel Flipbook`);
        emitTelemetry(latestNearbyPrompt);
      },
      triggerDodge: () => {
        player.triggerDodge();
        emitTelemetry(latestNearbyPrompt);
      },
      triggerInteract: () => {
        player.triggerInteract(worldRig, combatRig);
      },
      purchaseUpgrade: (kind) => {
        player.purchaseUpgrade(kind);
        emitTelemetry(latestNearbyPrompt);
      },
      grantSoulEmbers: (amount: number) => {
        player.addSoulEmbers(amount);
        wrenScripFund = Math.min(wrenScripGoal, wrenScripFund + amount * 1250);
        emitTelemetry(latestNearbyPrompt);
      },
      closeNpcDialog: () => {
        player.closeNpcDialog();
        emitTelemetry(latestNearbyPrompt);
      },
      triggerCutscene: (id: CutsceneId) => {
        startCutscene(id);
        emitTelemetry(latestNearbyPrompt);
      },
      skipCutscene: () => {
        stopCutscene();
        emitTelemetry(latestNearbyPrompt);
      },
      reelFishing: () => {
        player.reelFishing(combatRig);
        wrenScripFund = Math.min(wrenScripGoal, wrenScripFund + 6000);
        emitTelemetry(latestNearbyPrompt);
      },
      respawnPlateProps: () => {
        worldRig.respawnDestructibles();
        combatRig.respawnAllEnemies();
        emitTelemetry(latestNearbyPrompt);
      },
      teleportTo: (x: number, z: number) => {
        player.teleportTo(x, z, worldRig.getGroundHeight);
        prevPlayerPos.copy(player.position);
        currPlayerPos.copy(player.position);
        cameraFollowTarget.set(x, player.position.y + 0.45, z);
        emitTelemetry(null);
        renderAtTime(currentTimeRef.current, 0);
      },
      // NULLSPIRE: LEVEL ZERO API Methods
      triggerParasiteTech: (techId: ParasiteTechId) => {
        executeParasiteTech(techId);
      },
      triggerRespectBow: () => {
        player.triggerRespectBow(combatRig);
        boundEchoes = boundEchoes.map((ec) =>
          ec.id === '02' || ec.id === '06'
            ? { ...ec, loyalty: Math.min(100, ec.loyalty + 4) }
            : ec
        );
        emitTelemetry(latestNearbyPrompt);
      },
      attemptBindOffer: () => {
        if (!pendingBindOffer) return;
        const offer = pendingBindOffer;
        const roll = Math.random() * 100;
        const success = roll <= offer.chancePct;
        if (success) {
          boundEchoes = boundEchoes.map((e) =>
            e.id === offer.echoId
              ? {
                  ...e,
                  isBound: true,
                  rank: Math.min(5, e.rank + 1),
                  loyalty: Math.min(100, e.loyalty + 8),
                  fsmState: 'FOLLOW',
                }
              : e
          );
          adjustSyncRot(4);
          soundEngine.playEmberCollect();
          player.setToast(
            `BIND (73%) SUCCEEDED! Bound Echo [${offer.echoId} ${offer.echoName} ${offer.echoEpithet}] to your coat (+4% Sync/Rot)`
          );
        } else {
          // 27% Failure: Remnant shatters in a frenzy burst, +2% Rot, drops extra scrip
          adjustSyncRot(2);
          player.addSoulEmbers(6);
          wrenScripFund = Math.min(wrenScripGoal, wrenScripFund + 7500);
          soundEngine.playImpactShatter();
          player.setToast(
            `BIND (73%) SHATTERED (Rolled ${Math.round(roll)}%) — Remnant went berserk & burst into +6 Scrip Pockets!`
          );
        }
        pendingBindOffer = null;
        syncSummonedEchoVisuals();
        emitTelemetry(latestNearbyPrompt);
      },
      dismissBindOffer: () => {
        if (!pendingBindOffer) return;
        player.addSoulEmbers(3);
        player.setToast(`Released ${pendingBindOffer.enemyName}'s shadow (+3 Unbanked Scrip)`);
        pendingBindOffer = null;
        emitTelemetry(latestNearbyPrompt);
      },
      resolveWhisperDeal: (accept: boolean) => {
        if (!activeWhisperDeal) return;
        const deal = activeWhisperDeal;
        whisperDeals = whisperDeals.map((d) =>
          d.id === deal.id ? { ...d, accepted: accept, refused: !accept } : d
        );
        if (accept) {
          adjustSyncRot(deal.rotDelta);
          wrenScripFund = Math.max(0, Math.min(wrenScripGoal, wrenScripFund + deal.scripDelta));
          jossLevel += 1;
          if (deal.isLie) {
            tableClock = Math.min(8, tableClock + 1);
            player.setToast(
              `ACCEPTED VESTIGE BARGAIN "${deal.title}" — Truhound's ear drooped! Gilded Table Clock advanced to ${tableClock}/8!`
            );
          } else {
            returnedClock = Math.min(6, returnedClock + 1);
            player.setToast(
              `ACCEPTED VESTIGE BARGAIN "${deal.title}" (+${deal.rotDelta}% Sync/Rot, Level ${jossLevel})`
            );
          }
        } else {
          // Refusing a Whisper Deal builds Echo loyalty & keeps Rot clean
          boundEchoes = boundEchoes.map((e) =>
            e.isBound ? { ...e, loyalty: Math.min(100, e.loyalty + 5) } : e
          );
          player.setToast(
            `REFUSED VESTIGE WHISPER "${deal.title}" — Bound Echoes respect your restraint (+5 Loyalty)`
          );
        }
        activeWhisperDeal = null;
        truhoundEarState = 'idle';
        emitTelemetry(latestNearbyPrompt);
      },
      triggerWhisperById: (dealId?: string) => {
        const chosen = dealId
          ? whisperDeals.find((d) => d.id === dealId)
          : whisperDeals.find((d) => !d.accepted && !d.refused) || whisperDeals[0];
        if (chosen) {
          activeWhisperDeal = { ...chosen };
          truhoundEarState = chosen.isLie ? 'drooped-lie' : 'perked-truth';
          emitTelemetry(latestNearbyPrompt);
        }
      },
      resolveMemoryTithe: (acceptTithe: boolean) => {
        if (!memoryTithePending) return;
        memoryTithePending = false;
        if (acceptTithe) {
          // Corrupt one intact memory, forfeit unbanked scrip, rank down 1 Echo, full heal on the spot!
          const intactIdx = memories.findIndex((m) => !m.isTithed);
          if (intactIdx >= 0) {
            memories = memories.map((m, idx) =>
              idx === intactIdx ? { ...m, isTithed: true } : m
            );
          }
          player.setSoulEmbers(0);
          player.setHp(player.maxHp);
          adjustSyncRot(8);
          boundEchoes = boundEchoes.map((e, idx) =>
            idx === 0 ? { ...e, rank: Math.max(1, e.rank - 1) } : e
          );
          soundEngine.playBellToll();
          player.setToast(
            'MEMORY TITHE PAID TO VESTIGE — Resurrected on the spot! 1 Memory corrupted & unbanked scrip forfeited.'
          );
        } else {
          // Refuse Tithe: wake up at Doc Sable's Clinic in The Hold
          player.setHp(player.maxHp);
          player.teleportTo(7.4, -14.5, worldRig.getGroundHeight);
          cameraFollowTarget.set(7.4, player.position.y + 0.45, -14.5);
          player.setToast(
            "Refused VESTIGE's Tithe — Hauled back to Doc Sable's Clinic in Cinderfall (Memories Intact)."
          );
        }
        emitTelemetry(latestNearbyPrompt);
      },
      washRotAtClinic: () => {
        const cost = 4;
        if (player.soulEmbers < cost) {
          player.setToast(`Doc Sable requires ${cost} Unbanked Scrip Pockets to wash 15% Rot`);
          emitTelemetry(latestNearbyPrompt);
          return;
        }
        player.setSoulEmbers(player.soulEmbers - cost);
        adjustSyncRot(-15);
        player.setHp(player.maxHp);
        soundEngine.playEmberCollect();
        player.setToast(
          `Doc Sable flushed your lymph-lines (-15% Sync/Rot -> ${syncRotPct}%, Full HP Restored)`
        );
        emitTelemetry(latestNearbyPrompt);
      },
      depositWrenScrip: (emberCount: number) => {
        const count = Math.min(player.soulEmbers, Math.max(1, emberCount));
        if (count <= 0) {
          player.setToast('No Unbanked Scrip Pockets in coat to deposit for Wren');
          emitTelemetry(latestNearbyPrompt);
          return;
        }
        player.setSoulEmbers(player.soulEmbers - count);
        const scripValue = count * 5000;
        wrenScripFund = Math.min(wrenScripGoal, wrenScripFund + scripValue);
        soundEngine.playEmberCollect();
        player.setToast(
          `Banked ${count} Scrip Pockets (+${scripValue.toLocaleString()} Scrip) into Wren's Ward-C Breath-Graft Fund!`
        );
        emitTelemetry(latestNearbyPrompt);
      },
      toggleEchoSummon: (echoId: string) => {
        const target = boundEchoes.find((e) => e.id === echoId);
        if (!target) return;
        if (!target.isBound) {
          // Allow binding from Codex if player spends 5 Unbanked Scrip Pockets
          if (player.soulEmbers < 5) {
            player.setToast(`Echo ${target.name} is Unbound — Defeat Floor foes for 73% BIND or spend 5 Scrip Pockets`);
            emitTelemetry(latestNearbyPrompt);
            return;
          }
          player.setSoulEmbers(player.soulEmbers - 5);
          boundEchoes = boundEchoes.map((e) =>
            e.id === echoId ? { ...e, isBound: true, isSummoned: true, fsmState: 'FOLLOW' } : e
          );
          adjustSyncRot(3);
          syncSummonedEchoVisuals();
          player.setToast(`Bound & Summoned [${target.id} ${target.name} ${target.epithet}]!`);
          emitTelemetry(latestNearbyPrompt);
          return;
        }
        boundEchoes = boundEchoes.map((e) =>
          e.id === echoId
            ? {
                ...e,
                isSummoned: !e.isSummoned,
                fsmState: !e.isSummoned ? 'FOLLOW' : 'IDLE',
              }
            : e
        );
        syncSummonedEchoVisuals();
        emitTelemetry(latestNearbyPrompt);
      },
      cycleEchoFsmOrder: (echoId: string) => {
        const states: EchoFsmState[] = ['FOLLOW', 'FIGHT', 'HOLD-DOOR', 'MOURN', 'IDLE'];
        boundEchoes = boundEchoes.map((e) => {
          if (e.id !== echoId) return e;
          const idx = states.indexOf(e.fsmState);
          const next = states[(idx + 1) % states.length];
          return { ...e, fsmState: next };
        });
        syncSummonedEchoVisuals();
        emitTelemetry(latestNearbyPrompt);
      },
      toggleWardenAccord: (numeral: string) => {
        wardenAccords = wardenAccords.map((w) => {
          if (w.numeral !== numeral) return w;
          const nextSworn = !w.sworn;
          player.setToast(
            nextSworn
              ? `Swore Accord ${w.numeral} (${w.name}) — ${w.boon}`
              : `Broke Accord ${w.numeral} (${w.name}) — ${w.refusalBonus}`
          );
          return { ...w, sworn: nextSworn };
        });
        emitTelemetry(latestNearbyPrompt);
      },
    };

    window.__env = envApi;
    onEnvReady(envApi);
    emitTelemetry(null);

    // ========================================================================
    // DECOUPLED 60FPS PHYSICS & FRAME-SKIPPING RENDER LOOP
    // ========================================================================
    const TARGET_FPS = 60;
    const FIXED_PHYSICS_DT = 1 / TARGET_FPS; // 16.667ms fixed physics step
    const MIN_FRAME_INTERVAL_MS = 1000 / TARGET_FPS - 0.75; // High-refresh (120Hz/144Hz) frame-skip threshold
    const MAX_FRAME_DELTA_SEC = 0.1; // 100ms delta-time constraint to prevent spiral-of-death
    const MAX_PHYSICS_SUBSTEPS = 4; // Max catch-up physics steps before skipping stale frames

    let frameId = 0;
    let lastPhysicsTimestamp = performance.now();
    let lastRenderTimestamp = lastPhysicsTimestamp;
    let physicsAccumulator = 0;
    let telemetryTick = 0;
    let latestNearbyPrompt: string | null = null;

    const stepPhysics = (fixedDt: number) => {
      prevPlayerPos.copy(player.position);

      if (redSecondRemaining > 0) {
        redSecondRemaining = Math.max(0, redSecondRemaining - fixedDt);
      }
      if (bloodwageRemaining > 0) {
        bloodwageRemaining = Math.max(0, bloodwageRemaining - fixedDt);
        if (bloodwageRemaining <= 0) {
          player.setBloodwageActive(false);
        }
      }

      const cfg = configRef.current;
      const azimuth = Math.PI / 4 + (cfg.cameraYawIndex % 4) * (Math.PI / 2);

      const { triggeredExit, nearbyPrompt } = player.update(
        fixedDt,
        pressedKeys,
        worldRig,
        azimuth,
        cfg.worldMode === 'open-world',
        combatRig,
        currentTimeRef.current
      );
      latestNearbyPrompt = nearbyPrompt;
      currPlayerPos.copy(player.position);

      // Update Roaming Enemies (slowed to 30% speed during The Red Second!), Soul Ember Orbs, Regional Weather & Trigger Zones
      const enemyDt = redSecondRemaining > 0 ? fixedDt * 0.3 : fixedDt;
      const magnetRadius = 3.2 + (player.upgrades.lanternLevel - 1) * 1.8;
      combatRig.update(
        enemyDt,
        currentTimeRef.current,
        player.position,
        player.isInvulnerable,
        magnetRadius,
        cameraFollowTarget,
        orthoCamera.quaternion,
        cfg.weatherMode,
        worldRig.triggerZones,
        worldRig.getGroundHeight,
        player.takeDamage,
        (amt) => {
          player.addSoulEmbers(amt);
          wrenScripFund = Math.min(wrenScripGoal, wrenScripFund + amt * 1250);
        }
      );

      // Trigger Screen-Space Camera Shake when a new Hitstop physics event occurs
      if (
        player.hitstopImpactEvent &&
        player.hitstopImpactEvent.id !== lastHandledHitstopId
      ) {
        lastHandledHitstopId = player.hitstopImpactEvent.id;
        cameraShake.triggerFromHitstop(player.hitstopImpactEvent, azimuth);
      }

      if (triggeredExit && cfg.worldMode === 'cutout-plate') {
        lastEntryDirRef.current = triggeredExit;
        onTravelPlateRef.current(triggeredExit);
      }

      if (activeCutsceneId) {
        cutsceneElapsed += fixedDt;
        const def = VAELENPORT_CUTSCENES[activeCutsceneId];
        const totalDur = def.keyframes.reduce((s, k) => s + k.durationSec, 0);
        if (cutsceneElapsed >= totalDur) {
          stopCutscene();
        }
      }

      if (isPlayingRef.current && player.hitstopTimer <= 0) {
        currentTimeRef.current = (currentTimeRef.current + fixedDt) % LOOP_DURATION;
        if (cfg.dayNightCycleEnabled && !activeCutsceneId) {
          dayCycleHourRef.current =
            (dayCycleHourRef.current + fixedDt * cfg.dayCycleSpeed + 24.0) % 24.0;
        }
      }
    };

    function tick(now: number) {
      frameId = requestAnimationFrame(tick);

      // Frame-skipping gate for >60Hz monitors to enforce a consistent 60fps render cadence
      const elapsedSinceRenderMs = now - lastRenderTimestamp;
      if (elapsedSinceRenderMs < MIN_FRAME_INTERVAL_MS) {
        return;
      }
      lastRenderTimestamp = now - (elapsedSinceRenderMs % (1000 / TARGET_FPS));

      // Constrain frame delta-time to prevent spiral-of-death after tab switches or hitches
      const rawDeltaSec = Math.max(0, (now - lastPhysicsTimestamp) / 1000);
      lastPhysicsTimestamp = now;
      const clampedDeltaSec = Math.min(rawDeltaSec, MAX_FRAME_DELTA_SEC);
      physicsAccumulator += clampedDeltaSec;

      // Decoupled fixed-timestep physics substeps
      let substeps = 0;
      while (physicsAccumulator >= FIXED_PHYSICS_DT && substeps < MAX_PHYSICS_SUBSTEPS) {
        stepPhysics(FIXED_PHYSICS_DT);
        physicsAccumulator -= FIXED_PHYSICS_DT;
        substeps++;
      }

      // Frame-skipping backlog drop if physics fell behind by more than MAX_PHYSICS_SUBSTEPS
      if (substeps === MAX_PHYSICS_SUBSTEPS && physicsAccumulator >= FIXED_PHYSICS_DT) {
        physicsAccumulator %= FIXED_PHYSICS_DT;
      }

      // Sub-step state interpolation for silky-smooth rendering decoupled from physics ticks
      const alpha = physicsAccumulator / FIXED_PHYSICS_DT;
      interpPlayerPos.lerpVectors(prevPlayerPos, currPlayerPos, alpha);
      player.root.position.set(interpPlayerPos.x, 0, interpPlayerPos.z);

      const renderDt = Math.min(elapsedSinceRenderMs / 1000, MAX_FRAME_DELTA_SEC);
      pixelFxManager.update(renderDt, orthoCamera.quaternion);
      const savedPosX = player.position.x;
      const savedPosY = player.position.y;
      const savedPosZ = player.position.z;

      player.position.copy(interpPlayerPos);
      renderAtTime(currentTimeRef.current, renderDt);
      player.position.set(savedPosX, savedPosY, savedPosZ);

      telemetryTick++;
      if (telemetryTick % 4 === 0) {
        if (isPlayingRef.current) {
          onTimeUpdateRef.current(currentTimeRef.current);
          if (configRef.current.dayNightCycleEnabled) {
            const evalState = evaluateDayNightCycle(
              dayCycleHourRef.current,
              configRef.current.backgroundTone
            );
            const roundedHour = Number(evalState.hour.toFixed(2));
            if (
              evalState.preset !== configRef.current.timeOfDay ||
              Math.abs(roundedHour - configRef.current.dayCycleHour) >= 0.08
            ) {
              onSyncDayNightConfigRef.current({
                timeOfDay: evalState.preset,
                dayCycleHour: roundedHour,
              });
            }
          }
        }
        emitTelemetry(latestNearbyPrompt);
      }
    }

    renderAtTime(currentTimeRef.current, 0);
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('mousedown', handleCanvasPointerDown);
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu);
      player.dispose();
      combatRig.dispose();
      pixelFxManager.dispose();
      worldRig.dispose();
      lowResTarget.dispose();
      depthTexture.dispose();
      postQuad.geometry.dispose();
      postMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  const bgHex = BG_HEX_MAP[config.backgroundTone];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ backgroundColor: bgHex }}
    >
      <div ref={mountRef} className="w-screen h-screen" />
    </div>
  );
};
