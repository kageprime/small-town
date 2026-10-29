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
    displayName: 'Master Vaelen',
    roleTitle: 'Grand Bellwright & Clockmaker',
    cloakColorHex: '#8E3B2E',
    trimColorHex: '#E0A94E',
    backdropArchHex: '#2A1816',
    skinToneHex: '#E6C3A3',
    skinShadowHex: '#C99E7A',
    eyeIrisHex: '#D97706',
    hairOrBeardHex: '#D8D6DF',
    hatStyle: 'clockmaker',
    signatureAccessoryLabel: 'Brass Jeweler Loupe & Velvet Beret',
    frameFlavorNotes: {
      neutral: 'Listening to the steady escapement ticks of the Plaza',
      happy: 'Brass loupe glinting warmly at a synchronized chime',
      stern: 'Furrowed brow over a misaligned counterweight gear',
      thinking: 'Calculating harmonic pendulum ratios in his mind',
    },
  },
  isolde: {
    npcId: 'citizen-isolde',
    citizenId: 'isolde',
    displayName: 'Isolde',
    roleTitle: 'Cloister Apothecary & Botanist',
    cloakColorHex: '#256B54',
    trimColorHex: '#8CE0B8',
    backdropArchHex: '#132A23',
    skinToneHex: '#ECCCB0',
    skinShadowHex: '#CFA686',
    eyeIrisHex: '#10B981',
    hairOrBeardHex: '#3B2720',
    hatStyle: 'botanist',
    signatureAccessoryLabel: 'Silver-Fern Sprig & Woven Hood',
    frameFlavorNotes: {
      neutral: 'Calmly observing the conservatory dew distillation',
      happy: 'Warm herbalist smile scented with moon-sage',
      stern: 'Cautious warning against damp canal miasma',
      thinking: 'Pondering nocturnal moss and starlight bellflower lore',
    },
  },
  oswin: {
    npcId: 'citizen-oswin',
    citizenId: 'oswin',
    displayName: 'Oswin',
    roleTitle: 'Canal Dockmaster & Lock-Keeper',
    cloakColorHex: '#2C4A63',
    trimColorHex: '#D99B43',
    backdropArchHex: '#14222E',
    skinToneHex: '#DEB392',
    skinShadowHex: '#BE8E6B',
    eyeIrisHex: '#38BDF8',
    hairOrBeardHex: '#4B4852',
    hatStyle: 'dockmaster',
    signatureAccessoryLabel: "Weathered Sou'wester & Brass Capstan Key",
    frameFlavorNotes: {
      neutral: 'Steady dockmaster watch over the Lower Canal Quays',
      happy: 'Hearty quay-side grin as the lock waterwheel surges',
      stern: 'Grave warning of deep canal currents and iron sluices',
      thinking: 'Judging tide-marks along the dressed basalt embankment',
    },
  },
  sera: {
    npcId: 'citizen-sera',
    citizenId: 'sera',
    displayName: 'Sera',
    roleTitle: 'Plaza Lutenist & City Chronicler',
    cloakColorHex: '#9E2A47',
    trimColorHex: '#F3C663',
    backdropArchHex: '#2D141D',
    skinToneHex: '#F0CFB6',
    skinShadowHex: '#D4AD90',
    eyeIrisHex: '#F59E0B',
    hairOrBeardHex: '#5A2D28',
    hatStyle: 'lutenist',
    signatureAccessoryLabel: 'Gilded Feather Plume & Chronicler Cap',
    frameFlavorNotes: {
      neutral: 'Poised with lute strings tuned in resonant thirds',
      happy: 'Beaming with inspiration for a new Sanctuary stanza',
      stern: 'Dramatic cadence recounting the old floods of the fen',
      thinking: 'Searching for the exact meter and rhyme in the Chronicle',
    },
  },
  'brother-corvus': {
    npcId: 'citizen-brother-corvus',
    citizenId: 'brother-corvus',
    displayName: 'Brother Corvus',
    roleTitle: 'Sanctuary Archivist & Rose-Window Keeper',
    cloakColorHex: '#3B3654',
    trimColorHex: '#C8B8E8',
    backdropArchHex: '#1B1829',
    skinToneHex: '#E2C2A8',
    skinShadowHex: '#C29D80',
    eyeIrisHex: '#A78BFA',
    hairOrBeardHex: '#9CA3AF',
    hatStyle: 'archivist',
    signatureAccessoryLabel: 'Monastic Cowl & Rose-Window Meridian Seal',
    frameFlavorNotes: {
      neutral: 'Serene archival vigil beneath the Upper Cloister arches',
      happy: 'Illumined joy at a newly deciphered stained-glass verse',
      stern: 'Solemn vow to preserve Vaelenport’s three-tier harmony',
      thinking: 'Tracing celestial meridian projections across parchment',
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
