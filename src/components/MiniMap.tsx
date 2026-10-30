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
  if (isCurrent) return '#594C31';
  if (!isVisited) return '#12100D';

  if (gx >= 1 && gz >= 1) return '#233033';
  if (gx <= -1 && gz <= -1) return '#2D2A26';
  if (gx >= 1 && gz <= -1) return '#332A22';
  if (gx <= -1 && gz >= 1) return '#253027';
  return '#2C2821';
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
      className="fixed top-4 right-4 z-20 w-40 flex flex-col gap-1.5 select-none pointer-events-auto"
    >
      {/* Classical Codex Cartographer Frame */}
      <div className="bg-[#0B0A08]/94 backdrop-blur-md text-[#D8D0C1] border border-[#3A3327] shadow-[0_12px_30px_rgba(0,0,0,0.85),inset_0_0_0_1px_rgba(200,178,115,0.14)] p-2.5">
        {/* Clock & District Header */}
        <div className="flex items-center justify-between gap-1 pb-1.5 mb-2 border-b border-[#2A251D] text-[10px]">
          <span
            className="font-display tracking-[0.14em] uppercase text-[#EFE7D6] truncate"
            title={telemetry.nearestLandmarkTitle}
          >
            {telemetry.nearestLandmarkTitle}
          </span>
          <span className="inline-flex items-center gap-1 font-mono-tabular text-[#C8B273] shrink-0">
            {isDaylight ? (
              <Sun className="w-3 h-3 text-[#C8B273]" />
            ) : (
              <Moon className="w-3 h-3 text-[#9E937E]" />
            )}
            <span>{telemetry.formattedClock}</span>
          </span>
        </div>

        {/* 7x7 Sanctuary Sector Grid */}
        <div className="relative aspect-square w-full bg-[#14120F] p-1 border border-[#2A251D] overflow-hidden">
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] font-display tracking-widest text-[#8A8070] pointer-events-none z-10">
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
                    className={`relative flex items-center justify-center transition-opacity ${
                      isCurrent
                        ? 'ring-1 ring-[#C8B273] z-10'
                        : isVisited
                        ? 'hover:brightness-125'
                        : 'opacity-65 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: bgColor }}
                  >
                    {poi && (
                      <span
                        className={`w-1 h-1 rotate-45 ${
                          isCurrent
                            ? 'bg-[#EFE7D6]'
                            : isVisited
                            ? 'bg-[#C8B273]'
                            : 'bg-[#5A5244]'
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Player Position Diamond */}
          {worldMode === 'open-world' && (
            <div
              className="absolute w-2.5 h-2.5 -ml-1.25 -mt-1.25 pointer-events-none z-20 flex items-center justify-center transition-transform duration-75"
              style={{
                left: `${normPlayerX * 100}%`,
                top: `${normPlayerZ * 100}%`,
                transform: `rotate(${telemetry.facingAngle}rad)`,
              }}
            >
              <div className="w-2 h-2 rotate-45 bg-[#EFE7D6] border border-[#0B0A08]" />
            </div>
          )}
        </div>
      </div>

      {/* Classical 3-Button Codex Utility Strip (Bestiary [B], Audio, Sanctuary Menu [H]) */}
      <div className="grid grid-cols-3 gap-1 bg-[#0B0A08]/94 backdrop-blur-md border border-[#3A3327] p-1 shadow-xl">
        <button
          type="button"
          onClick={onToggleBestiary}
          title="Bestiary Codex (B)"
          className="flex items-center justify-center gap-1.5 py-1 bg-[#14120F] hover:bg-[#1E1A14] border border-transparent hover:border-[#C8B273] text-[10px] font-mono-tabular text-[#D8D0C1] hover:text-[#EFE7D6] transition-colors"
        >
          <BookOpen className="w-3 h-3 text-[#C8B273]" />
          <span>B</span>
        </button>

        <button
          type="button"
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          className="flex items-center justify-center py-1 bg-[#14120F] hover:bg-[#1E1A14] border border-transparent hover:border-[#C8B273] text-[#D8D0C1] hover:text-[#C8B273] transition-colors"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-[#C8B273]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#6E6658]" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleMenu}
          title="Sanctuary Codex & Settings (H)"
          className={`flex items-center justify-center gap-1.5 py-1 text-[10px] font-mono-tabular border transition-colors ${
            isMenuOpen
              ? 'bg-[#1B1813] text-[#EFE7D6] border-[#C8B273]'
              : 'bg-[#14120F] hover:bg-[#1E1A14] text-[#D8D0C1] border-transparent hover:border-[#C8B273]'
          }`}
        >
          <Sliders className="w-3 h-3 text-[#C8B273]" />
          <span>H</span>
        </button>
      </div>
    </aside>
  );
};
