import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkCheck,
  Clock,
  Film,
  Flame,
  Heart,
  MessageSquare,
  Sparkles,
  Sun,
  Swords,
  Volume2,
  X,
} from 'lucide-react';
import {
  ActiveCutsceneState,
  CitizenId,
  CutsceneId,
  NpcDialogState,
  PlayerTelemetry,
  PortraitExpression,
  ReactivePortraitFrame,
} from '../types/vignette';
import {
  CitizenProfile,
  CommunityMemoryStore,
  DialogueChoiceOption,
  evaluateCitizenSchedule,
  loadCommunityMemory,
  saveCommunityMemory,
  VAELENPORT_CITIZENS,
} from '../scene/dialogueAndCutscenes';
import {
  ComputedPortraitFrameState,
  evaluatePortraitEngineState,
  REACTIVE_FRAME_DEFINITIONS,
  REACTIVE_PORTRAIT_FRAMES,
} from '../scene/characterPortraitEngine';
import { soundEngine } from '../scene/soundEngine';

interface DialogueAndCutsceneOverlayProps {
  telemetry: PlayerTelemetry;
  onPurchaseUpgrade: (kind: 'sword' | 'lantern' | 'vitality') => void;
  onGrantSoulEmbers: (amount: number) => void;
  onCloseNpcDialog: () => void;
  onTriggerCutscene: (id: CutsceneId) => void;
  onSkipCutscene: () => void;
}

interface CharacterPortraitEngineProps {
  npcId?: string | null;
  citizenId?: CitizenId | null;
  expression?: PortraitExpression;
  overrideFrame?: ReactivePortraitFrame | null;
  onSelectOverrideFrame?: (frame: ReactivePortraitFrame | null) => void;
  fullText: string;
  revealedChars: number;
  isSpeaking: boolean;
  compact?: boolean;
}

/**
 * Character Portrait Engine component:
 * Maps NPC IDs to reactive portrait frames ('neutral' | 'happy' | 'stern' | 'thinking')
 * and renders syllable-synced visemes, eye blinks, brow/gaze shifts, and ambient motifs
 * alongside the typewriter dialogue text.
 */
export const CharacterPortraitEngine: React.FC<CharacterPortraitEngineProps> = ({
  npcId,
  citizenId,
  expression,
  overrideFrame = null,
  onSelectOverrideFrame,
  fullText,
  revealedChars,
  isSpeaking,
  compact = false,
}) => {
  const [tickCount, setTickCount] = useState<number>(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTickCount((prev) => (prev + 1) % 1000);
    }, 140);
    return () => window.clearInterval(timer);
  }, []);

  const portraitState: ComputedPortraitFrameState = useMemo(
    () =>
      evaluatePortraitEngineState({
        npcId,
        citizenId,
        expression,
        overrideFrame,
        fullText,
        revealedChars,
        isSpeaking,
        tickCount,
      }),
    [npcId, citizenId, expression, overrideFrame, fullText, revealedChars, isSpeaking, tickCount]
  );

  const { rig, activeFrame, frameParams, isBlinking, viseme, mouthOpenHeight, mouthWidth, speakingBobY } =
    portraitState;

  const leftBrowInnerY = 36 + frameParams.browInnerY + frameParams.browAsymmetryLeftY;
  const leftBrowOuterY = 36 + frameParams.browOuterY + frameParams.browAsymmetryLeftY * 0.5;
  const rightBrowInnerY = 36 + frameParams.browInnerY;
  const rightBrowOuterY = 36 + frameParams.browOuterY;

  const effectiveEyeHeight = isBlinking ? 1.2 : frameParams.eyeHeight;
  const eyeTopY = isBlinking ? 42 : 40;
  const pupilXLeft = 38.5 + frameParams.pupilOffsetX;
  const pupilXRight = 55.5 + frameParams.pupilOffsetX;
  const pupilY = 41 + frameParams.pupilOffsetY;

  return (
    <div className="flex flex-col items-center gap-2 shrink-0 select-none">
      {/* Portrait Frame Box */}
      <div
        className={`relative ${
          compact ? 'w-20 h-20' : 'w-28 h-28 sm:w-32 sm:h-32'
        } rounded-xl overflow-hidden border-2 bg-[#121118] shadow-inner transition-colors duration-200`}
        style={{
          borderColor: frameParams.frameBorderHex,
          boxShadow: `inset 0 0 18px ${frameParams.auraGlowHex}28`,
        }}
        title={`${rig.displayName} (${rig.npcId}) · Frame: ${frameParams.shortLabel} — ${portraitState.flavorNote}`}
      >
        <svg
          viewBox="0 0 96 96"
          className="w-full h-full"
          shapeRendering="crispEdges"
        >
          {/* Architectural Backdrop & Frame-Reactive Aura */}
          <rect x="0" y="0" width="96" height="96" fill={rig.backdropArchHex} />
          <circle
            cx="48"
            cy="48"
            r="39"
            fill={frameParams.auraGlowHex}
            fillOpacity={activeFrame === 'happy' ? '0.24' : '0.15'}
          />
          <rect
            x="6"
            y="6"
            width="84"
            height="84"
            fill="none"
            stroke={rig.trimColorHex}
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* Ambient Frame-Specific Motif Layer */}
          {frameParams.ambientMotif === 'radiant-motes' && (
            <>
              <rect
                x="14"
                y={18 - (tickCount % 5)}
                width="3"
                height="3"
                fill="#FDE68A"
                fillOpacity="0.85"
              />
              <rect
                x="78"
                y={24 - ((tickCount + 2) % 5)}
                width="3"
                height="3"
                fill="#FBBF24"
                fillOpacity="0.8"
              />
              <rect
                x="18"
                y={54 - ((tickCount + 4) % 4)}
                width="2"
                height="2"
                fill="#FEF08A"
                fillOpacity="0.7"
              />
            </>
          )}

          {frameParams.ambientMotif === 'iron-resolve' && (
            <>
              {/* Sharp Crimson/Iron Resolve Corner Brackets */}
              <path
                d="M10 20 L10 10 L20 10"
                stroke="#F43F5E"
                strokeWidth="2.5"
                fill="none"
              />
              <path
                d="M86 20 L86 10 L76 10"
                stroke="#F43F5E"
                strokeWidth="2.5"
                fill="none"
              />
              <rect x="10" y="10" width="76" height="8" fill="#881337" fillOpacity="0.3" />
            </>
          )}

          {frameParams.ambientMotif === 'thought-glyphs' && (
            <>
              {/* Contemplative Ellipsis & Meridian Thought Rings */}
              <circle
                cx="77"
                cy="20"
                r="6"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeOpacity="0.75"
              />
              <rect
                x="73"
                y="19"
                width="2"
                height="2"
                fill={tickCount % 3 === 0 ? '#E0F2FE' : '#38BDF8'}
              />
              <rect
                x="76"
                y="19"
                width="2"
                height="2"
                fill={tickCount % 3 === 1 ? '#E0F2FE' : '#38BDF8'}
              />
              <rect
                x="79"
                y="19"
                width="2"
                height="2"
                fill={tickCount % 3 === 2 ? '#E0F2FE' : '#38BDF8'}
              />
            </>
          )}

          {/* Shoulders & Mantle (with subtle frame shoulder lift) */}
          <g transform={`translate(0, ${frameParams.shoulderLiftY})`}>
            <path
              d="M15 96 L22 65 L74 65 L81 96 Z"
              fill={rig.cloakColorHex}
            />
            <rect x="34" y="65" width="28" height="31" fill="#1F1D29" />
            <rect x="25" y="65" width="46" height="5" fill={rig.trimColorHex} />
            <rect x="44" y="72" width="8" height="8" fill={rig.trimColorHex} fillOpacity="0.7" />
          </g>

          {/* Character Head Group (reacts to headTiltDeg & speaking syllable bob) */}
          <g
            transform={`translate(0, ${speakingBobY}) rotate(${frameParams.headTiltDeg}, 48, 46)`}
          >
            {/* Neck & Sculpted Head */}
            <rect x="41" y="55" width="14" height="12" fill={rig.skinShadowHex} />
            <rect x="30" y="29" width="36" height="30" fill={rig.skinToneHex} />
            {/* Cheekbone & Temple Shading */}
            <rect x="30" y="45" width="6" height="11" fill={rig.skinShadowHex} />
            <rect x="60" y="45" width="6" height="11" fill={rig.skinShadowHex} />

            {/* Warm Blush Highlight on 'happy' Frame */}
            {activeFrame === 'happy' && (
              <>
                <rect x="32" y="46" width="5" height="3" fill="#F43F5E" fillOpacity="0.35" />
                <rect x="59" y="46" width="5" height="3" fill="#F43F5E" fillOpacity="0.35" />
              </>
            )}

            {/* Stern Brow Shadow Bar on 'stern' Frame */}
            {activeFrame === 'stern' && (
              <rect x="31" y="33" width="34" height="4" fill="#18131E" fillOpacity="0.35" />
            )}

            {/* Distinct Headgear, Hair & Props per Citizen Rig */}
            {rig.hatStyle === 'clockmaker' && (
              <>
                {/* Master Vaelen: Clockmaker Velvet Beret + Brass Loupe */}
                <rect x="24" y="17" width="48" height="12" fill={rig.cloakColorHex} />
                <rect x="28" y="27" width="40" height="4" fill={rig.trimColorHex} />
                {/* White Side-Beard & Mustache */}
                <rect x="30" y="50" width="8" height="12" fill={rig.hairOrBeardHex} />
                <rect x="58" y="50" width="8" height="12" fill={rig.hairOrBeardHex} />
                <rect x="38" y="50" width="20" height="4" fill={rig.hairOrBeardHex} />
                {/* Brass Spectacle Monocle */}
                <rect
                  x="50"
                  y="36"
                  width="13"
                  height="11"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
              </>
            )}

            {rig.hatStyle === 'botanist' && (
              <>
                {/* Isolde: Woven Herbalist Hood + Silver-Fern Sprig */}
                <path d="M24 33 L32 13 L64 13 L72 33 Z" fill={rig.cloakColorHex} />
                <rect x="26" y="29" width="7" height="25" fill={rig.hairOrBeardHex} />
                <rect x="63" y="29" width="7" height="25" fill={rig.hairOrBeardHex} />
                <rect x="59" y="19" width="11" height="5" fill="#6EE7B7" />
              </>
            )}

            {rig.hatStyle === 'dockmaster' && (
              <>
                {/* Oswin: Weathered Sou'wester Oilskin Cap + Sea-Salt Beard */}
                <path d="M18 29 L30 15 L66 15 L78 29 Z" fill={rig.cloakColorHex} />
                <rect x="22" y="27" width="52" height="4" fill={rig.trimColorHex} />
                <rect x="32" y="50" width="32" height="12" fill={rig.hairOrBeardHex} />
              </>
            )}

            {rig.hatStyle === 'lutenist' && (
              <>
                {/* Sera: Plumed Bardic Cap + Flowing Locks */}
                <path d="M24 27 L36 13 L72 17 L68 29 Z" fill={rig.cloakColorHex} />
                <path d="M64 15 L82 7 L76 21 Z" fill={rig.trimColorHex} />
                <rect x="26" y="29" width="6" height="26" fill={rig.hairOrBeardHex} />
                <rect x="64" y="29" width="6" height="26" fill={rig.hairOrBeardHex} />
              </>
            )}

            {rig.hatStyle === 'archivist' && (
              <>
                {/* Brother Corvus: Monastic Cowl + Silver Tonsure */}
                <path
                  d="M22 35 L30 12 L66 12 L74 35 L68 65 L28 65 Z"
                  fill={rig.cloakColorHex}
                  fillOpacity="0.45"
                />
                <rect x="28" y="19" width="40" height="10" fill={rig.cloakColorHex} />
                <rect x="34" y="27" width="28" height="3" fill={rig.trimColorHex} />
              </>
            )}

            {/* Reactive Eyebrows (neutral, happy, stern, thinking) */}
            <line
              x1="34"
              y1={leftBrowOuterY}
              x2="44"
              y2={leftBrowInnerY}
              stroke="#241E29"
              strokeWidth="2.6"
            />
            <line
              x1="52"
              y1={rightBrowInnerY}
              x2="62"
              y2={rightBrowOuterY}
              stroke="#241E29"
              strokeWidth="2.6"
            />

            {/* Reactive Eyes & Gaze Tracking */}
            <rect
              x="36"
              y={eyeTopY}
              width="6"
              height={effectiveEyeHeight}
              fill="#16131B"
            />
            <rect
              x="53"
              y={eyeTopY}
              width="6"
              height={effectiveEyeHeight}
              fill="#16131B"
            />

            {!isBlinking && (
              <>
                {/* Colored Iris & Specular Glint */}
                <rect
                  x={pupilXLeft}
                  y={pupilY}
                  width="3"
                  height="3"
                  fill={rig.eyeIrisHex}
                />
                <rect
                  x={pupilXRight}
                  y={pupilY}
                  width="3"
                  height="3"
                  fill={rig.eyeIrisHex}
                />
                <rect
                  x={pupilXLeft}
                  y={pupilY}
                  width="1.6"
                  height="1.6"
                  fill="#FFFDF9"
                />
                <rect
                  x={pupilXRight}
                  y={pupilY}
                  width="1.6"
                  height="1.6"
                  fill="#FFFDF9"
                />
              </>
            )}

            {/* Lower-Lid Happy Squint Crescents */}
            {activeFrame === 'happy' && !isBlinking && (
              <>
                <line
                  x1="36"
                  y1="45"
                  x2="42"
                  y2="44"
                  stroke={rig.skinShadowHex}
                  strokeWidth="1.5"
                />
                <line
                  x1="53"
                  y1="44"
                  x2="59"
                  y2="45"
                  stroke={rig.skinShadowHex}
                  strokeWidth="1.5"
                />
              </>
            )}

            {/* Reactive Mouth & Typewriter Viseme Articulation */}
            {isSpeaking && viseme !== 'closed' ? (
              <rect
                x={48 - mouthWidth / 2}
                y="52.5"
                width={mouthWidth}
                height={mouthOpenHeight}
                rx={viseme === 'round' ? 2 : 0}
                fill="#5E2B2E"
              />
            ) : frameParams.restingMouthStyle === 'smile' ? (
              <path
                d="M41 53 Q48 58.5 55 53"
                stroke="#5E2B2E"
                strokeWidth="2.5"
                fill="none"
              />
            ) : frameParams.restingMouthStyle === 'stern-line' ? (
              <path
                d="M41 55 Q48 52.5 55 55"
                stroke="#5E2B2E"
                strokeWidth="2.5"
                fill="none"
              />
            ) : frameParams.restingMouthStyle === 'pursed' ? (
              <rect x="45.5" y="53" width="6" height="2.8" fill="#5E2B2E" />
            ) : (
              <rect x="43" y="53.5" width="10" height="2" fill="#5E2B2E" />
            )}

            {/* Thinking Gesture Hand on Chin when in 'thinking' frame */}
            {activeFrame === 'thinking' && (
              <rect
                x="52"
                y="56"
                width="8"
                height="6"
                fill={rig.skinToneHex}
                stroke={rig.skinShadowHex}
                strokeWidth="1"
              />
            )}
          </g>
        </svg>

        {/* Top-Left Reactive Frame State Pill inside Portrait */}
        <span
          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono-tabular uppercase tracking-wider border ${frameParams.badgeColorClass}`}
        >
          {frameParams.shortLabel}
        </span>

        {/* Bottom-Right Live Syllable Viseme Pulse Indicator */}
        {isSpeaking && (
          <span
            className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-amber-500/40 text-[9px] font-mono-tabular text-amber-300 flex items-center gap-1"
            title={`Active Typewriter Viseme: ${viseme}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>{viseme.toUpperCase()}</span>
          </span>
        )}
      </div>

      {/* Interactive 4-Frame Selector Bar (neutral, happy, stern, thinking) */}
      {!compact && onSelectOverrideFrame && (
        <div
          className="grid grid-cols-4 gap-1 w-full max-w-[148px]"
          title="Character Portrait Engine: Click to test reactive frames (neutral, happy, stern, thinking)"
        >
          {REACTIVE_PORTRAIT_FRAMES.map((frameKey) => {
            const def = REACTIVE_FRAME_DEFINITIONS[frameKey];
            const isSelected = activeFrame === frameKey;
            const isManualOverride = overrideFrame === frameKey;
            return (
              <button
                key={frameKey}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectOverrideFrame(isManualOverride ? null : frameKey);
                }}
                className={`px-1 py-0.5 rounded text-[9px] font-mono-tabular text-center border transition-all ${
                  isSelected
                    ? `${def.badgeColorClass} font-semibold shadow-sm`
                    : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
                title={`Switch portrait to '${frameKey}' frame`}
              >
                {def.shortLabel.slice(0, 4)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DialogueAndCutsceneOverlay: React.FC<DialogueAndCutsceneOverlayProps> = ({
  telemetry,
  onPurchaseUpgrade,
  onGrantSoulEmbers,
  onCloseNpcDialog,
  onTriggerCutscene,
  onSkipCutscene,
}) => {
  const [memoryStore, setMemoryStore] = useState<CommunityMemoryStore>(() =>
    loadCommunityMemory()
  );
  const [currentNodeId, setCurrentNodeId] = useState<string>('intro');
  const [showUpgradeDrawer, setShowUpgradeDrawer] = useState<boolean>(false);
  const [revealedChars, setRevealedChars] = useState<number>(0);
  const [recentMemoryBanner, setRecentMemoryBanner] = useState<string | null>(null);
  const [overrideFrame, setOverrideFrame] = useState<ReactivePortraitFrame | null>(null);

  const activeDialog: NpcDialogState | null = telemetry.activeNpcDialog;
  const activeCutscene: ActiveCutsceneState | null = telemetry.activeCutscene;

  const citizenProfile: CitizenProfile | null = useMemo(() => {
    if (!activeDialog) return null;
    if (activeDialog.citizenId && VAELENPORT_CITIZENS[activeDialog.citizenId]) {
      return VAELENPORT_CITIZENS[activeDialog.citizenId];
    }
    return VAELENPORT_CITIZENS['master-vaelen'];
  }, [activeDialog]);

  // Reset dialogue node when opening a conversation with a citizen
  const lastNpcIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeDialog || !citizenProfile) {
      lastNpcIdRef.current = null;
      setShowUpgradeDrawer(false);
      setRecentMemoryBanner(null);
      setOverrideFrame(null);
      return;
    }
    if (lastNpcIdRef.current !== activeDialog.npcId) {
      lastNpcIdRef.current = activeDialog.npcId;
      const latestMem = loadCommunityMemory();
      const priorTalks = latestMem.talkCount[citizenProfile.id] || 0;
      const startNode =
        priorTalks > 0 ? citizenProfile.repeatRootNodeId : citizenProfile.defaultRootNodeId;

      latestMem.talkCount[citizenProfile.id] = priorTalks + 1;
      saveCommunityMemory(latestMem);
      setMemoryStore(latestMem);
      setCurrentNodeId(startNode);
      setShowUpgradeDrawer(false);
      setRevealedChars(0);
      setOverrideFrame(null);
    }
  }, [activeDialog, citizenProfile]);

  const currentNode = useMemo(() => {
    if (!citizenProfile) return null;
    return (
      citizenProfile.nodes[currentNodeId] ||
      citizenProfile.nodes[citizenProfile.defaultRootNodeId]
    );
  }, [citizenProfile, currentNodeId]);

  const resolvedLine = useMemo(() => {
    if (!currentNode) {
      return { text: '', expression: 'neutral' as PortraitExpression, usesMemoryFlag: false };
    }
    if (
      currentNode.memoryVariantText &&
      memoryStore.flags[currentNode.memoryVariantText.flag]
    ) {
      return {
        text: currentNode.memoryVariantText.text,
        expression: currentNode.memoryVariantText.expression || currentNode.expression,
        usesMemoryFlag: true,
      };
    }
    return {
      text: currentNode.text,
      expression: currentNode.expression,
      usesMemoryFlag: false,
    };
  }, [currentNode, memoryStore.flags]);

  // Typewriter reveal effect with character voice blips
  useEffect(() => {
    if (!activeDialog || !citizenProfile || !resolvedLine.text || showUpgradeDrawer) return;
    setRevealedChars(0);

    let charIdx = 0;
    const fullText = resolvedLine.text;
    const interval = window.setInterval(() => {
      charIdx += 1;
      setRevealedChars(charIdx);

      // Play voice blip every 3rd alphanumeric character
      const ch = fullText[charIdx - 1];
      if (charIdx % 3 === 1 && ch && /[a-zA-Z]/.test(ch)) {
        soundEngine.playVoiceBlip(citizenProfile.voicePitchHz, citizenProfile.voiceTimbre);
      }

      if (charIdx >= fullText.length) {
        window.clearInterval(interval);
      }
    }, 22);

    return () => window.clearInterval(interval);
  }, [activeDialog, citizenProfile, currentNodeId, resolvedLine.text, showUpgradeDrawer]);

  // Cutscene subtitle voice blip cue on keyframe change
  const lastCutsceneKeyRef = useRef<string>('');
  useEffect(() => {
    if (!activeCutscene) {
      lastCutsceneKeyRef.current = '';
      return;
    }
    const key = `${activeCutscene.id}_${activeCutscene.keyframeIndex}`;
    if (lastCutsceneKeyRef.current !== key) {
      lastCutsceneKeyRef.current = key;
      soundEngine.playCutsceneCue(activeCutscene.keyframeIndex === 0 ? 'start' : 'keyframe');
    }
  }, [activeCutscene]);

  // Allow Escape key to skip cutscene or close dialogue
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeCutscene) {
          onSkipCutscene();
        } else if (activeDialog) {
          onCloseNpcDialog();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCutscene, activeDialog, onCloseNpcDialog, onSkipCutscene]);

  const handleSelectChoice = (choice: DialogueChoiceOption) => {
    if (!citizenProfile) return;

    // If typewriter is still mid-sentence, clicking completes the line first
    if (revealedChars < resolvedLine.text.length) {
      setRevealedChars(resolvedLine.text.length);
      return;
    }

    const updated: CommunityMemoryStore = {
      flags: { ...memoryStore.flags },
      affinity: { ...memoryStore.affinity },
      talkCount: { ...memoryStore.talkCount },
    };

    if (choice.setsMemory) {
      updated.flags[choice.setsMemory] = true;
    }
    if (choice.affinityDelta) {
      updated.affinity[citizenProfile.id] = Math.min(
        5,
        (updated.affinity[citizenProfile.id] || 1) + choice.affinityDelta
      );
    }
    saveCommunityMemory(updated);
    setMemoryStore(updated);

    if (choice.memoryNotification) {
      setRecentMemoryBanner(choice.memoryNotification);
    } else {
      setRecentMemoryBanner(null);
    }

    if (choice.grantsEmbers && choice.grantsEmbers > 0) {
      onGrantSoulEmbers(choice.grantsEmbers);
      soundEngine.playEmberCollect();
    }

    // Clear manual portrait frame override when advancing to a new dialogue node
    setOverrideFrame(null);

    if (choice.triggersCutscene) {
      onCloseNpcDialog();
      onTriggerCutscene(choice.triggersCutscene);
      return;
    }

    if (choice.nextNodeId === 'END') {
      onCloseNpcDialog();
      return;
    }

    if (choice.nextNodeId === 'OPEN_UPGRADES') {
      setShowUpgradeDrawer(true);
      return;
    }

    setCurrentNodeId(choice.nextNodeId);
  };

  // ==========================================================================
  // 1. IN-ENGINE CUTSCENE DIRECTOR LETTERBOX OVERLAY
  // ==========================================================================
  if (activeCutscene) {
    const speakerCitizen =
      activeCutscene.speakerId && VAELENPORT_CITIZENS[activeCutscene.speakerId]
        ? VAELENPORT_CITIZENS[activeCutscene.speakerId]
        : null;

    return (
      <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between">
        {/* Top Letterbox Bar */}
        <div className="w-full h-16 bg-[#0B0B0E]/95 border-b border-zinc-800/80 px-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono-tabular">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>IN-ENGINE CUTSCENE</span>
            </span>
            <h2 className="font-display text-sm sm:text-base font-semibold text-zinc-100">
              {activeCutscene.title}
            </h2>
            <span className="text-xs font-mono-tabular text-zinc-400">
              Scene {activeCutscene.keyframeIndex + 1} of {activeCutscene.totalKeyframes}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkipCutscene}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
          >
            <span>Skip Cutscene (Esc)</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom Letterbox Narrative Caption Bar */}
        <div className="w-full bg-[#0B0B0E]/95 border-t border-zinc-800/80 px-6 py-4 pointer-events-auto">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            {speakerCitizen && (
              <div className="hidden sm:block">
                <CharacterPortraitEngine
                  npcId={`citizen-${speakerCitizen.id}`}
                  citizenId={speakerCitizen.id}
                  expression={activeCutscene.expression || 'happy'}
                  fullText={activeCutscene.subtitle}
                  revealedChars={Math.max(
                    1,
                    Math.floor(activeCutscene.progress * activeCutscene.subtitle.length)
                  )}
                  isSpeaking={true}
                  compact={true}
                />
              </div>
            )}

            <div className="flex-1 space-y-1.5">
              {activeCutscene.speakerName && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-300 tracking-wide uppercase">
                    {activeCutscene.speakerName}
                  </span>
                  {activeCutscene.speakerRole && (
                    <span className="text-[11px] font-mono-tabular text-zinc-400">
                      · {activeCutscene.speakerRole}
                    </span>
                  )}
                </div>
              )}

              <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-medium">
                “{activeCutscene.subtitle}”
              </p>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden pt-0.5">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${Math.round(activeCutscene.progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 2. EXPRESSIVE BRANCHING CHARACTER DIALOGUE BOX + PORTRAIT ENGINE
  // ==========================================================================
  if (!activeDialog || !citizenProfile || !currentNode) {
    return null;
  }

  const scheduleSlot = evaluateCitizenSchedule(citizenProfile, telemetry.dayCycleHour);
  const isTyping = revealedChars < resolvedLine.text.length;
  const displayedText = resolvedLine.text.slice(0, revealedChars);

  const activePortraitEval = evaluatePortraitEngineState({
    npcId: activeDialog.npcId,
    citizenId: activeDialog.citizenId || citizenProfile.id,
    expression: resolvedLine.expression,
    overrideFrame,
    fullText: resolvedLine.text,
    revealedChars,
    isSpeaking: isTyping,
    tickCount: 0,
  });

  const citizenAffinity = memoryStore.affinity[citizenProfile.id] || 1;

  const visibleChoices = currentNode.choices.filter((c) => {
    if (c.requiresMemory && !memoryStore.flags[c.requiresMemory]) return false;
    if (c.excludesMemory && memoryStore.flags[c.excludesMemory]) return false;
    return true;
  });

  const swordCost = telemetry.upgrades.swordLevel * 5;
  const lanternCost = telemetry.upgrades.lanternLevel * 5;
  const vitalityCost = telemetry.upgrades.vitalityLevel * 5;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl bg-[#141418]/96 text-zinc-100 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Citizen Identity & Reactive Portrait Frame Badge Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-zinc-900/90 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="font-display text-base font-semibold text-zinc-100">
                  {citizenProfile.name}
                </h2>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono-tabular rounded border ${activePortraitEval.frameParams.badgeColorClass}`}
                >
                  {activePortraitEval.frameParams.badgeLabel}
                </span>
              </div>
              <p className="text-[11px] font-mono-tabular text-amber-300/90">
                {citizenProfile.role} · {scheduleSlot.districtTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Citizen Affinity Hearts */}
            <div
              className="flex items-center gap-0.5 px-2 py-1 bg-zinc-950/90 border border-zinc-800 rounded-lg"
              title={`Community Affinity with ${citizenProfile.name}: ${citizenAffinity}/5`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3 h-3 ${
                    i < citizenAffinity
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono-tabular text-amber-300 font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{telemetry.soulEmbers} Embers</span>
            </div>

            <button
              type="button"
              onClick={onCloseNpcDialog}
              className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition-colors"
              title="Close Conversation (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Citizen Current Daily Schedule Activity Strip */}
        <div className="px-5 py-1.5 bg-[#101014] border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular text-zinc-400">
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>
              {telemetry.formattedClock} Routine: {scheduleSlot.activityLabel}
            </span>
          </span>

          {resolvedLine.usesMemoryFlag ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{citizenProfile.name} remembers your past actions</span>
            </span>
          ) : (
            <span className="text-zinc-400 truncate max-w-[260px]">
              {activePortraitEval.flavorNote}
            </span>
          )}
        </div>

        {/* Memory Updated Notification Toast */}
        {recentMemoryBanner && (
          <div className="px-5 py-1.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2 text-xs text-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{recentMemoryBanner}</span>
          </div>
        )}

        {/* Main Character Portrait Engine + Typewriter Speech Body */}
        {!showUpgradeDrawer ? (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Reactive Character Portrait Engine */}
              <CharacterPortraitEngine
                npcId={activeDialog.npcId}
                citizenId={activeDialog.citizenId || citizenProfile.id}
                expression={resolvedLine.expression}
                overrideFrame={overrideFrame}
                onSelectOverrideFrame={setOverrideFrame}
                fullText={resolvedLine.text}
                revealedChars={revealedChars}
                isSpeaking={isTyping}
              />

              {/* Typewriter Dialogue Box */}
              <div
                onClick={() => {
                  if (isTyping) setRevealedChars(resolvedLine.text.length);
                }}
                className="flex-1 w-full min-h-[118px] p-3.5 bg-zinc-900/80 border border-zinc-800/90 rounded-xl flex flex-col justify-between cursor-pointer"
                title={isTyping ? 'Click to complete text immediately' : undefined}
              >
                <p className="text-sm sm:text-[15px] text-zinc-100 leading-relaxed">
                  “{displayedText}”
                  {isTyping && (
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-amber-400 animate-pulse" />
                  )}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-zinc-800/60 text-[10px] font-mono-tabular text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Volume2 className="w-3 h-3 text-amber-400" />
                    <span>
                      Voice {citizenProfile.voicePitchHz}Hz ({citizenProfile.voiceTimbre}) · Frame:{' '}
                      <strong className="text-zinc-200 uppercase">
                        {activePortraitEval.activeFrame}
                      </strong>
                    </span>
                  </span>
                  <span>
                    {isTyping ? 'Click text to complete line' : 'Select a response below'}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Branching Dialogue Choices */}
            <div className="space-y-1.5">
              {visibleChoices.map((choice, idx) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handleSelectChoice(choice)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 text-xs sm:text-sm text-zinc-200 hover:text-amber-200 transition-colors flex items-center justify-between gap-2 group"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-zinc-950 border border-zinc-700 group-hover:border-amber-400 text-[11px] font-mono-tabular text-amber-400 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{choice.label}</span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {choice.triggersCutscene && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono-tabular text-amber-300">
                        Cutscene
                      </span>
                    )}
                    {choice.grantsEmbers && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono-tabular text-emerald-300">
                        +{choice.grantsEmbers} Embers
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Soul Ember Sanctuary Craft & Upgrade Drawer */
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-300">
                Channel harvested Soul Embers with{' '}
                <strong className="text-amber-300">{citizenProfile.name}</strong> to temper your
                Wayfarer gear:
              </p>
              <button
                type="button"
                onClick={() => setShowUpgradeDrawer(false)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
              >
                ← Back to Dialogue
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={telemetry.soulEmbers < swordCost}
                onClick={() => onPurchaseUpgrade('sword')}
                className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-colors ${
                  telemetry.soulEmbers >= swordCost
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-amber-500/40 text-zinc-100 cursor-pointer'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Swords className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-mono-tabular px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300">
                    Lv.{telemetry.upgrades.swordLevel}
                  </span>
                </div>
                <div className="text-xs font-semibold mb-0.5">Silver Broadsword</div>
                <div className="text-[11px] text-zinc-400 mb-2">+15 Cleave Damage & Reach</div>
                <div className="text-[11px] font-mono-tabular font-semibold text-amber-400">
                  Cost: {swordCost} Embers
                </div>
              </button>

              <button
                type="button"
                disabled={telemetry.soulEmbers < lanternCost}
                onClick={() => onPurchaseUpgrade('lantern')}
                className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-colors ${
                  telemetry.soulEmbers >= lanternCost
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-amber-500/40 text-zinc-100 cursor-pointer'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-mono-tabular px-1.5 py-0.5 rounded bg-zinc-950 text-amber-300">
                    Lv.{telemetry.upgrades.lanternLevel}
                  </span>
                </div>
                <div className="text-xs font-semibold mb-0.5">Starlight Lantern</div>
                <div className="text-[11px] text-zinc-400 mb-2">
                  +Radius & Ember Magnet Pull
                </div>
                <div className="text-[11px] font-mono-tabular font-semibold text-amber-400">
                  Cost: {lanternCost} Embers
                </div>
              </button>

              <button
                type="button"
                disabled={telemetry.soulEmbers < vitalityCost}
                onClick={() => onPurchaseUpgrade('vitality')}
                className={`flex flex-col justify-between p-3 rounded-xl border text-left transition-colors ${
                  telemetry.soulEmbers >= vitalityCost
                    ? 'bg-zinc-900 hover:bg-zinc-800 border-amber-500/40 text-zinc-100 cursor-pointer'
                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="text-[11px] font-mono-tabular px-1.5 py-0.5 rounded bg-zinc-950 text-rose-300">
                    Lv.{telemetry.upgrades.vitalityLevel}
                  </span>
                </div>
                <div className="text-xs font-semibold mb-0.5">Wayfarer Vitality</div>
                <div className="text-[11px] text-zinc-400 mb-2">
                  +25 Max HP & Full Restore
                </div>
                <div className="text-[11px] font-mono-tabular font-semibold text-amber-400">
                  Cost: {vitalityCost} Embers
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
