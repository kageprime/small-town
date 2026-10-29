import {
  CitizenId,
  NpcBehaviorState,
  NpcInteractionReadiness,
  NpcStateMachineSnapshot,
} from '../types/vignette';
import {
  CitizenProfile,
  CitizenScheduleSlot,
  evaluateCitizenSchedule,
  VAELENPORT_CITIZENS,
} from './dialogueAndCutscenes';

export interface NpcProceduralPose {
  torsoBobY: number;
  torsoTwistY: number;
  torsoLeanX: number;
  headYaw: number;
  headPitch: number;
  toolPitch: number;
  toolRoll: number;
  promptGemY: number;
  promptGemScale: number;
}

export interface NpcStateUpdateInput {
  dt: number;
  timeSeconds: number;
  dayCycleHour: number;
  playerX: number;
  playerZ: number;
  activeDialogNpcId: string | null;
  isCutsceneActive: boolean;
  getGroundHeight: (x: number, z: number) => number;
}

export interface NpcStateUpdateResult {
  snapshot: NpcStateMachineSnapshot;
  pose: NpcProceduralPose;
  dynamicPrompt: string;
}

interface PatrolOffsetWaypoint {
  dx: number;
  dz: number;
  facingOffset: number;
  workLabel: string;
  idleLabel: string;
}

/**
 * Local patrol micro-waypoints and role-tailored idle/working sub-behaviors
 * around each citizen's scheduled station in Vaelenport.
 */
const CITIZEN_PATROL_PROFILES: Record<CitizenId, PatrolOffsetWaypoint[]> = {
  'master-vaelen': [
    {
      dx: 0.0,
      dz: 0.0,
      facingOffset: 0.0,
      workLabel: 'Calibrating brass escapement teeth with clockmaker loupe',
      idleLabel: 'Listening to the harmonic pulse of the Astrolabe rings',
    },
    {
      dx: 0.85,
      dz: 0.45,
      facingOffset: 0.35,
      workLabel: 'Winding counterweight mainspring & checking oil viscosity',
      idleLabel: 'Surveying the Lantern Plaza flagstones',
    },
    {
      dx: -0.7,
      dz: -0.4,
      facingOffset: -0.4,
      workLabel: 'Inscribing meridian sightlines onto a brass astrolabe plate',
      idleLabel: 'Polishing his spectacle monocle with a chamois cloth',
    },
  ],
  isolde: [
    {
      dx: 0.0,
      dz: 0.0,
      facingOffset: 0.0,
      workLabel: 'Distilling silver-fern dew inside emerald glass alembics',
      idleLabel: 'Breathing in warm botanical vapor beneath the conservatory glass',
    },
    {
      dx: -0.8,
      dz: 0.5,
      facingOffset: -0.45,
      workLabel: 'Pruning moon-lily blossoms & sorting dried mortar herbs',
      idleLabel: 'Checking condensation along the conservatory timber panes',
    },
    {
      dx: 0.75,
      dz: -0.35,
      facingOffset: 0.3,
      workLabel: 'Measuring luminescent tincture drops into crystal phials',
      idleLabel: 'Humming a quiet herbalist cadence over the planter beds',
    },
  ],
  oswin: [
    {
      dx: 0.0,
      dz: 0.0,
      facingOffset: 0.0,
      workLabel: 'Inspecting heavy iron sluice chains & capstan pawls',
      idleLabel: 'Scanning the tidal current ripples along the Lower Canal',
    },
    {
      dx: -0.95,
      dz: 0.3,
      facingOffset: -0.35,
      workLabel: 'Sounding canal basin depth with a leaded brass plumb line',
      idleLabel: 'Leaning on his boat-hook while watching the moored gondola',
    },
    {
      dx: 0.85,
      dz: -0.4,
      facingOffset: 0.4,
      workLabel: 'Greasing waterwheel axle bearings with tallow',
      idleLabel: 'Tapping his weathered sou’wester cap against the canal mist',
    },
  ],
  sera: [
    {
      dx: 0.0,
      dz: 0.0,
      facingOffset: 0.0,
      workLabel: 'Arpeggiating a twelve-string modal nocturne on her cedar lute',
      idleLabel: 'Tuning rosewood lute pegs by ear against the fountain chime',
    },
    {
      dx: 0.75,
      dz: 0.55,
      facingOffset: 0.5,
      workLabel: 'Projecting a sunlit acoustic ballad across the plaza steps',
      idleLabel: 'Bow-greeting passing citizens from the pavilion dais',
    },
    {
      dx: -0.7,
      dz: 0.35,
      facingOffset: -0.4,
      workLabel: 'Composing new lyrical verses in her pocket songbook',
      idleLabel: 'Resting her fingers while watching the festival lanterns sway',
    },
  ],
  'brother-corvus': [
    {
      dx: 0.0,
      dz: 0.0,
      facingOffset: 0.0,
      workLabel: 'Collating vellum concordances of the First Bellwrights',
      idleLabel: 'Contemplating the amber stained-glass Rose Window',
    },
    {
      dx: -0.85,
      dz: 0.4,
      facingOffset: -0.35,
      workLabel: 'Inking marginalia annotations with a silver-tipped quill',
      idleLabel: 'Listening to the high belfry wind across the Upper Cloister',
    },
    {
      dx: 0.8,
      dz: 0.35,
      facingOffset: 0.35,
      workLabel: 'Verifying foundational masonry seals along the colonnade',
      idleLabel: 'Hands folded inside his monastic sleeves in quiet vigil',
    },
  ],
};

function wrapAngleDiff(target: number, current: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function formatHourWindow(startHour: number, endHour: number): string {
  const fmt = (h: number) => `${String(Math.floor(h % 24)).padStart(2, '0')}:00`;
  return `${fmt(startHour)}–${fmt(endHour)}`;
}

/**
 * Individual State Machine instance for a single scheduled Citizen NPC.
 * Manages transitions between:
 *  - 'moving-schedule' (walking between daily schedule posts across Vaelenport)
 *  - 'moving-patrol'   (short local strolls between artisan stations at the current post)
 *  - 'working'         (focused artisan craft animation cycle)
 *  - 'idle'            (observational rest & ambient look-around cycle)
 *  - 'alert-ready'     (Wayfarer within awareness/greeting range; turns toward player)
 *  - 'interacting'     (Wayfarer actively engaged in branching dialogue)
 */
export class NpcAgentStateMachine {
  public readonly profile: CitizenProfile;
  public readonly npcId: string;
  private readonly phaseOffset: number;

  private state: NpcBehaviorState = 'working';
  private interactionReadiness: NpcInteractionReadiness = 'distant';

  private x: number;
  private y: number;
  private z: number;
  private targetX: number;
  private targetZ: number;
  private facingAngle: number;
  private headYawOffset = 0;
  private moveSpeed = 0;
  private walkCycleRad = 0;

  private activeSlotKey = '';
  private patrolIndex = 0;
  private behaviorTimerSec = 0;
  private currentPhaseDurationSec = 6.5;
  private isWorkSubPhase = true;

  private readonly interactRadius = 2.35;
  private readonly awarenessRadius = 4.35;
  private readonly scheduleWalkSpeed = 2.45;
  private readonly patrolWalkSpeed = 0.95;

  constructor(
    profile: CitizenProfile,
    initialHour: number,
    getGroundHeight: (x: number, z: number) => number,
    phaseOffset = 0
  ) {
    this.profile = profile;
    this.npcId = `citizen-${profile.id}`;
    this.phaseOffset = phaseOffset;

    const initSlot = evaluateCitizenSchedule(profile, initialHour);
    this.x = initSlot.x;
    this.z = initSlot.z;
    this.y = getGroundHeight(initSlot.x, initSlot.z);
    this.targetX = initSlot.x;
    this.targetZ = initSlot.z;
    this.facingAngle = initSlot.facingAngle;
    this.activeSlotKey = `${initSlot.startHour}-${initSlot.endHour}`;
    this.currentPhaseDurationSec = 5.5 + (phaseOffset % 3.0);
  }

  public update(input: NpcStateUpdateInput): NpcStateUpdateResult {
    const dt = Math.min(Math.max(input.dt, 0.001), 0.1);
    const slot: CitizenScheduleSlot = evaluateCitizenSchedule(
      this.profile,
      input.dayCycleHour
    );
    const slotKey = `${slot.startHour}-${slot.endHour}`;

    const patrolWaypoints = CITIZEN_PATROL_PROFILES[this.profile.id];
    const currentPatrol = patrolWaypoints[this.patrolIndex % patrolWaypoints.length];

    // Detect daily schedule slot transition
    if (slotKey !== this.activeSlotKey) {
      this.activeSlotKey = slotKey;
      this.patrolIndex = 0;
      this.behaviorTimerSec = 0;
      this.isWorkSubPhase = true;
    }

    // Compute desired anchor position (schedule post + local patrol offset)
    const desiredAnchorX = slot.x + currentPatrol.dx;
    const desiredAnchorZ = slot.z + currentPatrol.dz;
    const distToScheduleBase = Math.hypot(slot.x - this.x, slot.z - this.z);
    const distToAnchor = Math.hypot(desiredAnchorX - this.x, desiredAnchorZ - this.z);

    // Evaluate Player distance & Interaction Readiness
    const dxPlayer = input.playerX - this.x;
    const dzPlayer = input.playerZ - this.z;
    const distanceToPlayer = Math.hypot(dxPlayer, dzPlayer);
    const angleToPlayer = Math.atan2(dxPlayer, dzPlayer);

    const isConversingWithMe = input.activeDialogNpcId === this.npcId;

    if (input.isCutsceneActive) {
      this.interactionReadiness = 'busy-cutscene';
    } else if (isConversingWithMe) {
      this.interactionReadiness = 'engaged';
    } else if (distanceToPlayer <= this.interactRadius) {
      this.interactionReadiness = 'ready';
    } else if (distanceToPlayer <= this.awarenessRadius) {
      this.interactionReadiness = 'aware';
    } else {
      this.interactionReadiness = 'distant';
    }

    // ========================================================================
    // STATE TRANSITION & MOVEMENT LOGIC
    // ========================================================================
    if (isConversingWithMe) {
      this.state = 'interacting';
      this.targetX = this.x;
      this.targetZ = this.z;
      this.moveSpeed = 0;

      // Smoothly turn body and head toward the Wayfarer during conversation
      const bodyDiff = wrapAngleDiff(angleToPlayer, this.facingAngle);
      this.facingAngle += bodyDiff * Math.min(1, dt * 8.5);
      this.headYawOffset += (0 - this.headYawOffset) * Math.min(1, dt * 10.0);
    } else if (
      (this.interactionReadiness === 'ready' || this.interactionReadiness === 'aware') &&
      distToScheduleBase < 2.2
    ) {
      // Player is nearby and citizen is at their post: pause patrol and greet/attend player
      this.state = 'alert-ready';
      this.targetX = this.x;
      this.targetZ = this.z;
      this.moveSpeed = 0;

      const bodyDiff = wrapAngleDiff(angleToPlayer, this.facingAngle);
      if (this.interactionReadiness === 'ready') {
        // Turn body toward player when within direct [E] interaction range
        this.facingAngle += bodyDiff * Math.min(1, dt * 6.5);
        this.headYawOffset +=
          ( THREE.MathUtils_clamp(bodyDiff * 0.25, -0.35, 0.35) - this.headYawOffset) *
          Math.min(1, dt * 8.0);
      } else {
        // Turn head toward player while keeping body oriented near station
        const clampedHead = THREE.MathUtils_clamp(bodyDiff, -0.65, 0.65);
        this.headYawOffset += (clampedHead - this.headYawOffset) * Math.min(1, dt * 6.5);
      }
    } else if (distToScheduleBase > 1.35) {
      // Transitioning between daily schedule districts across the city
      this.state = 'moving-schedule';
      this.targetX = slot.x;
      this.targetZ = slot.z;
      this.stepMovementToward(slot.x, slot.z, this.scheduleWalkSpeed, dt, input.getGroundHeight);
    } else if (distToAnchor > 0.14) {
      // Walking a short local patrol step between artisan sub-stations
      this.state = 'moving-patrol';
      this.targetX = desiredAnchorX;
      this.targetZ = desiredAnchorZ;
      this.stepMovementToward(
        desiredAnchorX,
        desiredAnchorZ,
        this.patrolWalkSpeed,
        dt,
        input.getGroundHeight
      );
    } else {
      // Settled at anchor: cycle between 'working' and 'idle' and advance patrol waypoint
      this.moveSpeed = 0;
      this.targetX = desiredAnchorX;
      this.targetZ = desiredAnchorZ;

      const desiredFacing = slot.facingAngle + currentPatrol.facingOffset;
      const facingDiff = wrapAngleDiff(desiredFacing, this.facingAngle);
      this.facingAngle += facingDiff * Math.min(1, dt * 5.0);

      this.behaviorTimerSec += dt;
      if (this.behaviorTimerSec >= this.currentPhaseDurationSec) {
        this.behaviorTimerSec = 0;
        if (this.isWorkSubPhase) {
          // Transition from 'working' -> 'idle'
          this.isWorkSubPhase = false;
          this.currentPhaseDurationSec = 3.8 + ((this.patrolIndex * 1.3 + this.phaseOffset) % 2.4);
        } else {
          // Transition from 'idle' -> next local patrol station -> 'working'
          this.isWorkSubPhase = true;
          this.patrolIndex = (this.patrolIndex + 1) % patrolWaypoints.length;
          this.currentPhaseDurationSec = 6.2 + ((this.patrolIndex * 1.7 + this.phaseOffset) % 3.2);
        }
      }

      this.state = this.isWorkSubPhase ? 'working' : 'idle';

      // Subtle ambient head look-around during idle/work
      const lookWave =
        this.state === 'idle'
          ? Math.sin(input.timeSeconds * 1.35 + this.phaseOffset) * 0.28
          : Math.sin(input.timeSeconds * 2.4 + this.phaseOffset) * 0.1;
      this.headYawOffset += (lookWave - this.headYawOffset) * Math.min(1, dt * 5.0);
    }

    this.y = input.getGroundHeight(this.x, this.z);

    // ========================================================================
    // PROCEDURAL 3D RIG POSE SYNTHESIS PER STATE
    // ========================================================================
    const pose = this.computeProceduralPose(input.timeSeconds);
    const subBehaviorLabel = this.resolveSubBehaviorLabel(slot, currentPatrol);

    const snapshot: NpcStateMachineSnapshot = {
      npcId: this.npcId,
      citizenId: this.profile.id,
      name: this.profile.name,
      role: this.profile.role,
      state: this.state,
      interactionReadiness: this.interactionReadiness,
      districtTitle: slot.districtTitle,
      scheduleActivity: slot.activityLabel,
      subBehaviorLabel,
      x: Number(this.x.toFixed(2)),
      y: Number(this.y.toFixed(2)),
      z: Number(this.z.toFixed(2)),
      targetX: Number(this.targetX.toFixed(2)),
      targetZ: Number(this.targetZ.toFixed(2)),
      facingAngle: Number(this.facingAngle.toFixed(2)),
      moveSpeed: Number(this.moveSpeed.toFixed(2)),
      distanceToPlayer: Number(distanceToPlayer.toFixed(2)),
      scheduleWindowLabel: formatHourWindow(slot.startHour, slot.endHour),
      nextTransitionHour: slot.endHour % 24,
    };

    const readinessTag =
      this.interactionReadiness === 'ready'
        ? 'Ready to Speak'
        : this.state === 'moving-schedule'
          ? `Walking to ${slot.districtTitle}`
          : slot.activityLabel;

    const dynamicPrompt = `Press [E] to Speak with ${this.profile.name} (${this.profile.role} · ${readinessTag})`;

    return {
      snapshot,
      pose,
      dynamicPrompt,
    };
  }

  private stepMovementToward(
    destX: number,
    destZ: number,
    speed: number,
    dt: number,
    getGroundHeight: (x: number, z: number) => number
  ): void {
    let dx = destX - this.x;
    let dz = destZ - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.05) {
      this.x = destX;
      this.z = destZ;
      this.moveSpeed = 0;
      return;
    }

    let dirX = dx / dist;
    let dirZ = dz / dist;

    // Gentle steering deflection around the central Astrolabe Fountain (x=0, z=-0.5, r=2.65)
    const fountainDist = Math.hypot(this.x - 0, this.z - -0.5);
    if (fountainDist < 2.85 && fountainDist > 0.05) {
      const pushX = this.x / fountainDist;
      const pushZ = (this.z - -0.5) / fountainDist;
      dirX += pushX * 0.65;
      dirZ += pushZ * 0.65;
      const norm = Math.hypot(dirX, dirZ) || 1;
      dirX /= norm;
      dirZ /= norm;
    }

    const stepDist = Math.min(dist, speed * dt);
    this.x += dirX * stepDist;
    this.z += dirZ * stepDist;
    this.y = getGroundHeight(this.x, this.z);
    this.moveSpeed = stepDist / dt;
    this.walkCycleRad = (this.walkCycleRad + stepDist * 4.2) % (Math.PI * 2);

    const moveHeading = Math.atan2(dirX, dirZ);
    const headingDiff = wrapAngleDiff(moveHeading, this.facingAngle);
    this.facingAngle += headingDiff * Math.min(1, dt * 9.0);
    this.headYawOffset *= Math.max(0, 1 - dt * 6.0);
  }

  private resolveSubBehaviorLabel(
    slot: CitizenScheduleSlot,
    patrol: PatrolOffsetWaypoint
  ): string {
    switch (this.state) {
      case 'interacting':
        return `Conversing with the Wayfarer in ${slot.districtTitle}`;
      case 'alert-ready':
        return this.interactionReadiness === 'ready'
          ? `Awaiting your word (${slot.districtTitle})`
          : `Noticing your approach (${slot.activityLabel})`;
      case 'moving-schedule':
        return `Walking to ${slot.districtTitle} for ${slot.activityLabel.toLowerCase()}`;
      case 'moving-patrol':
        return `Pacing between stations (${slot.districtTitle})`;
      case 'working':
        return patrol.workLabel;
      case 'idle':
      default:
        return patrol.idleLabel;
    }
  }

  private computeProceduralPose(timeSeconds: number): NpcProceduralPose {
    const phase = timeSeconds * 3.0 + this.phaseOffset;

    if (this.state === 'moving-schedule' || this.state === 'moving-patrol') {
      const strideSin = Math.sin(this.walkCycleRad);
      const strideCos = Math.cos(this.walkCycleRad * 2.0);
      return {
        torsoBobY: 0.72 + Math.abs(strideSin) * 0.055,
        torsoTwistY: strideSin * 0.22,
        torsoLeanX: 0.08,
        headYaw: this.headYawOffset - strideSin * 0.08,
        headPitch: strideCos * 0.04,
        toolPitch: -0.25 + strideSin * 0.45,
        toolRoll: strideSin * 0.15,
        promptGemY: 1.96 + Math.sin(phase * 1.5) * 0.05,
        promptGemScale: 0.92,
      };
    }

    if (this.state === 'interacting') {
      const talkGesture = Math.sin(timeSeconds * 5.2 + this.phaseOffset);
      return {
        torsoBobY: 0.72 + Math.abs(talkGesture) * 0.025,
        torsoTwistY: talkGesture * 0.1,
        torsoLeanX: 0.03,
        headYaw: this.headYawOffset,
        headPitch: Math.sin(timeSeconds * 3.6) * 0.06,
        toolPitch: -0.35 + talkGesture * 0.22,
        toolRoll: 0.12 + talkGesture * 0.1,
        promptGemY: 2.05 + Math.sin(timeSeconds * 4.5) * 0.06,
        promptGemScale: 1.35,
      };
    }

    if (this.state === 'alert-ready') {
      const pulse = Math.sin(timeSeconds * 4.0 + this.phaseOffset);
      const isImmediate = this.interactionReadiness === 'ready';
      return {
        torsoBobY: 0.72 + (isImmediate ? 0.02 : 0.01) * Math.abs(pulse),
        torsoTwistY: this.headYawOffset * 0.35,
        torsoLeanX: isImmediate ? 0.04 : 0.0,
        headYaw: this.headYawOffset,
        headPitch: isImmediate ? -0.05 : 0.0,
        toolPitch: -0.18 + pulse * 0.1,
        toolRoll: pulse * 0.06,
        promptGemY: 2.02 + pulse * 0.07,
        promptGemScale: isImmediate ? 1.28 : 1.12,
      };
    }

    if (this.state === 'working') {
      const workSwing = Math.sin(phase);
      const secondaryHarmonic = Math.cos(phase * 2.0);
      return {
        torsoBobY: 0.72 + Math.abs(workSwing) * 0.032,
        torsoTwistY: workSwing * 0.16,
        torsoLeanX: 0.05 + secondaryHarmonic * 0.02,
        headYaw: this.headYawOffset - workSwing * 0.1,
        headPitch: 0.08 + secondaryHarmonic * 0.04,
        toolPitch: -0.22 + workSwing * 0.42,
        toolRoll: workSwing * 0.2,
        promptGemY: 1.95 + Math.sin(phase) * 0.04,
        promptGemScale: 1.0,
      };
    }

    // Default 'idle' contemplative breathing & observational look-around
    const breath = Math.sin(timeSeconds * 1.8 + this.phaseOffset);
    return {
      torsoBobY: 0.72 + (breath + 1) * 0.012,
      torsoTwistY: this.headYawOffset * 0.25,
      torsoLeanX: 0.0,
      headYaw: this.headYawOffset,
      headPitch: breath * 0.03,
      toolPitch: -0.12 + breath * 0.06,
      toolRoll: breath * 0.04,
      promptGemY: 1.94 + breath * 0.035,
      promptGemScale: 0.95,
    };
  }
}

function THREE_MathUtils_clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const THREE = {
  MathUtils_clamp: THREE_MathUtils_clamp,
};

/**
 * Registry-wide NPC State Machine Controller that coordinates all citizens in
 * `VAELENPORT_CITIZENS` and exposes snapshots for scene rendering and HUD/Dialogue telemetry.
 */
export class VaelenportNpcRegistryStateMachine {
  private readonly machines = new Map<CitizenId, NpcAgentStateMachine>();
  private latestSnapshots: NpcStateMachineSnapshot[] = [];

  constructor(
    initialHour: number,
    getGroundHeight: (x: number, z: number) => number
  ) {
    (Object.keys(VAELENPORT_CITIZENS) as CitizenId[]).forEach((cid, idx) => {
      const profile = VAELENPORT_CITIZENS[cid];
      this.machines.set(
        cid,
        new NpcAgentStateMachine(profile, initialHour, getGroundHeight, idx * 0.85)
      );
    });
  }

  public stepCitizen(
    citizenId: CitizenId,
    input: NpcStateUpdateInput
  ): NpcStateUpdateResult | null {
    const machine = this.machines.get(citizenId);
    if (!machine) return null;
    const res = machine.update(input);
    const existingIdx = this.latestSnapshots.findIndex((s) => s.citizenId === citizenId);
    if (existingIdx >= 0) {
      this.latestSnapshots[existingIdx] = res.snapshot;
    } else {
      this.latestSnapshots.push(res.snapshot);
    }
    return res;
  }

  public getSnapshots(): NpcStateMachineSnapshot[] {
    return this.latestSnapshots;
  }

  public getCitizenSnapshot(citizenId: CitizenId): NpcStateMachineSnapshot | undefined {
    return this.latestSnapshots.find((s) => s.citizenId === citizenId);
  }
}
