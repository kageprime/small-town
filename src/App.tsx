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
  SwordStrikeArchetype,
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
import {
  INITIAL_BOUND_ECHOES,
  INITIAL_JOSS_MEMORIES,
  PARASITE_TECHNIQUES,
  WARDEN_ACCORDS,
} from './data/nullspireData';
import type { CodexTabId } from './components/WorldOverlayModals';

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
  oklabLevels: 9,
  bayerStrength: 0.45,
  outlineStrength: 0.55,
  dappleIntensity: 0.65,
  internalWidth: 960,
  internalHeight: 540,
  pixelScale: 2,
  renderPassMode: 'final',
  backgroundTone: 'obsidian',
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
  soulEmbers: 18,
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
    spotTitle: 'B13 Black-Water Sump Dredge',
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
  activeBiomeTitle: 'The Hold — Bearers Combine Muster Hall',
  nearestLandmarkTitle: 'The Hold',
  nearestLandmarkDist: 1,
  plateSeedHex: '#12D5',
  lastActionToast: null,
  activeTriggerZone: null,
  jossLevel: 11,
  scanReadout: 'E · 11 · FLAT',
  syncRotPct: 18,
  wrenScripFund: 145000,
  wrenScripGoal: 2000000,
  tableClock: 2,
  returnedClock: 2,
  activeZoneId: 'the-hold',
  redSecondRemaining: 0,
  bloodwageRemaining: 0,
  deflectWindowActive: false,
  activeStrike: {
    strikeId: 'light-kesagiri',
    archetype: 'light',
    strikeName: 'Stance Ready',
    subtitle: '構え · Neutral Guard',
    phase: 'idle',
    normalizedProgress: 0,
    windupEnd: 0.22,
    activeEnd: 0.56,
    cancelWindowStart: 0.62,
    comboStep: 1,
    durationSec: 0.28,
    hitstopMs: 55,
    postureDamage: 18,
    lungeSpeed: 5.2,
    canCancelIntoDefense: true,
    canBufferNextStrike: true,
    isDeflecting: false,
  },
  boundEchoes: INITIAL_BOUND_ECHOES,
  activeWhisperDeal: null,
  pendingBindOffer: null,
  memoryTithePending: false,
  memories: INITIAL_JOSS_MEMORIES,
  wardenAccords: WARDEN_ACCORDS,
  truhoundEarState: 'idle',
};

export default function App() {
  const [config, setConfig] = useState<VignetteConfig>(DEFAULT_CONFIG);
  const [telemetry, setTelemetry] = useState<PlayerTelemetry>(INITIAL_TELEMETRY);
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(() => new Set(['0,0']));
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(true);
  const [isBestiaryOpen, setIsBestiaryOpen] = useState<boolean>(false);
  const [codexTab, setCodexTab] = useState<CodexTabId>('bestiary');

  const [isContactSheetOpen, setIsContactSheetOpen] = useState<boolean>(false);
  const [contactFrameCount, setContactFrameCount] = useState<8 | 12>(8);
  const [contactFrames, setContactFrames] = useState<ContactSheetFrame[]>([]);
  const [seamMetrics, setSeamMetrics] = useState<LoopSeamMetrics | null>(null);

  const envApiRef = useRef<VignetteEnvApi | null>(null);

  const openCodexOnTab = useCallback((tab: CodexTabId) => {
    setCodexTab(tab);
    setIsBestiaryOpen(true);
  }, []);

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
    link.download = `nullspire-levelzero-f${String(frameIdx).padStart(3, '0')}.png`;
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
  const syncRotPct = telemetry.syncRotPct ?? 18;
  const wrenScripFund = telemetry.wrenScripFund ?? 145000;
  const wrenScripGoal = telemetry.wrenScripGoal ?? 2000000;
  const wrenPct = Math.min(100, Math.round((wrenScripFund / wrenScripGoal) * 100));
  const tableClock = telemetry.tableClock ?? 2;
  const returnedClock = telemetry.returnedClock ?? 2;
  const summonedCount = (telemetry.boundEchoes || []).filter((e) => e.isSummoned && e.isBound).length;

  const isOverlayActive = Boolean(
    telemetry.activeNpcDialog ||
      telemetry.activeCutscene ||
      telemetry.activeWhisperDeal ||
      telemetry.memoryTithePending ||
      isBestiaryOpen ||
      !isDockCollapsed
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* Top-Left NULLSPIRE: LEVEL ZERO Cinderfall Vitals, Gate Scan, Sync/Rot & Racing Clocks */}
      {!telemetry.activeCutscene && (
        <header className="fixed top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-auto">
          <div className="relative flex flex-wrap items-center gap-3.5 px-3.5 py-2.5 bg-[#141114]/94 backdrop-blur-md border border-[#3a3235] shadow-[0_12px_30px_rgba(0,0,0,0.85)]">
            {/* Left Crimson VESTIGE Spine Accent */}
            <div className="w-0.5 self-stretch bg-[#e5482f]" />

            {/* Spire Gate Scan Badge vs True VESTIGE Level */}
            <div className="flex flex-col pr-2 border-r border-[#3a3235]">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 bg-[#1e1a1c] border border-[#e8a020]/60 text-[#e8a020]">
                  {telemetry.scanReadout || 'E · 11 · FLAT'}
                </span>
                <span className="text-[11px] font-mono-tabular font-semibold text-[#e5482f]">
                  TRUE LV.{telemetry.jossLevel || 11}
                </span>
              </div>
              <span className="text-[9px] font-mono-tabular text-[#a89f94] mt-0.5">
                JOSS VANE (“COFFIN”) · BEARERS COMBINE
              </span>
            </div>

            {/* HP, Stamina & Sync/Rot Framed Troughs */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-[#e5482f] fill-[#e5482f]/40 shrink-0" />
                <div className="w-24 sm:w-28 h-2 bg-[#1e1a1c] border border-[#3a3235] overflow-hidden">
                  <div
                    className="h-full bg-[#e5482f] transition-all duration-150"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono-tabular text-[#f4efe4] w-7">
                  {telemetry.hp}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#6daa45] shrink-0" />
                <div className="w-24 sm:w-28 h-1.5 bg-[#1e1a1c] border border-[#3a3235] overflow-hidden">
                  <div
                    className="h-full bg-[#6daa45] transition-all duration-75"
                    style={{ width: `${stamPct}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-mono-tabular ${
                    syncRotPct >= 65 ? 'text-[#e5482f]' : 'text-[#9fd8e8]'
                  }`}
                  title="VESTIGE Sync / Rot %"
                >
                  ROT {syncRotPct}%
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-[#3a3235]" />

            {/* Unbanked Coat Scrip + Wren's 2,000,000 Ward-C Breath-Graft Progress */}
            <button
              type="button"
              onClick={() => openCodexOnTab('clinic')}
              className="flex flex-col text-left hover:opacity-90 transition-opacity"
              title="Open Doc Sable's Clinic & Wren's 2,000,000 Scrip Ledger"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-[#e8a020] fill-[#e8a020]/25 shrink-0" />
                <span className="text-xs font-mono-tabular font-semibold text-[#f4efe4]">
                  {telemetry.soulEmbers} Coat Scrip
                </span>
                <span className="text-[10px] font-mono-tabular text-[#e8a020]">
                  · Wren: {(wrenScripFund / 1000).toFixed(0)}k / 2,000k ({wrenPct}%)
                </span>
              </div>
              <div className="w-full h-1 bg-[#1e1a1c] border border-[#3a3235] mt-1 overflow-hidden">
                <div
                  className="h-full bg-[#e8a020]"
                  style={{ width: `${Math.max(5, wrenPct)}%` }}
                />
              </div>
            </button>
          </div>

          {/* District Subtitle + Two Racing Clocks (Gilded Table 0/8 & The Returned 0/6) */}
          <div className="px-1.5 flex flex-wrap items-center gap-3 text-[10px] font-display tracking-[0.16em] uppercase text-[#f4efe4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-[#e8a020]">◆</span>
              <span>{telemetry.activeBiomeTitle}</span>
            </div>
            <span className="text-[#a89f94] font-mono-tabular">
              TABLE CLOCK: <strong className="text-[#e8a020]">{tableClock}/8</strong>
            </span>
            <span className="text-[#a89f94] font-mono-tabular">
              RETURNED: <strong className="text-[#9fd8e8]">{returnedClock}/6</strong>
            </span>
            {telemetry.redSecondRemaining && telemetry.redSecondRemaining > 0 ? (
              <span className="px-1.5 py-0.5 bg-[#e5482f]/25 border border-[#e5482f] text-[#f4efe4] font-mono-tabular">
                RED SECOND {telemetry.redSecondRemaining}s
              </span>
            ) : null}
            {telemetry.bloodwageRemaining && telemetry.bloodwageRemaining > 0 ? (
              <span className="px-1.5 py-0.5 bg-[#e5482f]/25 border border-[#e5482f] text-[#f4efe4] font-mono-tabular">
                BLOODWAGE {telemetry.bloodwageRemaining}s
              </span>
            ) : null}
          </div>
        </header>
      )}

      {/* Bottom-Left VESTIGE Parasite Technique Hotbar & Echo Command Strip */}
      {!telemetry.activeCutscene && !isOverlayActive && (
        <div className="fixed bottom-4 left-4 z-20 flex flex-wrap items-center gap-1.5 pointer-events-auto">
          {PARASITE_TECHNIQUES.map((tech) => (
            <button
              key={tech.id}
              type="button"
              onClick={() => envApiRef.current?.triggerParasiteTech(tech.id)}
              title={`${tech.name}: ${tech.effectSummary} (${tech.costLabel})`}
              className="px-2.5 py-1.5 bg-[#141114]/92 hover:bg-[#282226] border border-[#3a3235] hover:border-[#e5482f] text-left transition-colors flex items-center gap-1.5"
            >
              <span className="px-1 py-0.5 text-[10px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] text-[#e8a020]">
                {tech.keybind === 'R' ? 'F' : tech.keybind}
              </span>
              <span className="text-[11px] font-display tracking-[0.12em] uppercase text-[#f4efe4]">
                {tech.name}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => envApiRef.current?.triggerRespectBow()}
            title="Bow in Respect [G] — Stuns & pacifies nearby Palls for 4.2s and raises Mercy/Stitch Loyalty"
            className="px-2.5 py-1.5 bg-[#141114]/92 hover:bg-[#282226] border border-[#3a3235] hover:border-[#9fd8e8] text-left transition-colors flex items-center gap-1.5"
          >
            <span className="px-1 py-0.5 text-[10px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] text-[#9fd8e8]">
              G
            </span>
            <span className="text-[11px] font-display tracking-[0.12em] uppercase text-[#9fd8e8]">
              Bow
            </span>
          </button>

          <button
            type="button"
            onClick={() => openCodexOnTab('echoes')}
            className="px-2.5 py-1.5 bg-[#141114]/92 hover:bg-[#282226] border border-[#3a3235] hover:border-[#e8a020] text-left transition-colors flex items-center gap-1.5"
          >
            <span className="px-1 py-0.5 text-[10px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] text-[#e8a020]">
              B
            </span>
            <span className="text-[11px] font-display tracking-[0.12em] uppercase text-[#e8a020]">
              Echoes ({summonedCount}) &amp; Codex
            </span>
          </button>
        </div>
      )}

      {/* Bottom-Right Sekiro × BlazBlue Sword Choreography Deck & Live Frame Telemetry */}
      {!telemetry.activeCutscene && !isOverlayActive && (
        <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
          {/* Active Strike Phase & Feint-Cancel Readout */}
          {telemetry.activeStrike &&
            (telemetry.activeStrike.phase !== 'idle' || telemetry.activeStrike.isDeflecting) && (
              <div className="px-3 py-1.5 bg-[#141114]/95 border border-[#3a3235] flex items-center gap-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.85)]">
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-mono-tabular uppercase border ${
                    telemetry.activeStrike.phase === 'deflect'
                      ? 'bg-[#e8a020]/20 border-[#e8a020] text-[#e8a020]'
                      : telemetry.activeStrike.phase === 'active'
                        ? 'bg-[#e5482f]/25 border-[#e5482f] text-[#f4efe4]'
                        : telemetry.activeStrike.phase === 'windup'
                          ? 'bg-[#9fd8e8]/15 border-[#9fd8e8] text-[#9fd8e8]'
                          : 'bg-[#1e1a1c] border-[#3a3235] text-[#a89f94]'
                  }`}
                >
                  {telemetry.activeStrike.phase === 'windup'
                    ? 'CHAMBER'
                    : telemetry.activeStrike.phase === 'active'
                      ? 'SNAP'
                      : telemetry.activeStrike.phase === 'follow-through'
                        ? 'RECOVERY'
                        : 'DEFLECT'}
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-display tracking-[0.12em] uppercase text-[#f4efe4]">
                    {telemetry.activeStrike.strikeName}
                  </span>
                  <span className="text-[9px] font-mono-tabular text-[#a89f94]">
                    {telemetry.activeStrike.subtitle} ·{' '}
                    {telemetry.activeStrike.canCancelIntoDefense ? (
                      <strong className="text-[#9fd8e8]">FEINT-CANCEL OPEN</strong>
                    ) : (
                      <strong className="text-[#e5482f]">COMMITTED ARC</strong>
                    )}
                  </span>
                </div>
              </div>
            )}

          {/* 4 Sword Strike Archetype Triggers + Sekiro Crossguard Deflect */}
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {(
              [
                {
                  arch: 'light' as SwordStrikeArchetype,
                  key: 'J',
                  label: 'Light Slash',
                  sub: 'Kesagiri',
                  accent: 'hover:border-[#f4efe4]',
                  badgeText: 'text-[#f4efe4]',
                },
                {
                  arch: 'heavy' as SwordStrikeArchetype,
                  key: 'U',
                  label: 'Heavy Cleave',
                  sub: 'Shift+LMB',
                  accent: 'hover:border-[#e5482f]',
                  badgeText: 'text-[#e5482f]',
                },
                {
                  arch: 'thrust' as SwordStrikeArchetype,
                  key: 'I',
                  label: 'Shadowrush',
                  sub: 'W+LMB',
                  accent: 'hover:border-[#9fd8e8]',
                  badgeText: 'text-[#9fd8e8]',
                },
                {
                  arch: 'overhead' as SwordStrikeArchetype,
                  key: 'O',
                  label: 'Ichimonji',
                  sub: 'Alt+LMB',
                  accent: 'hover:border-[#e8a020]',
                  badgeText: 'text-[#e8a020]',
                },
              ] as const
            ).map((btn) => {
              const isCurrent =
                telemetry.activeStrike?.phase !== 'idle' &&
                telemetry.activeStrike?.archetype === btn.arch;
              return (
                <button
                  key={btn.arch}
                  type="button"
                  onClick={() => envApiRef.current?.triggerStrikeArchetype?.(btn.arch)}
                  title={`${btn.label} [${btn.key} / ${btn.sub}] — Sekiro timing & BlazBlue smear arc`}
                  className={`px-2.5 py-1.5 bg-[#141114]/92 hover:bg-[#282226] border transition-colors flex items-center gap-1.5 ${
                    isCurrent ? 'border-[#e8a020] bg-[#282226]' : `border-[#3a3235] ${btn.accent}`
                  }`}
                >
                  <span
                    className={`px-1 py-0.5 text-[10px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] ${btn.badgeText}`}
                  >
                    {btn.key}
                  </span>
                  <span className="text-[11px] font-display tracking-[0.11em] uppercase text-[#f4efe4]">
                    {btn.label}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => envApiRef.current?.triggerDeflect?.()}
              title="Sekiro Crossguard Deflect [K] — 190ms active parry window; cancels strike wind-up or recovery"
              className={`px-2.5 py-1.5 bg-[#141114]/92 hover:bg-[#282226] border transition-colors flex items-center gap-1.5 ${
                telemetry.activeStrike?.isDeflecting
                  ? 'border-[#e8a020] bg-[#282226]'
                  : 'border-[#3a3235] hover:border-[#e8a020]'
              }`}
            >
              <span className="px-1 py-0.5 text-[10px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] text-[#e8a020]">
                K
              </span>
              <span className="text-[11px] font-display tracking-[0.11em] uppercase text-[#e8a020]">
                Deflect
              </span>
            </button>
          </div>
        </div>
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

      {/* Centered Bottom-Screen Classical Codex Interaction Prompt */}
      {!isOverlayActive && (telemetry.nearbyPrompt || telemetry.lastActionToast) && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1.5">
          {telemetry.lastActionToast && (
            <div className="px-4 py-1.5 bg-[#141114]/94 backdrop-blur-md text-[#f4efe4] border border-[#3a3235] text-xs tracking-wide shadow-xl whitespace-nowrap">
              {telemetry.lastActionToast}
            </div>
          )}
          {telemetry.nearbyPrompt && (
            <div className="px-5 py-2 bg-[#141114]/96 backdrop-blur-md text-[#f4efe4] border border-[#e8a020] shadow-[0_10px_28px_rgba(0,0,0,0.85)] text-xs font-display tracking-[0.12em] uppercase flex items-center gap-2.5 whitespace-nowrap">
              <span className="text-[9px] text-[#e8a020]">◆</span>
              <span>{telemetry.nearbyPrompt}</span>
              <span className="text-[9px] text-[#e8a020]">◆</span>
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

      {/* NULLSPIRE Codex, Sump Dredge, 73% BIND Offer, VESTIGE Whisper & Memory Tithe Modals */}
      <WorldOverlayModals
        telemetry={telemetry}
        isBestiaryOpen={isBestiaryOpen}
        initialTab={codexTab}
        onCloseBestiary={() => setIsBestiaryOpen(false)}
        onPurchaseUpgrade={(kind) => envApiRef.current?.purchaseUpgrade(kind)}
        onCloseNpcDialog={() => envApiRef.current?.closeNpcDialog()}
        onReelFishing={() => envApiRef.current?.reelFishing()}
        onLocateVariantRegion={handleLocateVariantRegion}
        onAttemptBindOffer={() => envApiRef.current?.attemptBindOffer()}
        onDismissBindOffer={() => envApiRef.current?.dismissBindOffer()}
        onResolveWhisperDeal={(accept) => envApiRef.current?.resolveWhisperDeal(accept)}
        onTriggerWhisperDeal={(dealId) => envApiRef.current?.triggerWhisperById(dealId)}
        onResolveMemoryTithe={(accept) => envApiRef.current?.resolveMemoryTithe(accept)}
        onWashRotAtClinic={() => envApiRef.current?.washRotAtClinic()}
        onDepositWrenScrip={(count) => envApiRef.current?.depositWrenScrip(count)}
        onToggleEchoSummon={(echoId) => envApiRef.current?.toggleEchoSummon(echoId)}
        onCycleEchoFsmOrder={(echoId) => envApiRef.current?.cycleEchoFsmOrder(echoId)}
        onToggleWardenAccord={(numeral) => envApiRef.current?.toggleWardenAccord(numeral)}
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
        onTriggerAttack={(arch) => envApiRef.current?.triggerAttack(arch)}
        onTriggerStrikeArchetype={(arch) => envApiRef.current?.triggerStrikeArchetype?.(arch)}
        onTriggerDeflect={() => envApiRef.current?.triggerDeflect?.()}
        onTriggerPixelFx={(fxId) => envApiRef.current?.triggerPixelFx?.(fxId)}
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
