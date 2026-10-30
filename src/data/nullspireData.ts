/**
 * NULLSPIRE: LEVEL ZERO — Master Lore, Systems, Echo Roster (01–20),
 * 7 Warden Accords, Parasite Techniques, Memory Tithe & World Bible Registry.
 */

export type EchoFsmState = 'IDLE' | 'FOLLOW' | 'HOLD-DOOR' | 'FIGHT' | 'REFUSE' | 'MOURN';

export interface BoundEchoEntry {
  id: string;
  number: string; // '01' .. '20'
  name: string;
  epithet: string;
  originFloor: string;
  role: 'Tank' | 'Healer' | 'Assassin' | 'Tracker' | 'Bruiser' | 'Tactician' | 'Controller' | 'Duelist' | 'Support' | 'Siege' | 'Vanguard';
  rank: number; // 1..5
  loyalty: number; // 0..100
  fsmState: EchoFsmState;
  isBound: boolean;
  isSummoned: boolean;
  accentHex: string;
  signatureSkill: string;
  loyaltyGainTrigger: string;
  loyaltyLossTrigger: string;
  refuseBehavior: string;
  quote: string;
  lore: string;
}

export interface WardenAccordEntry {
  id: string;
  numeral: string;
  name: string;
  floorRange: string;
  accordTitle: string;
  boon: string;
  price: string;
  refusalConsequence: string;
  quote: string;
  isSworn: boolean;
  rotModifier: number;
  attackBonusPct: number;
}

export type ParasiteTechId = 'gapstep' | 'bloodwage' | 'crosspull' | 'call-bound' | 'red-second';

export interface ParasiteTechnique {
  id: ParasiteTechId;
  keyLabel: string;
  name: string;
  rotCost: number;
  hpCostPct: number;
  staminaCost: number;
  cooldownSec: number;
  summary: string;
  vestigeNote: string;
}

export interface JossMemoryEntry {
  id: string;
  title: string;
  yearLabel: string;
  originalText: string;
  tithedCorruptedText: string;
  isTithed: boolean;
}

export interface VestigeWhisperDeal {
  id: string;
  title: string;
  triggerContext: string;
  vestigeLine: string;
  isLie: boolean;
  lieTellNote: string;
  acceptLabel: string;
  refuseLabel: string;
  boonDescription: string;
  priceDescription: string;
  rotDelta: number;
  scripDelta: number;
  hpHealPct: number;
  tableClockDelta: number;
}

export interface NullspireFloorZone {
  id: 'the-hold' | 'floor-0' | 'floor-1' | 'floor-2' | 'sable-clinic' | 'gilt-bazaar';
  code: string;
  title: string;
  subtitle: string;
  actLabel: string;
  x: number;
  z: number;
  recommendedLevel: number;
  summary: string;
  mechanicsNote: string;
}

export const CINDERFALL_PALETTE = {
  ink: '#141114',
  surface: '#1e1a1c',
  surface2: '#282226',
  border: '#3a3235',
  chalk: '#f4efe4',
  muted: '#a89f94',
  blood: '#e5482f',
  gold: '#e8a020',
  echo: '#9fd8e8',
  moss: '#6daa45',
  river: '#5591c7',
} as const;

export const PARASITE_TECHNIQUES: ParasiteTechnique[] = [
  {
    id: 'gapstep',
    keyLabel: '1',
    name: 'Gapstep',
    rotCost: 3,
    hpCostPct: 0,
    staminaCost: 15,
    cooldownSec: 1.2,
    summary: '4.5m shadow-seam blink with full i-frames and an ink-and-blood afterimage.',
    vestigeNote: '"Step between the masonry frames, Coffin. The stone won\'t notice."',
  },
  {
    id: 'bloodwage',
    keyLabel: '2',
    name: 'Bloodwage',
    rotCost: 5,
    hpCostPct: 12,
    staminaCost: 10,
    cooldownSec: 6.0,
    summary: 'Pay 12% HP to ignite your cutlass in arterial crimson fire (+65% damage for 8s).',
    vestigeNote: '"Your blood is cheap. Their posture isn\'t. Spend a cup."',
  },
  {
    id: 'crosspull',
    keyLabel: '3',
    name: 'Crosspull',
    rotCost: 4,
    hpCostPct: 0,
    staminaCost: 18,
    cooldownSec: 3.5,
    summary: 'Lash a crimson parasite tendon to yank distant targets into cutlass range and stagger them.',
    vestigeNote: '"Bring the choirboy to the knife."',
  },
  {
    id: 'call-bound',
    keyLabel: '4',
    name: 'Call the Bound',
    rotCost: 2,
    hpCostPct: 0,
    staminaCost: 10,
    cooldownSec: 1.0,
    summary: 'Cycle your active Bound Echo posture (FOLLOW → FIGHT → HOLD-DOOR) and rally their shadow.',
    vestigeNote: '" Seventy-three percent means they work for us even after the funeral."',
  },
  {
    id: 'red-second',
    keyLabel: 'R',
    name: 'Red Second',
    rotCost: 12,
    hpCostPct: 5,
    staminaCost: 20,
    cooldownSec: 10.0,
    summary: 'Dilate perception for 3.5s: world slows to 28% speed while Joss moves and cuts at full lethal tempo.',
    vestigeNote: '"Three seconds of godhood. Don\'t look at the black veins on your wrists."',
  },
];

export const INITIAL_BOUND_ECHOES: BoundEchoEntry[] = [
  {
    id: 'echo-01-bram',
    number: '01',
    name: 'Bram',
    epithet: 'The Shield',
    originFloor: 'F00 · The Unfinished Block (B13)',
    role: 'Tank',
    rank: 2,
    loyalty: 84,
    fsmState: 'FOLLOW',
    isBound: true,
    isSummoned: true,
    accentHex: '#9fd8e8',
    signatureSkill: 'Hold the Seam (Plants dented tower shield, absorbing 70% incoming damage & blocking choke points)',
    loyaltyGainTrigger: '+Loyalty when saving porters, holding ground, or sharing rations.',
    loyaltyLossTrigger: '-Loyalty when abandoning allies in flooded rooms (never leaves Joss even at 0).',
    refuseBehavior: 'Plants shield in front of Joss instead of attacking, grumbling about his bad knee.',
    quote: '"Knee\'s still clicking, kid. Put me where the door\'s narrow."',
    lore: 'Veteran Bearers Combine vanguard who died holding the B13 bulkhead so three rookie carriers could make the lift. Bound on Joss\'s first 73% extraction roll.',
  },
  {
    id: 'echo-02-mercy',
    number: '02',
    name: 'Mercy',
    epithet: 'The Lantern',
    originFloor: 'F01 · The Muster Shrine',
    role: 'Healer',
    rank: 2,
    loyalty: 76,
    fsmState: 'FOLLOW',
    isBound: true,
    isSummoned: true,
    accentHex: '#e8a020',
    signatureSkill: 'Vigil-Lamp Pulse (Restores +18 HP and washes -6% Sync/Rot from Joss\'s veins)',
    loyaltyGainTrigger: '+Loyalty when performing Chaplain rites, bowing to Palls, or sparing surrendering climbers.',
    loyaltyLossTrigger: '-Loyalty when executing non-hostiles or abusing Bloodwage past 80% Rot.',
    refuseBehavior: 'Dims her vigil-lamp and turns her veiled cone away until Joss lowers his blade.',
    quote: '"Oil burns cleaner than blood, little coffin. Let the lamp wash the black out."',
    lore: 'A Blind Choir sister of the Returned who carried a brass vigil-lamp through the Muster fog until her lungs turned to salt glass.',
  },
  {
    id: 'echo-03-hush',
    number: '03',
    name: 'Hush',
    epithet: 'The Blade',
    originFloor: 'F02 · The Endless Gala Hall',
    role: 'Assassin',
    rank: 2,
    loyalty: 62,
    fsmState: 'FIGHT',
    isBound: true,
    isSummoned: true,
    accentHex: '#e5482f',
    signatureSkill: 'Cut-Frame Sever (Skips render columns to teleport behind staggered foes for a 2.2x crimson backslash)',
    loyaltyGainTrigger: '+Loyalty when landing clean Sekiro parries and winning 1v1 duels in under 30 seconds.',
    loyaltyLossTrigger: '-Loyalty when stalling, fleeing duels, or begging for parley.',
    refuseBehavior: 'Flickers out of phase on skipped frames, watching from the rafters with folded arms.',
    quote: '"Two frames between their heartbeat and the floor. Don\'t waste the third."',
    lore: 'A disgraced Table retainer who tried to assassinate Heir Seven (Rook) on the Gala balcony and lost his head in 1.4 seconds.',
  },
  {
    id: 'echo-04-ashfang',
    number: '04',
    name: 'Ashfang',
    epithet: 'The Soot-Hound',
    originFloor: 'F00 · B13 Flooded Stair',
    role: 'Tracker',
    rank: 1,
    loyalty: 78,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#9fd8e8',
    signatureSkill: 'Ankle-Snare Lunge (Pins fast runners and barks twice when VESTIGE lies)',
    loyaltyGainTrigger: '+Loyalty when tossing core scraps after combat.',
    loyaltyLossTrigger: '-Loyalty when caught in friendly-fire AoE strikes.',
    refuseBehavior: 'Curls by Old Beck\'s stove and whines at Joss\'s shadow.',
    quote: '[Two sharp barks — radar ears locked straight up.]',
    lore: 'A feral Truhound pack-leader drowned in the B13 black-water surge; its shadow still tracks honest scent trails.',
  },
  {
    id: 'echo-05-varn',
    number: '05',
    name: 'Varn',
    epithet: 'The Toll-Keeper',
    originFloor: 'F01 · Choke-Point Bridge',
    role: 'Bruiser',
    rank: 1,
    loyalty: 55,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e8a020',
    signatureSkill: 'Chain-Hook Drag (Hauls armored sentinels off ledges)',
    loyaltyGainTrigger: '+Loyalty when paying Combine dues on the honest ledger.',
    loyaltyLossTrigger: '-Loyalty when breaking sworn toll parleys.',
    refuseBehavior: 'Drops his iron chain and demands a 50-scrip tithe before swinging.',
    quote: '"Pay the bridge or swim the dark, porter."',
    lore: 'Held the F01 central span for four seasons before Table auxiliaries bought out his squad.',
  },
  {
    id: 'echo-06-nell',
    number: '06',
    name: 'Nell',
    epithet: 'The Chalk-Scribe',
    originFloor: 'F01 · Returned Crawlspace',
    role: 'Tactician',
    rank: 1,
    loyalty: 81,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#f4efe4',
    signatureSkill: 'White-Chalk Sight (Marks hidden crawlspaces, traps, and unfiled doors)',
    loyaltyGainTrigger: '+Loyalty when inspecting Returned chalk marks.',
    loyaltyLossTrigger: '-Loyalty when leading Table inquisitors near safe-houses.',
    refuseBehavior: 'Draws a X-slash in chalk across Joss\'s boots and vanishes.',
    quote: '"Three lines means dry air. Crossed circle means run."',
    lore: 'Seventeen-year-old scout for The Returned who mapped nineteen secret vents across the Down.',
  },
  {
    id: 'echo-07-korr',
    number: '07',
    name: 'Korr',
    epithet: 'The Bell-Ringer',
    originFloor: 'F02 · North Bell Loft',
    role: 'Controller',
    rank: 2,
    loyalty: 68,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e8a020',
    signatureSkill: 'Bronze Toll Wave (Stuns all enemies in a 5m radius on Bell chime)',
    loyaltyGainTrigger: '+Loyalty when fighting aggressively during Bell transitions.',
    loyaltyLossTrigger: '-Loyalty when silencing floor bells prematurely.',
    refuseBehavior: 'Strikes his own chest-plate like a dead bell, refusing to advance.',
    quote: '"First bell for the greedy. Second for the proud. Third for the bound."',
    lore: 'Mute foundry giant who cast the three bronze bells of the Gala Hall.',
  },
  {
    id: 'echo-08-velvet',
    number: '08',
    name: 'Cassian',
    epithet: 'Sera\'s Debtor',
    originFloor: 'F02 · Banquet Floor',
    role: 'Duelist',
    rank: 2,
    loyalty: 50,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e5482f',
    signatureSkill: 'Gilded Riposte (Counters melee swings and steals 15 scrip per parry)',
    loyaltyGainTrigger: '+Loyalty when winning outnumbered skirmishes without VESTIGE deals.',
    loyaltyLossTrigger: '-Loyalty when taking parasite shortcuts mid-duel.',
    refuseBehavior: 'Polishes his broken mask and laughs at Joss\'s footwork.',
    quote: '"Sera owns my coat, Coffin. You only own my shadow."',
    lore: 'High-stakes fencer who mortgaged his own lungs at the Gilt Bazaar.',
  },
  {
    id: 'echo-09-stitch',
    number: '09',
    name: 'Stitch',
    epithet: 'The Pall-Fragment',
    originFloor: 'F03 · The Cloth Vault',
    role: 'Support',
    rank: 2,
    loyalty: 74,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e8a020',
    signatureSkill: 'Gold-Stitch Mantle (Wraps Joss in 1 nested cloth cone that absorbs a lethal blow)',
    loyaltyGainTrigger: '+Loyalty when bowing in obeisance before engaging Palls.',
    loyaltyLossTrigger: '-Loyalty when striking first against passive beasts.',
    refuseBehavior: 'Unravels its gold stitch-ring and drapes motionless.',
    quote: '"Bow first. The cloth remembers manners."',
    lore: 'An ancient Pall shroud woven from the burial cloaks of the first expedition.',
  },
  {
    id: 'echo-10-gav',
    number: '10',
    name: 'Gav',
    epithet: 'The Cinder-Mason',
    originFloor: 'F04 · Kiln Shaft',
    role: 'Siege',
    rank: 1,
    loyalty: 79,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#a89f94',
    signatureSkill: 'Load-Bearing Sledge (Shatters cracked masonry walls and heavy armor)',
    loyaltyGainTrigger: '+Loyalty when opening shortcuts for Combine porters.',
    loyaltyLossTrigger: '-Loyalty when collapsing tunnels behind survivors.',
    refuseBehavior: 'Rests his sledgehammer head on the concrete and shakes his head.',
    quote: '"This wall\'s fake, kid. Hear how hollow the Table poured it?"',
    lore: 'Helped pour the Terminus foundations before the first Fluxburn wave hit Ward C.',
  },
  {
    id: 'echo-11-tallow',
    number: '11',
    name: 'Tallow',
    epithet: 'The Lamp-Wick',
    originFloor: 'F05 · Dark Warren',
    role: 'Support',
    rank: 1,
    loyalty: 82,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e8a020',
    signatureSkill: 'Shrine-Oil Flare (Burns away dark-fog and reveals stealthed stalkers)',
    loyaltyGainTrigger: '+Loyalty when relighting Old Beck\'s crossing shrines.',
    loyaltyLossTrigger: '-Loyalty when passing an unlit shrine without pausing.',
    refuseBehavior: 'Snuffs his wick between two cyan fingers.',
    quote: '"Keep the wick trimmed for the ones who didn\'t make the gate."',
    lore: 'Old Beck\'s former apprentice who carried lamp-oil down to Floor 5 and never came up.',
  },
  {
    id: 'echo-12-lens',
    number: '12',
    name: 'Lens',
    epithet: 'The Wire-Surgeon',
    originFloor: 'F06 · Triage Annex',
    role: 'Assassin',
    rank: 2,
    loyalty: 64,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#5591c7',
    signatureSkill: 'Tendon Sever (Applies heavy bleed and slows boss movement by 35%)',
    loyaltyGainTrigger: '+Loyalty when delivering intact cores to Doc Sable.',
    loyaltyLossTrigger: '-Loyalty when wasting stabilizer vials at full health.',
    refuseBehavior: 'Clicks her surgical shears shut and refuses to engage.',
    quote: '"Cut above the knee-strap. Always above the strap."',
    lore: 'Field medic who trained under Doc Sable before the Table requisitioned Ward B.',
  },
  {
    id: 'echo-13-pell',
    number: '13',
    name: 'Pell',
    epithet: 'The Oath-Clerk',
    originFloor: 'F08 · Audit Archive',
    role: 'Tactician',
    rank: 2,
    loyalty: 70,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#9fd8e8',
    signatureSkill: 'True Manifest (Highlights enemy posture break thresholds and bonus core drops)',
    loyaltyGainTrigger: '+Loyalty when logging honest weights at The Hold scale.',
    loyaltyLossTrigger: '-Loyalty when skimming Combine widow shares.',
    refuseBehavior: 'Closes his iron ledger with a loud snap.',
    quote: '"Two books in Cinderfall, Joss. Make sure your name\'s in the dry one."',
    lore: 'Combine bookkeeper murdered by Auditor Voss\'s clerks for keeping the unedited death tally.',
  },
  {
    id: 'echo-14-bellows',
    number: '14',
    name: 'Bellows',
    epithet: 'Iron-Lungs',
    originFloor: 'F09 · Smog Sump',
    role: 'Tank',
    rank: 3,
    loyalty: 88,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#6daa45',
    signatureSkill: 'Clean-Draft Exhale (Purges Flux-miasma clouds and grants +30% stamina regen)',
    loyaltyGainTrigger: '+Loyalty every time Joss deposits scrip toward Wren\'s 2M graft.',
    loyaltyLossTrigger: '-Loyalty if Joss spends clinic money on luxury bazaar trinkets.',
    refuseBehavior: 'Taps his brass respirator and points back toward Ward C.',
    quote: '"Pay for your sister\'s lungs first, boy. I\'ll hold the smog."',
    lore: 'A forty-year porter who survived three cases of Fluxburn with a hand-brazed copper lung.',
  },
  {
    id: 'echo-15-giltear',
    number: '15',
    name: 'Gilt-Ear',
    epithet: 'The Crown-Hound',
    originFloor: 'F11 · Table Outpost',
    role: 'Tracker',
    rank: 3,
    loyalty: 58,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e8a020',
    signatureSkill: 'Silent Quarry (Prevents loud Parasite kills from ticking the Gilded Table Clock)',
    loyaltyGainTrigger: '+Loyalty when eliminating Table spotters before they flare.',
    loyaltyLossTrigger: '-Loyalty when triggering public alarm bells.',
    refuseBehavior: 'Growls low at the Table crest and stalks in circles.',
    quote: '"Heir Seven\'s scent is gold wax and cold iron. He\'s two floors up."',
    lore: 'War-hound bred by House Seven, abandoned when it refused to maul unarmed carriers.',
  },
  {
    id: 'echo-16-marrow',
    number: '16',
    name: 'Marrow',
    epithet: 'The Twice-Dead',
    originFloor: 'F12 · The Ossuary',
    role: 'Bruiser',
    rank: 3,
    loyalty: 61,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e5482f',
    signatureSkill: 'Refuse the Grave (Automatically intercepts one fatal blow per floor and counter-slams)',
    loyaltyGainTrigger: '+Loyalty when surviving a floor without taking VESTIGE\'s Memory Tithe.',
    loyaltyLossTrigger: '-Loyalty when sacrificing Echo ranks to pay a Memory Tithe.',
    refuseBehavior: 'Stands rigid like a bone pillar, refusing to take a step.',
    quote: '"Don\'t sell your head to the Laugh, Coffin. Die honest or don\'t die."',
    lore: 'A climber who rejected a parasite host bargain and fought on broken ribs for six hours.',
  },
  {
    id: 'echo-17-vanekeen',
    number: '17',
    name: 'Vane-Keen',
    epithet: 'The Glass-Archer',
    originFloor: 'F13 · Wind Causeway',
    role: 'Duelist',
    rank: 3,
    loyalty: 75,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#9fd8e8',
    signatureSkill: 'Spire-Glass Pin (Fires overwatch bolts that interrupt enemy wind-ups)',
    loyaltyGainTrigger: '+Loyalty when fighting from elevated ledges or balconies.',
    loyaltyLossTrigger: '-Loyalty when rushing blindly into crossfire.',
    refuseBehavior: 'Unstrings her bow and waits on high ground.',
    quote: '"Wind\'s coming down from Floor 16. Aim two fingers left."',
    lore: 'Distant cousin of Joss\'s father who vanished on the 13th Causeway ten years ago.',
  },
  {
    id: 'echo-18-vespers',
    number: '18',
    name: 'Vespers',
    epithet: 'The Choir-Mute',
    originFloor: 'F14 · Chapel Ruin',
    role: 'Controller',
    rank: 4,
    loyalty: 72,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#f4efe4',
    signatureSkill: 'Chaplain\'s Silence (Creates a 4m hush dome and peacefully lays Returnlings to rest on Life 3)',
    loyaltyGainTrigger: '+Loyalty when granting Returnlings their final Chaplain Rite.',
    loyaltyLossTrigger: '-Loyalty when farming Returnling revives for extra XP.',
    refuseBehavior: 'Kneels in silent prayer over the nearest corpse (`MOURN` state).',
    quote: '"Three lives is enough for any man to suffer. Give him the word."',
    lore: 'The last ordained Spire Chaplain who stayed behind when the Gilded Table closed the lower chapels.',
  },
  {
    id: 'echo-19-kaelen',
    number: '19',
    name: 'Kaelen',
    epithet: 'Gate-Warden\'s Shadow',
    originFloor: 'F15 · Threshold of the Down',
    role: 'Vanguard',
    rank: 4,
    loyalty: 66,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#e8a020',
    signatureSkill: 'Threshold Halberd Cleave (Wide 270° posture-shattering sweep)',
    loyaltyGainTrigger: '+Loyalty when challenging Floor Guardians and Wardens face-to-face.',
    loyaltyLossTrigger: '-Loyalty when using Gilded Table skip-writs.',
    refuseBehavior: 'Bars the ascenso-lift door with his halberd shaft.',
    quote: '"No writ passes Floor 15 unweighed. Show me your steel, E-rank."',
    lore: 'Former captain of the 15th Threshold who swore an oath to Warden IV.',
  },
  {
    id: 'echo-20-alden',
    number: '20',
    name: 'Alden',
    epithet: 'The First-Carrier',
    originFloor: 'F16 · Middle Threshold',
    role: 'Vanguard',
    rank: 5,
    loyalty: 95,
    fsmState: 'IDLE',
    isBound: false,
    isSummoned: false,
    accentHex: '#6daa45',
    signatureSkill: 'Combine Standard (Doubles core scrip yield and rallies Bram, Mercy & Hush to +25% speed)',
    loyaltyGainTrigger: '+Loyalty when Bram reaches 90+ Loyalty and Wren\'s fund exceeds 500,000 scrip.',
    loyaltyLossTrigger: 'Never drops below 50 Loyalty once bound.',
    refuseBehavior: 'Never refuses an order that protects a porter.',
    quote: '"Eight thousand backs carry Cinderfall. Stand up straight, Coffin."',
    lore: 'Founder of the Bearers Combine who carried the first load of core-stone out of Floor Zero sixty years ago.',
  },
];

export const WARDEN_ACCORDS: WardenAccordEntry[] = [
  {
    id: 'warden-1-mason',
    numeral: 'I',
    name: 'The Mason of Unfinished Stone',
    floorRange: 'Floors 00–02 · The Unfinished Block',
    accordTitle: 'Accord of the Unmarked Door',
    boon: 'Reveals all Returned crawlspaces, secret concrete seams, and grants +15% Cutlass Posture Break.',
    price: 'Joss can never carry an official Gilded Table Ascent Writ (+1 Table Suspicion on loud clears).',
    refusalConsequence: 'F00–F02 shortcut seams remain sealed; Husks gain +20% armor.',
    quote: '"We poured the seventh floor without a blueprint so the Table could not tax the door."',
    isSworn: true,
    rotModifier: 0,
    attackBonusPct: 15,
  },
  {
    id: 'warden-2-scale',
    numeral: 'II',
    name: 'The Toll-Scale',
    floorRange: 'Floor 05 · The Weigh-House',
    accordTitle: 'Accord of Equal Weight',
    boon: 'Porter packs weigh nothing (+15% Sprint & Dodge speed) and Core drops yield +25% bonus Scrip.',
    price: '10% of every run\'s Scrip haul is automatically tithed to the Bearers Combine Widow Fund.',
    refusalConsequence: 'Heavy core hauls slow sprint speed by 10% until weighed by Old Beck.',
    quote: '"Gold weighs the same as bone on my pan, carrier."',
    isSworn: false,
    rotModifier: 0,
    attackBonusPct: 5,
  },
  {
    id: 'warden-3-bellfounder',
    numeral: 'III',
    name: 'The Bell-Founder',
    floorRange: 'Floor 10 · The Bronze Foundry',
    accordTitle: 'Accord of the Fourth Chime',
    boon: 'Extends Sekiro Deflect window by +120ms and adds +1.0s to Red Second slow-motion duration.',
    price: 'Every deflect rings with a bronze chime that increases enemy aggro radius by +25%.',
    refusalConsequence: 'Bell transitions in Floor 2 and Floor 10 inflict brief tinnitus stagger.',
    quote: '"Strike true and the whole floor hears your name."',
    isSworn: false,
    rotModifier: -2,
    attackBonusPct: 10,
  },
  {
    id: 'warden-4-floodkeeper',
    numeral: 'IV',
    name: 'The Flood-Keeper',
    floorRange: 'Floor 15 · Gate to The Middle',
    accordTitle: 'Accord of Dry Breath',
    boon: 'Halves passive Sync/Rot gain from Parasite Techniques and sends 1 Middle-Grade Breath Vial to Wren.',
    price: 'Locks out VESTIGE\'s Bloodwage HP-sacrifice during Boss encounters.',
    refusalConsequence: 'Black-water basins on F00 and F15 slowly build +1% Rot per 10 seconds.',
    quote: '"Keep the black water below your chin, brother, so your sister can breathe above."',
    isSworn: false,
    rotModifier: -5,
    attackBonusPct: 0,
  },
  {
    id: 'warden-5-inquisitor',
    numeral: 'V',
    name: 'The Ledger-Inquisitor',
    floorRange: 'Floor 30 · The Middle Archive',
    accordTitle: 'Accord of the Flat Scan',
    boon: 'Guarantees gate scanners read "E · 11 · FLAT" even up to 80% Sync/Rot, reducing Table Clock ticks.',
    price: 'Requires surrendering 1 childhood memory to the Archive stone.',
    refusalConsequence: 'Auditor Voss\'s scanners detect Joss\'s real level whenever Sync exceeds 50%.',
    quote: '"An unfiled line in the ledger is the only free man in Cinderfall."',
    isSworn: false,
    rotModifier: 0,
    attackBonusPct: 10,
  },
  {
    id: 'warden-6-saltchoir',
    numeral: 'VI',
    name: 'The Choir of Salt',
    floorRange: 'Floor 50 · Gate to The Up',
    accordTitle: 'Accord of the Unbound Tongue',
    boon: 'Allows Bram, Mercy, and Hush to fight simultaneously with +25% Loyalty resilience.',
    price: 'Whenever an Echo falls in combat, Joss suffers +8% instant Sync/Rot backlash.',
    refusalConsequence: 'Only 1 Bound Echo may manifest in The Up at a time.',
    quote: '"Do not call them shadows if you expect them to bleed for you."',
    isSworn: false,
    rotModifier: 2,
    attackBonusPct: 20,
  },
  {
    id: 'warden-7-architect',
    numeral: 'VII',
    name: 'The First Architect',
    floorRange: 'Floor 77 · The Crown of Nullspire',
    accordTitle: 'Accord of Level Zero',
    boon: 'Unlocks the Endgame Dual-Resolution: Shatter the Spire Monopoly OR Claim the Parasite Throne.',
    price: 'Final reckoning with VESTIGE ("The Laugh") at 100% Sync.',
    refusalConsequence: 'The cycle of the 77 Floors resets.',
    quote: '"The mountain was never a tower, Coffin. It was a lock."',
    isSworn: false,
    rotModifier: 0,
    attackBonusPct: 25,
  },
];

export const INITIAL_JOSS_MEMORIES: JossMemoryEntry[] = [
  {
    id: 'mem-wren-scarf',
    title: 'Wren Knitting the Red Scarf',
    yearLabel: '3 Years Ago · Ward C Tenement',
    originalText:
      'Wren sat by the paraffin stove with chapped fingers, dyeing cheap porter wool in beet-root and iron rust so you\'d be visible in the Terminus fog.',
    tithedCorruptedText:
      '[TITHED TO VESTIGE]: A girl with anblurred face handed you a strip of arterial cloth. You remember the weight of the wool, but not the sound of her laugh.',
    isTithed: false,
  },
  {
    id: 'mem-beck-crutch',
    title: 'Old Beck\'s First Lesson on the Scale',
    yearLabel: '2 Years Ago · The Hold Back-Room',
    originalText:
      'Beck rapped his crutch-spear against your knuckles when you tried to lift a cracked F03 core bare-handed: "Gloves first, Coffin. Dead heroes don\'t pay Ward C rent."',
    tithedCorruptedText:
      '[TITHED TO VESTIGE]: An old man with one leg told you that cores are worth more than fingers. The warmth in his voice has been scraped out.',
    isTithed: false,
  },
  {
    id: 'mem-flat-scan',
    title: 'The Day the Gate Read "E · 11 · FLAT"',
    yearLabel: '14 Months Ago · Spire Gate Pylon 4',
    originalText:
      'The Table clerk didn\'t even look up from his brass slate. "Eleven. Flatline. Porter badge only. Next." You tasted blood from biting your lip scar.',
    tithedCorruptedText:
      '[TITHED TO VESTIGE]: The pylon buzzed like a laughing tooth. Eleven. A perfect number for a door that shouldn\'t open.',
    isTithed: false,
  },
  {
    id: 'mem-mother-song',
    title: 'The Salt-Quay Lullaby',
    yearLabel: '9 Years Ago · Lower Cinderfall',
    originalText:
      'Three notes hummed against the iron bulkhead while the Spire sirens wailed overhead. It\'s the only tune that stops Wren\'s coughing fits at 3 AM.',
    tithedCorruptedText:
      '[TITHED TO VESTIGE]: Three metallic notes. When you try to hum them now, it sounds like VESTIGE tapping on the inside of your skull.',
    isTithed: false,
  },
  {
    id: 'mem-rook-carriage',
    title: 'Heir Seven\'s Gold Carriage in the Slush',
    yearLabel: '6 Months Ago · Terminus Avenue',
    originalText:
      'Rook stepped out in white wool without a speck of soot on his boots. He tossed a half-scrip coin into the mud near your crate—not out of cruelty, just because he didn\'t see you.',
    tithedCorruptedText:
      '[TITHED TO VESTIGE]: A boy in a gold braid. VESTIGE has circled his throat in red ink across your optic nerve.',
    isTithed: false,
  },
];

export const VESTIGE_WHISPER_DEALS: VestigeWhisperDeal[] = [
  {
    id: 'whisper-b13-six-seconds',
    title: 'The B13 Black-Water Bargain ("Six Seconds")',
    triggerContext: 'Floor 0 · Basement 13 Flooded Bulkhead',
    vestigeLine:
      '"Six seconds of breath left, Coffin. Scout Lark\'s pinned under the rebar, and three Grade-2 cores are sinking into the sump. Take my hand—we pull both, and it barely costs a smudge on the scan."',
    isLie: true,
    lieTellNote: 'LIE DETECTED (Truhound ears flat): VESTIGE claims the scan won\'t spike, but taking the greedy double-haul adds +14% Rot and ticks the Table Clock.',
    acceptLabel: 'Take VESTIGE\'s Hand (+45,000 Scrip, +14% Rot, +1 Table Clock)',
    refuseLabel: 'Save Lark with Raw Porter Muscle (+Bram Loyalty, +0% Rot, +15,000 Scrip)',
    boonDescription: '+45,000 Scrip haul & instant full HP/Stamina surge.',
    priceDescription: '+14% Sync/Rot & +1 tick on The Gilded Table Clock.',
    rotDelta: 14,
    scripDelta: 45000,
    hpHealPct: 100,
    tableClockDelta: 1,
  },
  {
    id: 'whisper-muster-choke',
    title: 'The Muster Toll-Breaker Whisper',
    triggerContext: 'Floor 1 · The Choke-Point Bridge',
    vestigeLine:
      '"Two hundred climbers, one hundred writs. Why crawl through the chalk-rat vent when we can paint the bridge with Bloodwage? Nobody up in the Office is watching Floor One."',
    isLie: true,
    lieTellNote: 'LIE DETECTED: Auditor Voss has scrying lenses mounted on the Muster arch. Loud Parasite clears advance the Table Clock.',
    acceptLabel: 'Unleash Loud Optimal Power (+35,000 Scrip, +10% Rot, +1 Table Clock)',
    refuseLabel: 'Take the Returned Crawlspace (+1 Returned Clock, -4% Rot, +Mercy Loyalty)',
    boonDescription: '+35,000 Scrip from toll-guard pouches & +1 Level stat boost.',
    priceDescription: '+10% Sync/Rot & +1 tick on The Gilded Table Clock.',
    rotDelta: 10,
    scripDelta: 35000,
    hpHealPct: 40,
    tableClockDelta: 1,
  },
  {
    id: 'whisper-gala-bell3',
    title: 'The Bell Three Clause ("The Bound Count Double")',
    triggerContext: 'Floor 2 · The Endless Gala Hall (Bell 3 Rematch)',
    vestigeLine:
      '"Read the fine print carved into the chandelier, kid: \'Sigils worn by the bound dead count double.\' Let Hush and Bram off the leash, pop a Red Second, and let\'s take Heir Seven\'s crown."',
    isLie: false,
    lieTellNote: 'TRUTH (Truhound ears perked straight up): The ancient Gala clause is real. Bound Echoes double your Sigil tally.',
    acceptLabel: 'Invoke the Bound Clause & Red Second (+80,000 Scrip, +8% Rot)',
    refuseLabel: 'Duel Rook with Pure Cutlass Steel (+50,000 Scrip, +0% Rot, +Hush Loyalty)',
    boonDescription: '+80,000 Scrip toward Wren\'s graft & double Sigil multiplier.',
    priceDescription: '+8% Sync/Rot.',
    rotDelta: 8,
    scripDelta: 80000,
    hpHealPct: 50,
    tableClockDelta: 0,
  },
];

export const NULLSPIRE_ZONES: NullspireFloorZone[] = [
  {
    id: 'the-hold',
    code: 'HUB · TERMINUS',
    title: 'The Hold & Spire Gate',
    subtitle: 'Bearers Combine Back-Room · Old Beck\'s Scale · Shrine & Cyan Corner',
    actLabel: 'Cinderfall Base (0m)',
    x: 0,
    z: 1.2,
    recommendedLevel: 1,
    summary:
      'Cutaway concrete warehouse headquarters of the Bearers Combine. Weigh cores at Old Beck\'s manifest desk, light oil at the Crossing Shrine, or inspect Bram, Mercy, and Hush in the cyan-fog corner.',
    mechanicsNote: 'Safe Hub: Interact with Old Beck, Truhound, or the Crossing Shrine to restore Echo Loyalty.',
  },
  {
    id: 'gilt-bazaar',
    code: 'HUB · BAZAAR',
    title: 'The Gilt Bazaar (Sera\'s Fiat Field)',
    subtitle: 'Three-Floor Market · Peace-Bonded Blades · Cutlass Tempering',
    actLabel: 'Cinderfall West (-7.5m)',
    x: -7.5,
    z: -1.8,
    recommendedLevel: 1,
    summary:
      'Three stacked market tiers plus an unrecorded fourth dashed floor. Inside Sera\'s Fiat Field, blades cannot be drawn—trade scrip to temper your Porter Cutlass or buy Returned chalk maps.',
    mechanicsNote: 'Upgrade Cutlass edge, Lantern radius, and Porter harness.',
  },
  {
    id: 'sable-clinic',
    code: 'HUB · CLINIC',
    title: 'Doc Sable\'s Container Clinic',
    subtitle: 'Sync/Rot Washing · Padlocked Fridge (6 Vials) · Wren\'s Ward C Fund',
    actLabel: 'Cinderfall North-East (+7.4m)',
    x: 7.4,
    z: -12.8,
    recommendedLevel: 1,
    summary:
      'A converted shipping container smelling of ozone and clove antiseptic. Doc Sable washes parasite Rot from your blood and wires your scrip installments toward Wren\'s 2,000,000 scrip breath-graft.',
    mechanicsNote: 'Wash -20% Sync/Rot or deposit Scrip into Wren\'s 2M Clinic Fund.',
  },
  {
    id: 'floor-0',
    code: 'RUN 01 · F00',
    title: 'Floor Zero: The Unfinished Block',
    subtitle: '6 Grey Floors · Unmarked Door F7 · B13 Black Water & First BIND',
    actLabel: 'The Down (F00 · B13)',
    x: -1.8,
    z: -13.5,
    recommendedLevel: 1,
    summary:
      'Raw poured concrete pillars and flooded rebar sumps. Where the unmarked seventh door opened itself, VESTIGE woke in Joss\'s skull, and Bram was bound from the black water.',
    mechanicsNote: 'Tutorial & Awakening Slice: Husks, Six Seconds choice, and 73% BIND extraction.',
  },
  {
    id: 'floor-1',
    code: 'RUN 02 · F01',
    title: 'Floor One: The Muster Ward',
    subtitle: '200 Climbers In, 100 Writs Out · Choke-Point Toll vs. Returned Crawlspace',
    actLabel: 'The Down (F01)',
    x: -2.0,
    z: 11.2,
    recommendedLevel: 3,
    summary:
      'A shifting three-day slate labyrinth. Cross the Choke-Point Bridge by force (risking Auditor Voss\'s scrying lenses) or slip through the Returned chalk crawlspace and bow before The Pall.',
    mechanicsNote: 'Encounter The Pall (bow [G] to stun) and bind Mercy (Echo 02).',
  },
  {
    id: 'floor-2',
    code: 'RUN 03 · F02',
    title: 'Floor Two: The Endless Gala Hall',
    subtitle: 'Five Teams · Three Bells · Heir Seven (Rook) Balcony Duel',
    actLabel: 'The Down (F02)',
    x: 9.5,
    z: 10.4,
    recommendedLevel: 5,
    summary:
      'Obsidian banquet floor beneath tarnished gold chandeliers and three bronze bells. Survive Rook\'s Hushblades in Bell 2, then invoke the Bound Dead sigil clause in Bell 3.',
    mechanicsNote: 'Boss & Rival Arena: Returnling (3 lives + Chaplain Rite) & Rook (Heir Seven).',
  },
];

export const WORLD_BIBLE_SECTIONS = [
  {
    id: 'wb-premise',
    number: '01',
    title: 'The Premise & The Flat Scan',
    kicker: 'Cinderfall · 12km South of the Nullspire',
    body: [
      'Twelve kilometers north of Cinderfall rises the Nullspire: a black mountain with 77 internal floors divided into The Down (F00–15), The Middle (F16–50), and The Up (F51–77). Everything the city breathes, burns, or cures is hauled out of those floors.',
      'Joss Vane ("Coffin"), 19, is an E-rank porter for the Bearers Combine. Every time he steps through the Spire Gate, the brass pylon reads the same three words: E-RANK · 11 · FLAT. No growth potential. No ascent writ.',
      'His 16-year-old sister Wren lies in Ward C with Fluxburn calcifying her lungs. A Middle-floor breath-graft costs 2,000,000 scrip. On a routine corpse-haul in Floor Zero\'s Basement 13, an unmarked seventh door groans open on its own—and something inside the flooded dark laughs inside Joss\'s skull.',
    ],
  },
  {
    id: 'wb-vestige',
    number: '02',
    title: 'VESTIGE ("The Laugh") & Sync / Rot',
    kicker: 'The Parasite System · Levels, Whispers & Memory Tithe',
    body: [
      'VESTIGE is not a benevolent status window. It is a starving, street-talking parasite nesting behind Joss\'s optic nerve. While the Gate pylons still read Joss as a flatline 11, VESTIGE grants real levels (+3 stat points per level across STR, VIT, AGI, INT, WILL, SENSE).',
      'Every Parasite Technique—Gapstep, Bloodwage, Crosspull, Call the Bound, and the 3-second slow-motion Red Second—pushes Joss\'s Sync / Rot meter from 0% toward 100%. Past 70% Sync, Joss\'s blood-red scarf visibly darkens toward pitch black and crimson veins creep across the edge of his vision.',
      'If Joss dies inside the Spire, VESTIGE offers the Memory Tithe: instant resurrection on the spot in exchange for all unbanked run loot, one Echo rank-down, and one real memory of Wren or Old Beck permanently rewritten in Joss\'s journal.',
    ],
  },
  {
    id: 'wb-bound',
    number: '03',
    title: 'BIND (73%) & The Bound Echoes',
    kicker: 'Autonomous Shadow Retainers with Loyalty & Will',
    body: [
      'When a worthy enemy or fallen climber dies, VESTIGE offers a single roll: BIND (73% base extraction chance). On the 27% failure, the soul screams, shatters, and buffs every remaining enemy in the room.',
      'On success, the fallen becomes one of The Bound—not a mindless puppet, but an Echo retaining its silhouette, habits, and a Loyalty score from 0 to 100. Each Echo runs a 6-state FSM: IDLE, FOLLOW, HOLD-DOOR, FIGHT, REFUSE, and MOURN.',
      'Bram (Echo 01, The Shield) holds narrow doors and complains about his bad knee; Mercy (Echo 02, The Lantern) washes Rot with warm gold light; Hush (Echo 03, The Blade) teleports on skipped animation frames.',
    ],
  },
  {
    id: 'wb-factions',
    number: '04',
    title: 'Three Factions & Two Racing Clocks',
    kicker: 'The Gilded Table · The Returned · The Bearers Combine',
    body: [
      '1. THE GILDED TABLE (Order): Seven noble houses and their Crown Heirs (including Rook, Heir Seven) who monopolize Ascent Writs and breath-grafts. Auditor Voss runs their inquisitorial ledger. Their clock—"Find the Door-Breaker" (0/8)—ticks up whenever Joss uses loud, optimal parasite power in view of scrying lenses.',
      '2. THE RETURNED (Rebellion): Underground climbers, blind chaplains, and smugglers who leave white chalk sigils around crawlspaces and smuggle stabilizer vials into Ward C. Their clock—"Recruit the Door-Breaker" (0/6)—advances when Joss uses quiet porter craft and honors fallen rites.',
      '3. THE BEARERS COMBINE (Ground): Eight thousand porters led in the Terminus by Old Beck. They keep two books: the clean manifest for Auditor Voss, and the true book written in oil and salt.',
    ],
  },
  {
    id: 'wb-beasts',
    number: '05',
    title: 'Ecology of the Down: Palls, Returnlings & Truhounds',
    kicker: 'Manners, Three Lives, and Radar Ears',
    body: [
      'THE PALL: A towering cone of three nested burial shrouds stitched with gold rings around a single red eye. A Pall never strikes first. If a climber bows in obeisance ([G] Respect), the Pall freezes in solemn acknowledgment for 4 seconds. Each HP threshold sheds one physical cloth layer.',
      'THE RETURNLING: A climber whom the Spire refused to let die cleanly. It fights across three distinct lives: Life 1 weeps and lunges wildly; Life 2 laughs at +40% speed; Life 3 drops its weapon and begs to negotiate. Only performing the Chaplain\'s Rite lays it to rest before a monstrous Life 4 erupts.',
      'THE TRUHOUND: Lean ridgeback hounds bred by porters. Their oversized radar ears perk straight up when spoken truth is heard—and fold flat with a double-bark whenever VESTIGE speaks or lies.',
    ],
  },
];
