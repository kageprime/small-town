import React, { useState } from 'react';
import {
  BookOpen,
  Compass,
  Eye,
  Flame,
  Fish,
  Heart,
  Lock,
  Shield,
  Skull,
  Sparkles,
  Swords,
  X,
} from 'lucide-react';
import { BestiaryEntry, PlayerTelemetry, SentinelArchetype } from '../types/vignette';

interface WorldOverlayModalsProps {
  telemetry: PlayerTelemetry;
  isBestiaryOpen: boolean;
  onCloseBestiary: () => void;
  onPurchaseUpgrade: (kind: 'sword' | 'lantern' | 'vitality') => void;
  onCloseNpcDialog: () => void;
  onReelFishing: () => void;
  onLocateVariantRegion?: (regionName: string) => void;
}

const ARCHETYPE_BADGE_STYLES: Record<
  SentinelArchetype,
  { label: string; badgeClass: string; barClass: string }
> = {
  sentinel: {
    label: 'Hollow Sentinel',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
    barClass: 'bg-rose-500',
  },
  wraith: {
    label: 'Fen Wraith',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
    barClass: 'bg-cyan-400',
  },
  gargoyle: {
    label: 'Ossuary Gargoyle',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    barClass: 'bg-amber-400',
  },
};

export const WorldOverlayModals: React.FC<WorldOverlayModalsProps> = ({
  telemetry,
  isBestiaryOpen,
  onCloseBestiary,
  onPurchaseUpgrade,
  onCloseNpcDialog,
  onReelFishing,
  onLocateVariantRegion,
}) => {
  const { activeNpcDialog, fishingState, soulEmbers, upgrades, bestiary } = telemetry;
  const [archetypeFilter, setArchetypeFilter] = useState<'all' | SentinelArchetype>('all');

  const swordCost = upgrades.swordLevel * 4;
  const lanternCost = upgrades.lanternLevel * 4;
  const vitalityCost = upgrades.vitalityLevel * 3;

  const discoveredCount = bestiary.filter((b) => b.encountered || b.defeatedCount > 0).length;
  const defeatedVariantsCount = bestiary.filter((b) => b.defeatedCount > 0).length;
  const totalDefeatedCount = bestiary.reduce((acc, b) => acc + b.defeatedCount, 0);
  const totalHarvestedEmbers = bestiary.reduce((acc, b) => acc + b.totalEmbersHarvested, 0);

  const filteredBestiary: BestiaryEntry[] =
    archetypeFilter === 'all'
      ? bestiary
      : bestiary.filter((entry) => entry.archetype === archetypeFilter);

  return (
    <>
      {/* 1. Playable Fen Fishing Minigame HUD Banner */}
      {fishingState.active && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 pointer-events-auto">
          <div
            className={`p-4 rounded-xl border shadow-2xl transition-colors ${
              fishingState.phase === 'bite'
                ? 'bg-amber-950/95 border-amber-400 text-amber-100'
                : 'bg-[#161618]/95 border-zinc-700 text-zinc-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Fish
                  className={`w-4 h-4 ${
                    fishingState.phase === 'bite'
                      ? 'text-amber-300 animate-bounce'
                      : 'text-sky-400'
                  }`}
                />
                <span className="font-display text-sm font-semibold">
                  {fishingState.spotTitle} · Fishing Lesson
                </span>
              </div>
              <span className="text-xs font-mono-tabular text-zinc-400">
                Caught: {fishingState.totalCaught}
              </span>
            </div>

            <p className="text-xs text-zinc-300 mb-3">
              {fishingState.phase === 'bite'
                ? 'THE BOBBER PLUNGED! Strike [E] or click Reel In before the catch slips away!'
                : 'Watching the expanding ripple rings... wait for the crimson bobber to dip and chime.'}
            </p>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onReelFishing}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-colors ${
                  fishingState.phase === 'bite'
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                {fishingState.phase === 'bite'
                  ? 'REEL IN CATCH NOW! (E / Click)'
                  : 'Pull Line Early (Cancel)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dynamic Bestiary Log & Soul Ember Drop Rate Overlay */}
      {isBestiaryOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 pointer-events-auto">
          <div className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-[#141417] text-zinc-100 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#18181C] border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-semibold tracking-tight text-zinc-100">
                    Sanctuary Bestiary Log &amp; Soul Ember Drop Codex
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Dynamically catalogs sentinel variants as you encounter and vanquish them across
                    the Sanctuary
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono-tabular">
                  <span className="text-zinc-300">
                    Sighted{' '}
                    <strong className="text-amber-300">
                      {discoveredCount}/{bestiary.length}
                    </strong>
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-300">
                    Slain <strong className="text-rose-400">{totalDefeatedCount}</strong> (
                    {defeatedVariantsCount} types)
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    {totalHarvestedEmbers} Harvested
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onCloseBestiary}
                  aria-label="Close Bestiary Log"
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Archetype Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-zinc-900/70 border-b border-zinc-800/80">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: `All Variants (${bestiary.length})` },
                    {
                      id: 'sentinel',
                      label: `Hollow Sentinels (${bestiary.filter((b) => b.archetype === 'sentinel').length})`,
                    },
                    {
                      id: 'wraith',
                      label: `Fen Wraiths (${bestiary.filter((b) => b.archetype === 'wraith').length})`,
                    },
                    {
                      id: 'gargoyle',
                      label: `Ossuary Gargoyles (${bestiary.filter((b) => b.archetype === 'gargoyle').length})`,
                    },
                  ] as { id: 'all' | SentinelArchetype; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setArchetypeFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      archetypeFilter === tab.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-mono-tabular text-zinc-400">
                Approach within 9m or strike [J] to register a sentinel entry
              </span>
            </div>

            {/* Bestiary Cards Grid */}
            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredBestiary.map((entry) => {
                const isUnlocked = entry.encountered || entry.defeatedCount > 0;
                const isDefeated = entry.defeatedCount > 0;
                const archMeta = ARCHETYPE_BADGE_STYLES[entry.archetype];
                const expectedAvgEmbers = (
                  entry.baseEmberDrop +
                  (entry.bonusEmberDrop * entry.bonusDropChancePct) / 100
                ).toFixed(1);

                return (
                  <div
                    key={entry.variantId}
                    className={`flex flex-col justify-between p-4 rounded-xl border transition-colors ${
                      isDefeated
                        ? 'bg-[#1A1B20] border-amber-500/40 shadow-md'
                        : isUnlocked
                          ? 'bg-[#18191E] border-zinc-700'
                          : 'bg-zinc-950/70 border-zinc-800/80 opacity-85'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Status & Archetype Row */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 text-[11px] font-mono-tabular font-medium rounded border ${archMeta.badgeClass}`}
                        >
                          {archMeta.label}
                        </span>

                        {isDefeated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono-tabular font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded">
                            <Skull className="w-3 h-3 text-amber-400" />
                            Vanquished ×{entry.defeatedCount}
                          </span>
                        ) : isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono-tabular font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded">
                            <Eye className="w-3 h-3 text-sky-400" />
                            Encountered ({entry.timesEncountered}×)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono-tabular text-zinc-500 bg-zinc-900 border border-zinc-800 rounded">
                            <Lock className="w-3 h-3" />
                            Uncharted Variant
                          </span>
                        )}
                      </div>

                      {/* Variant Name, Subtitle & Habitat */}
                      <div>
                        <h3 className="font-display text-sm sm:text-base font-semibold text-zinc-100">
                          {isUnlocked ? entry.name : `??? (${entry.name})`}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {isUnlocked
                            ? entry.title
                            : `Uncharted threat patrolling ${entry.regionName}`}
                        </p>
                      </div>

                      {/* Soul Ember Drop Rates Breakdown Box */}
                      <div className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-lg space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono-tabular">
                          <span className="text-zinc-400 inline-flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-400" />
                            Soul Ember Drop Table
                          </span>
                          <span className="text-amber-300 font-semibold">
                            Avg {expectedAvgEmbers} Embers / Kill
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tabular pt-0.5">
                          <div className="p-1.5 bg-zinc-950/80 rounded border border-zinc-800/80">
                            <div className="text-zinc-400">Guaranteed Core</div>
                            <div className="text-emerald-300 font-semibold">
                              +{entry.baseEmberDrop} Embers (100%)
                            </div>
                          </div>
                          <div className="p-1.5 bg-zinc-950/80 rounded border border-zinc-800/80">
                            <div className="text-zinc-400">Bonus Cluster Roll</div>
                            <div className="text-amber-300 font-semibold">
                              +{entry.bonusEmberDrop} Embers ({entry.bonusDropChancePct}%)
                            </div>
                          </div>
                        </div>

                        {/* Visual Bonus Drop Rate Probability Bar */}
                        <div className="space-y-1 pt-0.5">
                          <div className="flex justify-between text-[10px] font-mono-tabular text-zinc-400">
                            <span>Bonus Ember Yield Probability</span>
                            <span>{entry.bonusDropChancePct}% Drop Rate</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                            <div
                              className={`h-full ${archMeta.barClass}`}
                              style={{ width: `${entry.bonusDropChancePct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Combat Stats & Lore Note */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-zinc-300">
                        <span className="inline-flex items-center gap-1">
                          <Shield className="w-3 h-3 text-zinc-400" />
                          Vitality: {entry.maxHp} HP
                        </span>
                        <span>·</span>
                        <span className="text-zinc-400 truncate">{entry.attackStyle}</span>
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-2.5">
                        {isUnlocked
                          ? entry.loreText
                          : `Explore ${entry.regionName} and engage this guardian to transcribe its combat behavior and relic notes.`}
                      </p>
                    </div>

                    {/* Footer: Total Harvested + Fast-Locate Region Button */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-zinc-800/80 text-[11px] font-mono-tabular">
                      <span className="text-zinc-400">
                        Habitat: <strong className="text-zinc-200">{entry.regionName}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-amber-300">
                          Harvested: {entry.totalEmbersHarvested}
                        </span>
                        {onLocateVariantRegion && (
                          <button
                            type="button"
                            onClick={() => onLocateVariantRegion(entry.regionName)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
                            title={`Fast-travel to ${entry.regionName} to hunt ${entry.name}`}
                          >
                            <Compass className="w-3 h-3 text-amber-400" />
                            <span>Hunt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
