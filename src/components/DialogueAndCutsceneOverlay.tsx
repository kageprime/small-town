import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkCheck,
  Clock,
  Film,
  Flame,
  Heart,
  MapPin,
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
import { soundEngine } from '../scene/soundEngine';

interface DialogueAndCutsceneOverlayProps {
  telemetry: PlayerTelemetry;
  onPurchaseUpgrade: (kind: 'sword' | 'lantern' | 'vitality') => void;
  onGrantSoulEmbers: (amount: number) => void;
  onCloseNpcDialog: () => void;
  onTriggerCutscene: (id: CutsceneId) => void;
  onSkipCutscene: () => void;
}

const EXPRESSION_BADGE: Record<
  PortraitExpression,
  { label: string; colorClass: string }
> = {
  neutral: { label: 'Composed', colorClass: 'text-zinc-300 border-zinc-700 bg-zinc-900/90' },
  warm: { label: 'Warm & Welcoming', colorClass: 'text-amber-300 border-amber-500/40 bg-amber-950/60' },
  thoughtful: {
    label: 'Contemplative',
    colorClass: 'text-sky-300 border-sky-500/40 bg-sky-950/60',
  },
  surprised: {
    label: 'Inspired',
    colorClass: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/60',
  },
  solemn: {
    label: 'Solemn',
    colorClass: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/60',
  },
};

const CitizenPortraitSvg: React.FC<{
  citizen: CitizenProfile;
  expression: PortraitExpression;
  isSpeaking: boolean;
}> = ({ citizen, expression, isSpeaking }) => {
  const browTilt =
    expression === 'solemn'
      ? 3
      : expression === 'surprised'
        ? -3
        : expression === 'thoughtful'
          ? -1.5
          : 0;
  const eyeHeight = expression === 'surprised' ? 6 : expression === 'warm' ? 4 : 5;
  const mouthOpen = isSpeaking ? 4.5 : expression === 'surprised' ? 3.5 : 1.5;

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-amber-500/40 bg-[#14131A] shadow-inner shrink-0">
      <svg
        viewBox="0 0 96 96"
        className="w-full h-full"
        shapeRendering="crispEdges"
      >
        {/* Subtle Architectural Background Arch */}
        <rect x="0" y="0" width="96" height="96" fill="#171620" />
        <circle cx="48" cy="48" r="38" fill={citizen.cloakColorHex} fillOpacity="0.22" />
        <rect x="8" y="8" width="80" height="80" fill="none" stroke={citizen.trimColorHex} strokeWidth="1.5" strokeOpacity="0.35" />

        {/* Shoulders & Mantle */}
        <path
          d="M16 96 L22 66 L74 66 L80 96 Z"
          fill={citizen.cloakColorHex}
        />
        <rect x="34" y="66" width="28" height="30" fill="#23212B" />
        {/* Brass Collar Trim */}
        <rect x="26" y="66" width="44" height="5" fill={citizen.trimColorHex} />

        {/* Neck & Sculpted Head */}
        <rect x="41" y="56" width="14" height="12" fill="#D9B391" />
        <rect x="30" y="30" width="36" height="30" fill="#E6C3A3" />
        {/* Cheek Shading */}
        <rect x="30" y="46" width="6" height="10" fill="#CFA482" />
        <rect x="60" y="46" width="6" height="10" fill="#CFA482" />

        {/* Distinct Headgear / Hair per Citizen */}
        {citizen.hatStyle === 'clockmaker' && (
          <>
            {/* Master Vaelen: Clockmaker Velvet Beret + Brass Loupe */}
            <rect x="24" y="18" width="48" height="12" fill={citizen.cloakColorHex} />
            <rect x="28" y="28" width="40" height="4" fill={citizen.trimColorHex} />
            {/* White Side-Beard & Mustache */}
            <rect x="30" y="50" width="8" height="12" fill="#D8D6DF" />
            <rect x="58" y="50" width="8" height="12" fill="#D8D6DF" />
            <rect x="38" y="51" width="20" height="4" fill="#D8D6DF" />
            {/* Brass Spectacle Monocle */}
            <rect x="50" y="37" width="12" height="10" fill="none" stroke="#F59E0B" strokeWidth="2" />
          </>
        )}

        {citizen.hatStyle === 'botanist' && (
          <>
            {/* Isolde: Woven Herbalist Hood + Silver-Fern Sprig */}
            <path d="M24 34 L32 14 L64 14 L72 34 Z" fill={citizen.cloakColorHex} />
            <rect x="26" y="30" width="8" height="24" fill="#3B2720" />
            <rect x="62" y="30" width="8" height="24" fill="#3B2720" />
            <rect x="60" y="20" width="10" height="5" fill="#6EE7B7" />
          </>
        )}

        {citizen.hatStyle === 'dockmaster' && (
          <>
            {/* Oswin: Weathered Sou'wester Oilskin Cap + Sea-Salt Beard */}
            <path d="M18 30 L30 16 L66 16 L78 30 Z" fill={citizen.cloakColorHex} />
            <rect x="22" y="28" width="52" height="4" fill={citizen.trimColorHex} />
            <rect x="32" y="50" width="32" height="12" fill="#4B4852" />
          </>
        )}

        {citizen.hatStyle === 'lutenist' && (
          <>
            {/* Sera: Plumed Bardic Cap + Flowing Locks */}
            <path d="M24 28 L36 14 L72 18 L68 30 Z" fill={citizen.cloakColorHex} />
            <path d="M64 16 L82 8 L76 22 Z" fill={citizen.trimColorHex} />
            <rect x="26" y="30" width="6" height="26" fill="#5A2D28" />
            <rect x="64" y="30" width="6" height="26" fill="#5A2D28" />
          </>
        )}

        {citizen.hatStyle === 'archivist' && (
          <>
            {/* Brother Corvus: Monastic Cowl + Silver Tonsure */}
            <path d="M22 36 L30 12 L66 12 L74 36 L68 66 L28 66 Z" fill={citizen.cloakColorHex} fillOpacity="0.45" />
            <rect x="28" y="20" width="40" height="10" fill={citizen.cloakColorHex} />
            <rect x="34" y="28" width="28" height="3" fill={citizen.trimColorHex} />
          </>
        )}

        {/* Expressive Eyebrows */}
        <line
          x1="35"
          y1={36 + browTilt}
          x2="44"
          y2={36 - browTilt}
          stroke="#2A242E"
          strokeWidth="2.5"
        />
        <line
          x1="52"
          y1={36 - browTilt}
          x2="61"
          y2={36 + browTilt}
          stroke="#2A242E"
          strokeWidth="2.5"
        />

        {/* Eyes */}
        <rect x="37" y="40" width="5" height={eyeHeight} fill="#18151C" />
        <rect x="54" y="40" width="5" height={eyeHeight} fill="#18151C" />
        <rect x="38" y="40" width="2" height="2" fill="#FFFDF9" />
        <rect x="55" y="40" width="2" height="2" fill="#FFFDF9" />

        {/* Animated Speaking Mouth */}
        {expression === 'warm' && !isSpeaking ? (
          <path d="M42 54 Q48 58 54 54" stroke="#6E3B3B" strokeWidth="2.5" fill="none" />
        ) : (
          <rect
            x="44"
            y="53"
            width="8"
            height={mouthOpen}
            fill="#6E3B3B"
          />
        )}
      </svg>

      {/* Subtle Corner Affinity / Active Voice Pulse */}
      {isSpeaking && (
        <span className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
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
              <div className="hidden sm:block scale-90 origin-left">
                <CitizenPortraitSvg
                  citizen={speakerCitizen}
                  expression={activeCutscene.expression || 'warm'}
                  isSpeaking={true}
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
  // 2. EXPRESSIVE BRANCHING CHARACTER DIALOGUE BOX
  // ==========================================================================
  if (!activeDialog || !citizenProfile || !currentNode) {
    return null;
  }

  const scheduleSlot = evaluateCitizenSchedule(citizenProfile, telemetry.dayCycleHour);
  const isTyping = revealedChars < resolvedLine.text.length;
  const displayedText = resolvedLine.text.slice(0, revealedChars);
  const expBadge = EXPRESSION_BADGE[resolvedLine.expression];
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
        {/* Top Citizen Identity & Daily Routine Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-zinc-900/90 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-semibold text-zinc-100">
                  {citizenProfile.name}
                </h2>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono-tabular rounded border ${expBadge.colorClass}`}
                >
                  {expBadge.label}
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

          {resolvedLine.usesMemoryFlag && (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{citizenProfile.name} remembers your past actions</span>
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

        {/* Main Portrait + Typewriter Speech Body */}
        {!showUpgradeDrawer ? (
          <div className="p-5 space-y-4">
            <div
              onClick={() => {
                if (isTyping) setRevealedChars(resolvedLine.text.length);
              }}
              className="flex flex-col sm:flex-row items-start gap-4 cursor-pointer"
              title={isTyping ? 'Click to complete text immediately' : undefined}
            >
              <CitizenPortraitSvg
                citizen={citizenProfile}
                expression={resolvedLine.expression}
                isSpeaking={isTyping}
              />

              <div className="flex-1 min-h-[84px] p-3.5 bg-zinc-900/80 border border-zinc-800/90 rounded-xl flex flex-col justify-between">
                <p className="text-sm sm:text-[15px] text-zinc-100 leading-relaxed">
                  “{displayedText}”
                  {isTyping && (
                    <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-amber-400 animate-pulse" />
                  )}
                </p>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/60 text-[10px] font-mono-tabular text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-amber-400" />
                    <span>Voice Pitch {citizenProfile.voicePitchHz}Hz ({citizenProfile.voiceTimbre})</span>
                  </span>
                  <span>
                    {isTyping ? 'Click box to skip typing' : 'Choose your response below'}
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
