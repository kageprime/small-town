import React from 'react';
import { Compass, MapPin } from 'lucide-react';
import { CardinalDirection, LandmarkPOI, PlateCoordinate, PlayerTelemetry } from '../types/vignette';
import { OPEN_WORLD_LANDMARKS } from '../scene/buildOpenWorld';

export const WORLD_TILE_SIZE = 10.0; // Each open-world grid sector is 10m x 10m
export const MINIMAP_GRID_RADIUS = 3; // 7x7 grid: tile indices from -3 to +3

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
  onSelectLandmarkOrTile: (x: number, z: number, tileCoord: PlateCoordinate) => void;
  onTravelPlate: (dir: CardinalDirection) => void;
}

/**
 * Returns a subtle biome tint for a given (gx, gz) sector on the 7x7 open-world grid
 */
function getSectorBiomeColor(gx: number, gz: number, isVisited: boolean, isCurrent: boolean): string {
  if (isCurrent) return '#D97706'; // Amber-600 highlight for active tile
  if (!isVisited) return '#1E1E22'; // Unexplored fogged tile

  // Fen basin in South-East (+X, +Z)
  if (gx >= 1 && gz >= 1) return '#28454D';
  // High Ossuary Crag in North-West (-X, -Z)
  if (gx <= -1 && gz <= -1) return '#3E434D';
  // Crossroads Apothecary in North-East (+X, -Z)
  if (gx >= 1 && gz <= -1) return '#4C3B34';
  // Barrow Pine Woods in South-West (-X, +Z)
  if (gx <= -1 && gz >= 1) return '#2F4234';
  // Central Sanctuary roads & plains
  return '#394B3B';
}

export const MiniMap: React.FC<MiniMapProps> = ({
  worldMode,
  telemetry,
  plateCoord,
  visitedTiles,
  cameraYawIndex,
  onSelectLandmarkOrTile,
}) => {
  const gridRange: number[] = [];
  for (let i = -MINIMAP_GRID_RADIUS; i <= MINIMAP_GRID_RADIUS; i++) {
    gridRange.push(i);
  }

  const activeGx = worldMode === 'open-world' ? telemetry.tileX : plateCoord.gx;
  const activeGz = worldMode === 'open-world' ? telemetry.tileZ : plateCoord.gz;
  const totalGridTiles = (MINIMAP_GRID_RADIUS * 2 + 1) ** 2;
  const visitedCount = visitedTiles.size;

  // Map landmark tile coordinates for fast lookup
  const landmarkByTile = new Map<string, LandmarkPOI>();
  OPEN_WORLD_LANDMARKS.forEach((poi) => {
    landmarkByTile.set(tileKey(poi.tileX, poi.tileZ), poi);
  });

  // Normalized player dot inside the 7x7 grid (each tile = 1 unit, total span = 70m)
  const normPlayerX =
    worldMode === 'open-world'
      ? Math.max(0.04, Math.min(0.96, (telemetry.x + 35) / 70))
      : Math.max(0.06, Math.min(0.94, (activeGx + 3.5) / 7));
  const normPlayerZ =
    worldMode === 'open-world'
      ? Math.max(0.04, Math.min(0.96, (telemetry.z + 35) / 70))
      : Math.max(0.06, Math.min(0.94, (activeGz + 3.5) / 7));

  return (
    <aside
      aria-label="Open-World Plate Grid Mini-Map"
      className="fixed top-4 right-5 z-20 w-52 bg-[#161618] text-zinc-100 border border-zinc-800 rounded-xl shadow-2xl p-3 select-none pointer-events-auto"
    >
      {/* Top Header: Sector Coordinate & Visited Progress */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-zinc-800/90">
        <div className="flex items-center gap-1.5 text-xs font-display font-semibold tracking-tight text-zinc-100">
          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Sector ({activeGx}, {activeGz})</span>
        </div>
        <span className="text-[11px] font-mono-tabular text-zinc-400">
          {visitedCount}/{totalGridTiles} Visited
        </span>
      </div>

      {/* 7x7 Interactive Plate Grid */}
      <div className="relative aspect-square w-full bg-zinc-950 p-1.5 rounded-lg border border-zinc-800/90 overflow-hidden">
        {/* Cardinal Labels */}
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono-tabular text-zinc-500 pointer-events-none z-10">
          N
        </span>
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono-tabular text-zinc-500 pointer-events-none z-10">
          S
        </span>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-mono-tabular text-zinc-500 pointer-events-none z-10">
          W
        </span>
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-mono-tabular text-zinc-500 pointer-events-none z-10">
          E
        </span>

        <div className="grid grid-cols-7 grid-rows-7 gap-0.5 w-full h-full">
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
                  title={
                    poi
                      ? `${poi.title} — Sector (${gx}, ${gz}) ${isVisited ? '(Visited)' : '(Click to travel)'}`
                      : `Sector (${gx}, ${gz}) ${isVisited ? '· Visited' : '· Unexplored'} (Click to travel)`
                  }
                  className={`relative flex items-center justify-center rounded-[2px] transition-colors ${
                    isCurrent
                      ? 'ring-1 ring-amber-300 z-10'
                      : isVisited
                      ? 'hover:brightness-125'
                      : 'opacity-65 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: bgColor }}
                >
                  {/* Landmark POI Marker */}
                  {poi && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrent
                          ? 'bg-white'
                          : isVisited
                          ? 'bg-amber-300'
                          : 'bg-zinc-500'
                      }`}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Continuous Player Position & Facing Direction Indicator */}
        {worldMode === 'open-world' && (
          <div
            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 pointer-events-none z-20 flex items-center justify-center transition-transform duration-75"
            style={{
              left: `${normPlayerX * 100}%`,
              top: `${normPlayerZ * 100}%`,
              transform: `rotate(${telemetry.facingAngle}rad)`,
            }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-amber-500 shadow-sm" />
          </div>
        )}
      </div>

      {/* Footer: Nearest Landmark & Camera Bearing */}
      <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1 text-zinc-300 truncate" title={telemetry.nearestLandmarkTitle}>
          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="truncate">{telemetry.nearestLandmarkTitle}</span>
        </div>
        <span className="font-mono-tabular text-zinc-400 shrink-0 ml-1">
          {telemetry.nearestLandmarkDist}m · {45 + (cameraYawIndex % 4) * 90}°
        </span>
      </div>
    </aside>
  );
};
