import React, { useState } from 'react';
import {
  BookOpen,
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Download,
  Film,
  Grid,
  Hand,
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
  Swords,
  Volume2,
  VolumeX,
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
  PlayerTelemetry,
  RenderPassMode,
  TimeOfDayPreset,
  VignetteConfig,
  WeatherPreset,
} from '../types/vignette';
import { LOOP_DURATION } from '../scene/buildGothicCourtyard';
import { OPEN_WORLD_LANDMARKS } from '../scene/buildOpenWorld';
import { evaluateCitizenSchedule, VAELENPORT_CITIZENS } from '../scene/dialogueAndCutscenes';
import { hourToTimeOfDayPreset, PRESET_CANONICAL_HOUR } from '../scene/dayNightCycle';

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
  onTriggerAttack: () => void;
  onTriggerDodge: () => void;
  onTriggerInteract: () => void;
  onTriggerCutscene: (id: CutsceneId) => void;
  onRespawnProps: () => void;
  onResetDefaults: () => void;
  onToggleBestiary: () => void;
  onOpenContactSheet: () => void;
  onDownloadCurrentFrame: () => void;
}

type DockTab = 'world' | 'citizens' | 'timeline' | 'shader' | 'lessons';

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
  onTriggerDodge,
  onTriggerInteract,
  onTriggerCutscene,
  onRespawnProps,
  onResetDefaults,
  onToggleBestiary,
  onOpenContactSheet,
  onDownloadCurrentFrame,
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('world');

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
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-[min(980px,95vw)] transition-transform duration-200"
      style={{
        transform: isCollapsed ? 'translate(-50%, calc(100% - 34px))' : 'translate(-50%, 0)',
      }}
    >
      {/* Top Collapse / Expand Handle */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-[#161618] text-zinc-300 hover:text-white text-xs font-medium border border-b-0 border-zinc-800 rounded-t-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Open-World & Workbench Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Surface */}
      <div className="bg-[#161618] text-zinc-100 border border-zinc-800 rounded-xl shadow-2xl px-5 py-3.5 space-y-3">
        {/* Top Row: Segmented Mode Tabs + Camera Zoom/Tilt + Contact Sheet Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-zinc-800/90">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('world')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'world'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Vaelenport City</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('citizens')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'citizens'
                  ? 'bg-zinc-800 text-amber-300 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Citizens & Cutscenes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'timeline'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Loop Scrubber</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shader')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'shader'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>OKLab & Bayer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('lessons')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'lessons'
                  ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>v2 Layers</span>
            </button>
          </div>

          {/* Camera Zoom, Tilt & 90° Orbit Rotation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800/80">
              {(
                [
                  { id: 'close', label: 'Close' },
                  { id: 'standard', label: 'Standard' },
                  { id: 'wide', label: 'Wide Map' },
                ] as { id: CameraZoomPreset; label: string }[]
              ).map((zm) => (
                <button
                  key={zm.id}
                  type="button"
                  onClick={() => onUpdateConfig({ cameraZoom: zm.id })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    config.cameraZoom === zm.id
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {zm.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800/80">
              {(
                [
                  { id: 'dimetric-26.5', label: '26.5°' },
                  { id: 'isometric-30', label: '30.0°' },
                ] as { id: CameraProjectionAngle; label: string }[]
              ).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onUpdateConfig({ cameraAngle: cam.id })}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    config.cameraAngle === cam.id
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cam.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={rotateCameraYaw}
              title="Rotate Camera 90° (R)"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{45 + (config.cameraYawIndex % 4) * 90}°</span>
            </button>
          </div>

          {/* Primary Pipeline Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleBestiary}
              title="Open Sanctuary Bestiary Log & Soul Ember Drop Codex (B)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Bestiary (
                {
                  telemetry.bestiary.filter((b) => b.encountered || b.defeatedCount > 0)
                    .length
                }
                /{telemetry.bestiary.length})
              </span>
            </button>

            <button
              type="button"
              onClick={onDownloadCurrentFrame}
              title="Export current 1500×1400 PNG frame"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save PNG</span>
            </button>

            <button
              type="button"
              onClick={onOpenContactSheet}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Contact Sheet</span>
            </button>
          </div>
        </div>

        {/* Tab 0: Continuous Open-World Exploration, Fast-Travel Landmarks & Actions */}
        {activeTab === 'world' && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            {/* World Mode Toggle (Continuous Open World vs Cutout Diorama) + Seed Roller */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ worldMode: 'open-world' })}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    config.worldMode === 'open-world'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Continuous Open World
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ worldMode: 'cutout-plate' })}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    config.worldMode === 'cutout-plate'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Cutout Plate
                </button>
              </div>

              <button
                type="button"
                onClick={onRollNewSeed}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Seed {telemetry.plateSeedHex}</span>
              </button>

              {/* Landmark Fast-Travel Buttons across the 3 Vaelenport Tiers */}
              {config.worldMode === 'open-world' ? (
                <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                  <span className="px-1.5 text-[11px] text-zinc-400 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    Districts:
                  </span>
                  {OPEN_WORLD_LANDMARKS.map((poi) => {
                    const isHere =
                      telemetry.nearestLandmarkTitle === poi.shortLabel &&
                      telemetry.nearestLandmarkDist < 7;
                    return (
                      <button
                        key={poi.id}
                        type="button"
                        onClick={() => onTeleportLandmark(poi.x, poi.z)}
                        title={`Fast-travel or walk to ${poi.title} (${poi.regionName})`}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                          isHere
                            ? 'bg-zinc-800 text-amber-300 border border-amber-500/40'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                        }`}
                      >
                        {poi.shortLabel}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                  <span className="px-2 text-[11px] font-mono-tabular text-zinc-400">
                    Plate ({config.plateCoord.gx},{config.plateCoord.gz}):
                  </span>
                  {(['N', 'W', 'S', 'E'] as CardinalDirection[]).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => onTravelPlate(dir)}
                      className="px-2 py-1 text-[11px] font-mono-tabular font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors whitespace-nowrap shrink-0"
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Player Combat, Dodge, Time-of-Day Cycle & Weather Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Synced 24h Night-Day Cycle & Time-of-Day Switcher */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateConfig({ dayNightCycleEnabled: !config.dayNightCycleEnabled })
                  }
                  title="Toggle automatic 24-hour Night-Day Cycle synced with the game clock"
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono-tabular font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    config.dayNightCycleEnabled
                      ? 'bg-amber-600/25 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {telemetry.dayCycleHour >= 6.5 && telemetry.dayCycleHour < 19.5 ? (
                    <Sun className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Moon className="w-3 h-3 text-indigo-300" />
                  )}
                  <span>{telemetry.formattedClock}</span>
                  <span className="text-[10px] opacity-80">
                    {config.dayNightCycleEnabled ? 'AUTO' : 'HOLD'}
                  </span>
                </button>

                <input
                  type="range"
                  min={0}
                  max={23.95}
                  step={0.1}
                  value={config.dayCycleHour}
                  title={`Scrub 24h Game Clock (${telemetry.formattedClock} · ${telemetry.dayPhaseLabel})`}
                  onChange={(e) => {
                    const nextHour = parseFloat(e.target.value);
                    onUpdateConfig({
                      dayCycleHour: nextHour,
                      timeOfDay: hourToTimeOfDayPreset(nextHour),
                    });
                  }}
                  className="w-16 accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />

                {(
                  [
                    { id: 'noon-dapple', label: 'Noon' },
                    { id: 'golden-dusk', label: 'Dusk' },
                    { id: 'blood-moon', label: 'Blood Moon' },
                    { id: 'torch-midnight', label: 'Midnight' },
                  ] as { id: TimeOfDayPreset; label: string }[]
                ).map((tod) => (
                  <button
                    key={tod.id}
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        timeOfDay: tod.id,
                        dayCycleHour: PRESET_CANONICAL_HOUR[tod.id],
                      })
                    }
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      config.timeOfDay === tod.id
                        ? 'bg-amber-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tod.label}
                  </button>
                ))}
              </div>

              {/* Regional Weather Selector */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                <Wind className="w-3 h-3 text-zinc-400 ml-1" />
                {(
                  [
                    { id: 'auto-regional', label: 'Auto Weather' },
                    { id: 'fen-rain', label: 'Rain' },
                    { id: 'ash-embers', label: 'Ash' },
                    { id: 'clear', label: 'Clear' },
                  ] as { id: WeatherPreset; label: string }[]
                ).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onUpdateConfig({ weatherMode: w.id })}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      config.weatherMode === w.id
                        ? 'bg-zinc-800 text-amber-300'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onTriggerAttack}
                title="Melee / Lantern Strike with Hitstop (J or Left-Click)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Strike (J)</span>
              </button>

              <button
                type="button"
                onClick={onTriggerDodge}
                title="Shadowstep Evade Roll with I-Frames (Q)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>Evade (Q)</span>
              </button>

              <button
                type="button"
                onClick={onTriggerInteract}
                title="Interact with Caretaker NPC, Fishing Dock, Brazier, Gate, or Chest (E)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Hand className="w-3.5 h-3.5 text-amber-400" />
                <span>Interact (E)</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateConfig({ soundEnabled: !config.soundEnabled })}
                title={config.soundEnabled ? 'Mute WebAudio SFX' : 'Enable WebAudio SFX'}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors shrink-0"
              >
                {config.soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </button>

              {(telemetry.shatteredCount > 0 || telemetry.enemiesDefeated > 0) && (
                <button
                  type="button"
                  onClick={onRespawnProps}
                  className="px-2.5 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Respawn World
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 0.5: Scheduled Citizens Locator & In-Engine Cutscene Director */}
        {activeTab === 'citizens' && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            {/* Locate Scheduled Citizens at current game hour */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="px-2 text-[11px] text-zinc-400 font-medium">
                Visit Citizen ({telemetry.formattedClock}):
              </span>
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
                    }}
                    title={`${cit.name} (${cit.role}) — Currently at ${slot.districtTitle}: ${slot.activityLabel}`}
                    className="px-2.5 py-1 text-[11px] font-medium bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 hover:text-amber-300 rounded border border-zinc-700/70 transition-colors whitespace-nowrap shrink-0"
                  >
                    {cit.name}
                  </button>
                );
              })}
            </div>

            {/* In-Engine Cutscene Director Triggers */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
              <span className="px-2 text-[11px] text-amber-300 font-medium inline-flex items-center gap-1">
                <Film className="w-3 h-3 text-amber-400" />
                Cutscenes:
              </span>
              {(
                [
                  { id: 'arrival-intro', label: 'Arrival Panorama' },
                  { id: 'dusk-lantern-awakening', label: 'Dusk Lanterns' },
                  { id: 'canal-lock-opening', label: 'Canal Lock Opening' },
                ] as { id: CutsceneId; label: string }[]
              ).map((cs) => (
                <button
                  key={cs.id}
                  type="button"
                  onClick={() => onTriggerCutscene(cs.id)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-amber-600/20 hover:bg-amber-600/35 text-amber-200 border border-amber-500/40 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {cs.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Deterministic Loop Scrubber & Pass Isolation */}
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-0.5">
            <div className="md:col-span-7 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause loop' : 'Play loop'}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => stepFrame(-1)}
                title="Previous frame (-1/60s)"
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md transition-colors shrink-0"
              >
                <StepBack className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono-tabular text-zinc-400">
                  <span>
                    Frame{' '}
                    <strong className="text-zinc-100">
                      f{String(currentFrameIdx).padStart(3, '0')}
                    </strong>{' '}
                    / 359
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
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              <button
                type="button"
                onClick={() => stepFrame(1)}
                title="Next frame (+1/60s)"
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md transition-colors shrink-0"
              >
                <StepForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                {(
                  [
                    { id: 'final', label: 'Final Pixel' },
                    { id: 'raw', label: 'Raw 3D' },
                    { id: 'dapple-mask', label: 'Cloud Dapple' },
                    { id: 'outlines-shadows', label: 'Ink & Shadows' },
                  ] as { id: RenderPassMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdateConfig({ renderPassMode: mode.id })}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      config.renderPassMode === mode.id
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                {(
                  [
                    { id: 'ivory', label: 'Ivory', color: '#F4F1EA' },
                    { id: 'parchment', label: 'Parchment', color: '#EAE2D3' },
                    { id: 'obsidian', label: 'Void', color: '#121216' },
                  ] as { id: CutoutBackgroundTone; label: string; color: string }[]
                ).map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => onUpdateConfig({ backgroundTone: bg.id })}
                    title={`Background: ${bg.label}`}
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      config.backgroundTone === bg.id
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-xs border border-white/20"
                      style={{ backgroundColor: bg.color }}
                    />
                    <span>{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Live OKLab Quantization, Bayer 4x4 Dither, Outline & Dapple Sliders */}
        {activeTab === 'shader' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center pt-0.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">OKLab Levels</span>
                <span className="font-mono-tabular text-zinc-200">{config.oklabLevels}</span>
              </div>
              <input
                type="range"
                min={3}
                max={12}
                step={1}
                value={config.oklabLevels}
                onChange={(e) => onUpdateConfig({ oklabLevels: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Bayer 4×4 Dither</span>
                <span className="font-mono-tabular text-zinc-200">
                  {config.bayerStrength.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2.0}
                step={0.05}
                value={config.bayerStrength}
                onChange={(e) => onUpdateConfig({ bayerStrength: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Light Dapple Shimmer</span>
                <span className="font-mono-tabular text-zinc-200">
                  {Math.round(config.dappleIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.05}
                value={config.dappleIntensity}
                onChange={(e) => onUpdateConfig({ dappleIntensity: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Outline Kernel</span>
                  <span className="font-mono-tabular text-zinc-200">
                    {config.outlineStrength.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={config.outlineStrength}
                  onChange={(e) => onUpdateConfig({ outlineStrength: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              <button
                type="button"
                onClick={onResetDefaults}
                title="Reset shader parameters to defaults"
                className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Reference Lesson Layer Toggles */}
        {activeTab === 'lessons' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  {
                    key: 'roofSlab',
                    label: 'Overhanging Hat Roofs & Tally Banners',
                  },
                  {
                    key: 'cloudDapple',
                    label: 'Cloud-Shadow Dapple Shimmer',
                  },
                  {
                    key: 'waterFen',
                    label: 'Weeping Fen Water & Bridges',
                  },
                  {
                    key: 'gravekeeper',
                    label: 'Work-Idle Caretakers (12f Sweep)',
                  },
                  {
                    key: 'embersAndMotes',
                    label: 'Harmonic Embers & Beacons',
                  },
                ] as { key: keyof LayerToggles; label: string }[]
              ).map((item) => {
                const active = config.layerToggles[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onToggleLayer(item.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-zinc-800 border-amber-500/50 text-zinc-100'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {item.label}
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] text-zinc-400 font-mono-tabular hidden lg:inline">
              Toggle lessons across the entire open world
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
