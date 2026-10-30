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
    // 00:00 - Torchlit Midnight (Moonlit Silver-Slate & Warm Amber Braziers)
    hour: 0.0,
    hemiSky: '#3A4352',
    hemiGround: '#141518',
    hemiIntensity: 0.48,
    sunColor: '#7A889B',
    sunIntensity: 0.34,
    rimColor: '#8CA0B5',
    rimIntensity: 0.38,
    globalTint: '#647282',
    globalTintStrength: 0.16,
    nightFactor: 1.0,
    brazierMult: 2.65,
    lanternMult: 2.45,
    dappleMult: 0.36,
    bgDarkness: 0.96,
  },
  {
    // 05:00 - Pre-Dawn Slate Mist
    hour: 5.0,
    hemiSky: '#4B5463',
    hemiGround: '#1A1C20',
    hemiIntensity: 0.58,
    sunColor: '#8E9BAE',
    sunIntensity: 0.44,
    rimColor: '#9FB1C4',
    rimIntensity: 0.40,
    globalTint: '#788496',
    globalTintStrength: 0.14,
    nightFactor: 0.82,
    brazierMult: 2.25,
    lanternMult: 2.1,
    dappleMult: 0.45,
    bgDarkness: 0.85,
  },
  {
    // 07:30 - Pale Amber Dawn
    hour: 7.5,
    hemiSky: '#D8C7A8',
    hemiGround: '#3A342D',
    hemiIntensity: 1.08,
    sunColor: '#DFB982',
    sunIntensity: 0.88,
    rimColor: '#9BA8B5',
    rimIntensity: 0.38,
    globalTint: '#C8B273',
    globalTintStrength: 0.10,
    nightFactor: 0.28,
    brazierMult: 1.35,
    lanternMult: 1.35,
    dappleMult: 0.80,
    bgDarkness: 0.45,
  },
  {
    // 12:00 - High Noon Dapple (Natural Weathered Stone Daylight)
    hour: 12.0,
    hemiSky: '#EAE3D5',
    hemiGround: '#4A463F',
    hemiIntensity: 1.38,
    sunColor: '#F2E8D5',
    sunIntensity: 1.05,
    rimColor: '#9AA3AE',
    rimIntensity: 0.36,
    globalTint: '#EAE3D5',
    globalTintStrength: 0.0,
    nightFactor: 0.0,
    brazierMult: 0.95,
    lanternMult: 1.05,
    dappleMult: 0.92,
    bgDarkness: 0.25,
  },
  {
    // 15:30 - Late Afternoon Pale Gold
    hour: 15.5,
    hemiSky: '#E2D5BE',
    hemiGround: '#46413A',
    hemiIntensity: 1.28,
    sunColor: '#E5CA99',
    sunIntensity: 0.98,
    rimColor: '#98A4B3',
    rimIntensity: 0.38,
    globalTint: '#D4BE94',
    globalTintStrength: 0.06,
    nightFactor: 0.14,
    brazierMult: 1.15,
    lanternMult: 1.2,
    dappleMult: 0.88,
    bgDarkness: 0.35,
  },
  {
    // 18:30 - Golden Dusk (Warm Bronze & Umber Shadows)
    hour: 18.5,
    hemiSky: '#C9A97E',
    hemiGround: '#332A24',
    hemiIntensity: 0.94,
    sunColor: '#D49A5A',
    sunIntensity: 0.86,
    rimColor: '#7D8A9B',
    rimIntensity: 0.42,
    globalTint: '#C4925A',
    globalTintStrength: 0.14,
    nightFactor: 0.48,
    brazierMult: 1.78,
    lanternMult: 1.6,
    dappleMult: 0.72,
    bgDarkness: 0.65,
  },
  {
    // 21:30 - Blood Moon Ascent (Muted Wine-Umber & Ash Slate, no neon pink)
    hour: 21.5,
    hemiSky: '#5E3D3E',
    hemiGround: '#1A1516',
    hemiIntensity: 0.56,
    sunColor: '#A36A64',
    sunIntensity: 0.48,
    rimColor: '#8B7985',
    rimIntensity: 0.44,
    globalTint: '#8C5852',
    globalTintStrength: 0.16,
    nightFactor: 0.86,
    brazierMult: 2.35,
    lanternMult: 2.2,
    dappleMult: 0.46,
    bgDarkness: 0.90,
  },
  {
    // 24:00 - Wrap back to Torchlit Midnight
    hour: 24.0,
    hemiSky: '#3A4352',
    hemiGround: '#141518',
    hemiIntensity: 0.48,
    sunColor: '#7A889B',
    sunIntensity: 0.34,
    rimColor: '#8CA0B5',
    rimIntensity: 0.38,
    globalTint: '#647282',
    globalTintStrength: 0.16,
    nightFactor: 1.0,
    brazierMult: 2.65,
    lanternMult: 2.45,
    dappleMult: 0.36,
    bgDarkness: 0.96,
  },
];

const DAY_BG_HEX: Record<CutoutBackgroundTone, string> = {
  ivory: '#14120F',
  parchment: '#181511',
  obsidian: '#0B0A08',
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
