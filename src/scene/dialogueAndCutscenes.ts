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

const STORAGE_KEY = 'vaelenport_community_memory_v1';

export interface CommunityMemoryStore {
  flags: Record<string, boolean>;
  affinity: Record<CitizenId, number>;
  talkCount: Record<CitizenId, number>;
}

const DEFAULT_MEMORY_STORE: CommunityMemoryStore = {
  flags: {},
  affinity: {
    'master-vaelen': 1,
    isolde: 1,
    oswin: 1,
    sera: 1,
    'brother-corvus': 1,
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
    name: 'Master Vaelen',
    role: 'Grand Bellwright & Clockmaker',
    homeDistrict: 'The Lantern Plaza',
    voicePitchHz: 215,
    voiceTimbre: 'bellwright',
    cloakColorHex: '#8E3B2E',
    trimColorHex: '#E0A94E',
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
        districtTitle: 'Astrolabe Fountain (Lantern Plaza)',
        activityLabel: 'Calibrating the Astrolabe Fountain escapement gears',
      },
      {
        startHour: 12,
        endHour: 18,
        x: -7.5,
        z: -3.2,
        facingAngle: 1.57,
        districtTitle: "Clockmaker's Guildhall Interior",
        activityLabel: 'Forging brass mainsprings at the Guildhall workbench',
      },
      {
        startHour: 18,
        endHour: 24,
        x: 1.8,
        z: 1.4,
        facingAngle: -0.65,
        districtTitle: 'Lantern Plaza Promenade',
        activityLabel: 'Tending the Dusk Beacons & listening to Sera’s lute',
      },
      {
        startHour: 0,
        endHour: 6,
        x: -8.2,
        z: -4.2,
        facingAngle: 0.0,
        districtTitle: "Clockmaker's Guildhall Hearth",
        activityLabel: 'Studying celestial tide charts by the Guildhall hearth',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'warm',
        text: 'Welcome to Vaelenport, Wayfarer! Hear that steady brass pulse beneath the flagstones? The Astrolabe Fountain drives every lock-gate and lantern wire across our three tiers.',
        memoryVariantText: {
          flag: 'awakened_dusk_lanterns',
          expression: 'warm',
          text: 'Ah, the Wayfarer who helped me synchronize the Dusk Lanterns! Every brass pendulum in the Plaza sings in true harmonic phase thanks to your hand.',
        },
        choices: [
          {
            id: 'ask-city',
            label: 'Tell me how Vaelenport’s three tiers were built.',
            nextNodeId: 'city_lore',
            setsMemory: 'asked_vaelen_architecture',
            memoryNotification: 'Master Vaelen noted your curiosity about Vaelenport’s masonry.',
            affinityDelta: 1,
          },
          {
            id: 'trigger-dusk-cutscene',
            label: 'Let us ignite the Dusk Lantern Awakening across the Plaza! [Cutscene]',
            nextNodeId: 'after_dusk_promise',
            setsMemory: 'awakened_dusk_lanterns',
            memoryNotification: 'Master Vaelen will remember you awakened the Plaza Lanterns.',
            affinityDelta: 2,
            grantsEmbers: 3,
            triggersCutscene: 'dusk-lantern-awakening',
          },
          {
            id: 'temper-gear',
            label: 'Can you temper my Broadsword or Lantern at your forge?',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'farewell',
            label: 'Keep the gears turning, Master Vaelen.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'warm',
        text: 'Good to see your lantern-light again, friend. The clockwork heart of the Plaza beats true.',
        memoryVariantText: {
          flag: 'asked_vaelen_architecture',
          expression: 'thoughtful',
          text: 'Welcome back, fellow student of stone and brass! Have you climbed the northern steps to the Scholars’ Cloister yet, or walked the Lower Canal Quays?',
        },
        choices: [
          {
            id: 're-trigger-dusk',
            label: 'Sound the Dusk Lantern Awakening across the tiers! [Cutscene]',
            nextNodeId: 'END',
            setsMemory: 'awakened_dusk_lanterns',
            triggersCutscene: 'dusk-lantern-awakening',
          },
          {
            id: 'ask-citizens',
            label: 'Who else keeps watch over the Sanctuary tiers?',
            nextNodeId: 'community_guide',
            affinityDelta: 1,
          },
          {
            id: 'temper-gear-2',
            label: 'I brought Soul Embers for the Guildhall forge. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'leave',
            label: 'Until the next chime.',
            nextNodeId: 'END',
          },
        ],
      },
      city_lore: {
        id: 'city_lore',
        expression: 'thoughtful',
        text: 'Three centuries ago, the founders carved the Lower Canal Quays from dark basalt to shelter lantern skiffs. Above it rests this Lantern Plaza, and high to the north rises the Scholars’ Cloister (+1.15m) where Isolde and Brother Corvus keep the archives.',
        choices: [
          {
            id: 'ask-lock',
            label: 'Why is the eastern Canal Lock gate sealed?',
            nextNodeId: 'lock_hint',
            setsMemory: 'vaelen_vouched_for_oswin',
            memoryNotification: 'You can mention Vaelen’s brass key-seal to Dockmaster Oswin.',
            affinityDelta: 1,
          },
          {
            id: 'back-root',
            label: 'Let us speak of something else.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      lock_hint: {
        id: 'lock_hint',
        expression: 'solemn',
        text: 'Dockmaster Oswin lowered the iron sluice when the tide-mist thickened. Tell him Master Vaelen checked the counterweight—he will gladly crank open the Old Canal Lock for you.',
        choices: [
          {
            id: 'thanks-vaelen',
            label: 'I will speak with Oswin down on the Lower Quays.',
            nextNodeId: 'END',
          },
        ],
      },
      community_guide: {
        id: 'community_guide',
        expression: 'warm',
        text: 'North up the grand staircase, Isolde tends moon-fern elixirs in the Apothecary Conservatory while Brother Corvus studies the Rose Window. Down south on the Quays, Oswin watches the lock gates, and right here by the fountain, Sera chronicles our ballads.',
        choices: [
          {
            id: 'back-from-guide',
            label: 'Thank you, Master Vaelen.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      after_dusk_promise: {
        id: 'after_dusk_promise',
        expression: 'surprised',
        text: 'Behold how the amber filaments catch the water! Take these three Soul Embers from the Guildhall brazier as my thanks.',
        choices: [
          {
            id: 'end-dusk',
            label: 'The Plaza looks magnificent.',
            nextNodeId: 'END',
          },
        ],
      },
    },
  },

  isolde: {
    id: 'isolde',
    name: 'Isolde',
    role: 'Cloister Apothecary & Botanist',
    homeDistrict: "The Scholars' Cloister",
    voicePitchHz: 330,
    voiceTimbre: 'botanist',
    cloakColorHex: '#256B54',
    trimColorHex: '#8CE0B8',
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
        districtTitle: 'Apothecary Conservatory (Upper Cloister)',
        activityLabel: 'Distilling silver-leaf dew in the glass conservatory',
      },
      {
        startHour: 13,
        endHour: 18,
        x: 1.5,
        z: -15.4,
        facingAngle: 0.4,
        districtTitle: 'Cloister Herb Parterre (+1.15m)',
        activityLabel: 'Pruning luminous nightshade along the Cloister colonnade',
      },
      {
        startHour: 18,
        endHour: 23,
        x: 3.2,
        z: -1.8,
        facingAngle: -2.4,
        districtTitle: 'Lantern Plaza Fountain Steps',
        activityLabel: 'Sharing herbal cordials with townsfolk in the Plaza',
      },
      {
        startHour: 23,
        endHour: 6,
        x: 8.2,
        z: -15.0,
        facingAngle: 3.14,
        districtTitle: 'Apothecary Conservatory Study',
        activityLabel: 'Pressing nocturnal moss specimens under lantern glass',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'warm',
        text: 'Breathe deeply, traveler. The cedar and moon-sage in our Upper Cloister keep the canal dampness from the lungs. Did you climb the northern stair to seek a tonic, or quiet counsel?',
        memoryVariantText: {
          flag: ' tasted_isolde_tonic',
          expression: 'warm',
          text: 'Your step is lighter since you drank the Silver-Fern draught! The herbs of the Cloister always remember a kindred spirit.',
        },
        choices: [
          {
            id: 'taste-tonic',
            label: 'Try a vial of Isolde’s Silver-Fern restorative (+2 Soul Embers).',
            nextNodeId: 'tonic_shared',
            excludesMemory: 'tasted_isolde_tonic',
            setsMemory: 'tasted_isolde_tonic',
            memoryNotification: 'Isolde remembers sharing her prized Silver-Fern draught with you.',
            affinityDelta: 2,
            grantsEmbers: 2,
          },
          {
            id: 'ask-conservatory',
            label: 'What grows inside your glass-and-timber Conservatory?',
            nextNodeId: 'botany_lore',
            setsMemory: 'studied_cloister_botany',
            memoryNotification: 'Isolde appreciates your interest in Sanctuary botany.',
            affinityDelta: 1,
          },
          {
            id: 'open-barter',
            label: 'Infuse my Vitality or Lantern with Cloister essences. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'leave',
            label: 'May your conservatory flourish, Isolde.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'warm',
        text: 'Welcome back to the Upper Terrace. Step inside the Conservatory whenever you wish—the roof timber parts to show our distillation tables.',
        memoryVariantText: {
          flag: 'studied_cloister_botany',
          expression: 'thoughtful',
          text: 'Ah, my favorite naturalist returns! The Starlight Bellflowers opened another petal when the Plaza clock chimed.',
        },
        choices: [
          {
            id: 'ask-corvus',
            label: 'What is Brother Corvus researching by the Rose Window?',
            nextNodeId: 'corvus_insight',
            setsMemory: 'isolde_mentioned_corvus',
            affinityDelta: 1,
          },
          {
            id: 'open-barter-2',
            label: 'Let us commune over Soul Ember infusions. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'goodbye',
            label: 'Walk in peace, Isolde.',
            nextNodeId: 'END',
          },
        ],
      },
      tonic_shared: {
        id: 'tonic_shared',
        expression: 'surprised',
        text: 'Warm as liquid amber, isn’t it? We harvest the fern-spores where the Cloister mist meets the belltower breeze. Keep these two Soul Embers for your lantern.',
        choices: [
          {
            id: 'thank-isolde',
            label: 'It tastes like pine-resin and starlight. Thank you!',
            nextNodeId: 'return_visit',
          },
        ],
      },
      botany_lore: {
        id: 'botany_lore',
        expression: 'thoughtful',
        text: 'Glass-leaf bellwort, ember-root, and weeping fen-lily. Because the Cloister sits a full meter above the canal basin, the morning sunlight strikes our arches first while the lower quays still sleep in mist.',
        choices: [
          {
            id: 'return-botany',
            label: 'A wise design by the old architects.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      corvus_insight: {
        id: 'corvus_insight',
        expression: 'solemn',
        text: 'Brother Corvus believes the stained-glass Rose Window is an optical calendar left by the first Tide-Scholars. If you speak with him, ask about the Verse of the Sunken Lock.',
        choices: [
          {
            id: 'visit-corvus',
            label: 'I will speak with Brother Corvus under the colonnade.',
            nextNodeId: 'END',
          },
        ],
      },
    },
  },

  oswin: {
    id: 'oswin',
    name: 'Oswin',
    role: 'Canal Dockmaster & Lock-Keeper',
    homeDistrict: 'The Lower Canal Quays',
    voicePitchHz: 150,
    voiceTimbre: 'dockmaster',
    cloakColorHex: '#2C4A63',
    trimColorHex: '#D99B43',
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
        districtTitle: 'Eastern Lock Gate (Lower Canal Quays)',
        activityLabel: 'Inspecting the iron sluice chains & canal waterwheel',
      },
      {
        startHour: 14,
        endHour: 20,
        x: -2.4,
        z: 11.4,
        facingAngle: 0.2,
        districtTitle: 'Southern Gondola Jetty (Lower Quays)',
        activityLabel: 'Mooring the lantern skiff & mending hemp tow-lines',
      },
      {
        startHour: 20,
        endHour: 5,
        x: 5.5,
        z: 6.2,
        facingAngle: -2.5,
        districtTitle: 'East Canal Stone Bridge',
        activityLabel: 'Keeping night-watch over the canal reflections',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'neutral',
        text: 'Mind the wet flagstones on the Lower Quays, traveler. The canal runs deep between the embankments, and the eastern Lock Gate holds back the outer fen-tide.',
        memoryVariantText: {
          flag: 'opened_canal_lock',
          expression: 'warm',
          text: 'Ho there, Captain! Since we cranked open the Old Canal Lock, the waterwheel turns twice as briskly and the lantern skiff rides high.',
        },
        choices: [
          {
            id: 'open-lock-vaelen',
            label: 'Master Vaelen checked the counterweight—let’s open the Old Canal Lock! [Cutscene]',
            nextNodeId: 'lock_opened_node',
            requiresMemory: 'vaelen_vouched_for_oswin',
            setsMemory: 'opened_canal_lock',
            memoryNotification: 'Oswin opened the Old Canal Lock at Vaelen’s word.',
            affinityDelta: 3,
            grantsEmbers: 3,
            triggersCutscene: 'canal-lock-opening',
          },
          {
            id: 'open-lock-direct',
            label: 'Help me heave the winch to open the Old Canal Lock! [Cutscene]',
            nextNodeId: 'lock_opened_node',
            excludesMemory: 'vaelen_vouched_for_oswin',
            setsMemory: 'opened_canal_lock',
            memoryNotification: 'Oswin remembers you helped crank the heavy iron Lock Gate.',
            affinityDelta: 2,
            grantsEmbers: 2,
            triggersCutscene: 'canal-lock-opening',
          },
          {
            id: 'ask-fishing',
            label: 'What swims in the Lower Canal basin?',
            nextNodeId: 'canal_lore',
            setsMemory: 'talked_oswin_waters',
            affinityDelta: 1,
          },
          {
            id: 'leave',
            label: 'Fair tides, Dockmaster.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'warm',
        text: 'Nothing steadies the spirit like the lap of water against dressed ashlar stone. The jetty fishing line is rigged whenever you fancy casting.',
        memoryVariantText: {
          flag: 'opened_canal_lock',
          expression: 'warm',
          text: 'Listen to that waterwheel hum! Opening the eastern sluice brought fresh silver-carp right up to the southern jetty.',
        },
        choices: [
          {
            id: 'replay-lock-cutscene',
            label: 'Show me the Canal Lock & Lantern Skiff passage again. [Cutscene]',
            nextNodeId: 'END',
            setsMemory: 'opened_canal_lock',
            triggersCutscene: 'canal-lock-opening',
          },
          {
            id: 'canal-lore-2',
            label: 'Tell me about the twin stone bridges.',
            nextNodeId: 'canal_lore',
          },
          {
            id: 'farewell',
            label: 'Keep a dry lantern, Oswin.',
            nextNodeId: 'END',
          },
        ],
      },
      lock_opened_node: {
        id: 'lock_opened_node',
        expression: 'surprised',
        text: 'Put your shoulder to the brass capstan... There she swings! Look how the lantern skiff glides along the open channel. Take these Soul Embers dredged from the lock-sill!',
        choices: [
          {
            id: 'celebrate-lock',
            label: 'The waterway is open at last.',
            nextNodeId: 'END',
          },
        ],
      },
      canal_lore: {
        id: 'canal_lore',
        expression: 'thoughtful',
        text: 'Two arched bridges span our waterway: the West Guild Bridge leading up to Vaelen’s workshop, and the East Lock-Keeper’s Bridge. Beneath them swim Moon-Scale Koi and Brass-Shell Crabs that feed on fallen lantern embers.',
        choices: [
          {
            id: 'back-oswin',
            label: 'I will try casting a line from the wooden jetty.',
            nextNodeId: 'return_visit',
          },
        ],
      },
    },
  },

  sera: {
    id: 'sera',
    name: 'Sera',
    role: 'Plaza Lutenist & City Chronicler',
    homeDistrict: 'The Lantern Plaza',
    voicePitchHz: 370,
    voiceTimbre: 'lutenist',
    cloakColorHex: '#9E2A47',
    trimColorHex: '#F3C663',
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
        districtTitle: 'Astrolabe Fountain Steps (Plaza)',
        activityLabel: 'Composing morning preludes beside the fountain spray',
      },
      {
        startHour: 14,
        endHour: 19,
        x: -5.2,
        z: 6.0,
        facingAngle: 0.4,
        districtTitle: 'West Guild Bridge Parapet',
        activityLabel: 'Sketching the canal skiffs & singing to passing barges',
      },
      {
        startHour: 19,
        endHour: 24,
        x: 5.8,
        z: -2.2,
        facingAngle: -1.8,
        districtTitle: 'Hearthside Lute Pavilion (East Plaza)',
        activityLabel: 'Performing the Evening Chronicle beneath the paper lanterns',
      },
      {
        startHour: 0,
        endHour: 7,
        x: 5.2,
        z: -3.2,
        facingAngle: 3.14,
        districtTitle: 'Hearthside Pavilion Brazier',
        activityLabel: 'Transcribing traveler tales by warm brazier light',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'warm',
        text: 'Pluck a string in the Lantern Plaza and the stone arches sing back in thirds! I am Sera, keeper of Vaelenport’s spoken chronicle. What verse shall we add for your arrival?',
        memoryVariantText: {
          flag: 'composed_ballad_with_sera',
          expression: 'warm',
          text: 'There walks the hero of my newest stanza! The whole Plaza has been humming the verse we composed together.',
        },
        choices: [
          {
            id: 'arrival-panorama',
            label: 'Recite the Prelude of Arrival over Vaelenport! [Intro Cutscene]',
            nextNodeId: 'after_prelude',
            setsMemory: 'heard_sera_prelude',
            memoryNotification: 'Sera performed the Prelude of Vaelenport for you.',
            affinityDelta: 2,
            triggersCutscene: 'arrival-intro',
          },
          {
            id: 'choose-verse-dawn',
            label: 'Compose a verse of "Golden Brass & Morning Bells".',
            nextNodeId: 'verse_composed',
            setsMemory: 'composed_ballad_with_sera',
            memoryNotification: 'Sera inscribed your chosen verse into the City Chronicle.',
            affinityDelta: 2,
            grantsEmbers: 2,
          },
          {
            id: 'ask-rumors',
            label: 'What news do the citizens whisper today?',
            nextNodeId: 'town_rumors',
            affinityDelta: 1,
          },
          {
            id: 'leave',
            label: 'Play on, Sera.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'warm',
        text: 'Every hour of the clock changes the light on the canal and the mood of my lute. Have you watched the lanterns ignite at dusk?',
        memoryVariantText: {
          flag: 'awakened_dusk_lanterns',
          expression: 'surprised',
          text: 'When you and Master Vaelen lit the Dusk Lanterns, the whole Plaza shimmered like a gilded manuscript! I wrote three new chords on the spot.',
        },
        choices: [
          {
            id: 'replay-arrival',
            label: 'Let us behold the Arrival Panorama over Vaelenport! [Cutscene]',
            nextNodeId: 'END',
            triggersCutscene: 'arrival-intro',
          },
          {
            id: 'rumors-2',
            label: 'Share the latest word around the three tiers.',
            nextNodeId: 'town_rumors',
          },
          {
            id: 'leave-2',
            label: 'May your strings stay in tune.',
            nextNodeId: 'END',
          },
        ],
      },
      after_prelude: {
        id: 'after_prelude',
        expression: 'warm',
        text: 'From the sunken quays to the high rose window—every stone in Vaelenport was laid by hand to welcome travelers home.',
        choices: [
          {
            id: 'back-sera',
            label: 'A worthy sanctuary indeed.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      verse_composed: {
        id: 'verse_composed',
        expression: 'surprised',
        text: '"Where brass-gears turn the silver tide, and lantern-motes in twilight glide..." Splendid meter! Take these two Soul Embers—a patron’s gift for a fellow poet.',
        choices: [
          {
            id: 'thank-sera',
            label: 'I am honored to be in the Chronicle.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      town_rumors: {
        id: 'town_rumors',
        expression: 'thoughtful',
        text: 'Master Vaelen spends his afternoons inside the western Guildhall—walk right under the eaves to see his clock-table. Meanwhile, Brother Corvus up in the Cloister has been waiting for someone to decipher the Rose Window inscription.',
        choices: [
          {
            id: 'back-rumors',
            label: 'Thank you for the tip, Sera.',
            nextNodeId: 'return_visit',
          },
        ],
      },
    },
  },

  'brother-corvus': {
    id: 'brother-corvus',
    name: 'Brother Corvus',
    role: 'Sanctuary Archivist & Rose-Window Keeper',
    homeDistrict: "The Scholars' Cloister",
    voicePitchHz: 175,
    voiceTimbre: 'archivist',
    cloakColorHex: '#3B3654',
    trimColorHex: '#C8B8E8',
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
        districtTitle: 'Rose Window Sanctuary (Upper Cloister)',
        activityLabel: 'Cataloging stained-glass meridian projections',
      },
      {
        startHour: 15,
        endHour: 21,
        x: -0.2,
        z: -10.8,
        facingAngle: 0.0,
        districtTitle: 'Grand Cloister Balustrade Overlook',
        activityLabel: 'Overlooking the Lantern Plaza from the upper terrace',
      },
      {
        startHour: 21,
        endHour: 6,
        x: -5.4,
        z: -14.8,
        facingAngle: 0.8,
        districtTitle: 'Western Cloister Colonnade',
        activityLabel: 'Reading illuminated folios by sanctuary candelabrum',
      },
    ],
    nodes: {
      intro: {
        id: 'intro',
        expression: 'solemn',
        text: 'Peace be upon your lantern, Wayfarer. From this northern terrace (+1.15m), all of Vaelenport unfolds like an illuminated parchment—the Plaza below, and the Canal beyond.',
        memoryVariantText: {
          flag: 'isolde_mentioned_corvus',
          expression: 'warm',
          text: 'Ah, Isolde told me a keen-eyed traveler was ascending the Cloister stair! You wish to hear the Verse of the Sunken Lock and the Rose Window?',
        },
        choices: [
          {
            id: 'decipher-rose',
            label: 'Decipher the Rose Window inscription together (+2 Soul Embers).',
            nextNodeId: 'rose_deciphered',
            excludesMemory: 'deciphered_rose_window',
            setsMemory: 'deciphered_rose_window',
            memoryNotification: 'Brother Corvus recorded your translation in the Sanctuary Codex.',
            affinityDelta: 2,
            grantsEmbers: 2,
          },
          {
            id: 'ask-history',
            label: 'Why did the scholars build this Cloister above the city?',
            nextNodeId: 'cloister_history',
            affinityDelta: 1,
          },
          {
            id: 'corvus-upgrades',
            label: 'Consecrate my equipment with Sanctuary rites. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'leave',
            label: 'May the archives endure, Brother Corvus.',
            nextNodeId: 'END',
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        expression: 'thoughtful',
        text: 'The stone arches of the Cloister hold the memory of every footstep. What wisdom do you seek today?',
        memoryVariantText: {
          flag: 'deciphered_rose_window',
          expression: 'warm',
          text: 'Greetings, Co-Archivist! Your translation of the Rose Window meridian has illuminated three whole chapters of our city’s founding.',
        },
        choices: [
          {
            id: 'cloister-history-2',
            label: 'Recount the founding of the Scholars’ Cloister.',
            nextNodeId: 'cloister_history',
          },
          {
            id: 'corvus-upgrades-2',
            label: 'I seek a Sanctuary blessing for my gear. [Upgrades]',
            nextNodeId: 'OPEN_UPGRADES',
          },
          {
            id: 'farewell',
            label: 'Clear skies, Brother Corvus.',
            nextNodeId: 'END',
          },
        ],
      },
      rose_deciphered: {
        id: 'rose_deciphered',
        expression: 'surprised',
        text: '"When water, brass, and glass align, the Sanctuary’s heart shall shine." You read the old high-glyphs effortlessly! Please accept these two consecrated Soul Embers.',
        choices: [
          {
            id: 'thank-corvus',
            label: 'The stained glass is a masterpiece.',
            nextNodeId: 'return_visit',
          },
        ],
      },
      cloister_history: {
        id: 'cloister_history',
        expression: 'solemn',
        text: 'When the outer world grew turbulent, artisans, clockmakers, apothecaries, and ferrymen gathered here. We rejected random sprawl and laid out three harmonious tiers so every citizen could live within sight of the Astrolabe Fountain.',
        choices: [
          {
            id: 'back-corvus',
            label: 'You built a true sanctuary.',
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
      // Wraps across midnight (e.g., 20..5)
      if (h >= slot.startHour || h < slot.endHour) return slot;
    }
  }
  return citizen.schedule[0];
}

export const VAELENPORT_CUTSCENES: Record<CutsceneId, CutsceneDefinition> = {
  'arrival-intro': {
    id: 'arrival-intro',
    title: 'Arrival at Vaelenport Sanctuary',
    tag: 'Prologue Panorama',
    keyframes: [
      {
        durationSec: 4.2,
        targetX: -2.0,
        targetY: 0.25,
        targetZ: 11.2,
        zoom: 'standard',
        speakerId: 'oswin',
        speakerName: 'Oswin',
        speakerRole: 'Canal Dockmaster',
        expression: 'warm',
        subtitle:
          'From the mist of the Lower Canal Quays, your skiff reaches the dressed stone embankments of Vaelenport.',
      },
      {
        durationSec: 4.4,
        targetX: 0.0,
        targetY: 0.55,
        targetZ: 0.0,
        zoom: 'close',
        speakerId: 'master-vaelen',
        speakerName: 'Master Vaelen',
        speakerRole: 'Grand Bellwright',
        expression: 'warm',
        subtitle:
          'Across the arched stone bridge lies the Lantern Plaza, where the brass Astrolabe Fountain marks the city’s pulse.',
        worldEvent: 'ignite-plaza-lanterns',
      },
      {
        durationSec: 4.5,
        targetX: 1.5,
        targetY: 1.35,
        targetZ: -14.2,
        zoom: 'standard',
        speakerId: 'isolde',
        speakerName: 'Isolde',
        speakerRole: 'Cloister Apothecary',
        expression: 'thoughtful',
        subtitle:
          'And high above the grand northern staircase rises the Scholars’ Cloister, fragrant with silver-fern and stained glass.',
        worldEvent: 'toll-cloister-bell',
      },
      {
        durationSec: 3.6,
        targetX: 0.0,
        targetY: 0.45,
        targetZ: 2.5,
        zoom: 'standard',
        speakerId: 'sera',
        speakerName: 'Sera',
        speakerRole: 'Plaza Chronicler',
        expression: 'warm',
        subtitle:
          'Walk freely among our three tiers, Wayfarer—every citizen has a story waiting for your voice.',
      },
    ],
  },

  'dusk-lantern-awakening': {
    id: 'dusk-lantern-awakening',
    title: 'The Dusk Lantern Awakening',
    tag: 'Plaza Story Event',
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
        speakerName: 'Master Vaelen',
        speakerRole: 'Grand Bellwright',
        expression: 'thoughtful',
        subtitle:
          'Master Vaelen engages the Guildhall master-lever, sending a tremor of warm golden current through the Plaza conduits.',
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
        speakerName: 'Sera',
        speakerRole: 'Plaza Chronicler',
        expression: 'surprised',
        subtitle:
          'One by one, the Astrolabe Fountain braziers and overhead festival lanterns flare into amber brilliance against the twilight!',
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
        speakerName: 'Brother Corvus',
        speakerRole: 'Sanctuary Archivist',
        expression: 'warm',
        subtitle:
          'Up on the Scholars’ Cloister, the Rose Window answers the Plaza beacons with a deep, resonant evening chime.',
      },
    ],
  },

  'canal-lock-opening': {
    id: 'canal-lock-opening',
    title: 'Opening the Old Canal Lock',
    tag: 'Waterway Story Event',
    keyframes: [
      {
        durationSec: 3.8,
        targetX: 9.8,
        targetY: 0.3,
        targetZ: 9.5,
        zoom: 'close',
        speakerId: 'oswin',
        speakerName: 'Oswin',
        speakerRole: 'Canal Dockmaster',
        expression: 'thoughtful',
        subtitle:
          'Together with Dockmaster Oswin, you brace against the brass capstan on the Lower Quays and release the iron pawl.',
      },
      {
        durationSec: 4.5,
        targetX: 11.2,
        targetY: 0.25,
        targetZ: 9.8,
        zoom: 'close',
        worldEvent: 'open-canal-lock',
        speakerId: 'oswin',
        speakerName: 'Oswin',
        speakerRole: 'Canal Dockmaster',
        expression: 'surprised',
        subtitle:
          'With a thunderous groan of counterweights, the massive Eastern Canal Lock gates swing wide and the waterwheel surges!',
      },
      {
        durationSec: 4.0,
        targetX: 2.0,
        targetY: 0.25,
        targetZ: 10.2,
        zoom: 'standard',
        speakerId: 'sera',
        speakerName: 'Sera',
        speakerRole: 'Plaza Chronicler',
        expression: 'warm',
        subtitle:
          'Lantern reflections ripple freely from the Southern Gondola Jetty all the way beneath the East Lock-Keeper’s Bridge.',
      },
    ],
  },
};
