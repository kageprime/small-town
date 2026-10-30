import {
  CameraZoomPreset,
  CitizenId,
  CutsceneId,
  PortraitExpression,
  TimeOfDayPreset,
} from '../types/vignette';

export type VoiceTimbre =
  | 'bellwright'
  | 'botanist'
  | 'dockmaster'
  | 'lutenist'
  | 'archivist';

export interface CitizenScheduleSlot {
  startHour: number; // 0..24 inclusive
  endHour: number;
  x: number;
  z: number;
  facingAngle: number;
  districtTitle: string;
  activityLabel: string;
}

export interface DialogueChoiceOption {
  id: string;
  label: string;
  nextNodeId: string | 'END' | 'OPEN_UPGRADES';
  requiresMemory?: string;
  excludesMemory?: string;
  setsMemory?: string;
  memoryNotification?: string;
  affinityDelta?: number;
  grantsEmbers?: number;
  triggersCutscene?: CutsceneId;
}

export interface DialogueNode {
  id: string;
  expression: PortraitExpression;
  text: string;
  memoryVariantText?: {
    flag: string;
    text: string;
    expression?: PortraitExpression;
  };
  choices: DialogueChoiceOption[];
}

export interface CitizenProfile {
  id: CitizenId;
  name: string;
  role: string;
  homeDistrict: string;
  voicePitchHz: number;
  voiceTimbre: VoiceTimbre;
  cloakColorHex: string;
  trimColorHex: string;
  hatStyle: 'clockmaker' | 'botanist' | 'dockmaster' | 'lutenist' | 'archivist';
  defaultRootNodeId: string;
  repeatRootNodeId: string;
  schedule: CitizenScheduleSlot[];
  nodes: Record<string, DialogueNode>;
}

export interface CutsceneKeyframe {
  durationSec: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  zoom: CameraZoomPreset;
  yawIndex?: number;
  subtitle: string;
  speakerId?: CitizenId;
  speakerName?: string;
  speakerRole?: string;
  expression?: PortraitExpression;
  worldEvent?: 'ignite-plaza-lanterns' | 'open-canal-lock' | 'toll-cloister-bell';
  overrideHour?: number;
  overrideTimePreset?: TimeOfDayPreset;
}

export interface CutsceneDefinition {
  id: CutsceneId;
  title: string;
  tag: string;
  keyframes: CutsceneKeyframe[];
}

const STORAGE_KEY = 'nullspire_cinderfall_memory_v1';

export interface CommunityMemoryStore {
  flags: Record<string, boolean>;
  affinity: Record<CitizenId, number>;
  talkCount: Record<CitizenId, number>;
}

const DEFAULT_MEMORY_STORE: CommunityMemoryStore = {
  flags: {},
  affinity: {
    'master-vaelen': 2, // Old Beck
    isolde: 2, // Doc Sable
    oswin: 1, // Scout Lark
    sera: 1, // Broker Sera
    'brother-corvus': 1, // Auditor Voss
  },
  talkCount: {
    'master-vaelen': 0,
    isolde: 0,
    oswin: 0,
    sera: 0,
    'brother-corvus': 0,
  },
};

export function loadCommunityMemory(): CommunityMemoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_MEMORY_STORE);
    const parsed = JSON.parse(raw) as Partial<CommunityMemoryStore>;
    return {
      flags: { ...(parsed.flags || {}) },
      affinity: { ...DEFAULT_MEMORY_STORE.affinity, ...(parsed.affinity || {}) },
      talkCount: { ...DEFAULT_MEMORY_STORE.talkCount, ...(parsed.talkCount || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_MEMORY_STORE);
  }
}

export function saveCommunityMemory(store: CommunityMemoryStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors in sandboxed iframes
  }
}

export const VAELENPORT_CITIZENS: Record<CitizenId, CitizenProfile> = {
  'master-vaelen': {
    id: 'master-vaelen',
    name: 'Old Beck',
    role: 'Bearers Combine Manifest Keeper & Mentor',
    homeDistrict: 'The Hold (Terminus Hub)',
    voicePitchHz: 185,
    voiceTimbre: 'bellwright',
    cloakColorHex: '#282226',
    trimColorHex: '#e8a020',
    hatStyle: 'clockmaker',
    defaultRootNodeId: 'intro',
    repeatRootNodeId: 'return_visit',
    schedule: [
      {
        startHour: 6,
        endHour: 12,
        x: -1.8,
        z: -0.8,
        facingAngle: 0.75,
        districtTitle: 'The Hold — Manifest Desk & Core Scale',
        activityLabel: 'Weighing Floor Zero core-stone on the brass Combine scale',
      },
      {
        startHour: 12,
        endHour: 18,
        x: -7.5,
        z: -3.2,
        facingAngle: 1.57,
        districtTitle: 'The Hold Back-Room & Bunks',
        activityLabel: 'Updating the two Combine ledgers (the clean book and the oil book)',
      },
      {
        startHour: 18,
        endHour: 24,
        x: 1.8,
        z: 1.4,
        facingAngle: -0.65,
        districtTitle: 'The Crossing Shrine (The Hold)',
        activityLabel: 'Trimming lamp-oil wicks for porters who didn\'t make the gate',
      },
      {
        startHour: 0,
        endHour: 6,
        x: -8.2,
        z: -4.2,
        facingAngle: 0.0,
        districtTitle: 'The Hold — Cyan Echo Corner',
        activityLabel: 'Leaning on his crutch-spear while watching Bram\'s shadow',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'stern',
        text: 'You\'re dripping B13 black water on my manifest, Coffin. Gate pylon still reads you E-rank · 11 · Flat, which means Auditor Voss hasn\'t smelled what woke up behind your eyes. Keep it that way.',
        memoryVariantText: {
          flag: 'awakened_dusk_lanterns',
          expression: 'happy',
          text: 'You lit the Crossing Shrine lamps for Bram\'s squad. Eight thousand porters in the Combine, Joss, and not one of \'em forgets a kid who honors the oil book.',
        },
        choices: [
          {
            id: 'ask-city',
            label: 'Tell me about the two Combine books and Auditor Voss.',
            nextNodeId: 'city_lore',
            setsMemory: 'asked_vaelen_architecture',
            memoryNotification: 'Old Beck trusted you with the truth of the Combine\'s two ledgers.',
            affinityDelta: 1,
          },
          {
            id: 'trigger-dusk-cutscene',
            label: 'Light the Crossing Shrine lamps for the fallen porters. [Cutscene]',
            nextNodeId: 'after_dusk_promise',
            setsMemory: 'awakened_dusk_lanterns',
            memoryNotification: 'Old Beck remembers you lit the Crossing Shrine vigil.',
            affinityDelta: 2,
            grantsEmbers: 15,
            triggersCutscene: 'dusk-lantern-awakening',
          },
          {
            id: 'temper-gear',
            label: 'Weigh my cores & reinforce my Porter Cutlass harness. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'farewell',
            label: 'Keep the scale honest, Beck.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'neutral',
        text: 'Scarf\'s looking darker around the collar, Joss. Don\'t let the Laugh talk you into spending blood you owe your sister.',
        memoryVariantText: {
          flag: 'asked_vaelen_architecture',
          expression: 'thinking',
          text: 'Voss\'s clerks came sniffing around Pylon 4 an hour ago. Use the Returned crawlspace on Floor One if you want the Table clock to stay quiet.',
        },
        choices: [
          {
            id: 're-trigger-dusk',
            label: 'Relight the Crossing Shrine vigil lamps. [Cutscene]',
            nextNodeId: 'END',
            setsMemory: 'awakened_dusk_lanterns',
            triggersCutscene: 'dusk-lantern-awakening',
          },
          {
            id: 'ask-citizens',
            label: 'Who else in the Terminus can we trust?',
            nextNodeId: 'community_guide',
            affinityDelta: 1,
          },
          {
            id: 'temper-gear-2',
            label: 'Put these cores on the Combine scale. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'leave',
            label: 'Back to the Spire.',
            nextNodeId: 'END',
          },
        ],
      },
      city_lore: {
        id: 'city_lore',
        expression: 'thinking',
        text: 'One book sits on top of the desk for Auditor Voss: flat scans, taxed cores, docile E-ranks. The second book is rubbed in lamp-oil underneath: every porter lost on Floor Zero, and every crate of stabilizer smuggled to Ward C.',
        choices: [
          {
            id: 'ask-lock',
            label: 'How do we bypass the Choke-Point toll on Floor One?',
            nextNodeId: 'lock_hint',
            setsMemory: 'vaelen_vouched_for_oswin',
            memoryNotification: 'Give Old Beck\'s crutch-knock countersign to Scout Lark on Floor One.',
            affinityDelta: 1,
          },
          {
            id: 'back-root',
            label: 'Let\'s talk about something else.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      lock_hint: {
        id: 'lock_hint',
        expression: 'stern',
        text: 'Scout Lark is holding the south sluice near the Muster Ward. Tell him Beck sent the iron crutch-pin—he\'ll crank the Flood Bulkhead open so you don\'t have to pay Rook\'s outriders.',
        choices: [
          {
            id: 'thanks-vaelen',
            label: 'I\'ll find Lark by the southern Muster span.',
            nextNodeId: 'END',
          },
        ],
      },
      community_guide: {
        id: 'community_guide',
        expression: 'neutral',
        text: 'North-east up the concrete steps is Doc Sable\'s Container Clinic—she\'ll wash the Rot out of your veins and wire scrip to Wren\'s hospital ward. West is Sera\'s Gilt Bazaar where blades are peace-bonded. And watch out for Auditor Voss near the north archive.',
        choices: [
          {
            id: 'back-from-guide',
            label: 'Got it, Beck.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      after_dusk_promise: {
        id: 'after_dusk_promise',
        expression: 'happy',
        text: 'Look at Bram\'s shadow standing straighter in the cyan corner. The dead know when they\'re respected. Take this 15k scrip advance from the Combine tin.',
        choices: [
          {
            id: 'end-dusk',
            label: 'For Wren and the Combine.',
            nextNodeId: 'END',
          },
        ],
      },
    },
  },

  isolde: {
    id: 'isolde',
    name: 'Doc Sable',
    role: 'Container Clinic Surgeon & Sync Tech',
    homeDistrict: 'Doc Sable\'s Container Clinic',
    voicePitchHz: 310,
    voiceTimbre: 'botanist',
    cloakColorHex: '#282226',
    trimColorHex: '#5591c7',
    hatStyle: 'botanist',
    defaultRootNodeId: 'intro',
    repeatRootNodeId: 'return_visit',
    schedule: [
      {
        startHour: 6,
        endHour: 13,
        x: 7.4,
        z: -14.2,
        facingAngle: -1.2,
        districtTitle: 'Container Clinic Surgical Bay',
        activityLabel: 'Centrifuging Sync-rot plasma & checking the padlocked 6-vial fridge',
      },
      {
        startHour: 13,
        endHour: 18,
        x: 1.5,
        z: -15.4,
        facingAngle: 0.4,
        districtTitle: 'Floor Zero Medical Staging Terrace',
        activityLabel: 'Checking Ward C breath-graft telemetry lines',
      },
      {
        startHour: 18,
        endHour: 23,
        x: 3.2,
        z: -1.8,
        facingAngle: -2.4,
        districtTitle: 'The Hold Triage Bench',
        activityLabel: 'Stitching porter lacerations after the evening gate shift',
      },
      {
        startHour: 23,
        endHour: 6,
        x: 8.2,
        z: -15.0,
        facingAngle: 3.14,
        districtTitle: 'Container Clinic Cold Storage',
        activityLabel: 'Guarding the six Middle-grade stabilizer vials under padlock',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'stern',
        text: 'Sit on the steel table and roll up your sleeve, Vane. Your pulse sounds like a two-stroke engine. I checked Ward C this morning—Wren\'s O2 saturation held at 89%, but that 2,000,000 scrip breath-graft clock isn\'t slowing down.',
        memoryVariantText: {
          flag: 'tasted_isolde_tonic',
          expression: 'happy',
          text: 'The clean stabilizer flush is holding your Rot down nicely, Joss. Wren sent a note from Ward C—she says don\'t forget to eat real bread.',
        },
        choices: [
          {
            id: 'taste-tonic',
            label: 'Flush my veins with a cold Stabilizer Vial (+12k Scrip credit & Rot wash).',
            nextNodeId: 'tonic_shared',
            excludesMemory: 'tasted_isolde_tonic',
            setsMemory: 'tasted_isolde_tonic',
            memoryNotification: 'Doc Sable opened her padlocked fridge to flush your Sync/Rot.',
            affinityDelta: 2,
            grantsEmbers: 12,
          },
          {
            id: 'ask-conservatory',
            label: 'What happens if my Sync / Rot hits 100%?',
            nextNodeId: 'botany_lore',
            setsMemory: 'studied_cloister_botany',
            memoryNotification: 'Doc Sable explained the clinical threshold of Parasite Rot.',
            affinityDelta: 1,
          },
          {
            id: 'open-barter',
            label: 'Reinforce my Vitality or Cutlass surgical edge. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'leave',
            label: 'Thanks, Doc. Tell Wren I\'m coming.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'neutral',
        text: 'My container clinic is always open, Coffin. Bring me raw cores or scrip and I\'ll keep the Laugh from eating your optic nerve.',
        memoryVariantText: {
          flag: 'studied_cloister_botany',
          expression: 'thinking',
          text: 'Keep an eye on your scarf color, Joss. Past 70% Sync, the parasite starts rewriting motor reflexes before you even press the muscle.',
        },
        choices: [
          {
            id: 'ask-corvus',
            label: 'Why is Auditor Voss stationed near the Floor Zero entry?',
            nextNodeId: 'corvus_insight',
            setsMemory: 'isolde_mentioned_corvus',
            affinityDelta: 1,
          },
          {
            id: 'open-barter-2',
            label: 'Calibrate my combat vitals and gear. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'goodbye',
            label: 'Stay sharp, Doc Sable.',
            nextNodeId: 'END',
          },
        ],
      },
      tonic_shared: {
        id: 'tonic_shared',
        expression: 'happy',
        text: 'Breathe through the clove bite. That\'s one of the six Middle-floor vials from my padlocked fridge—courtesy of The Returned. I\'ve also logged 12k scrip toward your kit.',
        choices: [
          {
            id: 'thank-isolde',
            label: 'My head feels clearer already. Thank you, Doc.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      botany_lore: {
        id: 'botany_lore',
        expression: 'thinking',
        text: 'Below 40% Sync, VESTIGE is just a passenger lending you leverage. At 70%, black Rot-veins climb your jaw and your red scarf drinks the soot. At 100%, the host hollowed out on Floor Zero forty years ago wakes up wearing your boots.',
        choices: [
          {
            id: 'return-botany',
            label: 'I\'ll wash the Rot before it hits the collar.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      corvus_insight: {
        id: 'corvus_insight',
        expression: 'stern',
        text: 'Auditor Voss carries a seventh unfiled dossier in his coat—he calls the suspect "The Door-Breaker." Every time you use a loud Parasite Technique in public, his clock ticks one notch closer to your bunk.',
        choices: [
          {
            id: 'visit-corvus',
            label: 'I\'ll keep my scan flat around Voss.',
            nextNodeId: 'END',
          },
        ],
      },
    },
  },

  oswin: {
    id: 'oswin',
    name: 'Scout Lark',
    role: 'Combine Vanguard & B13 Flood Survivor',
    homeDistrict: 'Floor One: The Muster & Sluice Span',
    voicePitchHz: 155,
    voiceTimbre: 'dockmaster',
    cloakColorHex: '#282226',
    trimColorHex: '#6daa45',
    hatStyle: 'dockmaster',
    defaultRootNodeId: 'intro',
    repeatRootNodeId: 'return_visit',
    schedule: [
      {
        startHour: 5,
        endHour: 14,
        x: 10.5,
        z: 10.2,
        facingAngle: -0.8,
        districtTitle: 'Floor Two Threshold & East Sluice',
        activityLabel: 'Watching Heir Seven\'s outriders near the Gala Hall gate',
      },
      {
        startHour: 14,
        endHour: 20,
        x: -2.4,
        z: 11.4,
        facingAngle: 0.2,
        districtTitle: 'Floor One: The Muster Sump Jetty',
        activityLabel: 'Dredging sunken porter packs from the black-water basin',
      },
      {
        startHour: 20,
        endHour: 5,
        x: 5.5,
        z: 6.2,
        facingAngle: -2.5,
        districtTitle: 'Muster Choke-Point Bridge',
        activityLabel: 'Marking Returned white-chalk safe routes across the span',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'stern',
        text: 'Coffin! You pulled me out of the B13 black water with two seconds of air left in my lungs. Floor One\'s Muster Ward is ahead—two hundred climbers went in, and Rook\'s toll-guards are blocking the eastern bulkhead.',
        memoryVariantText: {
          flag: 'opened_canal_lock',
          expression: 'happy',
          text: 'The Muster Bulkhead is wide open, Joss! The Returned chalk-runners are moving stabilizer crates straight past Rook\'s sentries.',
        },
        choices: [
          {
            id: 'open-lock-vaelen',
            label: 'Old Beck sent the iron crutch-pin—crank open the Muster Bulkhead! [Cutscene]',
            nextNodeId: 'lock_opened_node',
            requiresMemory: 'vaelen_vouched_for_oswin',
            setsMemory: 'opened_canal_lock',
            memoryNotification: 'Lark opened the Floor 1–2 Flood Bulkhead on Beck\'s countersign.',
            affinityDelta: 3,
            grantsEmbers: 18,
            triggersCutscene: 'canal-lock-opening',
          },
          {
            id: 'open-lock-direct',
            label: 'Help me heave the rusted winch to breach the Muster Bulkhead! [Cutscene]',
            nextNodeId: 'lock_opened_node',
            excludesMemory: 'vaelen_vouched_for_oswin',
            setsMemory: 'opened_canal_lock',
            memoryNotification: 'You and Lark forced open the Muster Flood Bulkhead.',
            affinityDelta: 2,
            grantsEmbers: 12,
            triggersCutscene: 'canal-lock-opening',
          },
          {
            id: 'ask-fishing',
            label: 'What beasts prowl Floor One and the Gala Hall?',
            nextNodeId: 'canal_lore',
            setsMemory: 'talked_oswin_waters',
            affinityDelta: 1,
          },
          {
            id: 'leave',
            label: 'Keep your head down, Lark.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'neutral',
        text: 'If you need extra cores without ticking Voss\'s clock, drop a dredge-line into the B13 sump jetty. Climbers drop heavy pouches when the water rises.',
        memoryVariantText: {
          flag: 'opened_canal_lock',
          expression: 'happy',
          text: 'With the Muster sluice open, you\'ve got a clean lane straight to Floor Two\'s Gala Hall. Give Heir Seven hell for us.',
        },
        choices: [
          {
            id: 'replay-lock-cutscene',
            label: 'Inspect the Muster Bulkhead breach & Gala Hall approach. [Cutscene]',
            nextNodeId: 'END',
            setsMemory: 'opened_canal_lock',
            triggersCutscene: 'canal-lock-opening',
          },
          {
            id: 'canal-lore-2',
            label: 'Remind me how to fight a Pall and a Returnling.',
            nextNodeId: 'canal_lore',
          },
          {
            id: 'farewell',
            label: 'See you back at The Hold, Lark.',
            nextNodeId: 'END',
          },
        ],
      },
      lock_opened_node: {
        id: 'lock_opened_node',
        expression: 'happy',
        text: 'Hear that iron tooth shear! The crawlspace bypass is live and the Returned clock just ticked in our favor. Take these 18k scrip from the toll chest!',
        choices: [
          {
            id: 'celebrate-lock',
            label: 'Floor Two is wide open.',
            nextNodeId: 'END',
          },
        ],
      },
      canal_lore: {
        id: 'canal_lore',
        expression: 'thinking',
        text: 'Two rules in The Down: First, if you see a Pall—three nested cloth cones with gold stitch-rings—press [G] to bow before you swing. It never strikes first, and manners stun it cold. Second, a Returnling dies three times: weeping, laughing, then begging for a Chaplain\'s Rite.',
        choices: [
          {
            id: 'back-oswin',
            label: 'Bow to the Pall, Rite for the Returnling. Understood.',
            nextNodeId: 'return_visit',
          },
        ],
      },
    },
  },

  sera: {
    id: 'sera',
    name: 'Broker Sera',
    role: 'Mistress of the Gilt Bazaar & Fiat Field',
    homeDistrict: 'The Gilt Bazaar',
    voicePitchHz: 355,
    voiceTimbre: 'lutenist',
    cloakColorHex: '#3a2024',
    trimColorHex: '#e8a020',
    hatStyle: 'lutenist',
    defaultRootNodeId: 'intro',
    repeatRootNodeId: 'return_visit',
    schedule: [
      {
        startHour: 7,
        endHour: 14,
        x: 3.4,
        z: 1.6,
        facingAngle: -0.9,
        districtTitle: 'Spire Gate Return Board',
        activityLabel: 'Posting survival odds & pricing Floor Two Sigil futures',
      },
      {
        startHour: 14,
        endHour: 19,
        x: -5.2,
        z: 6.0,
        facingAngle: 0.4,
        districtTitle: 'West Span — Gilt Bazaar Approach',
        activityLabel: 'Enforcing the Peace-Bonded Blade fiat across the market tiers',
      },
      {
        startHour: 19,
        endHour: 24,
        x: 5.8,
        z: -2.2,
        facingAngle: -1.8,
        districtTitle: 'Gilt Bazaar Pavilion (4th Dashed Floor)',
        activityLabel: 'Auctioning unfiled Spire relics under gold lantern light',
      },
      {
        startHour: 0,
        endHour: 7,
        x: 5.2,
        z: -3.2,
        facingAngle: 3.14,
        districtTitle: 'Bazaar Counting Table',
        activityLabel: 'Weighing Gilded Table writs against Returned chalk tallies',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'happy',
        text: 'Welcome to the Gilt Bazaar, Little Coffin. Three floors of honest theft, plus a fourth floor that doesn\'t exist on Auditor Voss\'s map. Inside my Fiat Field, even Heir Seven\'s Hushblades stay in their scabbards.',
        memoryVariantText: {
          flag: 'composed_ballad_with_sera',
          expression: 'happy',
          text: 'My favorite dark-horse porter! The odds on the Return Board shifted 14 points after your duel in the Gala Hall.',
        },
        choices: [
          {
            id: 'arrival-panorama',
            label: 'Survey the Terminus, Floor Zero & the Gala Hall! [Act 1 Cutscene]',
            nextNodeId: 'after_prelude',
            setsMemory: 'heard_sera_prelude',
            memoryNotification: 'Broker Sera briefed you on the full Act 1 layout of Cinderfall.',
            affinityDelta: 2,
            triggersCutscene: 'arrival-intro',
          },
          {
            id: 'choose-verse-dawn',
            label: 'Place a side-bet on "The E-Rank Door-Breaker" (+15k Scrip).',
            nextNodeId: 'verse_composed',
            setsMemory: 'composed_ballad_with_sera',
            memoryNotification: 'Sera backed your climb on the fourth-floor book.',
            affinityDelta: 2,
            grantsEmbers: 15,
          },
          {
            id: 'ask-rumors',
            label: 'What\'s the word on Rook (Heir Seven) and the Sigil Game?',
            nextNodeId: 'town_rumors',
            affinityDelta: 1,
          },
          {
            id: 'leave',
            label: 'Keep my tab open, Sera.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'neutral',
        text: 'Every bell in the Gala Hall changes the price of blood. Need a briefing on the floors or a look at the Return Board?',
        memoryVariantText: {
          flag: 'awakened_dusk_lanterns',
          expression: 'happy',
          text: 'Old Beck told me you lit the Crossing Shrine. Even my bazaar brokers tipped their hats to the Hold tonight.',
        },
        choices: [
          {
            id: 'replay-arrival',
            label: 'Run the Cinderfall & Act 1 Floor reconnaissance! [Cutscene]',
            nextNodeId: 'END',
            triggersCutscene: 'arrival-intro',
          },
          {
            id: 'rumors-2',
            label: 'Tell me the secret of Bell Three in the Gala Hall.',
            nextNodeId: 'town_rumors',
          },
          {
            id: 'leave-2',
            label: 'Until the market closes.',
            nextNodeId: 'END',
          },
        ],
      },
      after_prelude: {
        id: 'after_prelude',
        expression: 'stern',
        text: 'The Hold at the center, Floor Zero\'s Unfinished Block to the north, and Floor One and Two across the southern span. Own the seams, Coffin.',
        choices: [
          {
            id: 'back-sera',
            label: 'Time to climb.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      verse_composed: {
        id: 'verse_composed',
        expression: 'happy',
        text: 'Forty-to-one odds against an E-rank surviving Bell Two against Rook. Here\'s 15k scrip up front—make me rich in Bell Three.',
        choices: [
          {
            id: 'thank-sera',
            label: 'Watch the balcony in Bell Three.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      town_rumors: {
        id: 'town_rumors',
        expression: 'thinking',
        text: 'Rook\'s Hushblades cut the sound out of the room half a second before the steel arrives—watch for the gold glint and deflect. And remember the old Gala charter: "Sigils worn by the bound dead count double." Summon Bram, Mercy, and Hush before the third bell tolls.',
        choices: [
          {
            id: 'back-rumors',
            label: 'The bound dead count double. I won\'t forget.',
            nextNodeId: 'return_visit',
          },
        ],
      },
    },
  },

  'brother-corvus': {
    id: 'brother-corvus',
    name: 'Auditor Voss',
    role: 'Gilded Table Inquisitor ("The Manifest")',
    homeDistrict: 'Floor Zero Gate & Audit Overlook',
    voicePitchHz: 165,
    voiceTimbre: 'archivist',
    cloakColorHex: '#141114',
    trimColorHex: '#e8a020',
    hatStyle: 'archivist',
    defaultRootNodeId: 'intro',
    repeatRootNodeId: 'return_visit',
    schedule: [
      {
        startHour: 6,
        endHour: 15,
        x: -3.2,
        z: -15.8,
        facingAngle: 0.25,
        districtTitle: 'Floor Zero — F7 Unmarked Door Seal',
        activityLabel: 'Measuring parasite residue around the Unfinished Block',
      },
      {
        startHour: 15,
        endHour: 21,
        x: -0.2,
        z: -10.8,
        facingAngle: 0.0,
        districtTitle: 'Spire Gate Audit Overlook',
        activityLabel: 'Reviewing the 7th unfiled dossier ("The Door-Breaker")',
      },
      {
        startHour: 21,
        endHour: 6,
        x: -5.4,
        z: -14.8,
        facingAngle: 0.8,
        districtTitle: 'Floor Zero — West Rebar Colonnade',
        activityLabel: 'Cross-checking Combine porter tallies against gate scans',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'stern',
        text: 'Halt, Carrier #419. J. Vane. Scan reads E-rank · 11 · Flat. Yet my slate shows you walked out of Basement 13 after a Class-3 flood that killed four D-rank vanguards. Explain the discrepancy.',
        memoryVariantText: {
          flag: 'isolde_mentioned_corvus',
          expression: 'thinking',
          text: 'Doctor Sable claims your elevated pulse is merely Ward C exhaustion. My seventh file remains open, Porter Vane.',
        },
        choices: [
          {
            id: 'decipher-rose',
            label: 'Present Old Beck\'s stamped flat-scan manifest (+10k Scrip hazard pay).',
            nextNodeId: 'rose_deciphered',
            excludesMemory: 'deciphered_rose_window',
            setsMemory: 'deciphered_rose_window',
            memoryNotification: 'Your flat-scan alibi passed Auditor Voss\'s inspection.',
            affinityDelta: 1,
            grantsEmbers: 10,
          },
          {
            id: 'ask-history',
            label: 'What is the Gilded Table searching for in Floor Zero?',
            nextNodeId: 'cloister_history',
            affinityDelta: 1,
          },
          {
            id: 'corvus-upgrades',
            label: 'Requisition official Table edge-stones for my cutlass. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'leave',
            label: 'Just doing my shift, Auditor.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'stern',
        text: 'Six files in my case are closed, Porter Vane. The seventh—"The Door-Breaker"—waits only for a single non-flat spike on the pylon.',
        memoryVariantText: {
          flag: 'deciphered_rose_window',
          expression: 'neutral',
          text: 'Your paperwork is in order, Carrier #419. Do not linger near the seventh door.',
        },
        choices: [
          {
            id: 'cloister-history-2',
            label: 'Ask about Heir Seven (Rook) and the Floor Two Sigil Game.',
            nextNodeId: 'cloister_history',
          },
          {
            id: 'corvus-upgrades-2',
            label: 'ClaimCombine requisition upgrades. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'farewell',
            label: 'Stepping back to the line, Auditor.',
            nextNodeId: 'END',
          },
        ],
      },
      rose_deciphered: {
        id: 'rose_deciphered',
        expression: 'neutral',
        text: '"E-rank · 11 · Flat. Salvage weight: 42 kilos." Hmph. Old Beck\'s ink is dry and the numbers balance. Collect your 10k scrip statutory salvage fee and move along.',
        choices: [
          {
            id: 'thank-corvus',
            label: 'Thank you, Auditor Voss.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      cloister_history: {
        id: 'cloister_history',
        expression: 'thinking',
        text: 'Someone forced the Seventh Unmarked Door in Basement 13 from the inside and bound a Combine shield-bearer\'s echo. Heir Seven—young Rook—has taken personal command of Floor Two\'s Gala Hall to draw the anomaly out.',
        choices: [
          {
            id: 'back-corvus',
            label: 'Sounds above an E-rank\'s pay grade.',
            nextNodeId: 'return_visit',
          },
        ],
      },
    },
  },
};

export function evaluateCitizenSchedule(
  citizen: CitizenProfile,
  hour: number
): CitizenScheduleSlot {
  const h = ((hour % 24) + 24) % 24;
  for (const slot of citizen.schedule) {
    if (slot.startHour <= slot.endHour) {
      if (h >= slot.startHour && h < slot.endHour) return slot;
    } else {
      if (h >= slot.startHour || h < slot.endHour) return slot;
    }
  }
  return citizen.schedule[0];
}

export const VAELENPORT_CUTSCENES: Record<CutsceneId, CutsceneDefinition> = {
  'arrival-intro': {
    id: 'arrival-intro',
    title: 'NULLSPIRE: LEVEL ZERO — Act 1 Reconnaissance',
    tag: 'Cinderfall & The Down',
    keyframes: [
      {
        durationSec: 4.2,
        targetX: -2.0,
        targetY: 0.25,
        targetZ: 11.2,
        zoom: 'standard',
        speakerId: 'oswin',
        speakerName: 'Scout Lark',
        speakerRole: 'B13 Flood Survivor',
        expression: 'stern',
        subtitle:
          'South lies Floor One (The Muster) and Floor Two (The Gala Hall)—where 200 climbers fight for 100 writs under Rook\'s gaze.',
      },
      {
        durationSec: 4.4,
        targetX: 0.0,
        targetY: 0.55,
        targetZ: 0.0,
        zoom: 'close',
        speakerId: 'master-vaelen',
        speakerName: 'Old Beck',
        speakerRole: 'Combine Manifest Keeper',
        expression: 'stern',
        subtitle:
          'At the center stands The Hold: Old Beck\'s manifest scale, the Crossing Shrine, and the cold cyan-fog corner where your Bound Echoes wait.',
        worldEvent: 'ignite-plaza-lanterns',
      },
      {
        durationSec: 4.5,
        targetX: 1.5,
        targetY: 1.35,
        targetZ: -14.2,
        zoom: 'standard',
        speakerId: 'isolde',
        speakerName: 'Doc Sable',
        speakerRole: 'Container Clinic Surgeon',
        expression: 'thoughtful',
        subtitle:
          'North rises Floor Zero (The Unfinished Block) and Doc Sable\'s Container Clinic—where every scrip buys breath for Wren in Ward C.',
        worldEvent: 'toll-cloister-bell',
      },
      {
        durationSec: 3.6,
        targetX: 0.0,
        targetY: 0.45,
        targetZ: 2.5,
        zoom: 'standard',
        speakerId: 'sera',
        speakerName: 'Broker Sera',
        speakerRole: 'Mistress of the Gilt Bazaar',
        expression: 'warm',
        subtitle:
          'Scan reads E · 11 · FLAT, Coffin. Keep the Table clock low, mind your Sync/Rot, and make the seventy-seven floors pay.',
      },
    ],
  },

  'dusk-lantern-awakening': {
    id: 'dusk-lantern-awakening',
    title: 'Vigil of the Crossing Shrine',
    tag: 'The Hold · Bearers Combine Rite',
    keyframes: [
      {
        durationSec: 3.8,
        targetX: -6.8,
        targetY: 0.55,
        targetZ: -3.2,
        zoom: 'close',
        overrideHour: 18.6,
        overrideTimePreset: 'golden-dusk',
        speakerId: 'master-vaelen',
        speakerName: 'Old Beck',
        speakerRole: 'Combine Manifest Keeper',
        expression: 'thoughtful',
        subtitle:
          'Old Beck strikes his iron crutch-spear against the Hold floor and pours unrationed lamp-oil into the Crossing Shrine basins.',
      },
      {
        durationSec: 4.4,
        targetX: 0.0,
        targetY: 0.65,
        targetZ: -0.5,
        zoom: 'standard',
        overrideHour: 19.2,
        overrideTimePreset: 'golden-dusk',
        worldEvent: 'ignite-plaza-lanterns',
        speakerId: 'sera',
        speakerName: 'Mercy (Echo 02)',
        speakerRole: 'The Lantern · Bound Echo',
        expression: 'warm',
        subtitle:
          'Warm Spire-gold light flares across the Terminus flagstones, washing -10% Rot from Joss\'s veins as Bram and Hush step into formation.',
      },
      {
        durationSec: 4.0,
        targetX: -1.5,
        targetY: 1.4,
        targetZ: -14.8,
        zoom: 'close',
        overrideHour: 19.6,
        overrideTimePreset: 'golden-dusk',
        worldEvent: 'toll-cloister-bell',
        speakerId: 'brother-corvus',
        speakerName: 'Auditor Voss',
        speakerRole: 'Gilded Table Inquisitor',
        expression: 'stern',
        subtitle:
          'High by the Floor Zero pylon, the Seventh Bell tolls—and the unmarked door in Basement 13 answers with a low crimson hum.',
      },
    ],
  },

  'canal-lock-opening': {
    id: 'canal-lock-opening',
    title: 'Breaching the Muster Flood Bulkhead',
    tag: 'Floor 1 → Floor 2 Bypass',
    keyframes: [
      {
        durationSec: 3.8,
        targetX: 9.8,
        targetY: 0.3,
        targetZ: 9.5,
        zoom: 'close',
        speakerId: 'oswin',
        speakerName: 'Scout Lark',
        speakerRole: 'B13 Flood Survivor',
        expression: 'thoughtful',
        subtitle:
          'Using Old Beck\'s iron crutch-pin, you and Scout Lark jam the Gilded Table scrying gear on the Muster Choke-Point span.',
      },
      {
        durationSec: 4.5,
        targetX: 11.2,
        targetY: 0.25,
        targetZ: 9.8,
        zoom: 'close',
        worldEvent: 'open-canal-lock',
        speakerId: 'oswin',
        speakerName: 'Scout Lark',
        speakerRole: 'B13 Flood Survivor',
        expression: 'surprised',
        subtitle:
          'The heavy iron Muster Sluice groans open, draining the black-water sump and exposing the direct stair into Floor Two\'s Gala Hall!',
      },
      {
        durationSec: 4.0,
        targetX: 2.0,
        targetY: 0.25,
        targetZ: 10.2,
        zoom: 'standard',
        speakerId: 'sera',
        speakerName: 'Broker Sera',
        speakerRole: 'Gilt Bazaar',
        expression: 'warm',
        subtitle:
          'Heir Seven (Rook) waits on the Gala Hall balcony above—and Bell Three is about to ring.',
      },
    ],
  },
};
