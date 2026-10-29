/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Heart, Zap } from 'lucide-react';
import {
  CardinalDirection,
  ContactSheetFrame,
  LayerToggles,
  LoopSeamMetrics,
  PlateCoordinate,
  PlayerTelemetry,
  VignetteConfig,
  VignetteEnvApi,
} from './types/vignette';
import { VignetteCanvas } from './components/VignetteCanvas';
import { StudioDock } from './components/StudioDock';
import { ContactSheetModal } from './components/ContactSheetModal';
import { MiniMap, MINIMAP_GRID_RADIUS, tileKey } from './components/MiniMap';
import { WorldOverlayModals } from './components/WorldOverlayModals';
import { DialogueAndCutsceneOverlay } from './components/DialogueAndCutsceneOverlay';
import { INITIAL_BESTIARY_ENTRIES } from './scene/enemySystem';
import { OPEN_WORLD_LANDMARKS } from './scene/buildOpenWorld';

const DEFAULT_CONFIG: VignetteConfig = {
  worldMode: 'open-world',
  cameraAngle: 'isometric-30',
  cameraZoom: 'standard',
  cameraYawIndex: 0,
  timeOfDay: 'noon-dapple',
  dayNightCycleEnabled: true,
  dayCycleSpeed: 0.45,
  dayCycleHour: 12.0,
  weatherMode: 'auto-regional',
  soundEnabled: true,
  autoRoofCutaway: true,
  oklabLevels: 6,
  bayerStrength: 1.0,
  outlineStrength: 0.85,
  dappleIntensity: 0.68,
  internalWidth: 300,
  internalHeight: 280,
  pixelScale: 5,
  renderPassMode: 'final',
  backgroundTone: 'ivory',
  layerToggles: {
    roofSlab: true,
    waterFen: true,
    gravekeeper: true,
    cloudDapple: true,
    embersAndMotes: true,
  },
  worldSeed: 4821,
  plateCoord: { gx: 0, gz: 0 },
  forcedBiome: 'auto',
};

const INITIAL_TELEMETRY: PlayerTelemetry = {
  x: 0,
  y: 0.14,
  z: 1.25,
  facingAngle: Math.PI,
  tileX: 0,
  tileZ: 0,
  isGrounded: true,
  isInsideInterior: false,
  dayCycleHour: 12.0,
  formattedClock: '12:00',
  dayPhaseLabel: 'Noon Dapple',
  brazierIntensityMultiplier: 0.85,
  cameraShakeIntensity: 0,
  bestiary: INITIAL_BESTIARY_ENTRIES,
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  soulEmbers: 8,
  enemiesDefeated: 0,
  totalEnemies: 6,
  upgrades: {
    swordLevel: 1,
    lanternLevel: 1,
    vitalityLevel: 1,
  },
  activeNpcDialog: null,
  activeCutscene: null,
  fishingState: {
    active: false,
    spotTitle: 'Lower Canal Gondola Jetty',
    phase: 'waiting',
    bobberProgress: 0,
    lastCatchName: null,
    lastCatchEmbers: 0,
    totalCaught: 0,
  },
  nearbyPrompt: null,
  litBraziers: 4,
  totalBraziers: 6,
  shatteredCount: 0,
  totalDestructibles: 8,
  activeBiome: 'crypt-courtyard',
  activeBiomeTitle: 'Lantern Plaza & Astrolabe Fountain',
  nearestLandmarkTitle: 'Lantern Plaza',
  nearestLandmarkDist: 1,
  plateSeedHex: '#12D5',
  lastActionToast: null,
  activeTriggerZone: null,
};

export default function App() {
  const [config, setConfig] = useState<VignetteConfig>(DEFAULT_CONFIG);
  const [telemetry, setTelemetry] = useState<PlayerTelemetry>(INITIAL_TELEMETRY);
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(() => new Set(['0,0']));
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(true);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState<boolean>(false);

  const [isContactSheetOpen, setIsContactSheetOpen] = useState<boolean>(false);
  const [contactFrameCount, setContactFrameCount] = useState<8 | 12>(8);
  const [contactFrames, setContactFrames] = useState<ContactSheetFrame[]>([]);
  const [seamMetrics, setSeamMetrics] = useState<LoopSeamMetrics | null>(null);

  const envApiRef = useRef<VignetteEnvApi | null>(null);

  const markTileVisited = useCallback((gx: number, gz: number) => {
    const clampedX = Math.max(-MINIMAP_GRID_RADIUS, Math.min(MINIMAP_GRID_RADIUS, gx));
    const clampedZ = Math.max(-MINIMAP_GRID_RADIUS, Math.min(MINIMAP_GRID_RADIUS, gz));
    const key = tileKey(clampedX, clampedZ);
    setVisitedTiles((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const handleTelemetryUpdate = useCallback(
    (nextTelemetry: PlayerTelemetry) => {
      setTelemetry(nextTelemetry);
      if (config.worldMode === 'open-world') {
        markTileVisited(nextTelemetry.tileX, nextTelemetry.tileZ);
      }
    },
    [config.worldMode, markTileVisited]
  );

  const handleEnvReady = useCallback((api: VignetteEnvApi) => {
    envApiRef.current = api;
  }, []);

  const handleUpdateConfig = useCallback((partial: Partial<VignetteConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleToggleLayer = useCallback((layerKey: keyof LayerToggles) => {
    setConfig((prev) => ({
      ...prev,
      layerToggles: {
        ...prev.layerToggles,
        [layerKey]: !prev.layerToggles[layerKey],
      },
    }));
  }, []);

  const handleTravelPlate = useCallback(
    (dir: CardinalDirection) => {
      setConfig((prev) => {
        const dx = dir === 'E' ? 1 : dir === 'W' ? -1 : 0;
        const dz = dir === 'S' ? 1 : dir === 'N' ? -1 : 0;
        const nextGx = Math.max(
          -MINIMAP_GRID_RADIUS,
          Math.min(MINIMAP_GRID_RADIUS, prev.plateCoord.gx + dx)
        );
        const nextGz = Math.max(
          -MINIMAP_GRID_RADIUS,
          Math.min(MINIMAP_GRID_RADIUS, prev.plateCoord.gz + dz)
        );
        markTileVisited(nextGx, nextGz);
        return {
          ...prev,
          plateCoord: {
            gx: nextGx,
            gz: nextGz,
          },
        };
      });
    },
    [markTileVisited]
  );

  const handleTeleportLandmark = useCallback(
    (x: number, z: number) => {
      envApiRef.current?.teleportTo(x, z);
      const tx = Math.round(x / 10);
      const tz = Math.round(z / 10);
      markTileVisited(tx, tz);
    },
    [markTileVisited]
  );

  const handleSelectMinimapTile = useCallback(
    (x: number, z: number, tileCoord: PlateCoordinate) => {
      markTileVisited(tileCoord.gx, tileCoord.gz);
      if (config.worldMode === 'open-world') {
        envApiRef.current?.teleportTo(x, z);
      } else {
        setConfig((prev) => ({
          ...prev,
          plateCoord: tileCoord,
        }));
      }
    },
    [config.worldMode, markTileVisited]
  );

  const handleRollNewSeed = useCallback(() => {
    const nextSeed = Math.floor(1000 + Math.random() * 90000);
    setVisitedTiles(new Set(['0,0']));
    setConfig((prev) => ({
      ...prev,
      worldSeed: nextSeed,
      plateCoord: { gx: 0, gz: 0 },
    }));
  }, []);

  const handleSeek = useCallback((targetTime: number) => {
    setIsPlaying(false);
    setCurrentTime(targetTime);
    if (envApiRef.current) {
      envApiRef.current.seek(targetTime);
    }
  }, []);

  const captureReviewSheet = useCallback(
    (count: 8 | 12 = contactFrameCount) => {
      const api = envApiRef.current;
      if (!api) return;
      const wasPlaying = isPlaying;
      setIsPlaying(false);
      const metrics = api.measureLoopMetrics();
      const frames = api.generateContactSheet(count);
      setSeamMetrics(metrics);
      setContactFrames(frames);
      if (wasPlaying) {
        setIsPlaying(true);
      }
    },
    [contactFrameCount, isPlaying]
  );

  const handleOpenContactSheet = useCallback(() => {
    captureReviewSheet(contactFrameCount);
    setIsContactSheetOpen(true);
  }, [captureReviewSheet, contactFrameCount]);

  const handleChangeContactFrameCount = useCallback(
    (count: 8 | 12) => {
      setContactFrameCount(count);
      captureReviewSheet(count);
    },
    [captureReviewSheet]
  );

  const handleDownloadCurrentFrame = useCallback(() => {
    const api = envApiRef.current;
    if (!api) return;
    const dataUrl = api.capture();
    const frameIdx = Math.floor((currentTime / 6.0) * 360) % 360;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `gothic-openworld-f${String(frameIdx).padStart(3, '0')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentTime]);

  const handleLocateVariantRegion = useCallback(
    (regionName: string) => {
      const matchedPoi = OPEN_WORLD_LANDMARKS.find(
        (poi) =>
          regionName.toLowerCase().includes(poi.shortLabel.toLowerCase()) ||
          poi.title.toLowerCase().includes(regionName.split(' ')[0].toLowerCase())
      );
      if (matchedPoi) {
        if (config.worldMode !== 'open-world') {
          setConfig((prev) => ({ ...prev, worldMode: 'open-world' }));
        }
        handleTeleportLandmark(matchedPoi.x, matchedPoi.z);
        setIsBestiaryOpen(false);
      }
    },
    [config.worldMode, handleTeleportLandmark]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H' || e.key === 'Tab') {
        if (e.key === 'Tab') e.preventDefault();
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setConfig((prev) => ({ ...prev, cameraYawIndex: (prev.cameraYawIndex + 1) % 4 }));
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBestiaryOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const hpPct = Math.max(0, Math.min(100, Math.round((telemetry.hp / telemetry.maxHp) * 100)));
  const stamPct = Math.max(
    0,
    Math.min(100, Math.round((telemetry.stamina / telemetry.maxStamina) * 100))
  );

  const isOverlayActive = Boolean(
    telemetry.activeNpcDialog || telemetry.activeCutscene || isBestiaryOpen || !isDockCollapsed
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* Minimal Top-Left RPG Player Vitals & District Cluster */}
      {!telemetry.activeCutscene && (
        <header className="fixed top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
          <div className="flex items-center gap-3 px-3 py-2 bg-[#121216]/85 backdrop-blur-md border border-white/10 rounded-xl shadow-xl">
            {/* HP & Stamina Bars */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30 shrink-0" />
                <div className="w-24 sm:w-28 h-2 bg-zinc-900/90 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-150"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono-tabular text-zinc-300">
                  {telemetry.hp}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="w-20 sm:w-24 h-1.5 bg-zinc-900/90 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${stamPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* Soul Embers Counter */}
            <div
              className="flex items-center gap-1.5 pr-1 text-amber-300"
              title="Soul Embers"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />
              <span className="text-sm font-mono-tabular font-semibold">
                {telemetry.soulEmbers}
              </span>
            </div>
          </div>

          {/* Subtle Location Subtitle */}
          <div className="px-1 text-xs font-display font-medium text-zinc-200/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {telemetry.activeBiomeTitle}
          </div>
        </header>
      )}

      {/* Top-Right Compact Radar & Quick Utility Strip */}
      {!telemetry.activeCutscene && (
        <MiniMap
          worldMode={config.worldMode}
          telemetry={telemetry}
          plateCoord={config.plateCoord}
          visitedTiles={visitedTiles}
          cameraYawIndex={config.cameraYawIndex}
          soundEnabled={config.soundEnabled}
          isMenuOpen={!isDockCollapsed}
          onSelectLandmarkOrTile={handleSelectMinimapTile}
          onTravelPlate={handleTravelPlate}
          onToggleBestiary={() => setIsBestiaryOpen((prev) => !prev)}
          onToggleSound={() =>
            handleUpdateConfig({ soundEnabled: !config.soundEnabled })
          }
          onToggleMenu={() => setIsDockCollapsed((prev) => !prev)}
        />
      )}

      {/* Centered Bottom-Screen Contextual RPG Interaction Prompt */}
      {!isOverlayActive && (telemetry.nearbyPrompt || telemetry.lastActionToast) && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5">
          {telemetry.lastActionToast && (
            <div className="px-3.5 py-1 bg-[#121216]/85 backdrop-blur-md text-zinc-200 border border-white/10 rounded-full text-xs font-medium shadow-lg whitespace-nowrap">
              {telemetry.lastActionToast}
            </div>
          )}
          {telemetry.nearbyPrompt && (
            <div className="px-4 py-1.5 bg-[#121216]/90 backdrop-blur-md text-amber-200 border border-amber-500/35 rounded-full text-xs font-medium shadow-xl whitespace-nowrap">
              {telemetry.nearbyPrompt}
            </div>
          )}
        </div>
      )}

      {/* Expressive Character Portrait Dialogue, Voice Blips, Persistent Choices & Cutscene Director */}
      <DialogueAndCutsceneOverlay
        telemetry={telemetry}
        onPurchaseUpgrade={(kind) => envApiRef.current?.purchaseUpgrade(kind)}
        onGrantSoulEmbers={(amt) => envApiRef.current?.grantSoulEmbers(amt)}
        onCloseNpcDialog={() => envApiRef.current?.closeNpcDialog()}
        onTriggerCutscene={(id) => envApiRef.current?.triggerCutscene(id)}
        onSkipCutscene={() => envApiRef.current?.skipCutscene()}
      />

      {/* Fen Fishing & Bestiary Log Overlay */}
      <WorldOverlayModals
        telemetry={telemetry}
        isBestiaryOpen={isBestiaryOpen}
        onCloseBestiary={() => setIsBestiaryOpen(false)}
        onPurchaseUpgrade={(kind) => envApiRef.current?.purchaseUpgrade(kind)}
        onCloseNpcDialog={() => envApiRef.current?.closeNpcDialog()}
        onReelFishing={() => envApiRef.current?.reelFishing()}
        onLocateVariantRegion={handleLocateVariantRegion}
      />

      {/* 100% Fullscreen Edge-to-Edge 3D Pixel-Upscaled Viewport */}
      <main className="w-screen h-screen">
        <VignetteCanvas
          config={config}
          isPlaying={isPlaying}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
          onTelemetryUpdate={handleTelemetryUpdate}
          onSyncDayNightConfig={handleUpdateConfig}
          onTravelPlate={handleTravelPlate}
          onEnvReady={handleEnvReady}
        />
      </main>

      {/* Hidden-by-Default World & Studio Menu Overlay (Toggled via [H] / [Tab] or Top-Right Button) */}
      <StudioDock
        config={config}
        telemetry={telemetry}
        isPlaying={isPlaying}
        currentTime={currentTime}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        onSeek={handleSeek}
        onUpdateConfig={handleUpdateConfig}
        onToggleLayer={handleToggleLayer}
        onTravelPlate={handleTravelPlate}
        onTeleportLandmark={handleTeleportLandmark}
        onRollNewSeed={handleRollNewSeed}
        onTriggerAttack={() => envApiRef.current?.triggerAttack()}
        onTriggerDodge={() => envApiRef.current?.triggerDodge()}
        onTriggerInteract={() => envApiRef.current?.triggerInteract()}
        onTriggerCutscene={(id) => envApiRef.current?.triggerCutscene(id)}
        onRespawnProps={() => envApiRef.current?.respawnPlateProps()}
        onResetDefaults={() => setConfig(DEFAULT_CONFIG)}
        onToggleBestiary={() => setIsBestiaryOpen((prev) => !prev)}
        onOpenContactSheet={handleOpenContactSheet}
        onDownloadCurrentFrame={handleDownloadCurrentFrame}
      />

      {/* Step 4 Contact Sheet & Loop Seam Audit Modal */}
      <ContactSheetModal
        isOpen={isContactSheetOpen}
        frames={contactFrames}
        seamMetrics={seamMetrics}
        frameCount={contactFrameCount}
        onChangeFrameCount={handleChangeContactFrameCount}
        onRefresh={() => captureReviewSheet(contactFrameCount)}
        onSelectFrame={handleSeek}
        onClose={() => setIsContactSheetOpen(false)}
      />
    </div>
  );
}
