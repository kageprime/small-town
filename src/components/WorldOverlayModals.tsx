import React, { useEffect, useMemo, useState } from 'react';
import { Fish } from 'lucide-react';
import { BestiaryEntry, PlayerTelemetry, SentinelArchetype } from '../types/vignette';
import {
  INITIAL_BOUND_ECHOES,
  INITIAL_JOSS_MEMORIES,
  NULLSPIRE_ZONES,
  WARDEN_ACCORDS,
  WORLD_BIBLE_SECTIONS,
} from '../data/nullspireData';

export type CodexTabId =
  | 'bestiary'
  | 'echoes'
  | 'accords'
  | 'clinic'
  | 'bible';

interface WorldOverlayModalsProps {
  telemetry: PlayerTelemetry;
  isBestiaryOpen: boolean;
  initialTab?: CodexTabId;
  onCloseBestiary: () => void;
  onPurchaseUpgrade: (kind: 'sword' | 'lantern' | 'vitality') => void;
  onCloseNpcDialog: () => void;
  onReelFishing: () => void;
  onLocateVariantRegion?: (regionName: string) => void;
  onAttemptBindOffer?: () => void;
  onDismissBindOffer?: () => void;
  onResolveWhisperDeal?: (accept: boolean) => void;
  onTriggerWhisperDeal?: (dealId?: string) => void;
  onResolveMemoryTithe?: (acceptTithe: boolean) => void;
  onWashRotAtClinic?: () => void;
  onDepositWrenScrip?: (emberCount: number) => void;
  onToggleEchoSummon?: (echoId: string) => void;
  onCycleEchoFsmOrder?: (echoId: string) => void;
  onToggleWardenAccord?: (numeral: string) => void;
}

interface CodexCreatureLoreMeta {
  categoryTitle: string;
  epigraphQuote: string;
  epigraphAuthor: string;
  secondParagraph: string;
  vulnerabilities: {
    id: string;
    name: string;
    category: string;
    iconType: 'oil' | 'bomb' | 'sign' | 'ember';
  }[];
}

const CREATURE_CODEX_META: Record<string, CodexCreatureLoreMeta> = {
  'gargoyle-ossuary': {
    categoryTitle: 'WRONG-DOOR AMALGAMS & INQUISITORS',
    epigraphQuote:
      '“Count its ribs before you swing, Coffin. Anything that crawled back through a sealed Spire door has three lives stitched inside its chest.”',
    epigraphAuthor: 'Old Beck, Master of the Hold (Bearers Combine)',
    secondParagraph:
      'Calcified ash-stone and grafted bone plates armor the Returnling against glancing blows. Bait its heavy smash, blink behind its shoulder with Gapstep [1], or ignite Bloodwage [2] to crack all three rib-seals before it can regenerate.',
    vulnerabilities: [
      { id: 'v1', name: 'Bloodwage [2]', category: '1.65× Crimson Cleave', iconType: 'oil' },
      { id: 'v2', name: 'Ichimonji Strike IV', category: 'Heavy Armor-Crack Slam', iconType: 'bomb' },
      { id: 'v3', name: 'Gapstep [1]', category: '3.6m Seam Blink Evade', iconType: 'sign' },
    ],
  },
  'gargoyle-crossroads': {
    categoryTitle: 'WRONG-DOOR AMALGAMS & INQUISITORS',
    epigraphQuote:
      '“Heir Seven does not send clerks when a door-seal breaks. He sends porcelain masks that never blink and blades that leave no echo.”',
    epigraphAuthor: 'Broker Sera, Gilt Bazaar Factor',
    secondParagraph:
      'Dispatched from Floor 2 (The Gala Hall) by Rook and Auditor Voss to hunt the unindexed E-11 anomaly. Triggering The Red Second [F] slows their dueling lunge to 30% speed, exposing their Gilded Table scrip cylinders to a 73% BIND extraction.',
    vulnerabilities: [
      { id: 'v1', name: 'The Red Second [F]', category: '2.4s Time Dilation', iconType: 'sign' },
      { id: 'v2', name: 'Crosspull [3]', category: 'Spatial Seam Yank', iconType: 'bomb' },
      { id: 'v3', name: 'Hush (Echo 03)', category: 'Flanking Backstab', iconType: 'oil' },
    ],
  },
  'wraith-fen-north': {
    categoryTitle: 'FUNERAL SHROUDS OF THE DOWN',
    epigraphQuote:
      '“Do not draw steel on a Pall unless you enjoy fighting your own burial cloth. Bow your head, let the gold stitches pass, and keep walking.”',
    epigraphAuthor: 'Scout Lark, Returned Chalk-Runner',
    secondParagraph:
      'Three nested cones of dark burial cloth bound by glinting gold stitch-rings. The Pall is passive until crowded or struck. Pressing [G] to Bow in respect honors the dead woven into its hem, stunning and pacifying the shroud for 4.2 seconds while raising Mercy and Stitch’s loyalty.',
    vulnerabilities: [
      { id: 'v1', name: 'Respect Bow [G]', category: '4.2s Shroud Pacification', iconType: 'sign' },
      { id: 'v2', name: "Mercy's Lamp", category: 'Tally-Lantern Radiance', iconType: 'oil' },
      { id: 'v3', name: 'Kesagiri Slash', category: 'Gold-Stitch Severance', iconType: 'bomb' },
    ],
  },
  'wraith-fen-south': {
    categoryTitle: 'FUNERAL SHROUDS OF THE DOWN',
    epigraphQuote:
      '“Stitch sewed those hems before the B13 lock gave way. Every thread remembers the porter it wrapped.”',
    epigraphAuthor: 'Doc Sable, Back-Alley Rot Surgeon',
    secondParagraph:
      'Drifting above the black-water locks of Floor 1 (The Drowned Sump), Sump Weave Palls lash out with constricted burial threads when disturbed. Bowing with [G] calms their mourning frenzy; felling one yields high-purity unbanked scrip.',
    vulnerabilities: [
      { id: 'v1', name: 'Respect Bow [G]', category: '4.2s Shroud Pacification', iconType: 'sign' },
      { id: 'v2', name: 'Crosspull [3]', category: 'Interrupt Constriction', iconType: 'bomb' },
      { id: 'v3', name: 'Bind (73%)', category: 'Echo Stitch Resonance', iconType: 'oil' },
    ],
  },
  'sentinel-citadel': {
    categoryTitle: 'HUSKS & DROWNED CARRIERS',
    epigraphQuote:
      '“The Gate read E-Flat on them too, once. Stay down here past your contract and the Spire keeps your name and leaves the coat walking.”',
    epigraphAuthor: 'Old Beck, Master of the Hold (Bearers Combine)',
    secondParagraph:
      'Towering oilskin coats and rusted Combine plate animated by residual Spire static in Floor 0 (The Muster Hall). Floor Zero Husks telegraph their overhead bail-hook cleaves with an iron rattle—step through with Shadowstep [Q] or Gapstep [1] to shatter their rigging.',
    vulnerabilities: [
      { id: 'v1', name: 'Combine Cleaver', category: '4-Strike Sekiro Combo', iconType: 'oil' },
      { id: 'v2', name: 'Bram (Echo 01)', category: '25% Guard Absorption', iconType: 'sign' },
      { id: 'v3', name: 'Crosspull [3]', category: 'Stagger Heavy Windup', iconType: 'bomb' },
    ],
  },
  'sentinel-barrow': {
    categoryTitle: 'HUSKS & DROWNED CARRIERS',
    epigraphQuote:
      '“Whole B13 lock-crew went under when the sluice blew. They’re still hauling chains at the bottom of the Sump.”',
    epigraphAuthor: 'Scout Lark, Returned Chalk-Runner',
    secondParagraph:
      'Stationed along the flooded catwalks of Floor 1, Drowned Sump Carriers swing heavy iron sluice-bars in wide arcs. Felling them and invoking BIND (73%) extracts the drowned crew’s memories into your Bound Echo roster.',
    vulnerabilities: [
      { id: 'v1', name: 'Bloodwage [2]', category: 'Pierce Waterlogged Plate', iconType: 'oil' },
      { id: 'v2', name: 'Call the Bound [4]', category: 'Retainer Focus Fire', iconType: 'sign' },
      { id: 'v3', name: 'Ichimonji Cleave', category: 'Hitstop Stagger Combo', iconType: 'bomb' },
    ],
  },
};

const CreatureCodexIllustration: React.FC<{
  archetype: SentinelArchetype;
  variantId: string;
  thumbnail?: boolean;
}> = ({ archetype, variantId, thumbnail = false }) => {
  const isSecondary =
    variantId.includes('crossroads') ||
    variantId.includes('south') ||
    variantId.includes('barrow');

  if (archetype === 'gargoyle') {
    const stoneBase = isSecondary ? '#6B665E' : '#78756C';
    const stoneLight = isSecondary ? '#9E978B' : '#ACA89C';
    const stoneDark = '#282226';
    const mossColor = isSecondary ? '#e8a020' : '#6daa45';

    return (
      <svg viewBox="0 0 240 240" className="w-full h-full select-none" aria-hidden="true">
        <defs>
          <radialGradient id={`garg-glow-${variantId}`} cx="50%" cy="48%" r="50%">
            <stop offset="0%" stopColor="#e8a020" stopOpacity={thumbnail ? '0.35' : '0.22'} />
            <stop offset="65%" stopColor="#3a3235" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#141114" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`garg-stone-${variantId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stoneLight} />
            <stop offset="55%" stopColor={stoneBase} />
            <stop offset="100%" stopColor={stoneDark} />
          </linearGradient>
        </defs>
        <circle cx="120" cy="118" r="108" fill={`url(#garg-glow-${variantId})`} />
        <path
          d="M105 86 C75 48, 38 44, 18 68 C34 74, 48 86, 54 106 C68 96, 84 96, 102 104 Z"
          fill={stoneDark}
          stroke="#575248"
          strokeWidth="1.5"
        />
        <path
          d="M135 84 C168 40, 208 42, 226 76 C206 78, 190 92, 182 114 C168 100, 152 98, 136 104 Z"
          fill={`url(#garg-stone-${variantId})`}
          stroke="#8E8779"
          strokeWidth="1.5"
        />
        <path
          d="M78 82 C66 105, 68 148, 86 168 C104 182, 136 182, 154 168 C172 148, 174 105, 162 82 C146 68, 94 68, 78 82 Z"
          fill={`url(#garg-stone-${variantId})`}
          stroke="#3a3235"
          strokeWidth="2"
        />
        <path
          d="M86 96 Q120 112 154 96 M88 124 Q120 142 152 124 M96 150 Q120 164 144 150"
          stroke="#e5482f"
          strokeWidth="2.2"
          fill="none"
        />
        <ellipse cx="104" cy="108" rx="16" ry="10" fill={mossColor} fillOpacity="0.45" />
        <path
          d="M86 162 C74 178, 72 196, 80 208 L64 214 L96 216 L98 198 C98 184, 102 174, 106 166 Z"
          fill={`url(#garg-stone-${variantId})`}
          stroke="#282226"
          strokeWidth="1.8"
        />
        <path
          d="M154 162 C166 178, 168 196, 160 208 L176 214 L144 216 L142 198 C142 184, 138 174, 134 166 Z"
          fill={`url(#garg-stone-${variantId})`}
          stroke="#282226"
          strokeWidth="1.8"
        />
        <path
          d="M96 58 C94 48, 108 42, 120 42 C132 42, 146 48, 144 58 C148 72, 140 88, 120 90 C100 88, 92 72, 96 58 Z"
          fill={`url(#garg-stone-${variantId})`}
          stroke="#282226"
          strokeWidth="2"
        />
        <circle cx="110" cy="67" r="2.6" fill="#e8a020" />
        <circle cx="130" cy="67" r="2.6" fill="#e8a020" />
      </svg>
    );
  }

  if (archetype === 'wraith') {
    // The Pall: 3 nested burial cloth cones with gold stitch-rings
    return (
      <svg viewBox="0 0 240 240" className="w-full h-full select-none" aria-hidden="true">
        <defs>
          <radialGradient id={`wraith-glow-${variantId}`} cx="50%" cy="48%" r="50%">
            <stop offset="0%" stopColor="#9fd8e8" stopOpacity={thumbnail ? '0.32' : '0.18'} />
            <stop offset="65%" stopColor="#1e1a1c" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#141114" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="120" cy="118" r="108" fill={`url(#wraith-glow-${variantId})`} />
        {/* Lower Cone 1 */}
        <polygon
          points="120,78 58,208 182,208"
          fill="#1e1a1c"
          stroke="#3a3235"
          strokeWidth="2"
        />
        {/* Middle Cone 2 */}
        <polygon
          points="120,52 72,158 168,158"
          fill="#282226"
          stroke="#3a3235"
          strokeWidth="2"
        />
        {/* Upper Cone 3 */}
        <polygon
          points="120,28 88,108 152,108"
          fill="#141114"
          stroke="#e8a020"
          strokeWidth="1.6"
        />
        {/* Gold Stitch Rings */}
        <ellipse
          cx="120"
          cy="108"
          rx="34"
          ry="7"
          fill="none"
          stroke="#e8a020"
          strokeWidth="2.4"
          strokeDasharray="5 3"
        />
        <ellipse
          cx="120"
          cy="158"
          rx="48"
          ry="9"
          fill="none"
          stroke="#e8a020"
          strokeWidth="2.4"
          strokeDasharray="6 4"
        />
        <circle cx="113" cy="68" r="2.5" fill="#9fd8e8" />
        <circle cx="127" cy="68" r="2.5" fill="#9fd8e8" />
      </svg>
    );
  }

  const armorLight = isSecondary ? '#8C9284' : '#a89f94';
  const armorMid = isSecondary ? '#3a3235' : '#282226';
  const armorDark = '#141114';

  return (
    <svg viewBox="0 0 240 240" className="w-full h-full select-none" aria-hidden="true">
      <defs>
        <radialGradient id={`sent-glow-${variantId}`} cx="50%" cy="48%" r="50%">
          <stop offset="0%" stopColor="#e5482f" stopOpacity={thumbnail ? '0.32' : '0.18'} />
          <stop offset="65%" stopColor="#282226" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#141114" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`sent-plate-${variantId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={armorLight} />
          <stop offset="50%" stopColor={armorMid} />
          <stop offset="100%" stopColor={armorDark} />
        </linearGradient>
      </defs>
      <circle cx="120" cy="118" r="108" fill={`url(#sent-glow-${variantId})`} />
      <path
        d="M82 72 L64 198 L94 188 L120 204 L146 188 L176 198 L158 72 Z"
        fill="#282226"
        stroke="#3a3235"
        strokeWidth="1.5"
      />
      <path
        d="M62 78 C62 60, 88 56, 120 56 C152 56, 178 60, 178 78 L164 102 L148 148 L92 148 L76 102 Z"
        fill={`url(#sent-plate-${variantId})`}
        stroke="#a89f94"
        strokeWidth="1.8"
      />
      <polygon
        points="120,84 132,102 120,122 108,102"
        fill="#e8a020"
        fillOpacity="0.85"
        stroke="#f4efe4"
        strokeWidth="1.5"
      />
      <rect
        x="90"
        y="148"
        width="22"
        height="62"
        rx="4"
        fill={`url(#sent-plate-${variantId})`}
        stroke="#3a3235"
        strokeWidth="1.6"
      />
      <rect
        x="128"
        y="148"
        width="22"
        height="62"
        rx="4"
        fill={`url(#sent-plate-${variantId})`}
        stroke="#3a3235"
        strokeWidth="1.6"
      />
      <path
        d="M98 34 C98 22, 142 22, 142 34 L144 64 L96 64 Z"
        fill={`url(#sent-plate-${variantId})`}
        stroke="#a89f94"
        strokeWidth="1.8"
      />
      <rect x="104" y="45" width="32" height="4" fill="#e5482f" />
      <line x1="184" y1="16" x2="172" y2="218" stroke="#a89f94" strokeWidth="3.5" />
      <path
        d="M184 16 L188 42 L214 34 L208 66 L182 58 Z"
        fill={armorLight}
        stroke="#3a3235"
        strokeWidth="1.5"
      />
    </svg>
  );
};

const VulnerabilityTileIcon: React.FC<{
  type: 'oil' | 'bomb' | 'sign' | 'ember';
}> = ({ type }) => {
  if (type === 'oil') {
    return (
      <svg viewBox="0 0 36 36" className="w-7 h-7">
        <path
          d="M15 6 L21 6 L20 12 L27 20 C28 24, 25 30, 18 30 C11 30, 8 24, 9 20 L16 12 Z"
          fill="#e5482f"
          fillOpacity="0.35"
          stroke="#e5482f"
          strokeWidth="1.5"
        />
        <path d="M12 22 Q18 25 24 22" stroke="#f4efe4" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }
  if (type === 'bomb') {
    return (
      <svg viewBox="0 0 36 36" className="w-7 h-7">
        <circle cx="17" cy="21" r="9" fill="#282226" stroke="#a89f94" strokeWidth="1.5" />
        <path d="M21 13 Q25 8 29 10" stroke="#e8a020" strokeWidth="2" fill="none" />
        <circle cx="29" cy="10" r="2.5" fill="#f4efe4" />
      </svg>
    );
  }
  if (type === 'sign') {
    return (
      <svg viewBox="0 0 36 36" className="w-7 h-7">
        <polygon points="18,7 29,27 7,27" fill="none" stroke="#9fd8e8" strokeWidth="2.2" />
        <polygon points="18,13 24,24 12,24" fill="#9fd8e8" fillOpacity="0.25" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 36 36" className="w-7 h-7">
      <path
        d="M18 6 C22 13, 27 17, 25 24 C24 28, 21 30, 18 30 C15 30, 12 28, 11 24 C9 17, 14 13, 18 6 Z"
        fill="#e8a020"
        stroke="#f4efe4"
        strokeWidth="1.4"
      />
    </svg>
  );
};

export const WorldOverlayModals: React.FC<WorldOverlayModalsProps> = ({
  telemetry,
  isBestiaryOpen,
  initialTab = 'bestiary',
  onCloseBestiary,
  onPurchaseUpgrade,
  onReelFishing,
  onLocateVariantRegion,
  onAttemptBindOffer,
  onDismissBindOffer,
  onResolveWhisperDeal,
  onTriggerWhisperDeal,
  onResolveMemoryTithe,
  onWashRotAtClinic,
  onDepositWrenScrip,
  onToggleEchoSummon,
  onCycleEchoFsmOrder,
  onToggleWardenAccord,
}) => {
  const { fishingState, soulEmbers, bestiary } = telemetry;
  const [activeTab, setActiveTab] = useState<CodexTabId>(initialTab);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('gargoyle-ossuary');
  const [activeVulnLabel, setActiveVulnLabel] = useState<string | null>(null);
  const [selectedEchoId, setSelectedEchoId] = useState<string>('01');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const orderedBestiary = useMemo(() => {
    const priority: Record<SentinelArchetype, number> = {
      gargoyle: 0,
      wraith: 1,
      sentinel: 2,
    };
    return [...bestiary].sort((a, b) => priority[a.archetype] - priority[b.archetype]);
  }, [bestiary]);

  const selectedEntry: BestiaryEntry = useMemo(() => {
    return (
      orderedBestiary.find((b) => b.variantId === selectedVariantId) ||
      orderedBestiary[0]
    );
  }, [orderedBestiary, selectedVariantId]);

  const codexMeta: CodexCreatureLoreMeta =
    CREATURE_CODEX_META[selectedEntry?.variantId] ||
    CREATURE_CODEX_META['gargoyle-ossuary'];

  const boundEchoes = telemetry.boundEchoes || INITIAL_BOUND_ECHOES;
  const wardenAccords = telemetry.wardenAccords || WARDEN_ACCORDS;
  const memories = telemetry.memories || INITIAL_JOSS_MEMORIES;
  const syncRotPct = telemetry.syncRotPct ?? 18;
  const wrenScripFund = telemetry.wrenScripFund ?? 145000;
  const wrenScripGoal = telemetry.wrenScripGoal ?? 2000000;
  const wrenPct = Math.min(100, Math.round((wrenScripFund / wrenScripGoal) * 100));

  const selectedEcho =
    boundEchoes.find((e) => e.id === selectedEchoId) || boundEchoes[0];

  const totalDefeatedCount = bestiary.reduce((acc, b) => acc + b.defeatedCount, 0);
  const discoveredCount = bestiary.filter((b) => b.encountered || b.defeatedCount > 0).length;

  useEffect(() => {
    if (!isBestiaryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseBestiary();
      } else if (activeTab === 'bestiary' && (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const idx = orderedBestiary.findIndex((b) => b.variantId === selectedEntry.variantId);
        const next = orderedBestiary[(idx + 1) % orderedBestiary.length];
        if (next) setSelectedVariantId(next.variantId);
      } else if (activeTab === 'bestiary' && (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        const idx = orderedBestiary.findIndex((b) => b.variantId === selectedEntry.variantId);
        const prev =
          orderedBestiary[(idx - 1 + orderedBestiary.length) % orderedBestiary.length];
        if (prev) setSelectedVariantId(prev.variantId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, isBestiaryOpen, onCloseBestiary, orderedBestiary, selectedEntry]);

  return (
    <>
      {/* 1. B13 Sump Dredge Minigame Prompt */}
      {fishingState.active && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 pointer-events-auto">
          <div
            className={`p-5 bg-[#141114]/96 backdrop-blur-md border shadow-[0_18px_45px_rgba(0,0,0,0.9)] transition-colors ${
              fishingState.phase === 'bite'
                ? 'border-[#e8a020] text-[#f4efe4]'
                : 'border-[#3a3235] text-[#a89f94]'
            }`}
          >
            <div className="flex items-center justify-between gap-3 pb-2.5 mb-3 border-b border-[#3a3235]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#1e1a1c] border border-[#3a3235] flex items-center justify-center">
                  <Fish
                    className={`w-4 h-4 ${
                      fishingState.phase === 'bite'
                        ? 'text-[#e8a020] animate-bounce'
                        : 'text-[#9fd8e8]'
                    }`}
                  />
                </div>
                <span className="font-display text-xs sm:text-sm tracking-[0.16em] uppercase text-[#f4efe4] font-semibold">
                  {fishingState.spotTitle}
                </span>
              </div>
              <span className="text-[11px] font-mono-tabular text-[#a89f94]">
                Hauled: <strong className="text-[#e8a020]">{fishingState.totalCaught}</strong>
              </span>
            </div>

            <p className="text-xs leading-relaxed text-[#a89f94] mb-4">
              {fishingState.phase === 'bite'
                ? 'The dredge-chain snagged heavy B13 salvage in the black water! Press [E] or click below to haul it up!'
                : 'Wait in stillness for the dredge-hook to snag a submerged Combine cylinder...'}
            </p>

            <button
              type="button"
              onClick={onReelFishing}
              className={`w-full py-2 px-4 border text-xs font-display tracking-[0.16em] uppercase transition-colors flex items-center justify-center gap-2 ${
                fishingState.phase === 'bite'
                  ? 'bg-[#282226] hover:bg-[#3a3235] border-[#e8a020] text-[#f4efe4]'
                  : 'bg-[#1e1a1c] hover:bg-[#282226] border-[#3a3235] text-[#a89f94] hover:text-[#f4efe4]'
              }`}
            >
              <span className="text-[9px] text-[#e8a020]">◆</span>
              <span>
                {fishingState.phase === 'bite' ? 'Haul Up Salvage [E]' : 'Draw Dredge Early'}
              </span>
              <span className="text-[9px] text-[#e8a020]">◆</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. 73% BIND Extraction Prompt (Appears when an enemy is felled) */}
      {telemetry.pendingBindOffer && !telemetry.memoryTithePending && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 pointer-events-auto">
          <div className="p-4 bg-[#141114]/96 backdrop-blur-md border border-[#9fd8e8] shadow-[0_18px_45px_rgba(0,0,0,0.92)] text-[#f4efe4]">
            <div className="flex items-center justify-between border-b border-[#3a3235] pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-tabular px-1.5 py-0.5 bg-[#9fd8e8]/15 border border-[#9fd8e8] text-[#9fd8e8]">
                  BIND · {telemetry.pendingBindOffer.chancePct}%
                </span>
                <span className="font-display text-xs tracking-[0.16em] uppercase text-[#f4efe4]">
                  REMNANT EXTRACTION READY
                </span>
              </div>
              <span className="text-[11px] font-mono-tabular text-[#a89f94]">
                Felled: {telemetry.pendingBindOffer.enemyName}
              </span>
            </div>

            <p className="text-xs text-[#a89f94] leading-relaxed mb-3">
              Reach into the cooling ash to bind{' '}
              <strong className="text-[#9fd8e8]">
                [{telemetry.pendingBindOffer.echoId} {telemetry.pendingBindOffer.echoName}{' '}
                {telemetry.pendingBindOffer.echoEpithet}]
              </strong>{' '}
              to your coat. <span className="text-[#e8a020]">73% success</span> (+1 Rank &amp; +8
              Loyalty, +4% Rot); <span className="text-[#e5482f]">27% failure</span> shatters the
              remnant into a frenzy burst (+6 Scrip Pockets).
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onAttemptBindOffer}
                className="flex-1 py-2 px-3 bg-[#1e1a1c] hover:bg-[#282226] border border-[#9fd8e8] text-[#9fd8e8] text-xs font-display tracking-[0.15em] uppercase transition-colors"
              >
                ◆ Invoke BIND (73% Roll)
              </button>
              <button
                type="button"
                onClick={onDismissBindOffer}
                className="py-2 px-3 bg-[#1e1a1c] hover:bg-[#282226] border border-[#3a3235] text-[#a89f94] hover:text-[#f4efe4] text-xs font-display tracking-[0.14em] uppercase transition-colors"
              >
                Release (+3 Scrip)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. VESTIGE ("The Laugh") Whisper Deal Modal with Truhound Radar-Ear Lie Tell */}
      {telemetry.activeWhisperDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141114]/85 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="w-full max-w-xl bg-[#141114] border-2 border-[#e5482f] shadow-[0_24px_60px_rgba(0,0,0,0.95)] p-6 text-[#f4efe4]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#3a3235]">
              <div>
                <span className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-[#e5482f]">
                  PARASITE WHISPER · FLOOR {telemetry.activeWhisperDeal.floor}
                </span>
                <h3 className="font-display text-base sm:text-lg tracking-[0.18em] uppercase text-[#f4efe4] font-semibold mt-0.5">
                  {telemetry.activeWhisperDeal.title}
                </h3>
              </div>
              <span className="px-2 py-1 text-[11px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] text-[#e8a020]">
                Sync/Rot: {syncRotPct}%
              </span>
            </div>

            <blockquote className="p-3.5 bg-[#1e1a1c] border-l-2 border-[#e5482f] text-xs sm:text-sm italic text-[#f4efe4] leading-relaxed mb-4">
              {telemetry.activeWhisperDeal.whisperQuote}
            </blockquote>

            {/* Truhound (Echo 11) Radar-Ear Lie Detection Box */}
            <div
              className={`p-3 mb-4 border text-xs flex items-start gap-3 ${
                telemetry.activeWhisperDeal.isLie
                  ? 'bg-[#e5482f]/10 border-[#e5482f]/60 text-[#f4efe4]'
                  : 'bg-[#6daa45]/10 border-[#6daa45]/60 text-[#f4efe4]'
              }`}
            >
              <span className="font-mono-tabular text-[10px] uppercase px-1.5 py-0.5 border border-current shrink-0">
                {telemetry.activeWhisperDeal.isLie
                  ? 'TRUHOUND: EAR DROOPED (LIE)'
                  : 'TRUHOUND: EAR PERKED (TRUTH)'}
              </span>
              <p className="text-[#a89f94] leading-relaxed">
                {telemetry.activeWhisperDeal.truhoundEarTell}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-xs">
              <div className="p-3 bg-[#1e1a1c] border border-[#3a3235]">
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#e8a020] mb-1">
                  PROMISED BOON
                </div>
                <div className="text-[#f4efe4]">{telemetry.activeWhisperDeal.promisedBoon}</div>
              </div>
              <div className="p-3 bg-[#1e1a1c] border border-[#3a3235]">
                <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-[#e5482f] mb-1">
                  HIDDEN COST (+{telemetry.activeWhisperDeal.rotDelta}% ROT)
                </div>
                <div className="text-[#a89f94]">{telemetry.activeWhisperDeal.hiddenPrice}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onResolveWhisperDeal?.(true)}
                className="flex-1 py-2.5 px-4 bg-[#e5482f]/20 hover:bg-[#e5482f]/35 border border-[#e5482f] text-[#f4efe4] text-xs font-display tracking-[0.16em] uppercase transition-colors"
              >
                ◆ Accept VESTIGE Bargain (+{telemetry.activeWhisperDeal.rotDelta}% Rot)
              </button>
              <button
                type="button"
                onClick={() => onResolveWhisperDeal?.(false)}
                className="flex-1 py-2.5 px-4 bg-[#1e1a1c] hover:bg-[#282226] border border-[#9fd8e8] text-[#9fd8e8] text-xs font-display tracking-[0.16em] uppercase transition-colors"
              >
                Refuse Whisper (+5 Echo Loyalty)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. VESTIGE Memory Tithe Death Modal */}
      {telemetry.memoryTithePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141114]/92 backdrop-blur-md p-4 pointer-events-auto">
          <div className="w-full max-w-lg bg-[#141114] border-2 border-[#e5482f] shadow-[0_24px_60px_rgba(0,0,0,0.95)] p-6 text-[#f4efe4]">
            <div className="text-[10px] font-mono-tabular uppercase tracking-[0.22em] text-[#e5482f] mb-1">
              HEARTBEAT FLATLINED · E · 11 · FLAT
            </div>
            <h3 className="font-display text-lg tracking-[0.18em] uppercase text-[#f4efe4] font-semibold pb-3 mb-3 border-b border-[#3a3235]">
              THE MEMORY TITHE
            </h3>
            <p className="text-xs sm:text-sm text-[#a89f94] leading-relaxed mb-4">
              “Don’t lie down in the wet, Coffin. Give me one little memory—the color of Wren’s
              scarf, or the sound of your father’s laugh—and I’ll stand this coat right back up.”
            </p>
            <div className="p-3 bg-[#1e1a1c] border border-[#3a3235] text-xs space-y-1.5 mb-5">
              <div className="text-[#e5482f]">
                • <strong>Pay Memory Tithe:</strong> Resurrect on the spot at 100% HP, forfeit
                unbanked coat scrip, +8% Sync/Rot, and permanently corrupt 1 Memory in your journal.
              </div>
              <div className="text-[#9fd8e8]">
                • <strong>Refuse &amp; Evacuate:</strong> Keep your memories intact; wake up on Doc
                Sable’s operating table in Cinderfall.
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onResolveMemoryTithe?.(true)}
                className="flex-1 py-2.5 px-4 bg-[#e5482f]/25 hover:bg-[#e5482f]/40 border border-[#e5482f] text-[#f4efe4] text-xs font-display tracking-[0.15em] uppercase"
              >
                ◆ Pay Memory Tithe (Stand Up Now)
              </button>
              <button
                type="button"
                onClick={() => onResolveMemoryTithe?.(false)}
                className="flex-1 py-2.5 px-4 bg-[#1e1a1c] hover:bg-[#282226] border border-[#3a3235] text-[#f4efe4] text-xs font-display tracking-[0.15em] uppercase"
              >
                Wake at Doc Sable's Clinic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Fullscreen NULLSPIRE CODEX (Bestiary, 20 Bound Echoes, 7 Warden Accords, Clinic & Wren, World Bible) */}
      {isBestiaryOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-between bg-[#141114]/96 backdrop-blur-md text-[#f4efe4] select-none pointer-events-auto overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 48% 50%, rgba(58, 50, 53, 0.28) 0%, rgba(20, 17, 20, 0.98) 68%)',
          }}
        >
          {/* Top Classical Codex Bar with 5 Navigation Tabs */}
          <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 pt-4 pb-3 flex flex-wrap items-center justify-between gap-4 border-b border-[#3a3235]">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {(
                [
                  { id: 'bestiary', label: 'I · BESTIARY' },
                  { id: 'echoes', label: `II · BOUND ECHOES (${boundEchoes.filter((e) => e.isBound).length}/20)` },
                  { id: 'accords', label: 'III · 7 WARDEN ACCORDS' },
                  { id: 'clinic', label: "IV · CLINIC & WREN'S 2M" },
                  { id: 'bible', label: 'V · MEMORIES & BIBLE' },
                ] as { id: CodexTabId; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-[11px] font-display tracking-[0.16em] uppercase border transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#282226] border-[#e8a020] text-[#f4efe4]'
                      : 'bg-[#1e1a1c]/70 border-[#3a3235] text-[#a89f94] hover:text-[#f4efe4]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right Status Strip */}
            <div className="flex items-center gap-5 text-xs font-mono-tabular">
              <div className="flex items-center gap-1.5" title="Spire Gate Scan vs True Level">
                <span className="text-[#a89f94]">GATE:</span>
                <span className="text-[#e8a020]">{telemetry.scanReadout || 'E · 11 · FLAT'}</span>
                <span className="text-[#e5482f]">(LV.{telemetry.jossLevel || 11})</span>
              </div>
              <div className="flex items-center gap-1.5" title="VESTIGE Sync / Rot">
                <span className="text-[#a89f94]">ROT:</span>
                <span className={syncRotPct >= 65 ? 'text-[#e5482f]' : 'text-[#9fd8e8]'}>
                  {syncRotPct}%
                </span>
              </div>
              <div className="flex items-center gap-1.5" title="Unbanked Scrip Pockets">
                <span className="text-[#a89f94]">COAT SCRIP:</span>
                <span className="text-[#e8a020]">{soulEmbers}</span>
              </div>
            </div>
          </header>

          {/* TAB 1: BESTIARY */}
          {activeTab === 'bestiary' && (
            <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-5 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center overflow-y-auto lg:overflow-hidden">
              {/* LEFT COLUMN: Creature Roster */}
              <div className="lg:col-span-4 flex flex-col h-full justify-center max-h-[520px] pr-2 border-r border-[#3a3235]/80">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#3a3235]">
                  <span className="font-display text-xs tracking-[0.18em] uppercase text-[#a89f94]">
                    {codexMeta.categoryTitle}
                  </span>
                  <span className="text-[10px] text-[#e8a020]">
                    {discoveredCount}/{bestiary.length} Sighted
                  </span>
                </div>

                <div className="space-y-1.5 overflow-y-auto pr-1">
                  {orderedBestiary.map((entry) => {
                    const isSelected = entry.variantId === selectedEntry.variantId;
                    const isSlain = entry.defeatedCount > 0;

                    return (
                      <button
                        key={entry.variantId}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(entry.variantId);
                          setActiveVulnLabel(null);
                        }}
                        className={`relative w-full flex items-center gap-3.5 p-1.5 text-left transition-all ${
                          isSelected
                            ? 'bg-[#282226] border border-[#e8a020] text-[#f4efe4]'
                            : 'border border-transparent hover:bg-[#1e1a1c] text-[#a89f94] hover:text-[#f4efe4]'
                        }`}
                      >
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            className="absolute -left-1.5 top-1/2 -translate-y-1/2 text-[9px] text-[#e8a020]"
                          >
                            ◆
                          </span>
                        )}
                        <div className="w-11 h-11 shrink-0 bg-[#141114] border border-[#3a3235] overflow-hidden">
                          <CreatureCodexIllustration
                            archetype={entry.archetype}
                            variantId={entry.variantId}
                            thumbnail={true}
                          />
                        </div>
                        <div className="min-w-0 flex-1 flex items-center justify-between gap-2 pr-2">
                          <span className="text-xs sm:text-[13px] font-medium truncate">
                            {entry.name}
                          </span>
                          {isSlain && (
                            <span className="text-[10px] font-mono-tabular text-[#e8a020]">
                              ×{entry.defeatedCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CENTER COLUMN: Creature Figure + Counter Techniques */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center">
                <div className="relative w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center">
                  <CreatureCodexIllustration
                    archetype={selectedEntry.archetype}
                    variantId={selectedEntry.variantId}
                  />
                </div>

                <div className="w-full max-w-xs mt-2 flex flex-col items-center">
                  <div className="w-full py-1.5 border-y border-[#3a3235] text-center">
                    <span className="text-[11px] font-display tracking-[0.2em] uppercase text-[#e8a020]">
                      VULNERABLE TO TECHNIQUES:
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3 py-3">
                    {codexMeta.vulnerabilities.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onMouseEnter={() => setActiveVulnLabel(`${v.name} — ${v.category}`)}
                        onClick={() => setActiveVulnLabel(`${v.name} — ${v.category}`)}
                        className="w-11 h-11 bg-[#1e1a1c] hover:bg-[#282226] border border-[#3a3235] hover:border-[#e8a020] flex items-center justify-center transition-colors"
                      >
                        <VulnerabilityTileIcon type={v.iconType} />
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseEnter={() =>
                        setActiveVulnLabel(
                          `73% BIND Extraction + ${selectedEntry.baseEmberDrop} Unbanked Scrip Yield`
                        )
                      }
                      onClick={() =>
                        setActiveVulnLabel(
                          `73% BIND Extraction + ${selectedEntry.baseEmberDrop} Unbanked Scrip Yield`
                        )
                      }
                      className="w-11 h-11 bg-[#1e1a1c] hover:bg-[#282226] border border-[#3a3235] hover:border-[#e8a020] flex items-center justify-center transition-colors"
                    >
                      <VulnerabilityTileIcon type="ember" />
                    </button>
                  </div>

                  <div className="w-full h-px bg-[#3a3235]" />
                  <p className="mt-2 text-[11px] text-[#a89f94] text-center min-h-[18px]">
                    {activeVulnLabel ||
                      `Yield: ${selectedEntry.baseEmberDrop}–${
                        selectedEntry.baseEmberDrop + selectedEntry.bonusEmberDrop
                      } Unbanked Scrip + 73% BIND Roll`}
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: Epigraph & Lore */}
              <div className="lg:col-span-4 relative flex flex-col justify-between h-full max-h-[520px] pl-2">
                <div className="relative z-10 space-y-4 overflow-y-auto pr-2">
                  <div className="pb-2 border-b border-[#3a3235]">
                    <h3 className="font-display text-sm sm:text-base tracking-[0.18em] uppercase text-[#f4efe4] font-semibold">
                      {selectedEntry.name}
                    </h3>
                    <div className="text-[11px] text-[#e8a020] mt-0.5">{selectedEntry.title}</div>
                  </div>

                  <blockquote className="space-y-1 text-xs sm:text-[13px] leading-relaxed text-[#f4efe4]/90 italic">
                    <p>{codexMeta.epigraphQuote}</p>
                    <footer className="not-italic text-[11px] text-[#a89f94]">
                      — {codexMeta.epigraphAuthor}
                    </footer>
                  </blockquote>

                  <div className="space-y-3 text-xs sm:text-[13px] leading-[1.75] text-[#a89f94]">
                    <p>{selectedEntry.loreText}</p>
                    <p>{codexMeta.secondParagraph}</p>
                  </div>

                  <div className="pt-3 border-t border-[#3a3235] space-y-1 text-[11px] text-[#a89f94]">
                    <div>
                      Spire Floor:{' '}
                      <span className="text-[#f4efe4]">{selectedEntry.regionName}</span>
                    </div>
                    <div>
                      Signature Form:{' '}
                      <span className="text-[#f4efe4]">{selectedEntry.attackStyle}</span>
                    </div>
                    <div>
                      Combine Ledger:{' '}
                      <span className="text-[#e8a020]">
                        {selectedEntry.defeatedCount > 0
                          ? `Felled ${selectedEntry.defeatedCount}× (${selectedEntry.totalEmbersHarvested} Scrip harvested)`
                          : `Active in ${selectedEntry.regionName}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 20 BOUND ECHOES ROSTER & FSM COMMAND */}
          {activeTab === 'echoes' && (
            <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-2">
                {boundEchoes.map((echo) => {
                  const isSel = echo.id === selectedEcho.id;
                  return (
                    <div
                      key={echo.id}
                      onClick={() => setSelectedEchoId(echo.id)}
                      className={`p-3 border cursor-pointer transition-colors flex flex-col justify-between gap-2 ${
                        isSel
                          ? 'bg-[#282226] border-[#9fd8e8]'
                          : echo.isBound
                            ? 'bg-[#1e1a1c] border-[#3a3235] hover:border-[#a89f94]'
                            : 'bg-[#141114]/70 border-[#282226] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono-tabular px-1.5 py-0.5 bg-[#141114] border border-[#3a3235] text-[#9fd8e8]">
                            {echo.id}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-[#f4efe4]">
                              {echo.name}{' '}
                              <span className="text-[#a89f94] font-normal">{echo.epithet}</span>
                            </div>
                            <div className="text-[10px] text-[#a89f94]">{echo.role}</div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono-tabular px-1.5 py-0.5 border ${
                            echo.isSummoned
                              ? 'border-[#9fd8e8] text-[#9fd8e8] bg-[#9fd8e8]/10'
                              : echo.isBound
                                ? 'border-[#e8a020] text-[#e8a020]'
                                : 'border-[#3a3235] text-[#a89f94]'
                          }`}
                        >
                          {echo.isSummoned ? echo.fsmState : echo.isBound ? 'BOUND' : 'UNBOUND'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#a89f94]">
                        <span>Rank {echo.rank}/5</span>
                        <span>Loyalty {echo.loyalty}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Echo Dossier & FSM Controls */}
              <div className="lg:col-span-5 bg-[#1e1a1c] border border-[#3a3235] p-5 flex flex-col justify-between max-h-[520px]">
                <div className="space-y-3 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#3a3235] pb-3">
                    <div>
                      <span className="text-[10px] font-mono-tabular text-[#9fd8e8] uppercase tracking-widest">
                        ECHO #{selectedEcho.id} · {selectedEcho.role}
                      </span>
                      <h3 className="font-display text-base tracking-[0.16em] uppercase text-[#f4efe4] font-semibold mt-0.5">
                        {selectedEcho.name} — {selectedEcho.epithet}
                      </h3>
                    </div>
                    <span className="text-xs font-mono-tabular px-2 py-1 bg-[#141114] border border-[#3a3235] text-[#e8a020]">
                      LOYALTY {selectedEcho.loyalty}%
                    </span>
                  </div>

                  <blockquote className="p-3 bg-[#141114] border-l-2 border-[#9fd8e8] text-xs italic text-[#f4efe4]">
                    {selectedEcho.signatureQuote}
                  </blockquote>

                  <p className="text-xs text-[#a89f94] leading-relaxed">
                    {selectedEcho.loreSummary}
                  </p>

                  <div className="p-3 bg-[#141114] border border-[#3a3235] space-y-2 text-xs">
                    <div>
                      <span className="text-[#6daa45] font-mono-tabular uppercase text-[10px]">
                        LOYALTY TRIGGER:{' '}
                      </span>
                      <span className="text-[#f4efe4]">{selectedEcho.loyaltyTrigger}</span>
                    </div>
                    <div>
                      <span className="text-[#e5482f] font-mono-tabular uppercase text-[10px]">
                        AUTONOMOUS REFUSAL RULE:{' '}
                      </span>
                      <span className="text-[#a89f94]">{selectedEcho.refusalCondition}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#3a3235] flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleEchoSummon?.(selectedEcho.id)}
                    className="flex-1 py-2 px-3 bg-[#282226] hover:bg-[#3a3235] border border-[#9fd8e8] text-[#9fd8e8] text-xs font-display tracking-[0.14em] uppercase"
                  >
                    {selectedEcho.isBound
                      ? selectedEcho.isSummoned
                        ? 'Recall to Coat'
                        : 'Summon Retainer'
                      : 'Bind Now (5 Coat Scrip)'}
                  </button>
                  {selectedEcho.isBound && (
                    <button
                      type="button"
                      onClick={() => onCycleEchoFsmOrder?.(selectedEcho.id)}
                      className="flex-1 py-2 px-3 bg-[#141114] hover:bg-[#282226] border border-[#e8a020] text-[#e8a020] text-xs font-display tracking-[0.14em] uppercase"
                    >
                      Order: [{selectedEcho.fsmState}]
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: THE 7 WARDEN ACCORDS */}
          {activeTab === 'accords' && (
            <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-5 overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-[#a89f94]">
                  The Seven Wardens of the Spire offer binding Accords. Every Boon carries a Price;
                  refusing or breaking an Accord grants its own defiant strength.
                </p>
                <span className="text-xs font-mono-tabular text-[#e8a020]">
                  Sworn: {wardenAccords.filter((w) => w.sworn).length} / 7
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
                {wardenAccords.map((accord) => (
                  <div
                    key={accord.numeral}
                    className={`p-4 border transition-colors flex flex-col justify-between gap-3 ${
                      accord.sworn
                        ? 'bg-[#282226] border-[#e8a020]'
                        : 'bg-[#1e1a1c] border-[#3a3235]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#3a3235]">
                        <div>
                          <span className="text-xs font-mono-tabular text-[#e8a020] mr-2">
                            WARDEN {accord.numeral}
                          </span>
                          <span className="font-display text-sm tracking-[0.14em] uppercase text-[#f4efe4] font-semibold">
                            {accord.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono-tabular text-[#a89f94]">
                          {accord.floorRange}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <strong className="text-[#6daa45]">Boon:</strong>{' '}
                          <span className="text-[#f4efe4]">{accord.boon}</span>
                        </div>
                        <div>
                          <strong className="text-[#e5482f]">Price:</strong>{' '}
                          <span className="text-[#a89f94]">{accord.price}</span>
                        </div>
                        <div>
                          <strong className="text-[#9fd8e8]">Refusal Path:</strong>{' '}
                          <span className="text-[#a89f94]">{accord.refusalBonus}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleWardenAccord?.(accord.numeral)}
                      className={`w-full py-1.5 px-3 border text-xs font-display tracking-[0.14em] uppercase transition-colors ${
                        accord.sworn
                          ? 'bg-[#e8a020]/20 border-[#e8a020] text-[#f4efe4]'
                          : 'bg-[#141114] hover:bg-[#282226] border-[#3a3235] text-[#a89f94] hover:text-[#f4efe4]'
                      }`}
                    >
                      {accord.sworn
                        ? `◆ Accord Sworn (${accord.domain}) — Click to Renounce`
                        : `Swear Accord of ${accord.domain}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DOC SABLE'S CLINIC & WREN'S 2,000,000 SCRIP BREATH-GRAFT LEDGER */}
          {activeTab === 'clinic' && (
            <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
              {/* Left: Wren's 2M Ward-C Ledger & Doc Sable Rot Wash */}
              <div className="lg:col-span-6 bg-[#1e1a1c] border border-[#3a3235] p-5 space-y-5">
                <div className="border-b border-[#3a3235] pb-3">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#e8a020]">
                    WARD C · CINDERFALL BREATH-GRAFT ESCROW
                  </span>
                  <h3 className="font-display text-base tracking-[0.16em] uppercase text-[#f4efe4] font-semibold mt-0.5">
                    WREN VANE'S 2,000,000 SCRIP FUND
                  </h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono-tabular">
                    <span className="text-[#a89f94]">Escrow Balance:</span>
                    <span className="text-[#e8a020] font-semibold">
                      {wrenScripFund.toLocaleString()} / {wrenScripGoal.toLocaleString()} Scrip (
                      {wrenPct}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#141114] border border-[#3a3235] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#e8a020] to-[#6daa45] transition-all duration-300"
                      style={{ width: `${Math.max(4, wrenPct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#a89f94] leading-relaxed">
                    Every Unbanked Scrip Pocket in your coat is worth{' '}
                    <strong className="text-[#f4efe4]">5,000 Spire Scrip</strong> when banked at
                    Doc Sable’s Clinic, and cannot be lost to VESTIGE’s Memory Tithe once deposited.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onDepositWrenScrip?.(5)}
                    className="flex-1 py-2.5 px-4 bg-[#282226] hover:bg-[#3a3235] border border-[#e8a020] text-[#f4efe4] text-xs font-display tracking-[0.14em] uppercase"
                  >
                    ◆ Bank 5 Coat Scrip (+25,000 to Wren)
                  </button>
                  <button
                    type="button"
                    onClick={() => onWashRotAtClinic?.()}
                    className="flex-1 py-2.5 px-4 bg-[#141114] hover:bg-[#282226] border border-[#9fd8e8] text-[#9fd8e8] text-xs font-display tracking-[0.14em] uppercase"
                  >
                    Doc Sable Rot Wash (-15% Rot · 4 Scrip)
                  </button>
                </div>

                <div className="pt-4 border-t border-[#3a3235] space-y-2">
                  <div className="text-xs font-display tracking-[0.14em] uppercase text-[#e5482f]">
                    CONSULT VESTIGE ("THE LAUGH")
                  </div>
                  <p className="text-xs text-[#a89f94]">
                    Ring an interior Spire bell or summon a Whisper Deal directly. Watch Truhound’s
                    left ear before signing.
                  </p>
                  <button
                    type="button"
                    onClick={() => onTriggerWhisperDeal?.()}
                    className="w-full py-2 px-4 bg-[#e5482f]/15 hover:bg-[#e5482f]/30 border border-[#e5482f] text-[#f4efe4] text-xs font-display tracking-[0.15em] uppercase"
                  >
                    ◆ Awaken VESTIGE Whisper Bargain
                  </button>
                </div>
              </div>

              {/* Right: Bearers Combine Kit Upgrades */}
              <div className="lg:col-span-6 bg-[#1e1a1c] border border-[#3a3235] p-5 space-y-4">
                <div className="border-b border-[#3a3235] pb-3">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-widest text-[#9fd8e8]">
                    THE HOLD · BEARERS COMBINE RIGGING BENCH
                  </span>
                  <h3 className="font-display text-base tracking-[0.16em] uppercase text-[#f4efe4] font-semibold mt-0.5">
                    JOSS VANE ("COFFIN") KIT UPGRADES
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-[#141114] border border-[#3a3235] flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-[#f4efe4]">
                        Combine Bail-Cleaver (Lv.{telemetry.upgrades.swordLevel})
                      </div>
                      <div className="text-[11px] text-[#a89f94]">
                        Increases 4-hit Sekiro combo cleave damage &amp; blade arc reach.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPurchaseUpgrade('sword')}
                      className="px-3 py-1.5 bg-[#282226] hover:bg-[#3a3235] border border-[#e8a020] text-[#e8a020] text-xs font-mono-tabular shrink-0"
                    >
                      Temper ({telemetry.upgrades.swordLevel * 4} Scrip)
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#141114] border border-[#3a3235] flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-[#f4efe4]">
                        Mercy's Tally-Lamp (Lv.{telemetry.upgrades.lanternLevel})
                      </div>
                      <div className="text-[11px] text-[#a89f94]">
                        Expands Floor Zero light radius &amp; magnetic scrip pull distance.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPurchaseUpgrade('lantern')}
                      className="px-3 py-1.5 bg-[#282226] hover:bg-[#3a3235] border border-[#9fd8e8] text-[#9fd8e8] text-xs font-mono-tabular shrink-0"
                    >
                      Brighten ({telemetry.upgrades.lanternLevel * 4} Scrip)
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#141114] border border-[#3a3235] flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-[#f4efe4]">
                        Doc Sable's Breath-Rig (Lv.{telemetry.upgrades.vitalityLevel})
                      </div>
                      <div className="text-[11px] text-[#a89f94]">
                        Raises Max HP by +25 and flushes all active wounds to full HP.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPurchaseUpgrade('vitality')}
                      className="px-3 py-1.5 bg-[#282226] hover:bg-[#3a3235] border border-[#6daa45] text-[#6daa45] text-xs font-mono-tabular shrink-0"
                    >
                      Reinforce ({telemetry.upgrades.vitalityLevel * 3} Scrip)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: JOSS'S MEMORIES & WORLD BIBLE */}
          {activeTab === 'bible' && (
            <div className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
              {/* Left: Joss Vane's Memory Journal (Shows Memory Tithe Corruption) */}
              <div className="lg:col-span-6 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                <div className="pb-2 border-b border-[#3a3235] flex items-center justify-between">
                  <span className="font-display text-xs tracking-[0.18em] uppercase text-[#e8a020]">
                    JOSS VANE'S MEMORY JOURNAL
                  </span>
                  <span className="text-[11px] font-mono-tabular text-[#a89f94]">
                    Intact: {memories.filter((m) => !m.isTithed).length}/{memories.length}
                  </span>
                </div>
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className={`p-3.5 border ${
                      mem.isTithed
                        ? 'bg-[#e5482f]/10 border-[#e5482f]'
                        : 'bg-[#1e1a1c] border-[#3a3235]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#f4efe4]">{mem.title}</span>
                      <span
                        className={`text-[10px] font-mono-tabular px-1.5 py-0.5 border ${
                          mem.isTithed
                            ? 'border-[#e5482f] text-[#e5482f]'
                            : 'border-[#6daa45] text-[#6daa45]'
                        }`}
                      >
                        {mem.isTithed ? 'TITHED TO VESTIGE' : 'INTACT'}
                      </span>
                    </div>
                    <p className="text-xs text-[#a89f94] leading-relaxed">
                      {mem.isTithed ? mem.corruptedText : mem.intactText}
                    </p>
                  </div>
                ))}
              </div>

              {/* Right: World Bible & Act 1 Floor Atlas */}
              <div className="lg:col-span-6 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                <div className="pb-2 border-b border-[#3a3235]">
                  <span className="font-display text-xs tracking-[0.18em] uppercase text-[#9fd8e8]">
                    NULLSPIRE WORLD BIBLE &amp; ACT 1 ATLAS
                  </span>
                </div>
                {WORLD_BIBLE_SECTIONS.map((sec) => (
                  <div key={sec.id} className="p-3.5 bg-[#1e1a1c] border border-[#3a3235]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[#f4efe4]">{sec.title}</span>
                      <span className="text-[10px] font-mono-tabular text-[#e8a020]">
                        {sec.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#a89f94] leading-relaxed">{sec.summary}</p>
                  </div>
                ))}
                {NULLSPIRE_ZONES.map((z) => (
                  <div key={z.id} className="p-3 bg-[#141114] border border-[#3a3235]">
                    <div className="flex items-center justify-between text-xs">
                      <strong className="text-[#f4efe4]">{z.title}</strong>
                      <span className="text-[10px] font-mono-tabular text-[#9fd8e8]">
                        {z.floorBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#a89f94] mt-1">{z.atmosphere}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Bar */}
          <footer className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-3 border-t border-[#3a3235] flex items-center justify-between text-xs">
            <span className="text-[#a89f94] font-mono-tabular text-[11px]">
              Keys: [1] Gapstep · [2] Bloodwage · [3] Crosspull · [4] Call Bound · [F] Red Second · [G] Bow to Palls
            </span>
            <div className="flex items-center gap-4">
              {activeTab === 'bestiary' && onLocateVariantRegion && (
                <button
                  type="button"
                  onClick={() => onLocateVariantRegion(selectedEntry.regionName)}
                  className="inline-flex items-center gap-1.5 text-[#f4efe4] hover:text-[#e8a020]"
                >
                  <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] text-[#e8a020]">
                    Track
                  </span>
                  <span>Deploy to Floor</span>
                </button>
              )}
              <button
                type="button"
                onClick={onCloseBestiary}
                className="inline-flex items-center gap-1.5 text-[#f4efe4] hover:text-[#e8a020]"
              >
                <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#1e1a1c] border border-[#3a3235] text-[#e8a020]">
                  Esc / B
                </span>
                <span>Close Codex</span>
              </button>
            </div>
          </footer>
        </div>
      )}
    </>
  );
};
