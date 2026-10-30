# Sekiro × BlazBlue Combat Choreography & Three.js Mesh Animation Architecture

This plan defines the combat choreography system for **NULLSPIRE: LEVEL ZERO**, distinguishing between four primary sword strike archetypes (**Light**, **Heavy**, **Thrust**, and **Overhead**) through *Sekiro*-inspired frame timing (compressed wind-up glints, razor-sharp active windows, posture-breaking deflect cancels, and heavy recovery commitment) paired with *BlazBlue*-style 2.5D kinetic flow (quartic keyframe snap curves, non-uniform blade smear scaling, multi-plane crescent trail geometry, and weight-tiered hitstop freeze).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Review the following core combat choreography and Three.js animation architecture decisions before execution. Clicking **Proceed** will implement these strike sequences, input routes, and procedural joint evaluators in the 3D scene.

- **Confirmed Decision 1 — Hybrid Combo Chain + Direct Archetype Triggers**: Players can flow naturally through a 4-stage combo chain via primary attack inputs (`Light → Rising Light/Cross → Piercing Thrust → Overhead Finisher`) OR directly invoke any of the four strike archetypes on demand (`Left-Click / [J]` for Light Slash, `Shift + Click / [U]` for Heavy Cleave, `Forward + Click / [I]` for Shadowrush Thrust, and `Jump/Hold + Click / [O]` for Ichimonji Overhead Slam).
- **Confirmed Decision 2 — Declarative Keyframe Pose Tables + Parametric Easing Evaluators**: Rather than hardcoding raw math per frame, each strike archetype is structured as a declarative `StrikeChoreographySpec` containing normalized phase boundaries (`windupEnd`, `activeEnd`, `cancelWindowStart`), per-phase joint target poses (`Euler` rotations and `Vector3` offsets across the 11-node character hierarchy), custom easing curves (smoothstep coil, quartic snap $1 - (1 - t)^{3.6}$, and damped spring settle), and dedicated 3D smear mesh controllers.
- **Confirmed Decision 3 — Sekiro Cancel Gates & Posture Telemetry**: Wind-up frames allow instant Guard/Deflect (`Right-Click / [K]`) or Dodge (`[Space / Shift]`) feint-cancels so players are never locked out of reactive defense during fast exchanges, while late follow-through frames open an early combo-buffer window (`p >= cancelWindowStart`) that chains seamlessly into the next chosen strike archetype.

---

## 1. Overview & Core Concept

- **What It Does**: Elevates the 3D isometric sword combat into a tactile, frame-accurate weapon choreography system where **Light**, **Heavy**, **Thrust**, and **Overhead** strikes feel unmistakably distinct in silhouette, rhythm, spatial reach, camera trauma, and posture impact.
- **Target Audience / Persona**: Action-RPG and character-action players who value crisp visual telegraphing, deliberate commitment vs. feint-cancel depth, and high-contrast anime/fighting-game smear aesthetics inside a grounded low-poly 3D viewport.
- **Key Value**: Eliminates floaty, uniform "hack-and-slash" swinging by binding every strike to a 3-phase physical law—**Chamber & Glint (Anticipation)** → **Quartic Whip & Smear (Active Delivery)** → **Kinetic Overshoot & Weight Settle (Follow-Through)**—synchronized with directional root motion, frame-freeze hitstop, and procedural WebAudio synthesis.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Neutral Stance & Approach**: Joss Vane holds the oversized Porter Cutlass in a low-right guard; his articulated legs, torso, cape, and left-hand ember lantern sway with 60fps stride kinematics.
2. **Strike Selection & Chambering (Anticipation Phase)**:
   - Triggering a **Light**, **Heavy**, **Thrust**, or **Overhead** strike immediately shifts the character rig into a signature silhouette compression (e.g., lateral hip coil for Light, deep reverse-grip crouch for Heavy sweep, 360° cyclone torque for Thrust, or two-handed high-chamber hop for Overhead).
   - A 4-point crossguard telegraph glint (`#f4efe4` core with `#e8a020` Spire Gold spikes) flashes at the hilt to signal the exact wind-up duration.
   - During wind-up, pressing **Deflect (`[K]` / Right-Click)** cancels the chamber into an instant crossguard parry spark.
3. **Active Delivery & BlazBlue Kinetic Smear**:
   - Crossing `windupEnd` triggers a forward root-velocity lunge impulse and whips the character's spine, shoulders, and wrist along a steep quartic curve ($1 - (1 - t)^{3.6}$) so the blade crosses the strike plane in 2–4 visual keyframe steps.
   - The 3D sword mesh dynamically elongates and widens (`smearBell` non-uniform scale) while igniting a multi-layered procedural smear mesh: a tapered crescent arc for Light/Heavy, a hollow spiral cone + sonic ring for Thrust, or a 90° vertical guillotine arc + ground fissure shockwave for Overhead.
4. **Impact, Hitstop Freeze & Posture Break**:
   - On enemy or relic contact, the animation clock freezes for a weight-tiered **Hitstop Window** (`44ms` for Light up to `95ms` for Overhead/Finisher) at peak smear opacity (`0.98`), firing a directional screen-space camera shake along the exact blade vector.
5. **Follow-Through Overshoot & Combo Branching**:
   - The blade overshoots its target angle by `8%–12%` and damps back via spring physics while root lunge velocity bleeds off through exponential ground friction.
   - Once normalized progress passes `cancelWindowStart`, buffered inputs immediately launch the next strike archetype without returning to neutral idle.

### Visual Identity & Theme

- **Aesthetic Direction**: Dark industrial-gothic action choreography (*Sekiro: Shadows Die Twice* posture discipline meets *BlazBlue* / Arc System Works keyframe contrast) rendered over the locked **Cinderfall** palette.
- **Color Palette & Mood**:
  - **Canvas & Architecture**: Ink (`--bg: #141114`), Slate Surface (`--surface: #1e1a1c`), Elevated Plinth (`--surface-2: #282226`), Bronze/Iron Trim (`--border: #3a3235`).
  - **Blade & Kinetic Trail Accents**:
    - *Primary Core Edge*: Chalk White (`--text: #f4efe4`) for razor-sharp leading blade edges and crossguard glints.
    - *Blood Crimson (`--accent: #e5482f`)*: Inner smear belly, Bloodwage flame coating, and Overhead fissure cracks.
    - *Spire Gold (`--accent-2: #e8a020`)*: Residual echo arc, deflect parry sparks, and heavy impact debris.
    - *Echo Cyan (`--echo: #9fd8e8`)*: Phantom afterimage trails during Thrust vortex and Bound Echo synchronized strikes.
- **Typography & Hierarchy**:
  - **Display Headers**: `Cinzel` serif for zone banners, boss cards, and choreography titles.
  - **HUD & Controls**: `Plus Jakarta Sans` for clean, single-line control prompts and stance labels.
  - **Frame Data & Telemetry**: `JetBrains Mono` (`tabular-nums`) for hitstop milliseconds, combo multipliers, posture percentages, and frame-phase readouts.
- **Component Styling & Layout**:
  - 100% unobstructed central 3D viewport (`w-full h-full`) with a compact, collapsible bottom studio/combat dock and minimal top-corner status bars. Zero pill-badge clutter and zero `backdrop-filter` over the active WebGL canvas.

### Four-Archetype Choreography Matrix

| Strike Archetype | Input / Combo Slot | Frame Timing (`Wind-up / Active / Recovery`) | Root Lunge & Hitbox Geometry | Blade Smear & Visual Signature | Hitstop & Camera Trauma |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Light Strike** (*Kesagiri / Rising Cut*) | `LMB` / `[J]` (Combo 1 & 2) | **Total: 320ms** (`64ms` coil · `122ms` whip · `134ms` settle; cancel at `62%`) | `4.8 m/s` step-in; wide `1.95m` horizontal-diagonal arc (`±65°`) | Diagonal tapered crescent (`#f4efe4` edge, `#e5482f` belly, `1.45x` width smear) | `44ms–54ms` freeze · `1.0x–1.35x` directional texel punch |
| **2. Heavy Strike** (*Cleaver Wide Sweep*) | `Shift+LMB` / `[U]` (or Hold `LMB`) | **Total: 460ms** (`147ms` deep coil · `138ms` sweep · `175ms` recovery; cancel at `70%`) | `6.2 m/s` heavy slide; broad `2.35m` cleaving arc (`±95°` crowd sweep) | Thick double-bellied horizontal crescent (`1.85x` blade chord smear + trailing `#e8a020` ember wake) | `76ms` freeze · `1.95x` lateral shudder + high poise break |
| **3. Thrust Strike** (*Shadowrush Vortex*) | `W+LMB` / `[I]` (or Combo 3) | **Total: 420ms** (`134ms` 360° spin coil · `168ms` stinger pierce · `118ms` lock; cancel at `72%`) | `9.4 m/s` forward dart; narrow `2.65m` deep linear lance corridor | 360° cyclone ring + nested piercing cone spike & expanding sonic vortex ring (`1.65x` Z-elongation) | `66ms` freeze · `1.65x` longitudinal camera punch along `+Z` |
| **4. Overhead Strike** (*Ichimonji Guillotine*) | `Space/Alt+LMB` / `[O]` (or Combo 4 Finisher) | **Total: 540ms** (`184ms` high two-hand hop · `151ms` vertical slam · `205ms` stone-embed hold) | `6.8 m/s` hop-lunge + `+0.26m` Y-arc; `2.40m` forward impact circle + shockwave | Pure `90°` vertical guillotine crescent + expanding floor shockwave ring, stone fissure line & spark debris | `88ms–95ms` freeze · `2.25x–2.55x` vertical ground-slam jolt |

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Procedural Hierarchical Joint Evaluator vs. Pre-Baked GLTF Skeletal Clips**
  - *Chosen Approach*: Drive a 11-pivot hierarchical `THREE.Group` rig via a parametric pose-table and easing evaluator at 60fps.
  - *Why*: Guarantees zero external `.glb` 404 asset dependencies, enables instantaneous non-uniform blade smear scaling (`swordGroup.scale`), allows dynamic blending with terrain slope/jump squash-and-stretch (`squashStretchY`), and permits frame-exact hitstop freezing and mid-swing deflect canceling.
  - *Alternatives Considered*: Standard `THREE.AnimationMixer` with static `KeyframeTrack` arrays was passed over because linear/cubic spline tracks lack the asymmetric quartic snap + spring overshoot curves needed for *BlazBlue*-style smear frames without bloating keyframe density.
- **Decision 2 — Non-Linear 3-Phase Time Warping (`windupT` → `snapT` → `followT`)**
  - *Chosen Approach*: Map normalized attack progress $p \in [0, 1]$ into three distinct mathematical envelopes per strike rather than a single sine wave.
  - *Why*: *Sekiro*'s combat weight comes from readable wind-up tension followed by an almost instantaneous blade transit and a weighty recovery hold. Using `smoothstep` for anticipation, $1 - (1 - t)^{3.6}$ for active delivery, and $\sin(followT \cdot \pi)$ for follow-through overshoot creates authentic keyframe contrast at any refresh rate.
  - *Alternatives Considered*: Uniform sine/cosine interpolation makes heavy swords look like underwater batons with no distinction between chambering and cutting.
- **Decision 3 — Dedicated 3D Smear Geometry Per Strike Plane**
  - *Chosen Approach*: Pair the physical broadsword/cutlass mesh with three specialized, zero-allocation procedural effect rigs (`slashGroup` tapered crescent, `thrustLanceGroup` hollow cone + sonic ring, and `cleaveShockwaveGroup` ground ring + fissure) whose vertex buffers are built once at initialization and transformed per strike.
  - *Why*: *BlazBlue* and *Guilty Gear* rely on exaggerated 2D/2.5D smear shapes that persist for 3–5 frames after the weapon passes. Toggling pre-allocated `THREE.Group` smear meshes with dynamic opacity envelopes achieves this kinetic persistence with zero per-frame garbage collection.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        USER INPUT & COMBAT ROUTER                            │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │
│  │ Direct Strike Keys │  │ 4-Stage Combo Chain│  │ Cancel / Deflect Gate  │  │
│  │ [J] Light [U] Heavy│  │ Auto-advances 1..4 │  │ [K]/RMB Parry Cancel   │  │
│  │ [I] Thrust[O] Over │  │ within 1.15s window│  │ [Space] Dodge Cancel   │  │
│  └─────────┬──────────┘  └─────────┬──────────┘  └───────────┬────────────┘  │
└────────────┼───────────────────────┼─────────────────────────┼───────────────┘
             └───────────────────────┼─────────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 CHOREOGRAPHY STATE MACHINE & TIMING ENGINE                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ StrikeChoreographySpec Registry (Light | Heavy | Thrust | Overhead)    │  │
│  │ • Phase Gates: windupEnd | activeEnd | cancelWindowStart | duration    │  │
│  │ • Easing Envelopes: windupT (Smoothstep) -> snapT (Quartic) -> followT │  │
│  │ • Root Kinematics: Step-In Lunge Impulse + Y-Hop Arc + Friction Drag   │  │
│  └───────────────┬────────────────────────────────────────┬───────────────┘  │
└──────────────────┼────────────────────────────────────────┼──────────────────┘
                   ▼                                        ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│   THREE.JS ARTICULATED MESH RIG     │  │   BLAZBLUE SMEAR & IMPACT ENGINE    │
│  root (World X, Z)                  │  │  • glintStarGroup (Wind-up Flash)   │
│  └── bodyPivot (Facing Y, Squash)   │  │  • slashGroup (Tapered Crescent)    │
│      ├── leftLegRig / rightLegRig   │  │    - Outer Edge / Inner Core / Echo │
│      │   └── hipPivot -> kneePivot  │  │  • thrustLanceGroup (Piercing Cone) │
│      └── torsoPivot (Coil/Pitch/Yaw)│  │    - Outer Cone / Spike / Sonic Ring│
│          ├── capePivot -> capeLower │  │  • cleaveShockwaveGroup (Slam Wave) │
│          ├── headPivot              │  │    - Ground Ring / Stone Fissure    │
│          ├── leftShoulderPivot      │  │  • Hitstop Freeze & Screen-Space    │
│          │   └── lanternPendulum    │  │    Camera Shake (Texel Impulse)     │
│          └── rightShoulderPivot     │  └─────────────────────────────────────┘
│              └── swordHandPivot     │
│                  └── swordGroup     │
└─────────────────────────────────────┘
```

### Data Model & State (`StrikeChoreographySpec`)

To keep the Four Strike Types modular, inspectable, and extensible inside the Three.js character controller, each strike is defined by a strongly typed choreography specification:

1. **Strike Identity & Classification**:
   - `id`: `'light-kesagiri' | 'light-rising' | 'heavy-cleave' | 'thrust-shadowrush' | 'overhead-ichimonji'`
   - `archetype`: `'light' | 'heavy' | 'thrust' | 'overhead'`
   - `weightClass`: `'light-slash' | 'cross-slash' | 'heavy-cleave' | 'finisher-strike'`
2. **Sekiro Normalized Frame Phases (`0.0` to `1.0`)**:
   - `durationSec`: Total animation duration in seconds (`0.32s` to `0.54s`).
   - `windupEnd`: Normalized timestamp where chambering ends and the active hitbox + lunge impulse fire (`0.20` for Light, `0.30` for Heavy, `0.32` for Thrust, `0.34` for Overhead).
   - `activeEnd`: Normalized timestamp where peak blade transit completes and follow-through settling begins (`0.58` to `0.72`).
   - `cancelWindowStart`: Normalized timestamp during recovery when buffered attack inputs can chain into the next strike (`0.62` to `0.74`).
   - `snapExponent`: Quartic/cubic power exponent ($k \in [3.2, 4.2]$) governing `snapT = 1.0 - Math.pow(1.0 - rawStrikeT, k)`.
3. **Hierarchical Joint Keyframe Poses (`chamberPose` vs. `deliveryPose`)**:
   - Stores target `Euler` angles `(x, y, z)` for `leftLegHip`, `leftLegKnee`, `rightLegHip`, `rightLegKnee`, `torsoPivot`, `headPivot`, `leftShoulderPivot`, `rightShoulderPivot`, `swordHandPivot`, and `swordGroup`, plus non-uniform blade smear multipliers (`smearScaleX`, `smearScaleY`, `smearScaleZ`) and vertical hop offset (`hopHeightY`).
4. **Combat Hitbox, Posture & Feedback Payload**:
   - `lungeSpeed`: Instantaneous forward step-in velocity applied on the active frame (`4.6` to `9.4 m/s`).
   - `reachRadius` & `forwardOffset`: Spatial sphere/cone intersection parameters.
   - `damageMultiplier` & `postureDamage`: Health and enemy stagger/poise damage scalars (Heavy breaks shields/clusters; Thrust pierces distant lines; Overhead cracks calcified armor like *The Returnling*).
   - `hitstopDurationSec` & `baseWeightMultiplier`: Drives the frame-freeze timer and `ScreenSpaceCameraShake`.

### Detailed Three.js Joint & Mesh Sequence Logic per Strike Type

#### 1. Light Strike Sequence (`light-kesagiri` & `light-rising`)
- **Anticipation (`0.0 -> 0.20`)**:
  - `bodyPivot` compresses slightly (`squashStretchY = 0.92`).
  - `torsoPivot.rotation.y` coils `-0.68 rad` to the right (or `+0.82 rad` low-left for rising cut) using `smoothstep(p / 0.20)`.
  - `rightShoulderPivot` chambers high-right (`rot.x = -1.15, rot.y = -1.25`), flashing `glintStarGroup`.
- **Active Whip (`0.20 -> 0.58`)**:
  - `torsoPivot.rotation.y` whips across to `+0.82 rad` via `snapT` ($k = 3.6$) while `leftLegRig` steps into a `-0.52 rad` forward lunge.
  - `swordGroup.scale.x` expands by `1.0 + smearBell * 1.45` at mid-swing to simulate anime motion blur on the steel blade.
  - `slashGroup` (tilted at `rot.z = -0.48` for downward Kesagiri or `+0.58` for Rising Fang) sweeps its Y-rotation from `-0.78` to `+0.72` at `0.96` opacity.
- **Follow-Through (`0.58 -> 1.00`)**:
  - `overshoot = Math.sin(followT * Math.PI) * 0.12` pushes the wrist and shoulder slightly past the terminal stop before settling back to `1.0`, while `slashGroup` opacity decays by `(1 - followT)^1.5`.

#### 2. Heavy Strike Sequence (`heavy-cleave`)
- **Anticipation (`0.0 -> 0.30`)**:
  - Deep grounded torque: `squashStretchY = 0.84`, knees bend (`leftKnee = 0.55, rightKnee = 0.68`), and `torsoPivot` twists `-1.08 rad` behind the rear hip with a reverse/two-handed horizontal chamber (`rightShoulderPivot.rotation.y = -1.55, z = -0.62`).
  - Crossguard glint pulses with a wider `#e8a020` gold flare to telegraph the high-commitment wind-up.
- **Active Whip (`0.30 -> 0.64`)**:
  - Unleashes a `6.2 m/s` forward slide and a massive `190°` horizontal-cleaving torso rotation (`-1.08 rad` to `+1.18 rad`, $k = 4.0$).
  - `swordGroup.scale` widens by `1.85x` across the cutting chord; `slashGroup` flattens near the horizontal plane (`rot.x = 0.08, rot.z = -0.14`) and scales to `1.28x` radius so the crescent arc visibly cleaves through multiple enemies.
- **Follow-Through (`0.64 -> 1.00`)**:
  - Heavy rotational momentum carries the upper body into a `0.18 rad` overshoot, holding the blade extended on the left flank while kicking up tangential ember sparks.

#### 3. Thrust Strike Sequence (`thrust-shadowrush`)
- **Anticipation (`0.0 -> 0.32`)**:
  - Initiates a high-speed `360°` (`-2π`) cyclone spin (`spinEase = 1 - (1 - spinProgress)^2.6`) that flares `capePivot.rotation.x` to `1.18 rad` and draws a horizontal vortex ring with `slashGroup`.
  - During the final quarter-turn, the right arm retracts tightly beside the ribs (`rightShoulderPivot.rotation.y = -0.95`).
- **Active Whip (`0.32 -> 0.72`)**:
  - Fires a `9.4 m/s` forward dart; `rightLegRig` extends into a deep `-0.78 rad` fencing lunge while `torsoPivot.rotation.x` pitches forward `+0.48 rad`.
  - `swordGroup` translates `+0.56m` forward along local `+Z`, rolls `90°` (`rot.z = π/2`) so the flat of the blade aligns horizontally, and stretches `1.62x` along the Z-axis like a piercing needle.
  - `thrustLanceGroup` activates (`thrustOuterCone` + `thrustInnerSpike` + `thrustSonicRing`), shooting the sonic vortex ring from `z = 0.35m` to `1.70m`.
- **Follow-Through (`0.72 -> 1.00`)**:
  - Holds the extended fencing lunge silhouette while retracting `swordGroup.position.z` smoothly back to the hand pivot.

#### 4. Overhead Strike Sequence (`overhead-ichimonji`)
- **Anticipation (`0.0 -> 0.34`)**:
  - Upward suspension: `squashStretchY = 1.18` and `bodyPivot.position.y` lifts by `+0.26m` along a sine hop arc.
  - `torsoPivot.rotation.x` arches backward (`-0.42 rad`) while **both** `leftShoulderPivot` (`rot.x = -1.65, rot.y = 0.32`) and `rightShoulderPivot` (`rot.x = -2.35`) converge high above the crown in a classic two-handed *Ichimonji* stance.
- **Active Whip (`0.34 -> 0.62`)**:
  - Slams downward withquartic acceleration ($k = 4.2$), driving `torsoPivot.rotation.x` to `+0.58 rad` and both shoulders straight down (`+0.48 rad`) while compressing the legs into a deep landing crouch (`squashStretchY = 0.76`).
  - `slashGroup` rotates `90°` onto the vertical XY plane (`rot.z = π/2`), slicing from sky (`rot.x = -0.95`) to flagstones (`rot.x = +0.55`).
- **Impact & Follow-Through (`0.62 -> 1.00`)**:
  - At `p = windupEnd + 0.06`, the blade tip strikes the ground, spawning stone shatter sparks and activating `cleaveShockwaveGroup` (`cleaveRingOuter` expands to `2.3x` radius while `cleaveFissureLine` scars the flagstones forward).
  - The character holds the stone-embedded crouch before rising back to neutral guard.

### Interactive Component & State Mapping

- **Direct & Combo Input Handling**:
  - Pressing `Left-Click` or `[J]` advances the 4-stage combo cycle (`Light Kesagiri → Light Rising Fang → Thrust Shadowrush → Overhead Ichimonji`), resetting to stage 1 if `comboResetTimer` (`1.15s`) expires.
  - Pressing `[U]` (or `Shift + Left-Click`) immediately triggers **Heavy Cleave**; `[I]` triggers **Shadowrush Thrust**; `[O]` triggers **Ichimonji Overhead Slam**—each setting the active `StrikeChoreographySpec` and advancing/linking the combo chain.
- **Deflect / Dodge Cancel Gate**:
  - If the player triggers `triggerDeflect()` (`Right-Click / [K]`) or `triggerDodge()` (`[Space]`) while `p < windupEnd` (anticipation phase) or `p >= cancelWindowStart` (recovery phase), the active attack immediately aborts, zeroes smear opacities, and transitions into the Deflect crossguard spark or Shadowstep evade without frame delay.
- **Live HUD & Studio Choreography Telemetry**:
  - Exposes the active strike archetype, current phase (`CHAMBER` / `ACTIVE` / `FOLLOW-THROUGH`), normalized frame progress, and hitstop state to the HUD and Studio Dock so players can inspect or test any of the 4 strike types directly.
