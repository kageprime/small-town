# Implementation Plan: Hand-Crafted Sanctuary Canal City, Living Community, Dialogue Engine & Cutscenes

## 1. Architectural Shift: From Procedural Scatter to Hand-Crafted City Design
We will retire the noisy procedural terrain and combat/enemy focus in favor of **Vaelenport (The Sanctuary Canal City)**—a hand-composed, multi-tiered isometric diorama city where every street, stone bridge, canal lock, guildhouse, interior room, and lantern sightline is deliberately authored for the pixel-art camera.

### Phase 1: Hand-Crafted Multi-Tier Canal City (`src/scene/buildSanctuaryCity.ts`)
- **Tier 1 — The Lantern Plaza & Clockwork Fountain (Central Tier, `y = 0.28m`)**:
  - Hand-laid herringbone cobblestone square centered around the **Astral Astrolabe Fountain** with animated water tiers and stone benches.
  - **The Guildhall & Bellwright Workshop** on the west flank with timber-framed upper stories, pitched slate roofs, dormant/glowing leaded windows, swaying guild banners, and an enterable workshop interior (with automatic roof cutaway).
  - **The Hearthside Tavern & Bakery** on the east flank with warm hearth light spilling onto the flagstones, outdoor tables, barrels, flower boxes, and chimney smoke plumes.
- **Tier 2 — The Lower Canal Quays & Lock Gates (Southern & Eastern Waterway, `y = 0.08m`)**:
  - Stepped stone embankments, twin arched footbridges with iron streetlamps, wooden mooring jetties, and a gentle canal current with harmonic ripple rings and moored gondola skiffs.
  - **The Ferryman's Boathouse & Lock Control** where the canal lock gates can be raised/lowered during story events.
- **Tier 3 — The Scholars' Cloister & Apothecary Conservatory (Northern Upper Terrace, `y = 1.15m`)**:
  - Reached via a grand carved stone staircase flanked by braziers and cypress trees.
  - Arched gothic colonnade, stained-glass rose windows that illuminate at dusk, moon-lily botanical planters, and an enterable **Apothecary & Archive Interior** with bookshelves, alchemy alembics, and reading desks.

---

## 2. Characters, Living Community & Daily Schedules (`src/scene/cityCitizens.ts`)
Each citizen has a distinct hand-crafted 3D character rig, idle/work animation, vocal register for dialogue blips, and a **24-Hour Schedule** synced to the game clock:
1. **Master Vaelen (The Clockmaker & Bellwright)**:
   - *Visuals*: Tall brass-buckled stovepipe hat, spectacles, bronze coat, carrying a tuning fork.
   - *Schedule*: Inspects the Astrolabe Fountain at dawn/noon (`07:00–16:00`), works inside the Guildhall Workshop at dusk (`16:00–20:00`), and warms his hands by the Tavern Plaza brazier at night (`20:00–07:00`).
2. **Isolde (The Cloister Apothecary & Botanist)**:
   - *Visuals*: Emerald herbalist mantle, wide-brimmed witch hat, glowing vial satchel.
   - *Schedule*: Tends the moon-lilies in the Upper Cloister by day, brews lantern oil in her Conservatory at dusk, and watches the canal reflections from the bridge at night.
3. **Oswin (The Canal Dockmaster & Ferryman)**:
   - *Visuals*: Weathered navy oilskin coat, captain's cap, brass lantern and wooden oar.
   - *Schedule*: Minds the moored skiff and canal lock gates along the Lower Quays by day, and shares tales of the sunken aqueducts by the Quay lantern at night.
4. **Sera (The Plaza Lutenist & Chronicler)**:
   - *Visuals*: Crimson feathered beret, traveling cape, articulated lute/chime instrument.
   - *Schedule*: Performs near the Plaza Fountain during the day and evening, reacting to the player's choices and composing verses about city events.
5. **Brother Corvus (The Sanctuary Archivist)**:
   - *Visuals*: Charcoal scholar's robes, brass astrolabe staff.
   - *Schedule*: Studies inscriptions in the Scholars' Cloister and keeps record of the city's history.

---

## 3. Expressive Dialogue Box, Portraits, Voice Blips & Branching Memory (`src/components/DialogueBox.tsx` & `src/scene/dialogueData.ts`)
- **Stylized Character Portraits & Expressions**:
  - Dedicated crisp pixel/SVG bust portraits for every citizen with dynamic expression states (`neutral`, `warm`, `thoughtful`, `surprised`, `solemn`).
- **Typewriter Text Reveal & Procedural Voice Blips**:
  - Smooth letter-by-letter typewriter reveal (with instant-complete on Space / Click / `E`), punctuation pauses on commas/periods, and pitched WebAudio voice blips matched to each character's timbre (`soundEngine.playVoiceBlip(pitchHz, timbre)`).
- **Branching Dialogue Trees & Persistent Citizen Memory**:
  - Multi-option dialogue choices that set persistent world flags (`memoryFlags`, e.g., `agreed_to_help_vaelen`, `received_isolde_phosphor`, `heard_oswin_lock_story`, `commissioned_sera_ballad`) and relationship affinity.
  - Citizens reference your earlier choices in subsequent conversations and unlock story events when conditions are met.

---

## 4. In-Engine Cutscene Director (`src/scene/cutsceneDirector.ts`)
- **Cinematic Letterbox & Camera Keyframe Sequencer**:
  - Smoothly interpolates the orthographic camera target `(x, y, z)`, zoom preset (`close`, `standard`, `wide`), and orbit yaw while displaying top/bottom cinematic letterbox bars and a skip/advance control.
- **Authored Cutscenes**:
  1. **"Arrival at Vaelenport" (Intro Cutscene)**: Panning from the Lower Canal Quays across the arched bridge up to the Lantern Plaza and Scholars' Cloister as Master Vaelen and Sera welcome the Wayfarer into the city.
  2. **"The Dusk Lantern Awakening" (Story Event Cutscene)**: Triggered through Vaelen & Isolde's dialogue questline—shifts the clock to Golden Dusk, pans to the Astrolabe Fountain and Cloister Rose Window as the city's grand beacons ignite in sequence.
  3. **"Opening the Old Canal Lock" (Story Event Cutscene)**: Triggered with Dockmaster Oswin at the Lower Quays—camera dollies to the canal gates as the lock mechanism turns, ripples surge, and the lantern skiff glides into the basin.
