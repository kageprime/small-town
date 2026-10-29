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
  X,
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

type DockTab = 'world' | 'citizens' | 'shader' | 'timeline';

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
  onTriggerCutscene,
  onRespawnProps,
  onResetDefaults,
  onToggleBestiary,
  onOpenContactSheet,
  onDownloadCurrentFrame,
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('world');

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
    <div className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-3xl bg-[#131317]/95 backdrop-blur-md text-zinc-100 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Navigation Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-zinc-900/80 border-b border-white/10">
          <div className="flex items-center gap-1 p-1 bg-zinc-950/80 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('world')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'world'
                  ? 'bg-zinc-800 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>World & Time</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('citizens')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'citizens'
                  ? 'bg-zinc-800 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Citizens & Cutscenes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shader')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'shader'
                  ? 'bg-zinc-800 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Camera & Shader</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'timeline'
                  ? 'bg-zinc-800 text-amber-300'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Loop & Export</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleBestiary}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-zinc-800/80 hover:bg-zinc-700 text-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bestiary</span>
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="Close Menu (H)"
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 space-y-3">
          {/* Tab 1: World Fast Travel, Time of Day & Weather */}
          {activeTab === 'world' && (
            <div className="space-y-3">
              {/* Fast Travel Districts */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {config.worldMode === 'open-world' ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-400 inline-flex items-center gap-1 mr-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Fast Travel:
                    </span>
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
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                            isHere
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                              : 'bg-zinc-900/80 text-zinc-300 border-white/5 hover:border-white/15 hover:text-white'
                          }`}
                        >
                          {poi.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono-tabular text-zinc-400">
                      Plate ({config.plateCoord.gx},{config.plateCoord.gz}):
                    </span>
                    {(['N', 'W', 'S', 'E'] as CardinalDirection[]).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => onTravelPlate(dir)}
                        className="px-2.5 py-1 text-xs font-mono-tabular font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors"
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({
                        worldMode:
                          config.worldMode === 'open-world' ? 'cutout-plate' : 'open-world',
                      })
                    }
                    className="px-2.5 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {config.worldMode === 'open-world' ? 'Mode: Open City' : 'Mode: Cutout Plate'}
                  </button>

                  {config.worldMode === 'cutout-plate' && (
                    <button
                      type="button"
                      onClick={onRollNewSeed}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>{telemetry.plateSeedHex}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Time of Day & Weather Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateConfig({ dayNightCycleEnabled: !config.dayNightCycleEnabled })
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-tabular font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      config.dayNightCycleEnabled
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-zinc-200'
                    }`}
                  >
                    {telemetry.dayCycleHour >= 6.5 && telemetry.dayCycleHour < 19.5 ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-300" />
                    )}
                    <span>{telemetry.formattedClock}</span>
                    <span className="text-[10px] opacity-75">
                      {config.dayNightCycleEnabled ? 'AUTO' : 'PAUSED'}
                    </span>
                  </button>

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
                    className="w-24 accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />

                  <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-white/5">
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
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          config.timeOfDay === tod.id
                            ? 'bg-amber-600 text-white'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {tod.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weather Selector */}
                <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-white/5">
                  <Wind className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-0.5" />
                  {(
                    [
                      { id: 'auto-regional', label: 'Auto' },
                      { id: 'fen-rain', label: 'Rain' },
                      { id: 'ash-embers', label: 'Ash' },
                      { id: 'clear', label: 'Clear' },
                    ] as { id: WeatherPreset; label: string }[]
                  ).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onUpdateConfig({ weatherMode: w.id })}
                      className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        config.weatherMode === w.id
                          ? 'bg-zinc-800 text-amber-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Citizens Locator & Cutscene Triggers */}
          {activeTab === 'citizens' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-zinc-400 mr-1">
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
                        onToggleCollapse();
                      }}
                      title={`${cit.role} — ${slot.districtTitle}: ${slot.activityLabel}`}
                      className="px-2.5 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-amber-300 rounded-lg border border-white/10 transition-colors whitespace-nowrap shrink-0"
                    >
                      {cit.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-zinc-400 inline-flex items-center gap-1 mr-1">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
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
                      onClick={() => {
                        onTriggerCutscene(cs.id);
                        onToggleCollapse();
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {cs.label}
                    </button>
                  ))}
                </div>

                {(telemetry.shatteredCount > 0 || telemetry.enemiesDefeated > 0) && (
                  <button
                    type="button"
                    onClick={onRespawnProps}
                    className="px-2.5 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Respawn Sentinels & Relics
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Camera Projection, Shader Sliders & Scene Layers */}
          {activeTab === 'shader' && (
            <div className="space-y-3">
              {/* Camera Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-white/5">
                    {(
                      [
                        { id: 'close', label: 'Close' },
                        { id: 'standard', label: 'Standard' },
                        { id: 'wide', label: 'Wide' },
                      ] as { id: CameraZoomPreset; label: string }[]
                    ).map((zm) => (
                      <button
                        key={zm.id}
                        type="button"
                        onClick={() => onUpdateConfig({ cameraZoom: zm.id })}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          config.cameraZoom === zm.id
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {zm.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-white/5">
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
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Orbit {45 + (config.cameraYawIndex % 4) * 90}° (R)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onResetDefaults}
                  title="Reset Defaults"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* OKLab & Bayer Sliders */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
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
                    <span className="text-zinc-400">Bayer Dither</span>
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
                    <span className="text-zinc-400">Light Dapple</span>
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
                    onChange={(e) =>
                      onUpdateConfig({ dappleIntensity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Outline Ink</span>
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
                    onChange={(e) =>
                      onUpdateConfig({ outlineStrength: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Layer Toggles */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/10">
                <Layers className="w-3.5 h-3.5 text-zinc-400 mr-1" />
                {(
                  [
                    { key: 'roofSlab', label: 'Roofs & Banners' },
                    { key: 'cloudDapple', label: 'Cloud Dapple' },
                    { key: 'waterFen', label: 'Canals & Bridges' },
                    { key: 'gravekeeper', label: 'Citizens' },
                    { key: 'embersAndMotes', label: 'Embers & Beacons' },
                  ] as { key: keyof LayerToggles; label: string }[]
                ).map((item) => {
                  const active = config.layerToggles[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onToggleLayer(item.key)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-zinc-800 border-amber-500/40 text-zinc-100'
                          : 'bg-zinc-900/60 border-white/5 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4: Loop Scrubber, Render Passes & Frame Export */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
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
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 rounded-md transition-colors shrink-0"
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
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 rounded-md transition-colors shrink-0"
                >
                  <StepForward className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-white/5">
                    {(
                      [
                        { id: 'final', label: 'Final Pixel' },
                        { id: 'raw', label: 'Raw 3D' },
                        { id: 'dapple-mask', label: 'Dapple' },
                        { id: 'outlines-shadows', label: 'Ink' },
                      ] as { id: RenderPassMode; label: string }[]
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => onUpdateConfig({ renderPassMode: mode.id })}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          config.renderPassMode === mode.id
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 p-0.5 bg-zinc-900 rounded-lg border border-white/5">
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
                        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onDownloadCurrentFrame}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenContactSheet}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Contact Sheet</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
