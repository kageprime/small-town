import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Flame,
  Heart,
  Sparkles,
  Sun,
  Swords,
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
  loadCommunityMemory,
  saveCommunityMemory,
  VAELENPORT_CITIZENS,
} from '../scene/dialogueAndCutscenes';
import {
  ComputedPortraitFrameState,
  evaluatePortraitEngineState,
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
 * and renders crisp, pixel-aligned SVG portraits with syllable-synced visemes and eye blinks.
 */
export const CharacterPortraitEngine: React.FC<CharacterPortraitEngineProps> = ({
  npcId,
  citizenId,
  expression,
  overrideFrame = null,
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
    <div className="shrink-0 select-none">
      <div
        className={`relative ${
          compact ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-24 h-24 sm:w-28 sm:h-28'
        } overflow-hidden border border-[#C8B273] bg-[#14120F] shadow-[inset_0_0_0_1px_rgba(200,178,115,0.22)] transition-colors duration-300`}
      >
        <svg
          viewBox="0 0 96 96"
          className="w-full h-full block"
          shapeRendering="crispEdges"
        >
          {/* Architectural Backdrop & Frame-Reactive Aura */}
          <rect x="0" y="0" width="96" height="96" fill={rig.backdropArchHex} />
          <circle
            cx="48"
            cy="48"
            r="39"
            fill={frameParams.auraGlowHex}
            fillOpacity={activeFrame === 'happy' ? '0.22' : '0.14'}
          />
          <rect
            x="4"
            y="4"
            width="88"
            height="88"
            fill="none"
            stroke={rig.trimColorHex}
            strokeWidth="1"
            strokeOpacity="0.32"
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
              <path
                d="M9 18 L9 9 L18 9"
                stroke="#F43F5E"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M87 18 L87 9 L78 9"
                stroke="#F43F5E"
                strokeWidth="2"
                fill="none"
              />
            </>
          )}

          {frameParams.ambientMotif === 'thought-glyphs' && (
            <>
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

          {/* Shoulders & Mantle */}
          <g transform={`translate(0, ${frameParams.shoulderLiftY})`}>
            <path
              d="M15 96 L22 65 L74 65 L81 96 Z"
              fill={rig.cloakColorHex}
            />
            <rect x="34" y="65" width="28" height="31" fill="#1F1D29" />
            <rect x="25" y="65" width="46" height="5" fill={rig.trimColorHex} />
            <rect x="44" y="72" width="8" height="8" fill={rig.trimColorHex} fillOpacity="0.7" />
          </g>

          {/* Character Head Group */}
          <g
            transform={`translate(0, ${speakingBobY}) rotate(${frameParams.headTiltDeg}, 48, 46)`}
          >
            {/* Neck & Sculpted Head */}
            <rect x="41" y="55" width="14" height="12" fill={rig.skinShadowHex} />
            <rect x="30" y="29" width="36" height="30" fill={rig.skinToneHex} />
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
                <rect x="24" y="17" width="48" height="12" fill={rig.cloakColorHex} />
                <rect x="28" y="27" width="40" height="4" fill={rig.trimColorHex} />
                <rect x="30" y="50" width="8" height="12" fill={rig.hairOrBeardHex} />
                <rect x="58" y="50" width="8" height="12" fill={rig.hairOrBeardHex} />
                <rect x="38" y="50" width="20" height="4" fill={rig.hairOrBeardHex} />
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
                <path d="M24 33 L32 13 L64 13 L72 33 Z" fill={rig.cloakColorHex} />
                <rect x="26" y="29" width="7" height="25" fill={rig.hairOrBeardHex} />
                <rect x="63" y="29" width="7" height="25" fill={rig.hairOrBeardHex} />
                <rect x="59" y="19" width="11" height="5" fill="#6EE7B7" />
              </>
            )}

            {rig.hatStyle === 'dockmaster' && (
              <>
                <path d="M18 29 L30 15 L66 15 L78 29 Z" fill={rig.cloakColorHex} />
                <rect x="22" y="27" width="52" height="4" fill={rig.trimColorHex} />
                <rect x="32" y="50" width="32" height="12" fill={rig.hairOrBeardHex} />
              </>
            )}

            {rig.hatStyle === 'lutenist' && (
              <>
                <path d="M24 27 L36 13 L72 17 L68 29 Z" fill={rig.cloakColorHex} />
                <path d="M64 15 L82 7 L76 21 Z" fill={rig.trimColorHex} />
                <rect x="26" y="29" width="6" height="26" fill={rig.hairOrBeardHex} />
                <rect x="64" y="29" width="6" height="26" fill={rig.hairOrBeardHex} />
              </>
            )}

            {rig.hatStyle === 'archivist' && (
              <>
                <path
                  d="M22 35 L30 12 L66 12 L74 35 L68 65 L28 65 Z"
                  fill={rig.cloakColorHex}
                  fillOpacity="0.45"
                />
                <rect x="28" y="19" width="40" height="10" fill={rig.cloakColorHex} />
                <rect x="34" y="27" width="28" height="3" fill={rig.trimColorHex} />
              </>
            )}

            {/* Reactive Eyebrows */}
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
      </div>
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
  const [isLineComplete, setIsLineComplete] = useState<boolean>(false);
  const [recentMemoryBanner, setRecentMemoryBanner] = useState<string | null>(null);

  const typewriterTimerRef = useRef<number | null>(null);
  const charIndexRef = useRef<number>(0);
  const activeLineSignatureRef = useRef<string>('');
  const completedLineSignatureRef = useRef<string>('');

  const stopTypewriterTimer = () => {
    if (typewriterTimerRef.current !== null) {
      window.clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
  };

  const activeDialog: NpcDialogState | null = telemetry.activeNpcDialog;
  const activeNpcId: string | null = activeDialog?.npcId ?? null;
  const activeCitizenId: CitizenId | null = activeDialog?.citizenId ?? null;
  const activeCutscene: ActiveCutsceneState | null = telemetry.activeCutscene;

  const citizenProfile: CitizenProfile | null = useMemo(() => {
    if (!activeNpcId) return null;
    if (activeCitizenId && VAELENPORT_CITIZENS[activeCitizenId]) {
      return VAELENPORT_CITIZENS[activeCitizenId];
    }
    return VAELENPORT_CITIZENS['master-vaelen'];
  }, [activeNpcId, activeCitizenId]);

  // Reset dialogue node when opening a conversation with a citizen
  const lastNpcIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeNpcId || !citizenProfile) {
      stopTypewriterTimer();
      lastNpcIdRef.current = null;
      activeLineSignatureRef.current = '';
      completedLineSignatureRef.current = '';
      charIndexRef.current = 0;
      setRevealedChars(0);
      setIsLineComplete(false);
      setShowUpgradeDrawer(false);
      setRecentMemoryBanner(null);
      return;
    }
    if (lastNpcIdRef.current !== activeNpcId) {
      stopTypewriterTimer();
      lastNpcIdRef.current = activeNpcId;
      activeLineSignatureRef.current = '';
      completedLineSignatureRef.current = '';
      charIndexRef.current = 0;

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
      setIsLineComplete(false);
    }
  }, [activeNpcId, citizenProfile]);

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

  const lineSignature = useMemo(() => {
    if (!activeNpcId || !citizenProfile || !resolvedLine.text || showUpgradeDrawer) {
      return '';
    }
    return `${activeNpcId}::${currentNodeId}::${resolvedLine.text}`;
  }, [activeNpcId, citizenProfile, currentNodeId, resolvedLine.text, showUpgradeDrawer]);

  const completeCurrentLineImmediately = () => {
    stopTypewriterTimer();
    const fullLength = resolvedLine.text.length;
    charIndexRef.current = fullLength;
    if (lineSignature) {
      completedLineSignatureRef.current = lineSignature;
    }
    setRevealedChars(fullLength);
    setIsLineComplete(true);
  };

  // Typewriter reveal effect with explicit completion detection & ref-guard against loop resets
  useEffect(() => {
    if (!lineSignature || !citizenProfile || !resolvedLine.text) {
      stopTypewriterTimer();
      return;
    }

    const fullText = resolvedLine.text;

    if (completedLineSignatureRef.current === lineSignature) {
      stopTypewriterTimer();
      charIndexRef.current = fullText.length;
      setRevealedChars(fullText.length);
      setIsLineComplete(true);
      return;
    }

    stopTypewriterTimer();
    activeLineSignatureRef.current = lineSignature;
    charIndexRef.current = 0;
    setRevealedChars(0);
    setIsLineComplete(false);

    const pitchHz = citizenProfile.voicePitchHz;
    const timbre = citizenProfile.voiceTimbre;

    const timerId = window.setInterval(() => {
      const nextIdx = Math.min(fullText.length, charIndexRef.current + 1);
      charIndexRef.current = nextIdx;
      setRevealedChars(nextIdx);

      const ch = fullText[nextIdx - 1];
      if (nextIdx < fullText.length && nextIdx % 3 === 1 && ch && /[a-zA-Z]/.test(ch)) {
        soundEngine.playVoiceBlip(pitchHz, timbre);
      }

      if (nextIdx >= fullText.length) {
        window.clearInterval(timerId);
        if (typewriterTimerRef.current === timerId) {
          typewriterTimerRef.current = null;
        }
        completedLineSignatureRef.current = lineSignature;
        setIsLineComplete(true);
      }
    }, 22);

    typewriterTimerRef.current = timerId;

    return () => {
      window.clearInterval(timerId);
      if (typewriterTimerRef.current === timerId) {
        typewriterTimerRef.current = null;
      }
    };
  }, [lineSignature, citizenProfile, resolvedLine.text]);

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

  const visibleChoices = useMemo(() => {
    if (!currentNode) return [];
    return currentNode.choices.filter((c) => {
      if (c.requiresMemory && !memoryStore.flags[c.requiresMemory]) return false;
      if (c.excludesMemory && memoryStore.flags[c.excludesMemory]) return false;
      return true;
    });
  }, [currentNode, memoryStore.flags]);

  const handleSelectChoice = (choice: DialogueChoiceOption) => {
    if (!citizenProfile) return;

    if (!isLineComplete && revealedChars < resolvedLine.text.length) {
      completeCurrentLineImmediately();
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

  // Allow Escape to close/skip, Space/Enter to complete typing, and 1-4 keys to pick choices
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeCutscene) {
          onSkipCutscene();
        } else if (activeDialog) {
          onCloseNpcDialog();
        }
        return;
      }

      if (!activeDialog || showUpgradeDrawer) return;

      if (e.key === ' ' || e.key === 'Enter') {
        if (!isLineComplete && revealedChars < resolvedLine.text.length) {
          e.preventDefault();
          completeCurrentLineImmediately();
        }
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= visibleChoices.length) {
        e.preventDefault();
        handleSelectChoice(visibleChoices[num - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ==========================================================================
  // 1. CLASSICAL CODEX CUTSCENE LETTERBOX
  // ==========================================================================
  if (activeCutscene) {
    const speakerCitizen =
      activeCutscene.speakerId && VAELENPORT_CITIZENS[activeCutscene.speakerId]
        ? VAELENPORT_CITIZENS[activeCutscene.speakerId]
        : null;

    return (
      <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between">
        {/* Top Classical Cinema Bar */}
        <div className="w-full h-12 bg-[#0B0A08]/95 border-b border-[#3A3327] px-6 sm:px-10 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] text-[#C8B273]">◆</span>
            <span className="font-display text-xs sm:text-sm tracking-[0.2em] uppercase text-[#EFE7D6]">
              {activeCutscene.title}
            </span>
          </div>

          <button
            type="button"
            onClick={onSkipCutscene}
            className="inline-flex items-center gap-1.5 text-xs text-[#9E937E] hover:text-[#C8B273] transition-colors whitespace-nowrap shrink-0"
          >
            <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular bg-[#1C1914] border border-[#4A4132] text-[#C8B273]">
              Esc
            </span>
            <span>Skip</span>
          </button>
        </div>

        {/* Bottom Classical Codex Dialogue Window in Letterbox */}
        <div className="w-full bg-[#0B0A08]/95 border-t border-[#C8B273]/60 px-6 py-5 pointer-events-auto">
          <div className="max-w-2xl mx-auto flex items-center gap-5">
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
                  isSpeaking={activeCutscene.progress < 0.96}
                  compact={true}
                />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1.5">
              {activeCutscene.speakerName && (
                <div className="font-display text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase text-[#C8B273] flex items-center gap-2">
                  <span className="text-[8px]">◆</span>
                  <span>{activeCutscene.speakerName}</span>
                </div>
              )}

              <p className="text-sm sm:text-base text-[#EFE7D6] leading-[1.7] tracking-[0.015em]">
                “{activeCutscene.subtitle}”
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 2. MINIMALIST CLASSIC JRPG TEXTBOX OVERLAY
  // ==========================================================================
  if (!activeDialog || !citizenProfile || !currentNode) {
    return null;
  }

  const isTyping = !isLineComplete && revealedChars < resolvedLine.text.length;
  const displayedText = isLineComplete
    ? resolvedLine.text
    : resolvedLine.text.slice(0, revealedChars);

  const citizenAffinity = memoryStore.affinity[citizenProfile.id] || 1;

  const swordCost = telemetry.upgrades.swordLevel * 5;
  const lanternCost = telemetry.upgrades.lanternLevel * 5;
  const vitalityCost = telemetry.upgrades.vitalityLevel * 5;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="relative pointer-events-auto w-full max-w-2xl">
        {/* Docked Classical Codex Speaker Nameplate Tab */}
        <div className="flex items-center justify-between mb-[-1px] relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#0B0A08] border border-b-0 border-[#C8B273]">
            <span className="text-[9px] text-[#C8B273]">◆</span>
            <span className="font-display text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-[#EFE7D6]">
              {citizenProfile.name}
            </span>
            <span className="text-[11px] text-[#9E937E] hidden sm:inline">
              · {citizenProfile.role}
            </span>
            <div
              className="flex items-center gap-1 pl-1"
              title={`Sanctuary Affinity: ${citizenAffinity}/5`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`text-[8px] ${
                    i < citizenAffinity ? 'text-[#C8B273]' : 'text-[#3A3327]'
                  }`}
                >
                  ◆
                </span>
              ))}
            </div>
          </div>

          {/* Classical Codex Esc Keycap Button */}
          <button
            type="button"
            onClick={onCloseNpcDialog}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#9E937E] hover:text-[#EFE7D6] bg-[#0B0A08] border border-b-0 border-[#3A3327] transition-colors"
            title="Close Conversation (Esc)"
          >
            <span className="px-1 py-0.2 text-[10px] font-mono-tabular bg-[#1C1914] border border-[#4A4132] text-[#C8B273]">
              Esc
            </span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Classical Dark-Fantasy Codex Dialogue Box */}
        <div className="bg-[#0B0A08]/95 backdrop-blur-md text-[#D8D0C1] border border-[#C8B273] shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(200,178,115,0.22)] px-5 py-5 sm:px-7 sm:py-6">
          {/* Subtle Chronicle Memory Whisper if triggered */}
          {recentMemoryBanner && (
            <div className="mb-3 pb-2 border-b border-[#3A3327] flex items-center gap-2 text-xs text-[#C8B273] italic">
              <Sparkles className="w-3.5 h-3.5 text-[#C8B273] shrink-0" />
              <span>{recentMemoryBanner}</span>
            </div>
          )}

          {!showUpgradeDrawer ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
              {/* Crisp Pixel Portrait in Codex Plate */}
              <CharacterPortraitEngine
                npcId={activeDialog.npcId}
                citizenId={activeDialog.citizenId || citizenProfile.id}
                expression={resolvedLine.expression}
                fullText={resolvedLine.text}
                revealedChars={isLineComplete ? resolvedLine.text.length : revealedChars}
                isSpeaking={isTyping}
              />

              {/* Right Column: Spoken Line + Classical Codex Choices */}
              <div className="flex-1 w-full min-w-0 flex flex-col justify-between">
                {/* Spoken Typewriter Text */}
                <div
                  onClick={() => {
                    if (isTyping) completeCurrentLineImmediately();
                  }}
                  className="min-h-[68px] cursor-pointer select-text"
                >
                  <p className="text-[15px] sm:text-base text-[#EFE7D6] leading-[1.75] tracking-[0.015em] font-normal">
                    “{displayedText}”
                    {isTyping ? (
                      <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-[#C8B273] animate-pulse" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="inline-block ml-1.5 text-xs text-[#C8B273] animate-bounce"
                      >
                        ▾
                      </span>
                    )}
                  </p>
                </div>

                {/* Classical Codex Dialogue Choices with Gold Diamond Selection */}
                <div className="mt-4 pt-3 border-t border-[#2A251D] space-y-1">
                  {visibleChoices.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleSelectChoice(choice)}
                      className="w-full text-left py-1.5 px-2.5 border border-transparent hover:border-[#C8B273] hover:bg-[#1B1813]/95 text-xs sm:text-sm text-[#B8B0A0] hover:text-[#F5EEDF] transition-all flex items-center justify-between gap-3 group"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[9px] text-[#C8B273] opacity-45 group-hover:opacity-100 transition-opacity shrink-0">
                          ◆
                        </span>
                        <span className="leading-snug">{choice.label}</span>
                      </span>

                      {(choice.triggersCutscene || choice.grantsEmbers) && (
                        <span className="text-[10px] font-display tracking-[0.14em] uppercase text-[#C8B273] shrink-0">
                          {choice.grantsEmbers ? `+${choice.grantsEmbers} Embers` : 'Chronicle'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Sanctuary Tempering Sub-Pane in Matching Codex Frame */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#3A3327]">
                <span className="font-display text-xs sm:text-sm font-semibold text-[#EFE7D6] tracking-[0.18em] uppercase">
                  SANCTUARY TEMPERING LEDGER
                </span>
                <div className="flex items-center gap-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono-tabular text-[#EFE7D6]">
                    <Flame className="w-3.5 h-3.5 text-[#C8B273]" />
                    <span>{telemetry.soulEmbers} Embers</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUpgradeDrawer(false)}
                    className="text-xs font-display tracking-wider uppercase text-[#9E937E] hover:text-[#C8B273] transition-colors"
                  >
                    ← Return
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={telemetry.soulEmbers < swordCost}
                  onClick={() => onPurchaseUpgrade('sword')}
                  className={`flex flex-col justify-between p-3.5 border text-left transition-colors ${
                    telemetry.soulEmbers >= swordCost
                      ? 'bg-[#161410] hover:bg-[#1E1A14] border-[#4A4132] hover:border-[#C8B273] text-[#EFE7D6] cursor-pointer'
                      : 'bg-[#110F0C] border-[#26221B] text-[#6E6658] cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-[#12100D] border border-[#3A3328] flex items-center justify-center">
                      <Swords className="w-4 h-4 text-[#C8B273]" />
                    </div>
                    <span className="text-[11px] font-mono-tabular text-[#C8B273]">
                      Rank {telemetry.upgrades.swordLevel}
                    </span>
                  </div>
                  <div className="font-display text-xs tracking-wider uppercase mb-0.5">
                    Silver Broadsword
                  </div>
                  <div className="text-[11px] text-[#9E937E] mb-2.5">+15 Cleave Damage</div>
                  <div className="text-[11px] font-mono-tabular text-[#C8B273] pt-1.5 border-t border-[#2A251D]">
                    Cost: {swordCost} Embers
                  </div>
                </button>

                <button
                  type="button"
                  disabled={telemetry.soulEmbers < lanternCost}
                  onClick={() => onPurchaseUpgrade('lantern')}
                  className={`flex flex-col justify-between p-3.5 border text-left transition-colors ${
                    telemetry.soulEmbers >= lanternCost
                      ? 'bg-[#161410] hover:bg-[#1E1A14] border-[#4A4132] hover:border-[#C8B273] text-[#EFE7D6] cursor-pointer'
                      : 'bg-[#110F0C] border-[#26221B] text-[#6E6658] cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-[#12100D] border border-[#3A3328] flex items-center justify-center">
                      <Sun className="w-4 h-4 text-[#C8B273]" />
                    </div>
                    <span className="text-[11px] font-mono-tabular text-[#C8B273]">
                      Rank {telemetry.upgrades.lanternLevel}
                    </span>
                  </div>
                  <div className="font-display text-xs tracking-wider uppercase mb-0.5">
                    Starlight Lantern
                  </div>
                  <div className="text-[11px] text-[#9E937E] mb-2.5">+Radius & Ember Draw</div>
                  <div className="text-[11px] font-mono-tabular text-[#C8B273] pt-1.5 border-t border-[#2A251D]">
                    Cost: {lanternCost} Embers
                  </div>
                </button>

                <button
                  type="button"
                  disabled={telemetry.soulEmbers < vitalityCost}
                  onClick={() => onPurchaseUpgrade('vitality')}
                  className={`flex flex-col justify-between p-3.5 border text-left transition-colors ${
                    telemetry.soulEmbers >= vitalityCost
                      ? 'bg-[#161410] hover:bg-[#1E1A14] border-[#4A4132] hover:border-[#C8B273] text-[#EFE7D6] cursor-pointer'
                      : 'bg-[#110F0C] border-[#26221B] text-[#6E6658] cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 bg-[#12100D] border border-[#3A3328] flex items-center justify-center">
                      <Heart className="w-4 h-4 text-[#B83B32]" />
                    </div>
                    <span className="text-[11px] font-mono-tabular text-[#C8B273]">
                      Rank {telemetry.upgrades.vitalityLevel}
                    </span>
                  </div>
                  <div className="font-display text-xs tracking-wider uppercase mb-0.5">
                    Wayfarer Vitality
                  </div>
                  <div className="text-[11px] text-[#9E937E] mb-2.5">+25 Max HP & Restore</div>
                  <div className="text-[11px] font-mono-tabular text-[#C8B273] pt-1.5 border-t border-[#2A251D]">
                    Cost: {vitalityCost} Embers
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
