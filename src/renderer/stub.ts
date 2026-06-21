import Konva from 'konva';
import type { RendererAPI } from './types';
import type {
  Blueprint,
  ElementRef,
  SymbolDef,
  CornerMotifEnum,
  PatternEnum,
  TextureEnum,
} from '../types/blueprint';

const CARD_W = 300;
const CARD_H = 520;

// ── Utilities ─────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyTitleCase(text: string, mode: Blueprint['typography']['titleCase']): string {
  if (mode === 'upper') return text.toUpperCase();
  if (mode === 'title') return text.replace(/\b\w/g, (c) => c.toUpperCase());
  return text;
}

function fontStyleStr(weight: Blueprint['typography']['titleWeight']): string {
  return weight === '600' || weight === '700' ? 'bold' : 'normal';
}

function seededRng(seed: string, index: number): number {
  let h = index * 2654435761;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2246822519);
  }
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 0xffffffff;
}

// Grain amounts (Konva Noise filter amplitude). Kept subtle so vector art reads
// as gently textured/printed rather than dirty. Text uses a lighter grain to
// preserve legibility.
const SHAPE_NOISE = 0.16;
const TEXT_NOISE = 0.09;

// Rasterizes a node and overlays film-grain noise so flat vector fills look more
// organic. Only opaque pixels are affected (the filter leaves alpha untouched),
// so the grain hugs the shape rather than its bounding box.
function applyNoise(node: Konva.Node, amount: number, offset = 2): void {
  const pixelRatio = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
  try {
    node.cache({ pixelRatio, offset });
    node.filters([Konva.Filters.Noise]);
    node.noise(amount);
  } catch {
    // cache() throws on zero-area nodes — just skip the grain in that case.
  }
}

// Height of the solid title band at the top of the card (frame border + padding + text + padding)
function computeTitleBandH(blueprint: Blueprint): number {
  const { frame, typography } = blueprint;
  return frame.thickness + frame.innerMargin + typography.titleSize + 6 + typography.bodySize + frame.innerMargin;
}

// ── Patterns ─────────────────────────────────────────────────────────────────

function drawPattern(
  layer: Konva.Layer,
  pattern: PatternEnum,
  opacity: number,
  color: string,
  seed: string,
): void {
  if (pattern === 'none' || opacity <= 0) return;

  const rng = (i: number) => seededRng(seed, i);

  switch (pattern) {
    case 'stars': {
      for (let i = 0; i < 22; i++) {
        layer.add(new Konva.Star({
          x: rng(i * 2) * CARD_W, y: rng(i * 2 + 1) * CARD_H,
          numPoints: 5, innerRadius: 1.5, outerRadius: 3.5 + rng(i * 3) * 2,
          fill: color, opacity, listening: false,
        }));
      }
      break;
    }
    case 'pentagrams': {
      for (let i = 0; i < 9; i++) {
        layer.add(new Konva.Star({
          x: rng(i * 2) * CARD_W, y: rng(i * 2 + 1) * CARD_H,
          numPoints: 5, innerRadius: 5, outerRadius: 10,
          stroke: color, strokeWidth: 1, opacity, listening: false,
        }));
      }
      break;
    }
    case 'circles': {
      for (let i = 0; i < 12; i++) {
        layer.add(new Konva.Circle({
          x: rng(i * 2) * CARD_W, y: rng(i * 2 + 1) * CARD_H,
          radius: 8 + rng(i * 3) * 14,
          stroke: color, strokeWidth: 1, opacity, listening: false,
        }));
      }
      break;
    }
    case 'diamonds': {
      for (let i = 0; i < 11; i++) {
        const s = 8 + rng(i * 3) * 10;
        layer.add(new Konva.Rect({
          x: rng(i * 2) * CARD_W - s / 2,
          y: rng(i * 2 + 1) * CARD_H - s / 2,
          width: s, height: s,
          rotation: 45,
          stroke: color, strokeWidth: 1, opacity, listening: false,
        }));
      }
      break;
    }
    case 'waves': {
      for (let w = 0; w < 5; w++) {
        const waveY = (w + 1) * (CARD_H / 6);
        const pts: number[] = [];
        for (let j = 0; j <= 12; j++) {
          pts.push(j * (CARD_W / 12));
          pts.push(waveY + Math.sin(j * 0.75 + w) * 14);
        }
        layer.add(new Konva.Line({
          points: pts, tension: 0.4,
          stroke: color, strokeWidth: 1, opacity, listening: false,
        }));
      }
      break;
    }
    case 'runes': {
      const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ'];
      for (let i = 0; i < 9; i++) {
        layer.add(new Konva.Text({
          x: rng(i * 2) * CARD_W - 9, y: rng(i * 2 + 1) * CARD_H - 9,
          width: 18, text: runes[i % runes.length],
          fontSize: 18, fill: color, opacity: opacity * 0.75,
          align: 'center', listening: false,
        }));
      }
      break;
    }
    case 'vines': {
      for (let v = 0; v < 4; v++) {
        const x0 = rng(v * 5) * CARD_W;
        const y0 = rng(v * 5 + 1) * CARD_H;
        layer.add(new Konva.Line({
          points: [
            x0, y0,
            x0 + (rng(v * 5 + 2) - 0.5) * 80, y0 + CARD_H / 5,
            x0 + (rng(v * 5 + 3) - 0.5) * 80, y0 + (CARD_H / 5) * 2,
            x0 + (rng(v * 5 + 4) - 0.5) * 60, y0 + (CARD_H / 5) * 3,
          ],
          tension: 0.5, stroke: color, strokeWidth: 2, opacity, listening: false,
        }));
      }
      break;
    }
    default:
      break;
  }
}

// ── Textures ──────────────────────────────────────────────────────────────────

function drawTexture(
  layer: Konva.Layer,
  texture: TextureEnum,
  density: number,
  seed: string,
): void {
  if (texture === 'none' || density <= 0) return;
  const d = Math.max(0, Math.min(1, density));
  const rng = (i: number) => seededRng(seed, 1000 + i);

  switch (texture) {
    case 'grain': {
      const count = Math.floor(80 + d * 120);
      for (let i = 0; i < count; i++) {
        layer.add(new Konva.Circle({
          x: rng(i * 3) * CARD_W, y: rng(i * 3 + 1) * CARD_H,
          radius: 0.6 + rng(i * 3 + 2) * 1.4,
          fill: rng(i * 7) > 0.5 ? '#ffffff' : '#000000',
          opacity: d * (0.04 + rng(i * 5) * 0.06),
          listening: false,
        }));
      }
      break;
    }
    case 'parchment': {
      layer.add(new Konva.Rect({
        x: 0, y: 0, width: CARD_W, height: CARD_H,
        fill: '#c4a265', opacity: d * 0.18, listening: false,
      }));
      const count = Math.floor(d * 70);
      for (let i = 0; i < count; i++) {
        layer.add(new Konva.Circle({
          x: rng(i * 3) * CARD_W, y: rng(i * 3 + 1) * CARD_H,
          radius: 1 + rng(i * 3 + 2) * 3,
          fill: '#6b4c10',
          opacity: d * (0.02 + rng(i) * 0.04),
          listening: false,
        }));
      }
      break;
    }
    case 'canvas': {
      const step = Math.max(5, Math.floor(13 - d * 6));
      for (let i = 0; i * step <= Math.max(CARD_W, CARD_H); i++) {
        layer.add(new Konva.Line({
          points: [i * step, 0, i * step, CARD_H],
          stroke: '#ffffff', strokeWidth: 0.5, opacity: d * 0.07, listening: false,
        }));
        layer.add(new Konva.Line({
          points: [0, i * step, CARD_W, i * step],
          stroke: '#ffffff', strokeWidth: 0.5, opacity: d * 0.07, listening: false,
        }));
      }
      break;
    }
    case 'linen': {
      const step = Math.max(4, Math.floor(9 - d * 4));
      for (let i = 0; i * step <= Math.max(CARD_W, CARD_H); i++) {
        layer.add(new Konva.Line({
          points: [i * step, 0, i * step, CARD_H],
          stroke: '#ffffff', strokeWidth: 0.35, opacity: d * 0.06, listening: false,
        }));
        layer.add(new Konva.Line({
          points: [0, i * step, CARD_W, i * step],
          stroke: '#ffffff', strokeWidth: 0.35, opacity: d * 0.06, listening: false,
        }));
      }
      break;
    }
    case 'marble': {
      for (let v = 0; v < 6; v++) {
        const x0 = rng(v * 7) * CARD_W;
        const y0 = rng(v * 7 + 1) * CARD_H;
        const pts: number[] = [x0, y0];
        for (let j = 1; j <= 4; j++) {
          pts.push(
            x0 + (rng(v * 7 + j * 2) - 0.5) * CARD_W,
            y0 + (rng(v * 7 + j * 2 + 1) - 0.5) * CARD_H * 0.8,
          );
        }
        layer.add(new Konva.Line({
          points: pts, tension: 0.55,
          stroke: '#ffffff',
          strokeWidth: d * (2 + rng(v * 3) * 6),
          opacity: d * (0.04 + rng(v * 2) * 0.09),
          listening: false,
        }));
      }
      break;
    }
    case 'watercolor': {
      for (let i = 0; i < 8; i++) {
        layer.add(new Konva.Circle({
          x: rng(i * 4) * CARD_W, y: rng(i * 4 + 1) * CARD_H,
          radius: 30 + rng(i * 4 + 2) * 90,
          fill: '#ffffff',
          opacity: d * (0.025 + rng(i * 4 + 3) * 0.055),
          listening: false,
        }));
      }
      break;
    }
    default:
      break;
  }
}

// ── Corner motifs ─────────────────────────────────────────────────────────────

function drawCornerMotif(
  parent: Konva.Layer,
  motif: CornerMotifEnum,
  cx: number,
  cy: number,
  color: string,
  bgColor: string,
): void {
  if (motif === 'none') return;
  const s = 11;

  // Each motif is grouped so it can be rasterized and grained as a unit.
  const layer = new Konva.Group({ listening: false });

  switch (motif) {
    case 'star':
      layer.add(new Konva.Star({
        x: cx, y: cy, numPoints: 5,
        innerRadius: s * 0.38, outerRadius: s,
        fill: color, opacity: 0.85, listening: false,
      }));
      break;
    case 'pentagram':
      layer.add(new Konva.Star({
        x: cx, y: cy, numPoints: 5,
        innerRadius: s * 0.4, outerRadius: s,
        stroke: color, strokeWidth: 1.5, opacity: 0.8, listening: false,
      }));
      break;
    case 'fleur':
      layer.add(new Konva.Star({
        x: cx, y: cy, numPoints: 4,
        innerRadius: s * 0.3, outerRadius: s,
        fill: color, opacity: 0.85, listening: false,
      }));
      break;
    case 'moon':
      layer.add(new Konva.Circle({
        x: cx, y: cy, radius: s,
        fill: color, opacity: 0.9, listening: false,
      }));
      layer.add(new Konva.Circle({
        x: cx + s * 0.38, y: cy, radius: s * 0.75,
        fill: bgColor, listening: false,
      }));
      break;
    case 'sun': {
      layer.add(new Konva.Circle({
        x: cx, y: cy, radius: s * 0.42,
        fill: color, opacity: 0.9, listening: false,
      }));
      for (let i = 0; i < 8; i++) {
        const a = (i * 45 * Math.PI) / 180;
        layer.add(new Konva.Line({
          points: [
            cx + Math.cos(a) * s * 0.56, cy + Math.sin(a) * s * 0.56,
            cx + Math.cos(a) * s, cy + Math.sin(a) * s,
          ],
          stroke: color, strokeWidth: 1.5, opacity: 0.8, listening: false,
        }));
      }
      break;
    }
    case 'spiral':
      layer.add(new Konva.Circle({
        x: cx, y: cy, radius: s,
        stroke: color, strokeWidth: 1.5, opacity: 0.7, listening: false,
      }));
      layer.add(new Konva.Circle({
        x: cx, y: cy, radius: s * 0.55,
        stroke: color, strokeWidth: 1.5, opacity: 0.7, listening: false,
      }));
      layer.add(new Konva.Circle({
        x: cx, y: cy, radius: s * 0.22,
        fill: color, opacity: 0.7, listening: false,
      }));
      break;
    case 'celtic-knot':
      layer.add(new Konva.Circle({
        x: cx - s * 0.3, y: cy, radius: s * 0.65,
        stroke: color, strokeWidth: 1.5, opacity: 0.7, listening: false,
      }));
      layer.add(new Konva.Circle({
        x: cx + s * 0.3, y: cy, radius: s * 0.65,
        stroke: color, strokeWidth: 1.5, opacity: 0.7, listening: false,
      }));
      break;
    default:
      break;
  }

  parent.add(layer);
  applyNoise(layer, SHAPE_NOISE);
}

// ── Symbol rendering ──────────────────────────────────────────────────────────

function drawSymbol(
  layer: Konva.Layer,
  sym: SymbolDef,
  color: string,
  accent: string,
  bgColor: string,
): void {
  const r = 28 * sym.scale;
  const group = new Konva.Group({
    x: sym.x * CARD_W,
    y: sym.y * CARD_H,
    scaleX: sym.flipX ? -1 : 1,
    scaleY: sym.flipY ? -1 : 1,
    opacity: sym.opacity,
    id: `symbol-${sym.id}`,
    name: `symbol::${sym.id}`,
  });

  const kind = sym.kind.toLowerCase();

  if (kind === 'sun') {
    group.add(new Konva.Circle({ radius: r * 0.42, fill: color }));
    for (let i = 0; i < 8; i++) {
      const a = (i * 45 * Math.PI) / 180;
      group.add(new Konva.Line({
        points: [
          Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55,
          Math.cos(a) * r, Math.sin(a) * r,
        ],
        stroke: color, strokeWidth: 2.5, lineCap: 'round',
      }));
    }
  } else if (kind === 'moon' || kind === 'crescent') {
    group.add(new Konva.Circle({ radius: r, fill: color }));
    group.add(new Konva.Circle({ x: r * 0.42, radius: r * 0.72, fill: bgColor }));
  } else if (kind === 'star') {
    group.add(new Konva.Star({
      numPoints: 5, innerRadius: r * 0.4, outerRadius: r, fill: color,
    }));
  } else if (kind === 'flame' || kind === 'fire') {
    group.add(new Konva.Path({
      data: `M 0 ${r} C ${-r * 0.5} ${r * 0.4} ${-r * 0.35} ${-r * 0.1} 0 ${-r * 0.6} C ${r * 0.35} ${-r * 0.1} ${r * 0.5} ${r * 0.4} 0 ${r} Z`,
      fill: color,
    }));
    group.add(new Konva.Path({
      data: `M 0 ${r * 0.55} C ${-r * 0.25} ${r * 0.25} ${-r * 0.18} 0 0 ${-r * 0.15} C ${r * 0.18} 0 ${r * 0.25} ${r * 0.25} 0 ${r * 0.55} Z`,
      fill: accent, opacity: 0.85,
    }));
  } else if (kind === 'flower') {
    for (let i = 0; i < 6; i++) {
      const a = (i * 60 * Math.PI) / 180;
      group.add(new Konva.Circle({
        x: Math.cos(a) * r * 0.42, y: Math.sin(a) * r * 0.42,
        radius: r * 0.36, fill: accent, opacity: 0.85,
      }));
    }
    group.add(new Konva.Circle({ radius: r * 0.26, fill: color }));
  } else {
    group.add(new Konva.RegularPolygon({ sides: 6, radius: r * 0.78, fill: color, opacity: 0.75 }));
    group.add(new Konva.Text({
      x: -r, y: -7, width: r * 2,
      text: sym.kind.slice(0, 4).toUpperCase(),
      fontSize: 10, fill: '#fff', align: 'center',
      fontStyle: 'bold', listening: false,
    }));
  }

  layer.add(group);
  applyNoise(group, SHAPE_NOISE);
}

// ── Frame rendering ────────────────────────────────────────────────────────────

function drawFrame(
  layer: Konva.Layer,
  frame: Blueprint['frame'],
  frameColor: string,
): void {
  const { style, thickness } = frame;

  const cornerRadius = (
    style === 'ornate' ? 6 :
    style === 'art-nouveau' ? 14 :
    style === 'minimal' ? 2 :
    style === 'celtic' || style === 'gothic' ? 0 :
    4
  );

  // Outer border (all styles)
  layer.add(new Konva.Rect({
    x: thickness / 2, y: thickness / 2,
    width: CARD_W - thickness, height: CARD_H - thickness,
    stroke: frameColor, strokeWidth: thickness,
    cornerRadius, id: 'frame-outer',
  }));

  if (style === 'simple' || style === 'minimal') {
    // Nothing more — single clean border
    return;
  }

  if (style === 'double') {
    // Two concentric borders with a visible gap, diamond markers at inner corners
    const gap = Math.max(8, thickness);
    const inX = thickness + gap;
    layer.add(new Konva.Rect({
      x: inX, y: inX,
      width: CARD_W - inX * 2, height: CARD_H - inX * 2,
      stroke: frameColor, strokeWidth: 1.5, opacity: 0.8,
      cornerRadius: Math.max(cornerRadius - 1, 0),
      id: 'frame-inner',
    }));
    // Diamond (rotated square) at each inner corner
    for (const [cx, cy] of [
      [inX, inX], [CARD_W - inX, inX],
      [inX, CARD_H - inX], [CARD_W - inX, CARD_H - inX],
    ] as [number, number][]) {
      layer.add(new Konva.Rect({
        x: cx, y: cy,
        width: 9, height: 9,
        offsetX: 4.5, offsetY: 4.5,
        rotation: 45,
        fill: frameColor, opacity: 0.9, listening: false,
      }));
    }
    return;
  }

  if (style === 'ornate') {
    // Inner rect + diamond ornaments at midpoint of each side
    const inOff = thickness + 5;
    layer.add(new Konva.Rect({
      x: inOff, y: inOff,
      width: CARD_W - inOff * 2, height: CARD_H - inOff * 2,
      stroke: frameColor, strokeWidth: 1.5, opacity: 0.65,
      cornerRadius: 4, id: 'frame-inner',
    }));
    const midpoints: [number, number][] = [
      [CARD_W / 2, inOff], [CARD_W / 2, CARD_H - inOff],
      [inOff, CARD_H / 2], [CARD_W - inOff, CARD_H / 2],
    ];
    for (const [mx, my] of midpoints) {
      layer.add(new Konva.Rect({
        x: mx, y: my,
        width: 10, height: 10,
        offsetX: 5, offsetY: 5,
        rotation: 45,
        fill: frameColor, opacity: 0.85, listening: false,
      }));
    }
    // Small corner fillets on inner rect
    for (const [cx, cy] of [
      [inOff, inOff], [CARD_W - inOff, inOff],
      [inOff, CARD_H - inOff], [CARD_W - inOff, CARD_H - inOff],
    ] as [number, number][]) {
      layer.add(new Konva.Circle({
        x: cx, y: cy, radius: 3,
        fill: frameColor, opacity: 0.7, listening: false,
      }));
    }
    return;
  }

  if (style === 'gothic') {
    // Dashed inner rect + cross ornaments at side midpoints
    const inOff = thickness + 6;
    layer.add(new Konva.Rect({
      x: inOff, y: inOff,
      width: CARD_W - inOff * 2, height: CARD_H - inOff * 2,
      stroke: frameColor, strokeWidth: 1.5, opacity: 0.7,
      dash: [6, 4], id: 'frame-inner',
    }));
    // Cross ornaments at each side's midpoint
    const crossLen = 9;
    const midpoints: [number, number][] = [
      [CARD_W / 2, inOff], [CARD_W / 2, CARD_H - inOff],
      [inOff, CARD_H / 2], [CARD_W - inOff, CARD_H / 2],
    ];
    for (const [mx, my] of midpoints) {
      layer.add(new Konva.Line({
        points: [mx - crossLen, my, mx + crossLen, my],
        stroke: frameColor, strokeWidth: 1.5, opacity: 0.8, listening: false,
      }));
      layer.add(new Konva.Line({
        points: [mx, my - crossLen, mx, my + crossLen],
        stroke: frameColor, strokeWidth: 1.5, opacity: 0.8, listening: false,
      }));
    }
    // Diamond at cross centres
    for (const [mx, my] of midpoints) {
      layer.add(new Konva.Rect({
        x: mx, y: my,
        width: 6, height: 6,
        offsetX: 3, offsetY: 3,
        rotation: 45,
        fill: frameColor, opacity: 0.9, listening: false,
      }));
    }
    return;
  }

  if (style === 'celtic') {
    // Triple inner borders + dot pattern between them
    const inOff1 = thickness + 4;
    const inOff2 = thickness + 8;
    const inOff3 = thickness + 12;
    layer.add(new Konva.Rect({
      x: inOff1, y: inOff1,
      width: CARD_W - inOff1 * 2, height: CARD_H - inOff1 * 2,
      stroke: frameColor, strokeWidth: 1, opacity: 0.85, listening: false,
    }));
    layer.add(new Konva.Rect({
      x: inOff3, y: inOff3,
      width: CARD_W - inOff3 * 2, height: CARD_H - inOff3 * 2,
      stroke: frameColor, strokeWidth: 1, opacity: 0.65, listening: false,
    }));
    // Dots along the midline (inOff2) on each side
    const dotSpacing = 10;
    const dotMid = inOff2;
    for (let x = inOff1 + dotSpacing; x < CARD_W - inOff1 - dotSpacing / 2; x += dotSpacing) {
      layer.add(new Konva.Circle({ x, y: dotMid, radius: 1.5, fill: frameColor, opacity: 0.75, listening: false }));
      layer.add(new Konva.Circle({ x, y: CARD_H - dotMid, radius: 1.5, fill: frameColor, opacity: 0.75, listening: false }));
    }
    for (let y = inOff1 + dotSpacing; y < CARD_H - inOff1 - dotSpacing / 2; y += dotSpacing) {
      layer.add(new Konva.Circle({ x: dotMid, y, radius: 1.5, fill: frameColor, opacity: 0.75, listening: false }));
      layer.add(new Konva.Circle({ x: CARD_W - dotMid, y, radius: 1.5, fill: frameColor, opacity: 0.75, listening: false }));
    }
    return;
  }

  if (style === 'art-nouveau') {
    // Sinusoidal wavy inner border — organic, flowing lines on each side
    const wInset = thickness + 7;
    const amp = 3.5;
    const freq = 0.13;

    // Top wave
    const topPts: number[] = [];
    for (let x = wInset; x <= CARD_W - wInset; x += 2) {
      topPts.push(x, wInset + Math.sin((x - wInset) * freq) * amp);
    }
    layer.add(new Konva.Line({ points: topPts, stroke: frameColor, strokeWidth: 1, opacity: 0.6, tension: 0.3, listening: false }));

    // Bottom wave (phase-shifted)
    const botPts: number[] = [];
    for (let x = wInset; x <= CARD_W - wInset; x += 2) {
      botPts.push(x, CARD_H - wInset + Math.sin((x - wInset) * freq + Math.PI) * amp);
    }
    layer.add(new Konva.Line({ points: botPts, stroke: frameColor, strokeWidth: 1, opacity: 0.6, tension: 0.3, listening: false }));

    // Left wave
    const leftPts: number[] = [];
    for (let y = wInset; y <= CARD_H - wInset; y += 2) {
      leftPts.push(wInset + Math.sin((y - wInset) * freq) * amp, y);
    }
    layer.add(new Konva.Line({ points: leftPts, stroke: frameColor, strokeWidth: 1, opacity: 0.6, tension: 0.3, listening: false }));

    // Right wave (phase-shifted)
    const rightPts: number[] = [];
    for (let y = wInset; y <= CARD_H - wInset; y += 2) {
      rightPts.push(CARD_W - wInset + Math.sin((y - wInset) * freq + Math.PI) * amp, y);
    }
    layer.add(new Konva.Line({ points: rightPts, stroke: frameColor, strokeWidth: 1, opacity: 0.6, tension: 0.3, listening: false }));

    // Small swirl circles at corners
    const swInset = thickness + 14;
    for (const [cx, cy] of [
      [swInset, swInset], [CARD_W - swInset, swInset],
      [swInset, CARD_H - swInset], [CARD_W - swInset, CARD_H - swInset],
    ] as [number, number][]) {
      layer.add(new Konva.Circle({ x: cx, y: cy, radius: 5, stroke: frameColor, strokeWidth: 1, opacity: 0.55, listening: false }));
      layer.add(new Konva.Circle({ x: cx, y: cy, radius: 2.5, stroke: frameColor, strokeWidth: 1, opacity: 0.55, listening: false }));
    }
    return;
  }
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export const rendererStub: RendererAPI = {
  render(blueprint: Blueprint, stage: Konva.Stage): void {
    stage.destroyChildren();
    const layer = new Konva.Layer();
    stage.add(layer);

    const { palette, typography, frame, background: bg, symbols, identity, footer } = blueprint;
    const frameColor = frame.color ?? palette.border;
    const innerLeft = frame.thickness + frame.innerMargin;
    const innerWidth = CARD_W - innerLeft * 2;
    const hasIllustration = !!blueprint.illustration;

    // Title band: solid strip at top of card that always shows the card background color.
    // The illustration fills the space below this band.
    const titleBandH = computeTitleBandH(blueprint);

    // 1 — Background
    if (hasIllustration) {
      // Only fill the title band with the card background color.
      // The illustration (HTML img positioned below the band) shows through the
      // transparent canvas beneath.
      layer.add(new Konva.Rect({
        x: 0, y: 0, width: CARD_W, height: titleBandH,
        fill: bg.baseColor, id: 'background',
      }));
    } else {
      // Full card background when no illustration
      layer.add(new Konva.Rect({
        x: 0, y: 0, width: CARD_W, height: CARD_H,
        fill: bg.baseColor, id: 'background',
      }));
    }

    // 2 — Texture overlay (beneath pattern and frame)
    drawTexture(layer, bg.texture, bg.textureDensity, blueprint.seed);

    // 2b — Pattern overlay (beneath frame)
    drawPattern(layer, bg.pattern, bg.patternOpacity, palette.primaryAccent, blueprint.seed);

    // 3 — Frame (outer border + style-specific inner decorations)
    drawFrame(layer, frame, frameColor);

    // 4 — Corner motifs
    const mInset = frame.thickness + frame.innerMargin * 0.6;
    const corners: [number, number][] = [
      [mInset, mInset],
      [CARD_W - mInset, mInset],
      [mInset, CARD_H - mInset],
      [CARD_W - mInset, CARD_H - mInset],
    ];
    for (const [cx, cy] of corners) {
      drawCornerMotif(layer, frame.cornerMotif, cx, cy, frameColor, bg.baseColor);
    }

    // 5 — Title band separator line (subtle rule between title section and image area)
    layer.add(new Konva.Line({
      points: [frame.thickness, titleBandH, CARD_W - frame.thickness, titleBandH],
      stroke: frameColor, strokeWidth: 1, opacity: 0.35, listening: false,
    }));

    // 6 — Illustration area placeholder (only when no illustration)
    if (!hasIllustration) {
      const illY = titleBandH;
      const illH = CARD_H - titleBandH - frame.thickness;
      layer.add(new Konva.Rect({
        x: frame.thickness, y: illY,
        width: CARD_W - frame.thickness * 2, height: illH,
        fill: hexToRgba(palette.primaryAccent, 0.08),
        id: 'illustration-bg',
      }));
      layer.add(new Konva.Rect({
        x: frame.thickness, y: illY,
        width: CARD_W - frame.thickness * 2, height: illH,
        stroke: hexToRgba(palette.border, 0.35), strokeWidth: 1,
        id: 'illustration-area',
      }));
      layer.add(new Konva.Text({
        x: frame.thickness, y: illY + illH / 2 - 9,
        width: CARD_W - frame.thickness * 2,
        text: '✦  illustration  ✦',
        fontSize: 12, fill: palette.text, opacity: 0.2,
        align: 'center', listening: false,
      }));
    }

    // 7 — Symbols (on top of image, behind text)
    for (const sym of symbols) {
      drawSymbol(layer, sym, palette.primaryAccent, palette.secondaryAccent, bg.baseColor);
    }

    // 8 — Title text
    const titleText = applyTitleCase(identity.name, typography.titleCase);
    const lineH = typography.titleSize + 6;
    const titleY = frame.thickness + frame.innerMargin;

    // Text nodes get a light grain too, but they must be re-cached once the web
    // fonts finish loading (caching freezes the rasterized glyphs).
    const textNodes: Konva.Text[] = [];

    const titleNode = new Konva.Text({
      x: innerLeft, y: titleY, width: innerWidth,
      text: titleText,
      fontSize: typography.titleSize,
      fontFamily: typography.fontFamily,
      fontStyle: fontStyleStr(typography.titleWeight),
      fill: palette.text,
      align: typography.titleAlign,
      letterSpacing: typography.letterSpacing,
      id: 'title',
    });
    layer.add(titleNode);
    textNodes.push(titleNode);

    // 9 — Archetype subtitle
    const archetypeNode = new Konva.Text({
      x: innerLeft, y: titleY + lineH, width: innerWidth,
      text: identity.archetype,
      fontSize: typography.bodySize,
      fontFamily: typography.fontFamily,
      fill: palette.secondaryAccent,
      align: typography.titleAlign,
      opacity: 0.8,
      id: 'archetype',
    });
    layer.add(archetypeNode);
    textNodes.push(archetypeNode);

    // 9.5 — Footer gradient overlay for readability (when illustration fills the image area)
    if (hasIllustration && footer.visible) {
      const footerGradH = Math.min(
        frame.thickness + frame.innerMargin + footer.size + 40,
        CARD_H * 0.25,
      );
      const footerGradY = CARD_H - footerGradH;
      layer.add(new Konva.Rect({
        x: 0, y: footerGradY, width: CARD_W, height: footerGradH,
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: 0, y: footerGradH },
        fillLinearGradientColorStops: [0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.68)'],
        listening: false,
      }));
    }

    // 10 — Footer
    if (footer.visible) {
      const footerY = CARD_H - frame.thickness - frame.innerMargin - footer.size - 3;
      const footerPadX = 8;
      const footerPadY = 4;
      layer.add(new Konva.Rect({
        x: innerLeft - footerPadX,
        y: footerY - footerPadY,
        width: innerWidth + footerPadX * 2,
        height: footer.size + footerPadY * 2 + 2,
        fill: hexToRgba(palette.background, 0.72),
        cornerRadius: 3,
        listening: false,
        id: 'footer-bg',
      }));
      const footerNode = new Konva.Text({
        x: innerLeft,
        y: footerY,
        width: innerWidth,
        text: footer.text,
        fontSize: footer.size,
        fontFamily: footer.fontFamily,
        fill: palette.text,
        align: 'center',
        opacity: 0.75,
        id: 'footer',
      });
      layer.add(footerNode);
      textNodes.push(footerNode);
    }

    for (const t of textNodes) applyNoise(t, TEXT_NOISE, 1);

    // 11 — Always-on vignette: soft dark edge that adds depth and a printed feel
    layer.add(new Konva.Rect({
      x: 0, y: 0, width: CARD_W, height: CARD_H,
      fillRadialGradientStartPoint: { x: CARD_W / 2, y: CARD_H / 2 },
      fillRadialGradientStartRadius: CARD_H * 0.18,
      fillRadialGradientEndPoint: { x: CARD_W / 2, y: CARD_H / 2 },
      fillRadialGradientEndRadius: CARD_H * 0.88,
      fillRadialGradientColorStops: [0, 'rgba(6,4,21,0)', 1, 'rgba(6,4,21,0.55)'],
      listening: false,
    }));

    layer.batchDraw();
    void document.fonts.ready.then(() => {
      // Re-rasterize grained text now that the real fonts are available.
      for (const t of textNodes) {
        t.clearCache();
        applyNoise(t, TEXT_NOISE, 1);
      }
      layer.batchDraw();
    });
  },

  hitTest(x: number, y: number, blueprint: Blueprint): ElementRef | null {
    const { symbols, frame, footer } = blueprint;
    const innerLeft = frame.thickness + frame.innerMargin;
    const titleBandH = computeTitleBandH(blueprint);

    // Symbols — reverse order so topmost rendered wins
    for (let i = symbols.length - 1; i >= 0; i--) {
      const sym = symbols[i];
      const cx = sym.x * CARD_W;
      const cy = sym.y * CARD_H;
      const r = 28 * sym.scale * 1.5;
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= r) {
        return { type: 'symbol', symbolId: sym.id };
      }
    }

    // Title band (full width inside frame border)
    if (x >= frame.thickness && x <= CARD_W - frame.thickness && y >= frame.thickness && y <= titleBandH) {
      return { type: 'title' };
    }

    // Footer area
    if (footer.visible) {
      const footerY = CARD_H - frame.thickness - frame.innerMargin - footer.size - 3;
      if (x >= innerLeft && x <= CARD_W - innerLeft && y >= footerY - 4 && y <= footerY + footer.size + 8) {
        return { type: 'footer' };
      }
    }

    // Frame border region
    const thick = frame.thickness + frame.innerMargin * 0.5;
    if (x <= thick || x >= CARD_W - thick || y <= thick || y >= CARD_H - thick) {
      return { type: 'frame' };
    }

    return { type: 'background' };
  },
};
