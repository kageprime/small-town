import {
  CitizenId,
  PortraitExpression,
  ReactivePortraitFrame,
} from '../types/vignette';

export const REACTIVE_PORTRAIT_FRAMES: readonly ReactivePortraitFrame[] = [
  'neutral',
  'happy',
  'stern',
  'thinking',
] as const;

export type MouthViseme = 'closed' | 'narrow' | 'wide' | 'round';

export interface ReactiveFrameParameters {
  frame: ReactivePortraitFrame;
  shortLabel: string;
  badgeLabel: string;
  badgeColorClass: string;
  frameBorderHex: string;
  auraGlowHex: string;
  /** Inner brow vertical offset in SVG units (positive = lowered/furrowed, negative = raised) */
  browInnerY: number;
  /** Outer brow vertical offset in SVG units */
  browOuterY: number;
  /** Left/right asymmetry for contemplative 'thinking' brow raise */
  browAsymmetryLeftY: number;
  /** Eye vertical aperture in SVG units */
  eyeHeight: number;
  /** Upper eyelid droop/hood height */
  upperLidHeight: number;
  /** Lower eyelid smile curve / squint */
  lowerLidCurve: number;
  /** Pupil horizontal gaze shift */
  pupilOffsetX: number;
  /** Pupil vertical gaze shift */
  pupilOffsetY: number;
  /** Base mouth curvature when not mid-syllable */
  restingMouthStyle: 'flat' | 'smile' | 'stern-line' | 'pursed';
  /** Head tilt in degrees */
  headTiltDeg: number;
  /** Shoulder vertical lift in SVG units */
  shoulderLiftY: number;
  /** Ambient frame particle/glyph motif */
  ambientMotif: 'steady-arch' | 'radiant-motes' | 'iron-resolve' | 'thought-glyphs';
}

export interface CharacterPortraitRig {
  npcId: string;
  citizenId: CitizenId;
  displayName: string;
  roleTitle: string;
  cloakColorHex: string;
  trimColorHex: string;
  backdropArchHex: string;
  skinToneHex: string;
  skinShadowHex: string;
  eyeIrisHex: string;
  hairOrBeardHex: string;
  hatStyle: 'clockmaker' | 'botanist' | 'dockmaster' | 'lutenist' | 'archivist';
  signatureAccessoryLabel: string;
  /** Per-frame character-specific flavor description shown in tooltip/telemetry */
  frameFlavorNotes: Record<ReactivePortraitFrame, string>;
}

export interface ComputedPortraitFrameState {
  rig: CharacterPortraitRig;
  activeFrame: ReactivePortraitFrame;
  frameParams: ReactiveFrameParameters;
  isSpeaking: boolean;
  isBlinking: boolean;
  viseme: MouthViseme;
  mouthOpenHeight: number;
  mouthWidth: number;
  activeChar: string;
  speakingBobY: number;
  flavorNote: string;
}

export const REACTIVE_FRAME_DEFINITIONS: Record<
  ReactivePortraitFrame,
  ReactiveFrameParameters
> = {
  neutral: {
    frame: 'neutral',
    shortLabel: 'Neutral',
    badgeLabel: 'NEUTRAL · Composed',
    badgeColorClass: 'text-zinc-200 border-zinc-600/80 bg-zinc-900/90',
    frameBorderHex: '#A1A1AA',
    auraGlowHex: '#71717A',
    browInnerY: 0,
    browOuterY: 0,
    browAsymmetryLeftY: 0,
    eyeHeight: 5.2,
    upperLidHeight: 1.0,
    lowerLidCurve: 0,
    pupilOffsetX: 0,
    pupilOffsetY: 0,
    restingMouthStyle: 'flat',
    headTiltDeg: 0,
    shoulderLiftY: 0,
    ambientMotif: 'steady-arch',
  },
  happy: {
    frame: 'happy',
    shortLabel: 'Happy',
    badgeLabel: 'HAPPY · Warm & Radiant',
    badgeColorClass: 'text-amber-300 border-amber-500/50 bg-amber-950/70',
    frameBorderHex: '#F59E0B',
    auraGlowHex: '#FBBF24',
    browInnerY: -2.0,
    browOuterY: -1.0,
    browAsymmetryLeftY: 0,
    eyeHeight: 4.5,
    upperLidHeight: 0.5,
    lowerLidCurve: 1.8,
    pupilOffsetX: 0,
    pupilOffsetY: -0.4,
    restingMouthStyle: 'smile',
    headTiltDeg: -1.6,
    shoulderLiftY: -1.0,
    ambientMotif: 'radiant-motes',
  },
  stern: {
    frame: 'stern',
    shortLabel: 'Stern',
    badgeLabel: 'STERN · Resolute & Grave',
    badgeColorClass: 'text-rose-300 border-rose-500/50 bg-rose-950/70',
    frameBorderHex: '#F43F5E',
    auraGlowHex: '#E11D48',
    browInnerY: 2.8,
    browOuterY: -1.4,
    browAsymmetryLeftY: 0,
    eyeHeight: 3.8,
    upperLidHeight: 1.8,
    lowerLidCurve: 0,
    pupilOffsetX: 0,
    pupilOffsetY: 0.3,
    restingMouthStyle: 'stern-line',
    headTiltDeg: 1.2,
    shoulderLiftY: 0.8,
    ambientMotif: 'iron-resolve',
  },
  thinking: {
    frame: 'thinking',
    shortLabel: 'Thinking',
    badgeLabel: 'THINKING · Contemplative',
    badgeColorClass: 'text-sky-300 border-sky-500/50 bg-sky-950/70',
    frameBorderHex: '#38BDF8',
    auraGlowHex: '#0EA5E9',
    browInnerY: -0.8,
    browOuterY: 0.6,
    browAsymmetryLeftY: -2.2,
    eyeHeight: 4.8,
    upperLidHeight: 1.2,
    lowerLidCurve: 0.4,
    pupilOffsetX: 1.4,
    pupilOffsetY: -1.2,
    restingMouthStyle: 'pursed',
    headTiltDeg: 2.4,
    shoulderLiftY: -0.4,
    ambientMotif: 'thought-glyphs',
  },
};

export const CHARACTER_PORTRAIT_RIGS: Record<CitizenId, CharacterPortraitRig> = {
  'master-vaelen': {
    npcId: 'citizen-master-vaelen',
    citizenId: 'master-vaelen',
    displayName: 'Old Beck',
    roleTitle: 'Bearers Combine Manifest Keeper & Mentor',
    cloakColorHex: '#282226',
    trimColorHex: '#e8a020',
    backdropArchHex: '#141114',
    skinToneHex: '#d8b89a',
    skinShadowHex: '#b59273',
    eyeIrisHex: '#e8a020',
    hairOrBeardHex: '#a89f94',
    hatStyle: 'clockmaker',
    signatureAccessoryLabel: 'Iron Crutch-Spear & Two Combine Ledgers',
    frameFlavorNotes: {
      neutral: 'Weighing core-stone at The Hold manifest desk',
      happy: 'Rare warm nod as the Crossing Shrine lamp flares',
      stern: 'Rapping his crutch-spear over a dangerous Sync reading',
      thinking: 'Cross-checking the oil book against Auditor Voss\'s tally',
    },
  },
  isolde: {
    npcId: 'citizen-isolde',
    citizenId: 'isolde',
    displayName: 'Doc Sable',
    roleTitle: 'Container Clinic Surgeon & Sync Tech',
    cloakColorHex: '#1e1a1c',
    trimColorHex: '#5591c7',
    backdropArchHex: '#141114',
    skinToneHex: '#e6c8b0',
    skinShadowHex: '#c4a188',
    eyeIrisHex: '#5591c7',
    hairOrBeardHex: '#231f22',
    hatStyle: 'botanist',
    signatureAccessoryLabel: 'Surgical Visor & Padlocked 6-Vial Fridge Key',
    frameFlavorNotes: {
      neutral: 'Monitoring Ward C telemetry & Sync-rot centrifuge',
      happy: 'Relieved smile as Wren\'s O2 saturation stabilizes',
      stern: 'Clinical warning as black Rot-veins climb past 70%',
      thinking: 'Calculating Middle-floor stabilizer dosages',
    },
  },
  oswin: {
    npcId: 'citizen-oswin',
    citizenId: 'oswin',
    displayName: 'Scout Lark',
    roleTitle: 'Combine Vanguard & B13 Flood Survivor',
    cloakColorHex: '#282226',
    trimColorHex: '#6daa45',
    backdropArchHex: '#141114',
    skinToneHex: '#d8b08e',
    skinShadowHex: '#b38b6b',
    eyeIrisHex: '#6daa45',
    hairOrBeardHex: '#3a3235',
    hatStyle: 'dockmaster',
    signatureAccessoryLabel: 'B13 Rebar Hook & Returned Chalk Pouch',
    frameFlavorNotes: {
      neutral: 'Keeping watch over the Muster Choke-Point span',
      happy: 'Grinning as the Flood Bulkhead bypass groans open',
      stern: 'Pointing out Rook\'s outriders on the Gala balcony',
      thinking: 'Tracing white-chalk safe routes along the wet concrete',
    },
  },
  sera: {
    npcId: 'citizen-sera',
    citizenId: 'sera',
    displayName: 'Broker Sera',
    roleTitle: 'Mistress of the Gilt Bazaar & Fiat Field',
    cloakColorHex: '#3a2024',
    trimColorHex: '#e8a020',
    backdropArchHex: '#141114',
    skinToneHex: '#edd0b8',
    skinShadowHex: '#cca98e',
    eyeIrisHex: '#e8a020',
    hairOrBeardHex: '#1e1a1c',
    hatStyle: 'lutenist',
    signatureAccessoryLabel: 'Peace-Bond Seal & Fourth-Floor Ledger',
    frameFlavorNotes: {
      neutral: 'Pricing survival odds at the Spire Gate Return Board',
      happy: 'Counting a 40-to-1 payout on the E-Rank Door-Breaker',
      stern: 'Enforcing the Fiat Field: no drawn blades in the Bazaar',
      thinking: 'Reading the ancient Bell Three clause of the Gala Hall',
    },
  },
  'brother-corvus': {
    npcId: 'citizen-brother-corvus',
    citizenId: 'brother-corvus',
    displayName: 'Auditor Voss',
    roleTitle: 'Gilded Table Inquisitor ("The Manifest")',
    cloakColorHex: '#141114',
    trimColorHex: '#e8a020',
    backdropArchHex: '#1e1a1c',
    skinToneHex: '#dfd7ce',
    skinShadowHex: '#b5aca2',
    eyeIrisHex: '#e5482f',
    hairOrBeardHex: '#a89f94',
    hatStyle: 'archivist',
    signatureAccessoryLabel: 'Scanning Monocle & The Unfiled 7th Dossier',
    frameFlavorNotes: {
      neutral: 'Inspecting gate pylon scans with cold precision',
      happy: 'Thin, clinical satisfaction when a manifest balances',
      stern: 'Suspicion narrowing on Carrier #419 ("E · 11 · FLAT")',
      thinking: 'Cross-referencing Basement 13 flood survivors',
    },
  },
};

/**
 * Maps any raw NPC ID (including cutout-plate caretakers or open-world citizens)
 * to a canonical CharacterPortraitRig.
 */
const NPC_ID_ALIASES: Record<string, CitizenId> = {
  'master-vaelen': 'master-vaelen',
  'citizen-master-vaelen': 'master-vaelen',
  'caretaker-belfry': 'master-vaelen',
  isolde: 'isolde',
  'citizen-isolde': 'isolde',
  'caretaker-apothecary': 'isolde',
  oswin: 'oswin',
  'citizen-oswin': 'oswin',
  'caretaker-fen': 'oswin',
  sera: 'sera',
  'citizen-sera': 'sera',
  'brother-corvus': 'brother-corvus',
  'citizen-brother-corvus': 'brother-corvus',
  'caretaker-crypt': 'brother-corvus',
};

export function resolveCharacterPortraitRig(
  npcId?: string | null,
  citizenId?: CitizenId | null
): CharacterPortraitRig {
  if (citizenId && CHARACTER_PORTRAIT_RIGS[citizenId]) {
    return CHARACTER_PORTRAIT_RIGS[citizenId];
  }
  if (npcId) {
    const normalized = npcId.trim().toLowerCase();
    if (NPC_ID_ALIASES[normalized]) {
      return CHARACTER_PORTRAIT_RIGS[NPC_ID_ALIASES[normalized]];
    }
    if (normalized.includes('isolde') || normalized.includes('apothecary') || normalized.includes('herb')) {
      return CHARACTER_PORTRAIT_RIGS.isolde;
    }
    if (normalized.includes('oswin') || normalized.includes('dock') || normalized.includes('fen') || normalized.includes('lock')) {
      return CHARACTER_PORTRAIT_RIGS.oswin;
    }
    if (normalized.includes('sera') || normalized.includes('lute') || normalized.includes('bard')) {
      return CHARACTER_PORTRAIT_RIGS.sera;
    }
    if (normalized.includes('corvus') || normalized.includes('crypt') || normalized.includes('archivist') || normalized.includes('cloister')) {
      return CHARACTER_PORTRAIT_RIGS['brother-corvus'];
    }
  }
  return CHARACTER_PORTRAIT_RIGS['master-vaelen'];
}

/**
 * Normalizes any PortraitExpression (including legacy aliases) and optional dialogue text
 * into one of the 4 core reactive portrait frames: 'neutral' | 'happy' | 'stern' | 'thinking'.
 */
export function resolveReactivePortraitFrame(
  expression?: PortraitExpression,
  dialogueText?: string
): ReactivePortraitFrame {
  if (expression) {
    switch (expression) {
      case 'neutral':
        return 'neutral';
      case 'happy':
      case 'warm':
      case 'surprised':
        return 'happy';
      case 'stern':
      case 'solemn':
        return 'stern';
      case 'thinking':
      case 'thoughtful':
        return 'thinking';
    }
  }

  // Fallback contextual inference from dialogue text if expression is omitted
  if (dialogueText) {
    const trimmed = dialogueText.trim();
    if (trimmed.includes('?') || trimmed.includes('...')) {
      return 'thinking';
    }
    if (trimmed.includes('!')) {
      return 'happy';
    }
  }

  return 'neutral';
}

/**
 * Computes the syllable viseme and mouth aperture for the current typewriter character.
 */
export function computeTypewriterViseme(
  fullText: string,
  revealedChars: number,
  isSpeaking: boolean
): { viseme: MouthViseme; openHeight: number; width: number; activeChar: string } {
  if (!isSpeaking || revealedChars <= 0 || revealedChars >= fullText.length) {
    return { viseme: 'closed', openHeight: 1.5, width: 8, activeChar: '' };
  }

  const rawChar = fullText[Math.max(0, revealedChars - 1)] || '';
  const ch = rawChar.toLowerCase();

  // Pause on punctuation or spaces
  if (/[\s.,;:'"—\-!?]/.test(ch)) {
    return { viseme: 'closed', openHeight: 1.4, width: 8, activeChar: rawChar };
  }

  // Open vowels ('a', 'e', 'i') -> wide aperture
  if (/[aei]/.test(ch)) {
    return { viseme: 'wide', openHeight: 5.2, width: 10, activeChar: rawChar };
  }

  // Rounded vowels ('o', 'u', 'w', 'y') -> round aperture
  if (/[ouwy]/.test(ch)) {
    return { viseme: 'round', openHeight: 4.8, width: 6.5, activeChar: rawChar };
  }

  // Bilabial/closed consonants ('m', 'b', 'p')
  if (/[mbp]/.test(ch)) {
    return { viseme: 'closed', openHeight: 1.6, width: 9, activeChar: rawChar };
  }

  // Default consonant articulation
  const cadenceToggle = revealedChars % 2 === 0;
  return {
    viseme: cadenceToggle ? 'narrow' : 'closed',
    openHeight: cadenceToggle ? 3.4 : 2.0,
    width: 8.5,
    activeChar: rawChar,
  };
}

/**
 * Master state evaluation function for the Character Portrait Engine.
 */
export function evaluatePortraitEngineState(params: {
  npcId?: string | null;
  citizenId?: CitizenId | null;
  expression?: PortraitExpression;
  overrideFrame?: ReactivePortraitFrame | null;
  fullText: string;
  revealedChars: number;
  isSpeaking: boolean;
  tickCount: number;
}): ComputedPortraitFrameState {
  const rig = resolveCharacterPortraitRig(params.npcId, params.citizenId);
  const resolvedFrame =
    params.overrideFrame ||
    resolveReactivePortraitFrame(params.expression, params.fullText);
  const frameParams = REACTIVE_FRAME_DEFINITIONS[resolvedFrame];

  const { viseme, openHeight, width, activeChar } = computeTypewriterViseme(
    params.fullText,
    params.revealedChars,
    params.isSpeaking
  );

  // Periodic natural blink every ~28 ticks (with deterministic offset per citizen)
  const citizenSeed = rig.displayName.charCodeAt(0) % 11;
  const blinkCycle = (params.tickCount + citizenSeed * 3) % 34;
  const isBlinking = blinkCycle === 0 || blinkCycle === 1;

  // Subtle head bob synced to active speech syllables
  const speakingBobY =
    params.isSpeaking && viseme !== 'closed'
      ? (params.revealedChars % 2 === 0 ? -0.9 : 0.5)
      : 0;

  return {
    rig,
    activeFrame: resolvedFrame,
    frameParams,
    isSpeaking: params.isSpeaking,
    isBlinking,
    viseme,
    mouthOpenHeight: openHeight,
    mouthWidth: width,
    activeChar,
    speakingBobY,
    flavorNote: rig.frameFlavorNotes[resolvedFrame],
  };
}
