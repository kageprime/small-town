import * as THREE from 'three';
import { CutoutBackgroundTone, TimeOfDayPreset } from '../types/vignette';

export interface DayNightState {
  hour: number; // 0.0 .. 24.0
  formattedClock: string; // e.g. "18:45"
  preset: TimeOfDayPreset;
  phaseLabel: string;
  nightFactor: number; // 0.0 at high noon -> 1.0 at deep midnight
  brazierIntensityMultiplier: number; // 0.85x at noon -> 2.85x at midnight
  lanternIntensityMultiplier: number; // 1.0x at noon -> 2.65x at midnight
  dappleMultiplier: number; // 1.0x in daylight -> 0.35x moonlight dapple at night
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  sunColorHex: string;
  sunIntensity: number;
  sunPosition: [number, number, number];
  rimColorHex: string;
  rimIntensity: number;
  globalTintHex: string;
  globalTintStrength: number; // 0.0 .. 0.45 shader grade strength
  bgColorHex: string;
}

interface CelestialKeyframe {
  hour: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  rimColor: string;
  rimIntensity: number;
  globalTint: string;
  globalTintStrength: number;
  nightFactor: number;
  brazierMult: number;
  lanternMult: number;
  dappleMult: number;
  bgDarkness: number; // 0 = day cutout tone, 1 = nocturnal void
}

const KEYFRAMES: CelestialKeyframe[] = [
  {
    // 00:00 - Torchlit Midnight
    hour: 0.0,
    hemiSky: '#2E2B78',
    hemiGround: '#0F1526',
    hemiIntensity: 0.36,
    sunColor: '#6366F1',
    sunIntensity: 0.24,
    rimColor: '#38BDF8',
    rimIntensity: 0.52,
    globalTint: '#4F5BD5',
    globalTintStrength: 0.36,
    nightFactor: 1.0,
    brazierMult: 2.85,
    lanternMult: 2.65,
    dappleMult: 0.32,
    bgDarkness: 0.94,
  },
  {
    // 05:00 - Pre-Dawn Indigo Mist
    hour: 5.0,
    hemiSky: '#3B347A',
    hemiGround: '#161B2E',
    hemiIntensity: 0.45,
    sunColor: '#818CF8',
    sunIntensity: 0.34,
    rimColor: '#67E8F9',
    rimIntensity: 0.54,
    globalTint: '#6366F1',
    globalTintStrength: 0.3,
    nightFactor: 0.85,
    brazierMult: 2.45,
    lanternMult: 2.25,
    dappleMult: 0.42,
    bgDarkness: 0.82,
  },
  {
    // 07:30 - Golden Dawn
    hour: 7.5,
    hemiSky: '#FDE68A',
    hemiGround: '#4A3B42',
    hemiIntensity: 1.15,
    sunColor: '#FDBA74',
    sunIntensity: 0.95,
    rimColor: '#7DD3FC',
    rimIntensity: 0.48,
    globalTint: '#FBBF24',
    globalTintStrength: 0.16,
    nightFactor: 0.3,
    brazierMult: 1.35,
    lanternMult: 1.35,
    dappleMult: 0.82,
    bgDarkness: 0.22,
  },
  {
    // 12:00 - High Noon Dapple
    hour: 12.0,
    hemiSky: '#FFFDF9',
    hemiGround: '#5A6270',
    hemiIntensity: 1.55,
    sunColor: '#FFF5E0',
    sunIntensity: 1.15,
    rimColor: '#93A8C4',
    rimIntensity: 0.45,
    globalTint: '#FFFDF9',
    globalTintStrength: 0.0,
    nightFactor: 0.0,
    brazierMult: 0.85,
    lanternMult: 1.0,
    dappleMult: 1.0,
    bgDarkness: 0.0,
  },
  {
    // 15:30 - Late Afternoon Sun
    hour: 15.5,
    hemiSky: '#FEF3C7',
    hemiGround: '#57534E',
    hemiIntensity: 1.42,
    sunColor: '#FDE047',
    sunIntensity: 1.12,
    rimColor: '#93C5FD',
    rimIntensity: 0.46,
    globalTint: '#FDE68A',
    globalTintStrength: 0.08,
    nightFactor: 0.12,
    brazierMult: 1.05,
    lanternMult: 1.15,
    dappleMult: 0.96,
    bgDarkness: 0.06,
  },
  {
    // 18:30 - Golden Dusk
    hour: 18.5,
    hemiSky: '#FDE68A',
    hemiGround: '#4C343A',
    hemiIntensity: 1.02,
    sunColor: '#FB923C',
    sunIntensity: 1.02,
    rimColor: '#818CF8',
    rimIntensity: 0.56,
    globalTint: '#F97316',
    globalTintStrength: 0.24,
    nightFactor: 0.48,
    brazierMult: 1.78,
    lanternMult: 1.55,
    dappleMult: 0.76,
    bgDarkness: 0.36,
  },
  {
    // 21:30 - Blood Moon Ascent
    hour: 21.5,
    hemiSky: '#9F1239',
    hemiGround: '#1F1224',
    hemiIntensity: 0.55,
    sunColor: '#F43F5E',
    sunIntensity: 0.52,
    rimColor: '#C084FC',
    rimIntensity: 0.65,
    globalTint: '#E11D48',
    globalTintStrength: 0.34,
    nightFactor: 0.86,
    brazierMult: 2.45,
    lanternMult: 2.25,
    dappleMult: 0.48,
    bgDarkness: 0.84,
  },
  {
    // 24:00 - Wrap back to Torchlit Midnight
    hour: 24.0,
    hemiSky: '#2E2B78',
    hemiGround: '#0F1526',
    hemiIntensity: 0.36,
    sunColor: '#6366F1',
    sunIntensity: 0.24,
    rimColor: '#38BDF8',
    rimIntensity: 0.52,
    globalTint: '#4F5BD5',
    globalTintStrength: 0.36,
    nightFactor: 1.0,
    brazierMult: 2.85,
    lanternMult: 2.65,
    dappleMult: 0.32,
    bgDarkness: 0.94,
  },
];

const DAY_BG_HEX: Record<CutoutBackgroundTone, string> = {
  ivory: '#F4F1EA',
  parchment: '#EAE2D3',
  obsidian: '#121216',
};

export const PRESET_CANONICAL_HOUR: Record<TimeOfDayPreset, number> = {
  'noon-dapple': 12.0,
  'golden-dusk': 18.5,
  'blood-moon': 21.5,
  'torch-midnight': 0.0,
};

export function hourToTimeOfDayPreset(hour: number): TimeOfDayPreset {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7.0 && h < 16.5) return 'noon-dapple';
  if (h >= 16.5 && h < 20.2) return 'golden-dusk';
  if (h >= 20.2 && h < 23.0) return 'blood-moon';
  return 'torch-midnight';
}

export function hourToPhaseLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 5.0 && h < 8.5) return 'Dawn Mist';
  if (h >= 8.5 && h < 16.5) return 'Noon Dapple';
  if (h >= 16.5 && h < 20.2) return 'Golden Dusk';
  if (h >= 20.2 && h < 23.0) return 'Blood Moon';
  return 'Torch Midnight';
}

export function formatGameClock(hour: number): string {
  const wrapped = ((hour % 24) + 24) % 24;
  const hrs = Math.floor(wrapped);
  const mins = Math.floor((wrapped - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

const colorA = new THREE.Color();
const colorB = new THREE.Color();

function lerpHex(hexA: string, hexB: string, t: number): string {
  colorA.set(hexA);
  colorB.set(hexB);
  colorA.lerp(colorB, t);
  return '#' + colorA.getHexString().toUpperCase();
}

export function evaluateDayNightCycle(
  rawHour: number,
  backgroundTone: CutoutBackgroundTone
): DayNightState {
  const hour = ((rawHour % 24) + 24) % 24;

  let kf0 = KEYFRAMES[0];
  let kf1 = KEYFRAMES[KEYFRAMES.length - 1];

  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (hour >= KEYFRAMES[i].hour && hour <= KEYFRAMES[i + 1].hour) {
      kf0 = KEYFRAMES[i];
      kf1 = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, kf1.hour - kf0.hour);
  const linearT = THREE.MathUtils.clamp((hour - kf0.hour) / span, 0, 1);
  // Smoothstep for organic celestial transitions
  const t = linearT * linearT * (3 - 2 * linearT);

  const hemiSkyHex = lerpHex(kf0.hemiSky, kf1.hemiSky, t);
  const hemiGroundHex = lerpHex(kf0.hemiGround, kf1.hemiGround, t);
  const hemiIntensity = THREE.MathUtils.lerp(kf0.hemiIntensity, kf1.hemiIntensity, t);

  const sunColorHex = lerpHex(kf0.sunColor, kf1.sunColor, t);
  const sunIntensity = THREE.MathUtils.lerp(kf0.sunIntensity, kf1.sunIntensity, t);

  const rimColorHex = lerpHex(kf0.rimColor, kf1.rimColor, t);
  const rimIntensity = THREE.MathUtils.lerp(kf0.rimIntensity, kf1.rimIntensity, t);

  const globalTintHex = lerpHex(kf0.globalTint, kf1.globalTint, t);
  const globalTintStrength = THREE.MathUtils.lerp(
    kf0.globalTintStrength,
    kf1.globalTintStrength,
    t
  );

  const nightFactor = THREE.MathUtils.lerp(kf0.nightFactor, kf1.nightFactor, t);
  const brazierIntensityMultiplier = THREE.MathUtils.lerp(kf0.brazierMult, kf1.brazierMult, t);
  const lanternIntensityMultiplier = THREE.MathUtils.lerp(kf0.lanternMult, kf1.lanternMult, t);
  const dappleMultiplier = THREE.MathUtils.lerp(kf0.dappleMult, kf1.dappleMult, t);

  const bgDarkness = THREE.MathUtils.lerp(kf0.bgDarkness, kf1.bgDarkness, t);
  const dayBg = DAY_BG_HEX[backgroundTone];
  const nightBg = hour >= 20.0 && hour < 23.0 ? '#1A1118' : '#0E1017';
  const bgColorHex =
    backgroundTone === 'obsidian' ? '#121216' : lerpHex(dayBg, nightBg, bgDarkness);

  // Orbiting solar/lunar key light arc across the sky dome
  const celestialAngle = ((hour - 6.0) / 24.0) * Math.PI * 2.0;
  const sunX = Math.cos(celestialAngle) * 16.0;
  const sunY = Math.max(8.5, 16.0 + Math.sin(celestialAngle) * 7.5);
  const sunZ = 10.0 + Math.sin(celestialAngle * 0.5) * 6.0;

  return {
    hour,
    formattedClock: formatGameClock(hour),
    preset: hourToTimeOfDayPreset(hour),
    phaseLabel: hourToPhaseLabel(hour),
    nightFactor,
    brazierIntensityMultiplier: Number(brazierIntensityMultiplier.toFixed(2)),
    lanternIntensityMultiplier: Number(lanternIntensityMultiplier.toFixed(2)),
    dappleMultiplier: Number(dappleMultiplier.toFixed(2)),
    hemiSkyHex,
    hemiGroundHex,
    hemiIntensity,
    sunColorHex,
    sunIntensity,
    sunPosition: [sunX, sunY, sunZ],
    rimColorHex,
    rimIntensity,
    globalTintHex,
    globalTintStrength,
    bgColorHex,
  };
}
