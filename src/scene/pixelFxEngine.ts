import * as THREE from 'three';
import { SwordStrikeArchetype, SwordStrikeId } from './combatChoreography';

/**
 * ============================================================================
 * PIXELFX PROCEDURAL PIXEL-ART VFX ENGINE (patch-gg/pixelfx Architecture)
 * ============================================================================
 * Implements the core zero-dependency pixel buffer pipeline (`createFrame`,
 * `clearFrame`, `setPixel`, `bayer4x4`, `composite`, and multi-frame sprite
 * sheet baking) inspired by https://github.com/patch-gg/pixelfx, tailored for
 * NULLSPIRE: LEVEL ZERO's Cinderfall palette and Three.js 3D combat choreography.
 */

export type PixelFxId =
  | 'combat/kesagiri-slash'
  | 'combat/crimson-cleave'
  | 'combat/shadowrush-pierce'
  | 'combat/ichimonji-fissure'
  | 'combat/sekiro-deflect'
  | 'shadow/gapstep-sigil'
  | 'shadow/crosspull-grasp'
  | 'status/bloodwage-burn'
  | 'holy/pacify-halo'
  | 'pickups/bind-remnant-burst';

export type PixelFxCategory = 'combat' | 'shadow' | 'status' | 'holy' | 'pickups';

export type PixelFxOrientation = 'slash-plane' | 'ground-decal' | 'billboard';

export interface PixelFrame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface PixelFxCatalogEntry {
  id: PixelFxId;
  category: PixelFxCategory;
  name: string;
  subtitle: string;
  frameSize: number;
  frameCount: number;
  fps: number;
  defaultScale: number;
  orientation: PixelFxOrientation;
  paletteHex: string[];
  renderFrame: (frame: PixelFrame, progress: number, frameIdx: number) => void;
}

export interface BakedPixelFxSheet {
  spec: PixelFxCatalogEntry;
  texture: THREE.DataTexture;
  sheetWidth: number;
  sheetHeight: number;
  sheetRgba: Uint8ClampedArray;
}

const BAYER_4X4 = [
  0 / 16, 8 / 16, 2 / 16, 10 / 16,
  12 / 16, 4 / 16, 14 / 16, 6 / 16,
  3 / 16, 11 / 16, 1 / 16, 9 / 16,
  15 / 16, 7 / 16, 13 / 16, 5 / 16,
];

function bayerThreshold(x: number, y: number): number {
  const ix = ((x | 0) % 4 + 4) % 4;
  const iy = ((y | 0) % 4 + 4) % 4;
  return BAYER_4X4[iy * 4 + ix];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function createFrame(width: number, height: number): PixelFrame {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
}

export function clearFrame(frame: PixelFrame): void {
  frame.data.fill(0);
}

export function setPixelRgba(
  frame: PixelFrame,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255
): void {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || ix >= frame.width || iy < 0 || iy >= frame.height) return;
  const idx = (iy * frame.width + ix) * 4;
  frame.data[idx] = r;
  frame.data[idx + 1] = g;
  frame.data[idx + 2] = b;
  frame.data[idx + 3] = a;
}

export function setPixelDithered(
  frame: PixelFrame,
  x: number,
  y: number,
  rgb: [number, number, number],
  coverage = 1.0
): void {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || ix >= frame.width || iy < 0 || iy >= frame.height) return;
  if (coverage <= 0.02) return;
  if (coverage < 0.98 && bayerThreshold(ix, iy) > coverage) return;
  const idx = (iy * frame.width + ix) * 4;
  frame.data[idx] = rgb[0];
  frame.data[idx + 1] = rgb[1];
  frame.data[idx + 2] = rgb[2];
  frame.data[idx + 3] = 255;
}

function drawBresenhamLine(
  frame: PixelFrame,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: [number, number, number],
  coverage = 1.0
): void {
  let ix0 = Math.round(x0);
  let iy0 = Math.round(y0);
  const ix1 = Math.round(x1);
  const iy1 = Math.round(y1);
  const dx = Math.abs(ix1 - ix0);
  const dy = -Math.abs(iy1 - iy0);
  const sx = ix0 < ix1 ? 1 : -1;
  const sy = iy0 < iy1 ? 1 : -1;
  let err = dx + dy;

  for (let steps = 0; steps < 128; steps++) {
    setPixelDithered(frame, ix0, iy0, rgb, coverage);
    if (ix0 === ix1 && iy0 === iy1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      ix0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      iy0 += sy;
    }
  }
}

function hash2d(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

// ============================================================================
// CINDERFALL PALETTE RAMPS (RGB Tuples)
// ============================================================================
const COL_WHITE = hexToRgb('#ffffff');
const COL_CHALK = hexToRgb('#f4efe4');
const COL_GOLD = hexToRgb('#e8a020');
const COL_BLOOD = hexToRgb('#e5482f');
const COL_EMBER_DARK = hexToRgb('#7f1d1d');
const COL_CYAN = hexToRgb('#9fd8e8');
const COL_CYAN_DEEP = hexToRgb('#2d6a7e');
const COL_VIOLET_INK = hexToRgb('#3a243b');

// ============================================================================
// 10 PROCEDURAL PIXELFX GENERATORS (src/fx/<category>/<name>)
// ============================================================================
export const PIXELFX_CATALOG: Record<PixelFxId, PixelFxCatalogEntry> = {
  'combat/kesagiri-slash': {
    id: 'combat/kesagiri-slash',
    category: 'combat',
    name: 'Kesagiri Crescent Slash',
    subtitle: 'Light Strike · Bayer-Dithered Blade Arc & Sparks',
    frameSize: 48,
    frameCount: 12,
    fps: 32,
    defaultScale: 2.85,
    orientation: 'slash-plane',
    paletteHex: ['#ffffff', '#f4efe4', '#e8a020', '#e5482f'],
    renderFrame: (frame, p, frameIdx) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      const headAngle = -Math.PI * 0.75 + Math.pow(p, 0.65) * Math.PI * 1.48;
      const tailAngle = -Math.PI * 0.75 + Math.pow(p, 1.85) * Math.PI * 1.35;
      const outerR = frame.width * 0.44;
      const innerR = frame.width * 0.24;

      for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.hypot(dx, dy);
          if (r < innerR || r > outerR) continue;
          const ang = Math.atan2(dy, dx);
          if (ang < tailAngle || ang > headAngle) continue;

          const arcU = (ang - tailAngle) / Math.max(0.05, headAngle - tailAngle);
          const radV = (r - innerR) / (outerR - innerR);
          const belly = Math.sin(arcU * Math.PI);
          if (1.0 - radV > belly * 0.95) continue;

          const fade = (1.0 - p * 0.55) * arcU;
          if (radV > 0.82 && arcU > 0.45) {
            setPixelDithered(frame, x, y, COL_WHITE, Math.min(1, fade * 1.4));
          } else if (radV > 0.58) {
            setPixelDithered(frame, x, y, COL_CHALK, fade * 1.15);
          } else if (radV > 0.32) {
            setPixelDithered(frame, x, y, COL_GOLD, fade * 0.95);
          } else {
            setPixelDithered(frame, x, y, COL_BLOOD, fade * 0.75);
          }
        }
      }

      // Detached pixel sparks along the slash wake
      for (let i = 0; i < 10; i++) {
        const sparkAng = tailAngle + (i / 10) * (headAngle - tailAngle);
        const sparkR = outerR * (0.72 + hash2d(i, frameIdx) * 0.32);
        const sx = cx + Math.cos(sparkAng) * sparkR;
        const sy = cy + Math.sin(sparkAng) * sparkR;
        setPixelDithered(frame, sx, sy, i % 2 === 0 ? COL_GOLD : COL_CHALK, 1.0 - p * 0.7);
      }
    },
  },

  'combat/crimson-cleave': {
    id: 'combat/crimson-cleave',
    category: 'combat',
    name: 'Combine Wide Cleave',
    subtitle: 'Heavy Strike · 230° Double-Bellied Serrated Ember Wake',
    frameSize: 56,
    frameCount: 12,
    fps: 26,
    defaultScale: 3.45,
    orientation: 'slash-plane',
    paletteHex: ['#ffffff', '#e8a020', '#e5482f', '#7f1d1d'],
    renderFrame: (frame, p, frameIdx) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      const startAng = -Math.PI * 0.88;
      const headAng = startAng + Math.pow(p, 0.58) * Math.PI * 1.68;
      const tailAng = startAng + Math.pow(p, 1.95) * Math.PI * 1.45;
      const outerR = frame.width * 0.46;
      const innerR = frame.width * 0.16;

      for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const r = Math.hypot(dx, dy);
          if (r < innerR || r > outerR) continue;
          const ang = Math.atan2(dy, dx);
          if (ang < tailAng || ang > headAng) continue;

          const arcU = (ang - tailAng) / Math.max(0.05, headAng - tailAng);
          const radV = (r - innerR) / (outerR - innerR);
          // Serrated saw-tooth outer rim
          const serration = Math.sin(ang * 14.0 + frameIdx) * 0.06;
          if (radV > 0.94 + serration) continue;

          const intensity = (1.0 - p * 0.45) * Math.pow(arcU, 0.65);
          if (radV > 0.78) {
            setPixelDithered(frame, x, y, arcU > 0.65 ? COL_WHITE : COL_GOLD, intensity * 1.25);
          } else if (radV > 0.44) {
            setPixelDithered(frame, x, y, COL_BLOOD, intensity * 1.05);
          } else {
            setPixelDithered(frame, x, y, COL_EMBER_DARK, intensity * 0.75);
          }
        }
      }

      // Orbiting cinder chunks
      for (let i = 0; i < 16; i++) {
        const a = startAng + hash2d(i, 3) * Math.PI * 1.65 + p * 0.9;
        const rad = innerR + hash2d(i, 9) * (outerR - innerR) * (0.85 + p * 0.35);
        const px = cx + Math.cos(a) * rad;
        const py = cy + Math.sin(a) * rad;
        setPixelDithered(frame, px, py, i % 3 === 0 ? COL_WHITE : COL_GOLD, 1.0 - p * 0.5);
        setPixelDithered(frame, px + 1, py, COL_BLOOD, 0.85 - p * 0.5);
      }
    },
  },

  'combat/shadowrush-pierce': {
    id: 'combat/shadowrush-pierce',
    category: 'combat',
    name: 'Shadowrush Vortex Lance',
    subtitle: 'Thrust Strike · Axial Needle Beam & Sonic Shock-Rings',
    frameSize: 48,
    frameCount: 12,
    fps: 30,
    defaultScale: 3.1,
    orientation: 'slash-plane',
    paletteHex: ['#ffffff', '#9fd8e8', '#f4efe4', '#2d6a7e'],
    renderFrame: (frame, p) => {
      const cx = frame.width * 0.5;
      const tipY = frame.height * (0.82 - Math.pow(p, 0.45) * 0.74);
      const baseY = frame.height * (0.92 - Math.pow(p, 1.6) * 0.48);

      // Central needle beam + tapered cyan aura
      for (let y = Math.max(1, Math.floor(tipY)); y <= Math.min(frame.height - 2, Math.ceil(baseY)); y++) {
        const beamU = (y - tipY) / Math.max(1, baseY - tipY);
        const halfW = Math.sin(beamU * Math.PI) * 5.5 * (1.0 - p * 0.4);
        for (let dx = -Math.ceil(halfW); dx <= Math.ceil(halfW); dx++) {
          const dist = Math.abs(dx) / Math.max(0.5, halfW);
          if (dist < 0.32) {
            setPixelDithered(frame, cx + dx, y, COL_WHITE, 1.0);
          } else if (dist < 0.68) {
            setPixelDithered(frame, cx + dx, y, COL_CYAN, 1.0 - p * 0.35);
          } else {
            setPixelDithered(frame, cx + dx, y, COL_CYAN_DEEP, 0.75 - p * 0.45);
          }
        }
      }

      // Two concentric sonic rings around the lance shaft
      for (let rIdx = 0; rIdx < 2; rIdx++) {
        const ringY = frame.height * (0.68 - rIdx * 0.22 - p * 0.18);
        const rx = (6 + rIdx * 3) * (0.6 + p * 0.75);
        const ry = 2.5 + p * 1.5;
        for (let a = 0; a < 28; a++) {
          const theta = (a / 28) * Math.PI * 2;
          const px = cx + Math.cos(theta) * rx;
          const py = ringY + Math.sin(theta) * ry;
          setPixelDithered(
            frame,
            px,
            py,
            rIdx === 0 ? COL_CYAN : COL_CHALK,
            (1.0 - p * 0.65) * 0.9
          );
        }
      }
    },
  },

  'combat/ichimonji-fissure': {
    id: 'combat/ichimonji-fissure',
    category: 'combat',
    name: 'Ichimonji Crater Shockwave',
    subtitle: 'Overhead Finisher · Radial Stone Fracture & Gold Plume',
    frameSize: 56,
    frameCount: 12,
    fps: 24,
    defaultScale: 3.3,
    orientation: 'ground-decal',
    paletteHex: ['#ffffff', '#e8a020', '#e5482f', '#f4efe4'],
    renderFrame: (frame, p) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      const ringR = frame.width * (0.12 + Math.pow(p, 0.55) * 0.34);
      const ringThick = 4.2 * (1.0 - p * 0.45);

      // Radial shockwave ring
      for (let y = 0; y < frame.height; y++) {
        for (let x = 0; x < frame.width; x++) {
          const d = Math.hypot(x - cx, y - cy);
          const diff = Math.abs(d - ringR);
          if (diff <= ringThick) {
            const u = 1.0 - diff / ringThick;
            setPixelDithered(
              frame,
              x,
              y,
              u > 0.65 ? COL_GOLD : COL_BLOOD,
              u * (1.0 - p * 0.45)
            );
          }
        }
      }

      // 8 radial lightning / stone-split fissure rays
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + 0.2;
        const r0 = 2 + p * 6;
        const r1 = ringR * 1.15;
        drawBresenhamLine(
          frame,
          cx + Math.cos(ang) * r0,
          cy + Math.sin(ang) * r0,
          cx + Math.cos(ang) * r1,
          cy + Math.sin(ang) * r1,
          i % 2 === 0 ? COL_WHITE : COL_GOLD,
          1.0 - p * 0.5
        );
      }
    },
  },

  'combat/sekiro-deflect': {
    id: 'combat/sekiro-deflect',
    category: 'combat',
    name: 'Sekiro Crossguard Parry Star',
    subtitle: 'Timed Deflect [K] · 8-Point Steel Clash & Shrapnel Sparks',
    frameSize: 48,
    frameCount: 12,
    fps: 36,
    defaultScale: 2.35,
    orientation: 'billboard',
    paletteHex: ['#ffffff', '#e8a020', '#e5482f', '#9fd8e8'],
    renderFrame: (frame, p) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      const spikeLen = frame.width * 0.45 * Math.sin(Math.min(1, p * 1.35) * Math.PI);

      // 4 cardinal + 4 diagonal crossguard clash spikes
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const len = i % 2 === 0 ? spikeLen : spikeLen * 0.62;
        drawBresenhamLine(
          frame,
          cx - Math.cos(ang) * 2,
          cy - Math.sin(ang) * 2,
          cx + Math.cos(ang) * len,
          cy + Math.sin(ang) * len,
          i % 2 === 0 ? COL_WHITE : COL_GOLD,
          1.0 - p * 0.35
        );
      }

      // Expanding parry shock ring
      const ringR = frame.width * (0.1 + p * 0.34);
      for (let a = 0; a < 36; a++) {
        const theta = (a / 36) * Math.PI * 2;
        setPixelDithered(
          frame,
          cx + Math.cos(theta) * ringR,
          cy + Math.sin(theta) * ringR,
          a % 2 === 0 ? COL_GOLD : COL_BLOOD,
          1.0 - p * 0.55
        );
      }

      // Flying steel sparks
      for (let s = 0; s < 12; s++) {
        const ang = (s / 12) * Math.PI * 2 + 0.18;
        const dist = (4 + hash2d(s, 7) * 16) * (0.35 + p * 0.95);
        setPixelDithered(
          frame,
          cx + Math.cos(ang) * dist,
          cy + Math.sin(ang) * dist,
          s % 3 === 0 ? COL_WHITE : COL_GOLD,
          1.0 - p * 0.5
        );
      }
    },
  },

  'shadow/gapstep-sigil': {
    id: 'shadow/gapstep-sigil',
    category: 'shadow',
    name: 'Gapstep Seam Sigil',
    subtitle: 'Parasite Tech [1] · Occult Seam Octagram & Blink Wake',
    frameSize: 48,
    frameCount: 12,
    fps: 28,
    defaultScale: 2.5,
    orientation: 'ground-decal',
    paletteHex: ['#9fd8e8', '#e5482f', '#f4efe4', '#3a243b'],
    renderFrame: (frame, p) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      const r = frame.width * (0.38 - p * 0.12);
      const rot = p * Math.PI * 0.75;

      for (let i = 0; i < 8; i++) {
        const a0 = rot + (i / 8) * Math.PI * 2;
        const a1 = rot + (((i + 3) % 8) / 8) * Math.PI * 2;
        drawBresenhamLine(
          frame,
          cx + Math.cos(a0) * r,
          cy + Math.sin(a0) * r,
          cx + Math.cos(a1) * r,
          cy + Math.sin(a1) * r,
          i % 2 === 0 ? COL_CYAN : COL_BLOOD,
          1.0 - p * 0.5
        );
      }
    },
  },

  'shadow/crosspull-grasp': {
    id: 'shadow/crosspull-grasp',
    category: 'shadow',
    name: 'Crosspull Seam Vortex',
    subtitle: 'Parasite Tech [3] · Converging Spatial Lash Tendrils',
    frameSize: 56,
    frameCount: 12,
    fps: 26,
    defaultScale: 3.6,
    orientation: 'ground-decal',
    paletteHex: ['#e5482f', '#9fd8e8', '#e8a020', '#3a243b'],
    renderFrame: (frame, p) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      const invP = 1.0 - p;
      for (let arm = 0; arm < 6; arm++) {
        const baseAng = (arm / 6) * Math.PI * 2;
        for (let step = 0; step < 22; step++) {
          const u = step / 22;
          const rad = frame.width * 0.45 * u * (0.35 + invP * 0.65);
          const spiralAng = baseAng + u * 2.4 + p * 3.2;
          const px = cx + Math.cos(spiralAng) * rad;
          const py = cy + Math.sin(spiralAng) * rad;
          setPixelDithered(
            frame,
            px,
            py,
            step % 2 === 0 ? COL_BLOOD : COL_CYAN,
            1.0 - p * 0.4
          );
        }
      }
    },
  },

  'status/bloodwage-burn': {
    id: 'status/bloodwage-burn',
    category: 'status',
    name: 'Bloodwage Crimson Pyre',
    subtitle: 'Parasite Tech [2] · Rising Pixel Blood-Flame & Cinders',
    frameSize: 48,
    frameCount: 12,
    fps: 24,
    defaultScale: 2.3,
    orientation: 'billboard',
    paletteHex: ['#ffffff', '#e8a020', '#e5482f', '#7f1d1d'],
    renderFrame: (frame, p, frameIdx) => {
      const cx = frame.width * 0.5;
      for (let i = 0; i < 24; i++) {
        const seed = hash2d(i, 11);
        const life = (p + seed) % 1.0;
        const x = cx + Math.sin(i * 2.1 + life * 5.0) * (12 * (1.0 - life * 0.5));
        const y = frame.height * (0.85 - life * 0.72);
        const col =
          life < 0.25
            ? COL_WHITE
            : life < 0.55
              ? COL_GOLD
              : life < 0.8
                ? COL_BLOOD
                : COL_EMBER_DARK;
        setPixelDithered(frame, x, y, col, 1.0 - p * 0.4);
        setPixelDithered(frame, x, y + 1, COL_BLOOD, (1.0 - life) * (1.0 - p * 0.4));
        if ((i + frameIdx) % 3 === 0) {
          setPixelDithered(frame, x + 1, y, COL_GOLD, 0.8 * (1.0 - p * 0.4));
        }
      }
    },
  },

  'holy/pacify-halo': {
    id: 'holy/pacify-halo',
    category: 'holy',
    name: 'Sanctuary Respect Halo',
    subtitle: 'Bow in Respect [G] · Pacifying Spire Gold & Cyan Crown',
    frameSize: 48,
    frameCount: 12,
    fps: 24,
    defaultScale: 2.6,
    orientation: 'ground-decal',
    paletteHex: ['#f4efe4', '#e8a020', '#9fd8e8'],
    renderFrame: (frame, p) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      const rOuter = frame.width * (0.22 + p * 0.22);
      const rInner = rOuter * 0.68;

      for (let a = 0; a < 48; a++) {
        const theta = (a / 48) * Math.PI * 2 + p * 1.2;
        setPixelDithered(
          frame,
          cx + Math.cos(theta) * rOuter,
          cy + Math.sin(theta) * rOuter,
          a % 2 === 0 ? COL_CYAN : COL_GOLD,
          1.0 - p * 0.45
        );
        setPixelDithered(
          frame,
          cx + Math.cos(-theta) * rInner,
          cy + Math.sin(-theta) * rInner,
          COL_CHALK,
          1.0 - p * 0.55
        );
      }
    },
  },

  'pickups/bind-remnant-burst': {
    id: 'pickups/bind-remnant-burst',
    category: 'pickups',
    name: 'BIND Remnant Crystal Burst',
    subtitle: '73% BIND / Coat Scrip · Radial Pixel Shard & Soul Burst',
    frameSize: 48,
    frameCount: 12,
    fps: 28,
    defaultScale: 2.4,
    orientation: 'billboard',
    paletteHex: ['#ffffff', '#9fd8e8', '#e8a020', '#3a243b'],
    renderFrame: (frame, p) => {
      const cx = frame.width * 0.5;
      const cy = frame.height * 0.5;
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 + (i % 2) * 0.15;
        const r = (3 + hash2d(i, 5) * 16) * Math.pow(p, 0.65);
        const px = cx + Math.cos(ang) * r;
        const py = cy + Math.sin(ang) * r;
        const col = i % 3 === 0 ? COL_CYAN : i % 3 === 1 ? COL_GOLD : COL_VIOLET_INK;
        setPixelDithered(frame, px, py, COL_WHITE, 1.0 - p * 0.5);
        setPixelDithered(frame, px + 1, py, col, 1.0 - p * 0.4);
        setPixelDithered(frame, px, py + 1, col, 1.0 - p * 0.4);
      }
    },
  },
};

export const STRIKE_ID_TO_PIXELFX: Record<SwordStrikeId, PixelFxId> = {
  'light-kesagiri': 'combat/kesagiri-slash',
  'light-rising': 'combat/kesagiri-slash',
  'heavy-cleave': 'combat/crimson-cleave',
  'thrust-shadowrush': 'combat/shadowrush-pierce',
  'overhead-ichimonji': 'combat/ichimonji-fissure',
};

export const ARCHETYPE_TO_PIXELFX: Record<SwordStrikeArchetype, PixelFxId> = {
  light: 'combat/kesagiri-slash',
  heavy: 'combat/crimson-cleave',
  thrust: 'combat/shadowrush-pierce',
  overhead: 'combat/ichimonji-fissure',
};

/**
 * Bakes a 12-frame horizontal pixel-art sprite sheet (`width = frameSize * frameCount`,
 * `height = frameSize`) with NearestFilter for crisp zero-blur Three.js UV stepping.
 */
export function bakePixelFxSpriteSheet(spec: PixelFxCatalogEntry): BakedPixelFxSheet {
  const { frameSize, frameCount } = spec;
  const sheetWidth = frameSize * frameCount;
  const sheetHeight = frameSize;
  const sheetRgba = new Uint8ClampedArray(sheetWidth * sheetHeight * 4);
  const singleFrame = createFrame(frameSize, frameSize);

  for (let f = 0; f < frameCount; f++) {
    clearFrame(singleFrame);
    const progress = f / Math.max(1, frameCount - 1);
    spec.renderFrame(singleFrame, progress, f);

    for (let y = 0; y < frameSize; y++) {
      // Flip Y when copying into Three.js DataTexture so Y=0 in pixel frame is top
      const dstY = frameSize - 1 - y;
      for (let x = 0; x < frameSize; x++) {
        const srcIdx = (y * frameSize + x) * 4;
        const dstIdx = (dstY * sheetWidth + (f * frameSize + x)) * 4;
        sheetRgba[dstIdx] = singleFrame.data[srcIdx];
        sheetRgba[dstIdx + 1] = singleFrame.data[srcIdx + 1];
        sheetRgba[dstIdx + 2] = singleFrame.data[srcIdx + 2];
        sheetRgba[dstIdx + 3] = singleFrame.data[srcIdx + 3];
      }
    }
  }

  const texture = new THREE.DataTexture(
    sheetRgba,
    sheetWidth,
    sheetHeight,
    THREE.RGBAFormat
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1 / frameCount, 1);
  texture.needsUpdate = true;

  return {
    spec,
    texture,
    sheetWidth,
    sheetHeight,
    sheetRgba,
  };
}

/**
 * Converts a baked `BakedPixelFxSheet` (or a single frame from it) into a PNG data URL
 * so the StudioDock PixelFX Inspector can display or download the sprite sheet.
 */
export function renderBakedSheetToDataUrl(sheet: BakedPixelFxSheet, scale = 2): string {
  const canvas = document.createElement('canvas');
  canvas.width = sheet.sheetWidth * scale;
  canvas.height = sheet.sheetHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sheet.sheetWidth;
  tempCanvas.height = sheet.sheetHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return '';

  const imgData = tempCtx.createImageData(sheet.sheetWidth, sheet.sheetHeight);
  // Flip back vertically for standard 2D HTML canvas orientation
  for (let y = 0; y < sheet.sheetHeight; y++) {
    const srcY = sheet.sheetHeight - 1 - y;
    for (let x = 0; x < sheet.sheetWidth; x++) {
      const srcIdx = (srcY * sheet.sheetWidth + x) * 4;
      const dstIdx = (y * sheet.sheetWidth + x) * 4;
      imgData.data[dstIdx] = sheet.sheetRgba[srcIdx];
      imgData.data[dstIdx + 1] = sheet.sheetRgba[srcIdx + 1];
      imgData.data[dstIdx + 2] = sheet.sheetRgba[srcIdx + 2];
      imgData.data[dstIdx + 3] = sheet.sheetRgba[srcIdx + 3];
    }
  }
  tempCtx.putImageData(imgData, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

// ============================================================================
// 3D WORLD-SPACE PIXELFX FLIPBOOK POOL MANAGER
// ============================================================================
interface ActivePixelFxNode {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  active: boolean;
  fxId: PixelFxId;
  elapsed: number;
  duration: number;
  frameCount: number;
  orientation: PixelFxOrientation;
  planeTiltX: number;
  planeRollZ: number;
  facingAngle: number;
}

export interface PixelFxWorldManager {
  spawnFx: (
    fxId: PixelFxId,
    x: number,
    y: number,
    z: number,
    options?: {
      facingAngle?: number;
      planeTiltX?: number;
      planeRollZ?: number;
      scaleMultiplier?: number;
    }
  ) => void;
  update: (dt: number, cameraQuaternion: THREE.Quaternion) => void;
  dispose: () => void;
}

export function createPixelFxWorldManager(scene: THREE.Scene): PixelFxWorldManager {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'PixelFxWorldPool';
  scene.add(rootGroup);

  const bakedSheets = new Map<PixelFxId, BakedPixelFxSheet>();
  (Object.keys(PIXELFX_CATALOG) as PixelFxId[]).forEach((id) => {
    bakedSheets.set(id, bakePixelFxSpriteSheet(PIXELFX_CATALOG[id]));
  });

  const sharedPlaneGeo = new THREE.PlaneGeometry(1, 1);
  const poolSize = 18;
  const pool: ActivePixelFxNode[] = [];

  for (let i = 0; i < poolSize; i++) {
    const defaultSheet = bakedSheets.get('combat/kesagiri-slash')!;
    const texClone = defaultSheet.texture.clone();
    texClone.needsUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      map: texClone,
      transparent: true,
      opacity: 1.0,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(sharedPlaneGeo, material);
    mesh.visible = false;
    mesh.renderOrder = 12;
    rootGroup.add(mesh);

    pool.push({
      mesh,
      material,
      active: false,
      fxId: 'combat/kesagiri-slash',
      elapsed: 0,
      duration: 0.35,
      frameCount: 12,
      orientation: 'slash-plane',
      planeTiltX: 0,
      planeRollZ: 0,
      facingAngle: 0,
    });
  }

  let nextCursor = 0;

  const spawnFx: PixelFxWorldManager['spawnFx'] = (fxId, x, y, z, options = {}) => {
    const sheet = bakedSheets.get(fxId);
    if (!sheet) return;

    const node = pool[nextCursor];
    nextCursor = (nextCursor + 1) % pool.length;

    const spec = sheet.spec;
    node.active = true;
    node.fxId = fxId;
    node.elapsed = 0;
    node.frameCount = spec.frameCount;
    node.duration = spec.frameCount / spec.fps;
    node.orientation = spec.orientation;
    node.facingAngle = options.facingAngle ?? 0;
    node.planeTiltX = options.planeTiltX ?? 0;
    node.planeRollZ = options.planeRollZ ?? 0;

    // Bind baked sprite sheet texture and configure UV repeat for frame 0
    if (node.material.map) {
      node.material.map.dispose();
    }
    const instanceTex = sheet.texture.clone();
    instanceTex.repeat.set(1 / spec.frameCount, 1);
    instanceTex.offset.set(0, 0);
    instanceTex.needsUpdate = true;
    node.material.map = instanceTex;
    node.material.opacity = 1.0;
    node.material.needsUpdate = true;

    const scale = spec.defaultScale * (options.scaleMultiplier ?? 1.0);
    node.mesh.scale.set(scale, scale, scale);
    node.mesh.position.set(x, y, z);
    node.mesh.rotation.set(0, 0, 0);

    if (spec.orientation === 'ground-decal') {
      node.mesh.rotation.order = 'YXZ';
      node.mesh.rotation.y = node.facingAngle;
      node.mesh.rotation.x = -Math.PI / 2;
    } else if (spec.orientation === 'slash-plane') {
      node.mesh.rotation.order = 'YXZ';
      node.mesh.rotation.y = node.facingAngle;
      node.mesh.rotation.x = -Math.PI / 2 + node.planeTiltX;
      node.mesh.rotation.z = node.planeRollZ;
    }

    node.mesh.visible = true;
  };

  const update: PixelFxWorldManager['update'] = (dt, cameraQuaternion) => {
    for (let i = 0; i < pool.length; i++) {
      const node = pool[i];
      if (!node.active) continue;

      node.elapsed += dt;
      if (node.elapsed >= node.duration) {
        node.active = false;
        node.mesh.visible = false;
        continue;
      }

      const norm = node.elapsed / node.duration;
      const frameIdx = Math.min(
        node.frameCount - 1,
        Math.floor(norm * node.frameCount)
      );

      if (node.material.map) {
        node.material.map.offset.x = frameIdx / node.frameCount;
      }

      if (node.orientation === 'billboard') {
        node.mesh.quaternion.copy(cameraQuaternion);
      }
    }
  };

  const dispose = () => {
    scene.remove(rootGroup);
    sharedPlaneGeo.dispose();
    for (const node of pool) {
      node.material.map?.dispose();
      node.material.dispose();
    }
    bakedSheets.forEach((sheet) => sheet.texture.dispose());
  };

  return {
    spawnFx,
    update,
    dispose,
  };
}
