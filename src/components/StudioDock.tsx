import React, { useState } from 'react';
import {
  BookOpen,
  Clock,
  Compass,
  Download,
  Film,
  Grid,
  Layers,
  MapPin,
  Moon,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Shuffle,
  Sliders,
  StepBack,
  StepForward,
  Sun,
  Wind,
} from 'lucide-react';
import {
  CameraProjectionAngle,
  CameraZoomPreset,
  CardinalDirection,
  CitizenId,
  CutoutBackgroundTone,
  CutsceneId,
  LayerToggles,
  PixelFxId,
  PlayerTelemetry,
  RenderPassMode,
  SwordStrikeArchetype,
  TimeOfDayPreset,
  VignetteConfig,
  WeatherPreset,
} from '../types/vignette';
import { LOOP_DURATION } from '../scene/buildGothicCourtyard';
import { OPEN_WORLD_LANDMARKS } from '../scene/buildOpenWorld';
import { evaluateCitizenSchedule, VAELENPORT_CITIZENS } from '../scene/dialogueAndCutscenes';
import { hourToTimeOfDayPreset, PRESET_CANONICAL_HOUR } from '../scene/dayNightCycle';
import {
  ARCHETYPE_TO_PRIMARY_STRIKE_ID,
  STRIKE_CHOREOGRAPHY_REGISTRY,
} from '../scene/combatChoreography';
import {
  bakePixelFxSpriteSheet,
  PIXELFX_CATALOG,
  renderBakedSheetToDataUrl,
} from '../scene/pixelFxEngine';

interface StudioDockProps {
  config: VignetteConfig;
  telemetry: PlayerTelemetry;
  isPlaying: boolean;
  currentTime: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTogglePlay: () => void;
  onSeek: (timeSeconds: number) => void;
  onUpdateConfig: (partial: Partial<VignetteConfig>) => void;
  onToggleLayer: (layerKey: keyof LayerToggles) => void;
  onTravelPlate: (dir: CardinalDirection) => void;
  onTeleportLandmark: (x: number, z: number) => void;
  onRollNewSeed: () => void;
  onTriggerAttack: (archetype?: SwordStrikeArchetype) => void;
  onTriggerStrikeArchetype?: (archetype: SwordStrikeArchetype) => void;
  onTriggerDeflect?: () => void;
  onTriggerPixelFx?: (fxId: PixelFxId) => void;
  onTriggerDodge: () => void;
  onTriggerInteract: () => void;
  onTriggerCutscene: (id: CutsceneId) => void;
  onRespawnProps: () => void;
  onResetDefaults: () => void;
  onToggleBestiary: () => void;
  onOpenContactSheet: () => void;
  onDownloadCurrentFrame: () => void;
}

type DockTab = 'world' | 'citizens' | 'shader' | 'timeline';

const TAB_ITEMS: { id: DockTab; label: string; subtitle: string }[] = [
  { id: 'world', label: 'WORLD & TRAVEL', subtitle: 'SANCTUARY ATLAS' },
  { id: 'citizens', label: 'CITIZENS & EVENTS', subtitle: 'DAILY CHRONICLE' },
  { id: 'shader', label: 'CAMERA & SHADER', subtitle: 'CODEX RENDERING' },
  { id: 'timeline', label: 'LOOP & AUDIT', subtitle: 'HARMONIC CYCLE' },
];

export const StudioDock: React.FC<StudioDockProps> = ({
  config,
  telemetry,
  isPlaying,
  currentTime,
  isCollapsed,
  onToggleCollapse,
  onTogglePlay,
  onSeek,
  onUpdateConfig,
  onToggleLayer,
  onTravelPlate,
  onTeleportLandmark,
  onRollNewSeed,
  onTriggerAttack,
  onTriggerStrikeArchetype,
  onTriggerDeflect,
  onTriggerPixelFx,
  onTriggerCutscene,
  onRespawnProps,
  onResetDefaults,
  onToggleBestiary,
  onOpenContactSheet,
  onDownloadCurrentFrame,
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('world');
  const [selectedPixelFxId, setSelectedPixelFxId] = useState<PixelFxId>('combat/kesagiri-slash');
  const [bakedSheetUrl, setBakedSheetUrl] = useState<string>('');

  const handleInspectPixelFx = (fxId: PixelFxId) => {
    setSelectedPixelFxId(fxId);
    const sheet = bakePixelFxSpriteSheet(PIXELFX_CATALOG[fxId]);
    setBakedSheetUrl(renderBakedSheetToDataUrl(sheet, 2));
  };

  const handleDownloadPixelFxSheet = (fxId: PixelFxId) => {
    const sheet = bakePixelFxSpriteSheet(PIXELFX_CATALOG[fxId]);
    const dataUrl = renderBakedSheetToDataUrl(sheet, 2);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `pixelfx-${fxId.replace('/', '-')}-12f.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // When collapsed during active gameplay, keep the viewport completely unobstructed
  if (isCollapsed) {
    return null;
  }

  const currentFrameIdx = Math.floor((currentTime / LOOP_DURATION) * 360) % 360;
  const phaseRad = (currentTime / LOOP_DURATION) * Math.PI * 2;

  const stepFrame = (deltaFrames: number) => {
    const nextFrame = (currentFrameIdx + deltaFrames + 360) % 360;
    onSeek((nextFrame / 360) * LOOP_DURATION);
  };

  const rotateCameraYaw = () => {
    onUpdateConfig({ cameraYawIndex: (config.cameraYawIndex + 1) % 4 });
  };

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between bg-[#0B0A08]/96 backdrop-blur-md text-[#D8D0C1] select-none pointer-events-auto overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 45%, rgba(76, 68, 52, 0.22) 0%, rgba(11, 10, 8, 0.96) 68%)',
      }}
    >
      {/* Top Classical Codex Navigation Bar (Matches Bestiary Header) */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-12 pt-5 pb-3 flex flex-wrap items-center justify-between gap-4 border-b border-[#2A261F]">
        {/* Classical Tab Strip with Gold Underline & Ornament Dots */}
        <nav className="flex flex-wrap items-center gap-6 sm:gap-9" aria-label="Sanctuary Menu Tabs">
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center group text-left transition-colors"
              >
                <span
                  className={`font-display text-xs sm:text-sm tracking-[0.22em] uppercase transition-colors ${
                    isActive
                      ? 'text-[#EFE7D6] font-semibold'
                      : 'text-[#8A8070] group-hover:text-[#D5CBB8]'
                  }`}
                >
                  {tab.label}
                </span>
                <div
                  className={`w-full h-px my-1 transition-colors ${
                    isActive ? 'bg-[#C8B273]/80' : 'bg-transparent group-hover:bg-[#3A3327]'
                  }`}
                />
                <span
                  className={`text-[9px] tracking-[0.28em] transition-opacity ${
                    isActive ? 'text-[#9E937E] opacity-100' : 'opacity-0'
                  }`}
                >
                  ··········
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Unboxed Status Readouts (Soul Embers, Clock, Bestiary Link) */}
        <div className="flex items-center gap-6 text-xs font-mono-tabular">
          <div className="flex items-center gap-2" title="Soul Embers">
            <span className="text-sm text-[#EFE7D6]">{telemetry.soulEmbers}</span>
            <span className="w-3.5 h-3.5 rounded-full bg-[#C8B273]/25 border border-[#C8B273] inline-block" />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[#B8B0A0]">
            <span>{telemetry.formattedClock}</span>
            <span className="text-[10px] uppercase tracking-wider text-[#7C7465]">
              {telemetry.dayPhaseLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onToggleCollapse();
              onToggleBestiary();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#161410] hover:bg-[#211D16] border border-[#4A4132] hover:border-[#C8B273] text-[#EFE7D6] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C8B273]" />
            <span className="font-display text-[11px] tracking-[0.16em] uppercase">
              Bestiary [B]
            </span>
          </button>
        </div>
      </header>

      {/* Main Classical Codex Body */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 overflow-y-auto">
        {/* =================================================================== */}
        {/* TAB 1: WORLD FAST TRAVEL, CELESTIAL CLOCK & REGIONAL WEATHER        */}
        {/* =================================================================== */}
        {activeTab === 'world' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-full">
            {/* Left Column (5 cols): District Fast Travel Roster */}
            <div className="lg:col-span-5 flex flex-col pr-2 lg:border-r border-[#26221B]">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#3A3327]">
                <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                  VAELENPORT DISTRICTS
                </span>
                <span className="text-[10px] text-[#C8B273]">▲</span>
              </div>

              {config.worldMode === 'open-world' ? (
                <div className="space-y-1.5">
                  {OPEN_WORLD_LANDMARKS.map((poi) => {
                    const isHere =
                      telemetry.nearestLandmarkTitle === poi.shortLabel &&
                      telemetry.nearestLandmarkDist < 7;
                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => {
                          onTeleportLandmark(poi.x, poi.z);
                          onToggleCollapse();
                        }}
                        className={`relative w-full flex items-center gap-3.5 p-2 text-left transition-all ${
                          isHere
                            ? 'bg-[#1B1813]/95 border border-[#C8B273] shadow-[inset_0_0_0_1px_rgba(200,178,115,0.28)] text-[#F5EEDF]'
                            : 'border border-transparent hover:bg-[#15130F]/70 text-[#9E9585] hover:text-[#D8D0C1]'
                        }`}
                      >
                        {isHere && (
                          <span
                            aria-hidden="true"
                            className="absolute -left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#C8B273]"
                          >
                            ◆
                          </span>
                        )}

                        <div className="w-10 h-10 shrink-0 bg-[#14120F] border border-[#3A3328] flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-[#C8B273]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-[13px] font-medium text-[#EFE7D6] truncate">
                            {poi.title}
                          </div>
                          <div className="text-[11px] text-[#8A8070] truncate">
                            {poi.regionName}
                          </div>
                        </div>

                        {isHere && (
                          <span className="text-[10px] font-display tracking-[0.14em] uppercase text-[#C8B273] pr-1">
                            Present
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-[#14120F] border border-[#3A3327]">
                  <div className="text-xs font-mono-tabular text-[#D8D0C1]">
                    Current Cutout Sector: ({config.plateCoord.gx}, {config.plateCoord.gz}) · Seed{' '}
                    <span className="text-[#C8B273]">{telemetry.plateSeedHex}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['N', 'W', 'S', 'E'] as CardinalDirection[]).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => onTravelPlate(dir)}
                        className="py-2 text-xs font-display tracking-[0.16em] bg-[#1B1813] hover:bg-[#242019] border border-[#4A4132] hover:border-[#C8B273] text-[#EFE7D6] transition-colors"
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (7 cols): Celestial Horology, Weather & World Mode */}
            <div className="lg:col-span-7 space-y-6">
              {/* Celestial Clock & Canonical Presets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#3A3327]">
                  <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                    CELESTIAL HOROLOGY & LIGHTING
                  </span>
                  <span className="text-xs font-mono-tabular text-[#C8B273]">
                    {telemetry.formattedClock} · {telemetry.dayPhaseLabel}
                  </span>
                </div>

                <blockquote className="text-xs leading-relaxed text-[#C9C0AF] italic">
                  “As the Astrolabe Fountain turns through the twenty-four hours, every brazier, shadow, and citizen schedule shifts in harmonic phase.”
                </blockquote>

                <div className="p-4 bg-[#14120F] border border-[#2A251D] space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ dayNightCycleEnabled: !config.dayNightCycleEnabled })
                      }
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-display tracking-[0.14em] uppercase border transition-colors ${
                        config.dayNightCycleEnabled
                          ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                          : 'bg-[#12100D] border-[#3A3327] text-[#9E937E] hover:text-[#D8D0C1]'
                      }`}
                    >
                      {telemetry.dayCycleHour >= 6.5 && telemetry.dayCycleHour < 19.5 ? (
                        <Sun className="w-3.5 h-3.5 text-[#C8B273]" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-[#9E937E]" />
                      )}
                      <span>
                        Cycle: {config.dayNightCycleEnabled ? 'Advancing' : 'Paused'}
                      </span>
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-[#9E937E]">
                        <span>Solar / Lunar Meridian</span>
                        <span className="font-mono-tabular text-[#EFE7D6]">
                          {telemetry.formattedClock}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={23.95}
                        step={0.1}
                        value={config.dayCycleHour}
                        onChange={(e) => {
                          const nextHour = parseFloat(e.target.value);
                          onUpdateConfig({
                            dayCycleHour: nextHour,
                            timeOfDay: hourToTimeOfDayPreset(nextHour),
                          });
                        }}
                        className="w-full accent-[#C8B273] cursor-pointer h-1.5 bg-[#26221B]"
                      />
                    </div>
                  </div>

                  {/* 4 Canonical Hour Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#26221B]">
                    {(
                      [
                        { id: 'noon-dapple', label: 'High Noon', time: '12:00' },
                        { id: 'golden-dusk', label: 'Golden Dusk', time: '18:30' },
                        { id: 'blood-moon', label: 'Blood Moon', time: '21:30' },
                        { id: 'torch-midnight', label: 'Midnight', time: '00:00' },
                      ] as { id: TimeOfDayPreset; label: string; time: string }[]
                    ).map((tod) => {
                      const active = config.timeOfDay === tod.id;
                      return (
                        <button
                          key={tod.id}
                          type="button"
                          onClick={() =>
                            onUpdateConfig({
                              timeOfDay: tod.id,
                              dayCycleHour: PRESET_CANONICAL_HOUR[tod.id],
                            })
                          }
                          className={`p-2.5 text-left border transition-colors ${
                            active
                              ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                              : 'bg-[#12100D] border-[#2A251D] text-[#9E937E] hover:border-[#4A4132] hover:text-[#D8D0C1]'
                          }`}
                        >
                          <div className="text-[10px] font-mono-tabular text-[#C8B273]">
                            {tod.time}
                          </div>
                          <div className="text-xs font-display tracking-wider uppercase mt-0.5">
                            {tod.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Atmospheric Weather & Architecture Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <div className="pb-1.5 border-b border-[#3A3327] flex items-center justify-between">
                    <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                      ATMOSPHERIC PRECIPITATION
                    </span>
                    <Wind className="w-3.5 h-3.5 text-[#C8B273]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'auto-regional', label: 'Regional Auto' },
                        { id: 'fen-rain', label: 'Canal Rain' },
                        { id: 'ash-embers', label: 'Forge Ash' },
                        { id: 'clear', label: 'Clear Sky' },
                      ] as { id: WeatherPreset; label: string }[]
                    ).map((w) => {
                      const active = config.weatherMode === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onUpdateConfig({ weatherMode: w.id })}
                          className={`px-3 py-2 text-xs font-display tracking-wider uppercase border transition-colors ${
                            active
                              ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                              : 'bg-[#14120F] border-[#2A251D] text-[#9E937E] hover:text-[#D8D0C1]'
                          }`}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="pb-1.5 border-b border-[#3A3327] flex items-center justify-between">
                    <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                      SANCTUARY REALM TOPOLOGY
                    </span>
                    <Compass className="w-3.5 h-3.5 text-[#C8B273]" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateConfig({
                          worldMode:
                            config.worldMode === 'open-world' ? 'cutout-plate' : 'open-world',
                        })
                      }
                      className="px-3.5 py-2 text-xs font-display tracking-[0.14em] uppercase bg-[#14120F] hover:bg-[#1B1813] text-[#EFE7D6] border border-[#4A4132] hover:border-[#C8B273] transition-colors text-left flex items-center justify-between"
                    >
                      <span>
                        {config.worldMode === 'open-world'
                          ? 'Multi-Tier Canal City'
                          : 'Cutout Diorama Plate'}
                      </span>
                      <span className="text-[10px] text-[#C8B273]">Switch</span>
                    </button>

                    {config.worldMode === 'cutout-plate' && (
                      <button
                        type="button"
                        onClick={onRollNewSeed}
                        className="px-3.5 py-2 text-xs font-mono-tabular bg-[#14120F] hover:bg-[#1B1813] text-[#C8B273] border border-[#3A3327] transition-colors flex items-center justify-between"
                      >
                        <span>Roll New Plate Seed</span>
                        <span className="inline-flex items-center gap-1">
                          <Shuffle className="w-3 h-3" />
                          {telemetry.plateSeedHex}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SCHEDULED CITIZENS & IN-ENGINE STORY CUTSCENES               */}
        {/* =================================================================== */}
        {activeTab === 'citizens' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (6 cols): Citizen Daily Schedule Roster */}
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#3A3327]">
                <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                  CITIZENS OF VAELENPORT ({telemetry.formattedClock})
                </span>
                <Clock className="w-3.5 h-3.5 text-[#C8B273]" />
              </div>

              <div className="space-y-2">
                {(Object.keys(VAELENPORT_CITIZENS) as CitizenId[]).map((cid) => {
                  const cit = VAELENPORT_CITIZENS[cid];
                  const slot = evaluateCitizenSchedule(cit, telemetry.dayCycleHour);
                  return (
                    <button
                      key={cid}
                      type="button"
                      onClick={() => {
                        if (config.worldMode !== 'open-world') {
                          onUpdateConfig({ worldMode: 'open-world' });
                        }
                        onTeleportLandmark(slot.x, slot.z + 1.15);
                        onToggleCollapse();
                      }}
                      className="w-full flex items-center gap-3.5 p-2.5 bg-[#14120F] hover:bg-[#1B1813] border border-[#2A251D] hover:border-[#C8B273] text-left transition-colors group"
                    >
                      <div
                        className="w-10 h-10 shrink-0 border border-[#4A4132] flex items-center justify-center font-display text-xs font-semibold text-[#EFE7D6]"
                        style={{ backgroundColor: cit.cloakColorHex }}
                      >
                        {cit.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-xs sm:text-sm tracking-wider uppercase text-[#EFE7D6] group-hover:text-[#C8B273] transition-colors">
                            {cit.name}
                          </span>
                          <span className="text-[10px] font-display tracking-[0.14em] uppercase text-[#C8B273]">
                            Visit ◆
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9E937E] truncate">{cit.role}</div>
                        <div className="text-[11px] text-[#D8D0C1] truncate mt-0.5">
                          {slot.districtTitle} — <span className="italic text-[#B8B0A0]">{slot.activityLabel}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column (6 cols): In-Engine Cutscenes & Sanctuary Restoration */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#3A3327]">
                  <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                    IN-ENGINE STORY CUTSCENES
                  </span>
                  <Film className="w-3.5 h-3.5 text-[#C8B273]" />
                </div>

                <p className="text-xs leading-relaxed text-[#B8B0A0]">
                  Launch deterministic camera pans across Vaelenport’s three tiers with synchronized world events and citizen narration.
                </p>

                <div className="space-y-2">
                  {(
                    [
                      {
                        id: 'arrival-intro',
                        label: 'Prelude of Arrival Panorama',
                        desc: 'Sweeping overview from the Scholars’ Cloister down to the Lantern Plaza.',
                      },
                      {
                        id: 'dusk-lantern-awakening',
                        label: 'The Dusk Lantern Awakening',
                        desc: 'Ignites every sanctuary brazier across the tiers at Golden Dusk.',
                      },
                      {
                        id: 'canal-lock-opening',
                        label: 'Opening of the Old Canal Lock',
                        desc: 'Cranks the brass capstan and swings open the eastern iron sluice gates.',
                      },
                    ] as { id: CutsceneId; label: string; desc: string }[]
                  ).map((cs) => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => {
                        onTriggerCutscene(cs.id);
                        onToggleCollapse();
                      }}
                      className="w-full p-3 bg-[#14120F] hover:bg-[#1B1813] border border-[#3A3327] hover:border-[#C8B273] text-left transition-colors flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-display text-xs tracking-[0.16em] uppercase text-[#EFE7D6]">
                          {cs.label}
                        </div>
                        <div className="text-[11px] text-[#9E937E] mt-0.5">{cs.desc}</div>
                      </div>
                      <span className="px-2 py-1 text-[10px] font-display tracking-[0.14em] uppercase bg-[#1B1813] border border-[#C8B273]/60 text-[#C8B273] shrink-0">
                        Play
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#2A251D] flex items-center justify-between">
                <div className="text-xs text-[#9E937E]">
                  Sentinels Vanquished:{' '}
                  <strong className="text-[#EFE7D6]">
                    {telemetry.enemiesDefeated} / {telemetry.totalEnemies}
                  </strong>{' '}
                  · Urns Shattered:{' '}
                  <strong className="text-[#EFE7D6]">
                    {telemetry.shatteredCount} / {telemetry.totalDestructibles}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={onRespawnProps}
                  className="px-3.5 py-1.5 text-xs font-display tracking-[0.14em] uppercase bg-[#161410] hover:bg-[#211D16] border border-[#4A4132] hover:border-[#C8B273] text-[#C8B273] transition-colors"
                >
                  Restore Sentinels & Urns
                </button>
              </div>

              {/* Sekiro × BlazBlue Combat Choreography & Frame Data Deck */}
              <div className="pt-4 border-t border-[#2A251D] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                    SEKIRO × BLAZBLUE SWORD CHOREOGRAPHY
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerDeflect?.();
                      onToggleCollapse();
                    }}
                    className="px-2.5 py-1 text-[10px] font-mono-tabular uppercase bg-[#1B1813] hover:bg-[#262119] border border-[#C8B273] text-[#C8B273] transition-colors"
                  >
                    Test Crossguard Deflect [K]
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(['light', 'heavy', 'thrust', 'overhead'] as SwordStrikeArchetype[]).map(
                    (arch) => {
                      const spec =
                        STRIKE_CHOREOGRAPHY_REGISTRY[ARCHETYPE_TO_PRIMARY_STRIKE_ID[arch]];
                      const windupMs = Math.round(spec.durationSec * spec.windupEnd * 1000);
                      const activeMs = Math.round(
                        spec.durationSec * (spec.activeEnd - spec.windupEnd) * 1000
                      );
                      const recovMs = Math.round(
                        spec.durationSec * (1 - spec.activeEnd) * 1000
                      );
                      return (
                        <button
                          key={arch}
                          type="button"
                          onClick={() => {
                            if (onTriggerStrikeArchetype) {
                              onTriggerStrikeArchetype(arch);
                            } else {
                              onTriggerAttack(arch);
                            }
                            onToggleCollapse();
                          }}
                          className="p-2.5 bg-[#14120F] hover:bg-[#1B1813] border border-[#3A3327] hover:border-[#C8B273] text-left transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-xs tracking-wider uppercase text-[#EFE7D6]">
                              {spec.name}
                            </span>
                            <span className="text-[10px] font-mono-tabular text-[#C8B273]">
                              {Math.round(spec.durationSec * 1000)}ms
                            </span>
                          </div>
                          <div className="text-[10px] font-mono-tabular text-[#9E937E]">
                            {spec.subtitle} · Snap p^{spec.snapExponent} · Hitstop{' '}
                            {Math.round(spec.hitstopDurationSec * 1000)}ms
                          </div>
                          {/* Normalized 3-Phase Frame Bar (Chamber / Active Snap / Recovery) */}
                          <div className="w-full h-1.5 bg-[#0B0A08] border border-[#2A251D] flex overflow-hidden">
                            <div
                              style={{ width: `${Math.round(spec.windupEnd * 100)}%` }}
                              className="h-full bg-[#9fd8e8]/75"
                              title={`Chamber Wind-up: ${windupMs}ms (Feint-Cancelable)`}
                            />
                            <div
                              style={{
                                width: `${Math.round((spec.activeEnd - spec.windupEnd) * 100)}%`,
                              }}
                              className="h-full bg-[#e5482f]"
                              title={`BlazBlue Active Snap: ${activeMs}ms`}
                            />
                            <div
                              style={{ width: `${Math.round((1 - spec.activeEnd) * 100)}%` }}
                              className="h-full bg-[#e8a020]/65"
                              title={`Follow-Through Recovery: ${recovMs}ms`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-mono-tabular text-[#8A8070]">
                            <span>
                              W:{windupMs}ms · A:{activeMs}ms · R:{recovMs}ms
                            </span>
                            <span className="text-[#C8B273]">Posture {spec.postureDamage}</span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CAMERA PROJECTION, RESOLUTION & OKLAB SHADER CALIBRATION     */}
        {/* =================================================================== */}
        {activeTab === 'shader' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (6 cols): Camera Projection, Zoom & Pixel Resolution */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#3A3327]">
                <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                  ORTHOGRAPHIC CAMERA & RESOLUTION
                </span>
                <Sliders className="w-3.5 h-3.5 text-[#C8B273]" />
              </div>

              {/* Resolution Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-display tracking-[0.14em] uppercase text-[#9E937E]">
                  Internal Pixel Canvas Resolution
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { h: 540, label: 'Crisp 540p', sub: 'Fine Architectural' },
                      { h: 400, label: 'Balanced 400p', sub: 'Classic RPG' },
                      { h: 280, label: 'Retro 280p', sub: 'Chunky Pixel' },
                    ] as { h: number; label: string; sub: string }[]
                  ).map((res) => {
                    const active = config.internalHeight === res.h;
                    return (
                      <button
                        key={res.h}
                        type="button"
                        onClick={() => onUpdateConfig({ internalHeight: res.h })}
                        className={`p-2.5 text-left border transition-colors ${
                          active
                            ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                            : 'bg-[#14120F] border-[#2A251D] text-[#9E937E] hover:text-[#D8D0C1]'
                        }`}
                      >
                        <div className="text-xs font-display tracking-wider uppercase">
                          {res.label}
                        </div>
                        <div className="text-[10px] text-[#8A8070] mt-0.5">{res.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Projection & Zoom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[11px] font-display tracking-[0.14em] uppercase text-[#9E937E]">
                    Elevation Angle
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'dimetric-26.5', label: '26.5° Dimetric' },
                        { id: 'isometric-30', label: '30.0° Isometric' },
                      ] as { id: CameraProjectionAngle; label: string }[]
                    ).map((cam) => (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => onUpdateConfig({ cameraAngle: cam.id })}
                        className={`py-2 px-2.5 text-xs font-display tracking-wider uppercase border transition-colors ${
                          config.cameraAngle === cam.id
                            ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                            : 'bg-[#14120F] border-[#2A251D] text-[#9E937E] hover:text-[#D8D0C1]'
                        }`}
                      >
                        {cam.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-display tracking-[0.14em] uppercase text-[#9E937E]">
                    Field Zoom & Azimuth
                  </span>
                  <div className="flex items-center gap-2">
                    {(
                      [
                        { id: 'close', label: 'Close' },
                        { id: 'standard', label: 'Std' },
                        { id: 'wide', label: 'Wide' },
                      ] as { id: CameraZoomPreset; label: string }[]
                    ).map((zm) => (
                      <button
                        key={zm.id}
                        type="button"
                        onClick={() => onUpdateConfig({ cameraZoom: zm.id })}
                        className={`flex-1 py-2 text-xs font-display tracking-wider uppercase border transition-colors ${
                          config.cameraZoom === zm.id
                            ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                            : 'bg-[#14120F] border-[#2A251D] text-[#9E937E] hover:text-[#D8D0C1]'
                        }`}
                      >
                        {zm.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={rotateCameraYaw}
                      title="Orbit Camera 90° (R)"
                      className="px-3 py-2 text-xs font-mono-tabular bg-[#161410] hover:bg-[#211D16] border border-[#4A4132] hover:border-[#C8B273] text-[#C8B273] flex items-center gap-1"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{45 + (config.cameraYawIndex % 4) * 90}°</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (6 cols): OKLab + Bayer Sliders & Architectural Layer Toggles */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#3A3327]">
                <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                  OKLAB QUANTIZATION & SCENE LAYERS
                </span>
                <button
                  type="button"
                  onClick={onResetDefaults}
                  className="inline-flex items-center gap-1 text-[11px] font-display tracking-wider uppercase text-[#9E937E] hover:text-[#C8B273] transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Defaults</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#14120F] border border-[#2A251D]">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9E937E]">OKLab Lightness Levels</span>
                    <span className="font-mono-tabular text-[#EFE7D6]">{config.oklabLevels}</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={14}
                    step={1}
                    value={config.oklabLevels}
                    onChange={(e) => onUpdateConfig({ oklabLevels: parseInt(e.target.value, 10) })}
                    className="w-full accent-[#C8B273] cursor-pointer h-1.5 bg-[#26221B]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9E937E]">Bayer 4×4 Dither</span>
                    <span className="font-mono-tabular text-[#EFE7D6]">
                      {config.bayerStrength.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={config.bayerStrength}
                    onChange={(e) => onUpdateConfig({ bayerStrength: parseFloat(e.target.value) })}
                    className="w-full accent-[#C8B273] cursor-pointer h-1.5 bg-[#26221B]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9E937E]">Canopy Light Dapple</span>
                    <span className="font-mono-tabular text-[#EFE7D6]">
                      {Math.round(config.dappleIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.2}
                    step={0.05}
                    value={config.dappleIntensity}
                    onChange={(e) =>
                      onUpdateConfig({ dappleIntensity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[#C8B273] cursor-pointer h-1.5 bg-[#26221B]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#9E937E]">Depth Ink Outlines</span>
                    <span className="font-mono-tabular text-[#EFE7D6]">
                      {config.outlineStrength.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={config.outlineStrength}
                    onChange={(e) =>
                      onUpdateConfig({ outlineStrength: parseFloat(e.target.value) })
                    }
                    className="w-full accent-[#C8B273] cursor-pointer h-1.5 bg-[#26221B]"
                  />
                </div>
              </div>

              {/* Layer Toggles */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-display tracking-[0.14em] uppercase text-[#9E937E]">
                  <Layers className="w-3.5 h-3.5 text-[#C8B273]" />
                  <span>Architectural & Atmospheric Layers</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: 'roofSlab', label: 'Roofs & Cupolas' },
                      { key: 'cloudDapple', label: 'Cloud Dapple' },
                      { key: 'waterFen', label: 'Canals & Bridges' },
                      { key: 'gravekeeper', label: 'Scheduled Citizens' },
                      { key: 'embersAndMotes', label: 'Embers & Lanterns' },
                    ] as { key: keyof LayerToggles; label: string }[]
                  ).map((item) => {
                    const active = config.layerToggles[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onToggleLayer(item.key)}
                        className={`px-3 py-1.5 text-xs font-display tracking-wider uppercase border transition-colors ${
                          active
                            ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                            : 'bg-[#14120F] border-[#2A251D] text-[#7C7465] hover:text-[#B8B0A0]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: HARMONIC 6.00S LOOP SCRUBBER, RENDER PASSES & EXPORT         */}
        {/* =================================================================== */}
        {activeTab === 'timeline' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#3A3327]">
              <span className="font-display text-xs tracking-[0.18em] uppercase text-[#D5CBB8]">
                DETERMINISTIC 360-FRAME HARMONIC LOOP
              </span>
              <span className="text-xs font-mono-tabular text-[#C8B273]">
                f{String(currentFrameIdx).padStart(3, '0')} / 359 · {currentTime.toFixed(2)}s
              </span>
            </div>

            <div className="p-5 bg-[#14120F] border border-[#2A251D] space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? 'Pause loop' : 'Play loop'}
                  className="w-10 h-10 bg-[#1B1813] hover:bg-[#262119] border border-[#C8B273] text-[#EFE7D6] flex items-center justify-center transition-colors shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => stepFrame(-1)}
                  className="w-9 h-10 bg-[#161410] hover:bg-[#1E1A14] text-[#D8D0C1] border border-[#3A3327] flex items-center justify-center transition-colors shrink-0"
                >
                  <StepBack className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#9E937E]">
                    <span>
                      Frame <strong className="text-[#EFE7D6]">f{String(currentFrameIdx).padStart(3, '0')}</strong>
                    </span>
                    <span>{currentTime.toFixed(2)}s / 6.00s</span>
                    <span>u = {phaseRad.toFixed(2)} rad</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5.9833}
                    step={1 / 60}
                    value={currentTime}
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className="w-full accent-[#C8B273] cursor-pointer h-1.5 bg-[#26221B]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => stepFrame(1)}
                  className="w-9 h-10 bg-[#161410] hover:bg-[#1E1A14] text-[#D8D0C1] border border-[#3A3327] flex items-center justify-center transition-colors shrink-0"
                >
                  <StepForward className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#26221B]">
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { id: 'final', label: 'Final Codex' },
                      { id: 'raw', label: 'Raw 3D' },
                      { id: 'dapple-mask', label: 'Dapple Mask' },
                      { id: 'outlines-shadows', label: 'Ink & Shadow' },
                    ] as { id: RenderPassMode; label: string }[]
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onUpdateConfig({ renderPassMode: mode.id })}
                      className={`px-3 py-1.5 text-xs font-display tracking-wider uppercase border transition-colors ${
                        config.renderPassMode === mode.id
                          ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                          : 'bg-[#12100D] border-[#2A251D] text-[#9E937E] hover:text-[#D8D0C1]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {(
                    [
                      { id: 'obsidian', label: 'Obsidian', color: '#0B0A08' },
                      { id: 'ivory', label: 'Charcoal', color: '#14120F' },
                      { id: 'parchment', label: 'Umber', color: '#181511' },
                    ] as { id: CutoutBackgroundTone; label: string; color: string }[]
                  ).map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => onUpdateConfig({ backgroundTone: bg.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-display tracking-wider uppercase border transition-colors ${
                        config.backgroundTone === bg.id
                          ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                          : 'bg-[#12100D] border-[#2A251D] text-[#9E937E] hover:text-[#D8D0C1]'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 border border-[#4A4132]"
                        style={{ backgroundColor: bg.color }}
                      />
                      <span>{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onDownloadCurrentFrame}
                className="flex items-center gap-2 px-4 py-2 text-xs font-display tracking-[0.16em] uppercase bg-[#14120F] hover:bg-[#1B1813] text-[#D8D0C1] border border-[#3A3327] hover:border-[#C8B273] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#C8B273]" />
                <span>Save Frame PNG</span>
              </button>

              <button
                type="button"
                onClick={onOpenContactSheet}
                className="flex items-center gap-2 px-4 py-2 text-xs font-display tracking-[0.16em] uppercase bg-[#1B1813] hover:bg-[#262119] text-[#EFE7D6] border border-[#C8B273] transition-colors"
              >
                <Grid className="w-3.5 h-3.5 text-[#C8B273]" />
                <span>Inspect Contact Sheet</span>
              </button>
            </div>

            {/* PIXELFX PROCEDURAL SPRITE-SHEET STUDIO (patch-gg/pixelfx) */}
            <div className="p-5 bg-[#14120F] border border-[#2A251D] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#26221B]">
                <div>
                  <span className="font-display text-xs tracking-[0.18em] uppercase text-[#EFE7D6]">
                    PIXELFX PROCEDURAL SPRITE-SHEET BAKER (PATCH-GG/PIXELFX)
                  </span>
                  <div className="text-[11px] text-[#9E937E] mt-0.5">
                    Zero-dependency 4×4 Bayer-dithered pixel buffer (`createFrame` · `setPixelDithered` · 12-frame flipbook sheets)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerPixelFx?.(selectedPixelFxId);
                      onToggleCollapse();
                    }}
                    className="px-3 py-1.5 text-[11px] font-display tracking-[0.14em] uppercase bg-[#1B1813] hover:bg-[#262119] border border-[#C8B273] text-[#C8B273] transition-colors"
                  >
                    Spawn [{selectedPixelFxId.split('/')[1]}] in 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPixelFxSheet(selectedPixelFxId)}
                    className="px-3 py-1.5 text-[11px] font-display tracking-[0.14em] uppercase bg-[#161410] hover:bg-[#211D16] border border-[#4A4132] text-[#EFE7D6] transition-colors"
                  >
                    Export 12-Frame Sheet PNG
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(PIXELFX_CATALOG) as PixelFxId[]).map((fxId) => {
                  const entry = PIXELFX_CATALOG[fxId];
                  const active = selectedPixelFxId === fxId;
                  return (
                    <button
                      key={fxId}
                      type="button"
                      onClick={() => handleInspectPixelFx(fxId)}
                      className={`p-2 text-left border transition-colors ${
                        active
                          ? 'bg-[#1B1813] border-[#C8B273] text-[#EFE7D6]'
                          : 'bg-[#12100D] border-[#2A251D] text-[#9E937E] hover:text-[#D8D0C1]'
                      }`}
                    >
                      <div className="text-[9px] font-mono-tabular uppercase text-[#C8B273]">
                        {entry.category} · {entry.frameSize}×{entry.frameSize}
                      </div>
                      <div className="text-[11px] font-display tracking-wider uppercase truncate mt-0.5">
                        {entry.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {entry.paletteHex.map((hex) => (
                          <span
                            key={hex}
                            className="w-2.5 h-2.5 border border-[#3A3327]"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {bakedSheetUrl && (
                <div className="p-3 bg-[#0B0A08] border border-[#26221B] space-y-1.5 overflow-x-auto">
                  <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#9E937E]">
                    <span>
                      {PIXELFX_CATALOG[selectedPixelFxId].name} —{' '}
                      {PIXELFX_CATALOG[selectedPixelFxId].subtitle}
                    </span>
                    <span className="text-[#C8B273]">
                      12 Frames · {PIXELFX_CATALOG[selectedPixelFxId].fps} FPS · NearestFilter
                    </span>
                  </div>
                  <img
                    src={bakedSheetUrl}
                    alt={selectedPixelFxId}
                    className="pixelated-canvas h-16 w-auto border border-[#3A3327]"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Classical Codex Legend Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-4 border-t border-[#2A251D] flex items-center justify-between text-xs text-[#9E937E]">
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[9px] text-[#C8B273]">◆</span>
          <span className="font-display tracking-[0.14em] uppercase text-[#B8B0A0]">
            Vaelenport Sanctuary Chronicle
          </span>
        </div>

        <div className="flex items-center gap-6 ml-auto">
          <button
            type="button"
            onClick={rotateCameraYaw}
            className="inline-flex items-center gap-1.5 text-[#D8D0C1] hover:text-[#C8B273] transition-colors"
          >
            <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#1C1914] border border-[#4A4132] text-[#C8B273]">
              R
            </span>
            <span>Orbit Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleCollapse();
              onToggleBestiary();
            }}
            className="inline-flex items-center gap-1.5 text-[#D8D0C1] hover:text-[#C8B273] transition-colors"
          >
            <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#1C1914] border border-[#4A4132] text-[#C8B273]">
              B
            </span>
            <span>Bestiary</span>
          </button>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex items-center gap-1.5 text-[#D8D0C1] hover:text-[#C8B273] transition-colors"
          >
            <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#1C1914] border border-[#4A4132] text-[#C8B273]">
              H / Esc
            </span>
            <span>Resume Sanctuary</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
