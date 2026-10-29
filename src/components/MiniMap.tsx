import React from 'react';
import { BookOpen, Moon, Sliders, Sun, Volume2, VolumeX } from 'lucide-react';
import { CardinalDirection, LandmarkPOI, PlateCoordinate, PlayerTelemetry } from '../types/vignette';
import { OPEN_WORLD_LANDMARKS } from '../scene/buildOpenWorld';

export const WORLD_TILE_SIZE = 10.0;
export const MINIMAP_GRID_RADIUS = 3;

export function worldPosToTile(x: number, z: number): PlateCoordinate {
  return {
    gx: Math.max(-MINIMAP_GRID_RADIUS, Math.min(MINIMAP_GRID_RADIUS, Math.round(x / WORLD_TILE_SIZE))),
    gz: Math.max(-MINIMAP_GRID_RADIUS, Math.min(MINIMAP_GRID_RADIUS, Math.round(z / WORLD_TILE_SIZE))),
  };
}

export function tileKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

interface MiniMapProps {
  worldMode: 'open-world' | 'cutout-plate';
  telemetry: PlayerTelemetry;
  plateCoord: PlateCoordinate;
  visitedTiles: ReadonlySet<string>;
  cameraYawIndex: number;
  soundEnabled?: boolean;
  isMenuOpen?: boolean;
  onSelectLandmarkOrTile: (x: number, z: number, tileCoord: PlateCoordinate) => void;
  onTravelPlate: (dir: CardinalDirection) => void;
  onToggleBestiary?: () => void;
  onToggleSound?: () => void;
  onToggleMenu?: () => void;
}

function getSectorBiomeColor(gx: number, gz: number, isVisited: boolean, isCurrent: boolean): string {
  if (isCurrent) return '#D97706';
  if (!isVisited) return '#18181C';

  if (gx >= 1 && gz >= 1) return '#243E46';
  if (gx <= -1 && gz <= -1) return '#363B44';
  if (gx >= 1 && gz <= -1) return '#44352E';
  if (gx <= -1 && gz >= 1) return '#293B2E';
  return '#324234';
}

export const MiniMap: React.FC<MiniMapProps> = ({
  worldMode,
  telemetry,
  plateCoord,
  visitedTiles,
  soundEnabled = true,
  isMenuOpen = false,
  onSelectLandmarkOrTile,
  onToggleBestiary,
  onToggleSound,
  onToggleMenu,
}) => {
  const gridRange: number[] = [];
  for (let i = -MINIMAP_GRID_RADIUS; i <= MINIMAP_GRID_RADIUS; i++) {
    gridRange.push(i);
  }

  const activeGx = worldMode === 'open-world' ? telemetry.tileX : plateCoord.gx;
  const activeGz = worldMode === 'open-world' ? telemetry.tileZ : plateCoord.gz;

  const landmarkByTile = new Map<string, LandmarkPOI>();
  OPEN_WORLD_LANDMARKS.forEach((poi) => {
    landmarkByTile.set(tileKey(poi.tileX, poi.tileZ), poi);
  });

  const normPlayerX =
    worldMode === 'open-world'
      ? Math.max(0.05, Math.min(0.95, (telemetry.x + 35) / 70))
      : Math.max(0.06, Math.min(0.94, (activeGx + 3.5) / 7));
  const normPlayerZ =
    worldMode === 'open-world'
      ? Math.max(0.05, Math.min(0.95, (telemetry.z + 35) / 70))
      : Math.max(0.06, Math.min(0.94, (activeGz + 3.5) / 7));

  const isDaylight = telemetry.dayCycleHour >= 6.5 && telemetry.dayCycleHour < 19.5;

  return (
    <aside
      aria-label="Compass Radar & Quick Menu"
      className="fixed top-4 right-4 z-20 w-36 flex flex-col gap-1.5 select-none pointer-events-auto"
    >
      {/* Compact Radar Frame */}
      <div className="bg-[#121216]/85 backdrop-blur-md text-zinc-100 border border-white/10 rounded-xl shadow-xl p-2">
        {/* Clock & District Header */}
        <div className="flex items-center justify-between gap-1 pb-1.5 mb-1.5 border-b border-white/10 text-[11px]">
          <span
            className="font-medium text-zinc-200 truncate"
            title={telemetry.nearestLandmarkTitle}
          >
            {telemetry.nearestLandmarkTitle}
          </span>
          <span className="inline-flex items-center gap-1 font-mono-tabular text-amber-300 shrink-0">
            {isDaylight ? (
              <Sun className="w-3 h-3 text-amber-400" />
            ) : (
              <Moon className="w-3 h-3 text-indigo-300" />
            )}
            <span>{telemetry.formattedClock}</span>
          </span>
        </div>

        {/* 7x7 Radar Grid */}
        <div className="relative aspect-square w-full bg-zinc-950/90 p-1 rounded-lg border border-white/5 overflow-hidden">
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-mono-tabular text-zinc-500 pointer-events-none z-10">
            N
          </span>

          <div className="grid grid-cols-7 grid-rows-7 gap-[1.5px] w-full h-full">
            {gridRange.map((gz) =>
              gridRange.map((gx) => {
                const key = tileKey(gx, gz);
                const isVisited = visitedTiles.has(key);
                const isCurrent = gx === activeGx && gz === activeGz;
                const poi = landmarkByTile.get(key);
                const bgColor = getSectorBiomeColor(gx, gz, isVisited, isCurrent);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      onSelectLandmarkOrTile(
                        poi ? poi.x : gx * WORLD_TILE_SIZE,
                        poi ? poi.z : gz * WORLD_TILE_SIZE,
                        { gx, gz }
                      )
                    }
                    title={poi ? poi.title : `Sector (${gx}, ${gz})`}
                    className={`relative flex items-center justify-center rounded-[1.5px] transition-opacity ${
                      isCurrent
                        ? 'ring-1 ring-amber-300 z-10'
                        : isVisited
                        ? 'hover:brightness-125'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: bgColor }}
                  >
                    {poi && (
                      <span
                        className={`w-1 h-1 rounded-full ${
                          isCurrent
                            ? 'bg-white'
                            : isVisited
                            ? 'bg-amber-300'
                            : 'bg-zinc-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Player Position Dot */}
          {worldMode === 'open-world' && (
            <div
              className="absolute w-2.5 h-2.5 -ml-1.25 -mt-1.25 pointer-events-none z-20 flex items-center justify-center transition-transform duration-75"
              style={{
                left: `${normPlayerX * 100}%`,
                top: `${normPlayerZ * 100}%`,
                transform: `rotate(${telemetry.facingAngle}rad)`,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-white border border-amber-500 shadow-xs" />
            </div>
          )}
        </div>
      </div>

      {/* Discreet 3-Icon HUD Utility Bar (Codex, Sound, World Menu) */}
      <div className="grid grid-cols-3 gap-1 bg-[#121216]/85 backdrop-blur-md border border-white/10 rounded-lg p-1 shadow-lg">
        <button
          type="button"
          onClick={onToggleBestiary}
          title="Bestiary Codex (B)"
          className="flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium text-zinc-300 hover:text-amber-300 hover:bg-white/5 transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>B</span>
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className="flex items-center justify-center py-1 rounded text-zinc-300 hover:text-amber-300 hover:bg-white/5 transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleMenu}
          title="World & Studio Menu (H)"
          className={`flex items-center justify-center gap-1 py-1 rounded text-[10px] font-medium transition-colors ${
            isMenuOpen
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-zinc-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>H</span>
        </button>
      </div>
    </aside>
  );
};
