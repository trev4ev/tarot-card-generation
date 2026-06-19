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
  layer: Konva.Layer,
  motif: CornerMotifEnum,
  cx: number,
  cy: number,
  color: string,
  bgColor: string,
): void {
  if (motif === 'none') return;
  const s = 11;

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
  } else if (kind === 'staff' || kind === 'wand') {
    group.add(new Konva.Line({
      points: [0, -r, 0, r], stroke: color, strokeWidth: 5, lineCap: 'round',
    }));
    group.add(new Konva.Circle({ y: -r, radius: 6, fill: color }));
  } else if (kind === 'wolf') {
    group.add(new Konva.RegularPolygon({ sides: 5, radius: r * 0.65, fill: color, opacity: 0.9 }));
    group.add(new Konva.Line({
      points: [-r * 0.35, -r * 0.5, -r * 0.15, -r * 0.88, 0, -r * 0.5],
      closed: true, fill: color, stroke: color, strokeWidth: 1,
    }));
    group.add(new Konva.Line({
      points: [r * 0.35, -r * 0.5, r * 0.15, -r * 0.88, 0, -r * 0.5],
      closed: true, fill: color, stroke: color, strokeWidth: 1,
    }));
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
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export const rendererStub: RendererAPI = {
  render(blueprint: Blueprint, stage: Konva.Stage): void {
    stage.destroyChildren();
    const layer = new Konva.Layer();
    stage.add(layer);

    const { palette, typography, frame, background: bg, symbols, identity, footer, layout } = blueprint;
    const frameColor = frame.color ?? palette.border;
    const innerLeft = frame.thickness + frame.innerMargin;
    const innerWidth = CARD_W - innerLeft * 2;
    const ia = layout.illustrationArea;
    const iaX = ia.x * CARD_W;
    const iaY = ia.y * CARD_H;
    const iaW = ia.width * CARD_W;
    const iaH = ia.height * CARD_H;

    // 1 — Background
    layer.add(new Konva.Rect({
      x: 0, y: 0, width: CARD_W, height: CARD_H,
      fill: bg.baseColor, id: 'background',
    }));

    // 2 — Texture overlay (beneath pattern and frame)
    drawTexture(layer, bg.texture, bg.textureDensity, blueprint.id);

    // 2b — Pattern overlay (beneath frame)
    drawPattern(layer, bg.pattern, bg.patternOpacity, palette.primaryAccent, blueprint.id);

    // 3 — Outer frame border
    const cornerRadius = (
      frame.style === 'ornate' ? 6 :
      frame.style === 'art-nouveau' ? 14 :
      frame.style === 'minimal' ? 2 :
      frame.style === 'celtic' || frame.style === 'gothic' ? 0 :
      4
    );
    layer.add(new Konva.Rect({
      x: frame.thickness / 2, y: frame.thickness / 2,
      width: CARD_W - frame.thickness, height: CARD_H - frame.thickness,
      stroke: frameColor, strokeWidth: frame.thickness,
      cornerRadius, id: 'frame-outer',
    }));

    // 4 — Inner frame line for double/ornate/gothic/celtic/art-nouveau
    if (['double', 'ornate', 'gothic', 'celtic', 'art-nouveau'].includes(frame.style)) {
      const inOff = frame.thickness + 5;
      layer.add(new Konva.Rect({
        x: inOff, y: inOff,
        width: CARD_W - inOff * 2, height: CARD_H - inOff * 2,
        stroke: frameColor,
        strokeWidth: frame.style === 'double' ? 2 : 1.5,
        opacity: 0.65,
        cornerRadius: cornerRadius > 0 ? Math.max(cornerRadius - 2, 0) : 0,
        id: 'frame-inner',
      }));
    }

    // 5 — Corner motifs
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

    // 6 — Illustration area
    layer.add(new Konva.Rect({
      x: iaX, y: iaY, width: iaW, height: iaH,
      fill: hexToRgba(palette.primaryAccent, 0.1),
      id: 'illustration-bg',
    }));
    layer.add(new Konva.Rect({
      x: iaX, y: iaY, width: iaW, height: iaH,
      stroke: hexToRgba(palette.border, 0.35), strokeWidth: 1,
      id: 'illustration-area',
    }));
    layer.add(new Konva.Text({
      x: iaX, y: iaY + iaH / 2 - 9, width: iaW,
      text: '✦  illustration  ✦',
      fontSize: 12, fill: palette.text, opacity: 0.2,
      align: 'center', listening: false,
    }));

    // 7 — Symbols
    for (const sym of symbols) {
      drawSymbol(layer, sym, palette.primaryAccent, palette.secondaryAccent, bg.baseColor);
    }

    // 8 — Title
    const titleText = applyTitleCase(identity.name, typography.titleCase);
    const lineH = typography.titleSize + 6;
    const titleY = layout.titlePosition === 'top'
      ? frame.thickness + frame.innerMargin
      : CARD_H - frame.thickness - frame.innerMargin - lineH
        - (footer.visible ? footer.size + 10 : 0);

    layer.add(new Konva.Text({
      x: innerLeft, y: titleY, width: innerWidth,
      text: titleText,
      fontSize: typography.titleSize,
      fontFamily: typography.fontFamily,
      fontStyle: fontStyleStr(typography.titleWeight),
      fill: palette.text,
      align: typography.titleAlign,
      letterSpacing: typography.letterSpacing,
      id: 'title',
    }));

    // 9 — Archetype subtitle
    layer.add(new Konva.Text({
      x: innerLeft, y: titleY + lineH, width: innerWidth,
      text: identity.archetype,
      fontSize: typography.bodySize,
      fontFamily: typography.fontFamily,
      fill: palette.secondaryAccent,
      align: typography.titleAlign,
      opacity: 0.8,
      id: 'archetype',
    }));

    // 10 — Footer
    if (footer.visible) {
      layer.add(new Konva.Text({
        x: innerLeft,
        y: CARD_H - frame.thickness - frame.innerMargin - footer.size - 3,
        width: innerWidth,
        text: footer.text,
        fontSize: footer.size,
        fontFamily: footer.fontFamily,
        fill: palette.text,
        align: 'center',
        opacity: 0.75,
        id: 'footer',
      }));
    }

    // 11 — Mood overlay (vignette / glow via radial gradient)
    const moodRatio = blueprint.mood / 100;
    if (moodRatio < 0.45) {
      const t = (0.45 - moodRatio) / 0.45;
      layer.add(new Konva.Rect({
        x: 0, y: 0, width: CARD_W, height: CARD_H,
        fillRadialGradientStartPoint: { x: CARD_W / 2, y: CARD_H / 2 },
        fillRadialGradientStartRadius: CARD_H * 0.18,
        fillRadialGradientEndPoint: { x: CARD_W / 2, y: CARD_H / 2 },
        fillRadialGradientEndRadius: CARD_H * 0.88,
        fillRadialGradientColorStops: [0, 'rgba(6,4,21,0)', 1, `rgba(6,4,21,${+(t * 0.72).toFixed(3)})`],
        listening: false,
      }));
    } else if (moodRatio > 0.65) {
      const t = (moodRatio - 0.65) / 0.35;
      layer.add(new Konva.Rect({
        x: 0, y: 0, width: CARD_W, height: CARD_H,
        fillRadialGradientStartPoint: { x: CARD_W / 2, y: CARD_H / 2 },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndPoint: { x: CARD_W / 2, y: CARD_H / 2 },
        fillRadialGradientEndRadius: CARD_H * 0.72,
        fillRadialGradientColorStops: [0, `rgba(255,248,220,${+(t * 0.28).toFixed(3)})`, 1, 'rgba(255,248,220,0)'],
        listening: false,
      }));
    }

    layer.batchDraw();
    void document.fonts.ready.then(() => { layer.batchDraw(); });
  },

  hitTest(x: number, y: number, blueprint: Blueprint): ElementRef | null {
    const { symbols, frame, footer, layout, typography } = blueprint;
    const innerLeft = frame.thickness + frame.innerMargin;

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

    // Title area
    const lineH = typography.titleSize + 6;
    const titleY = layout.titlePosition === 'top'
      ? frame.thickness + frame.innerMargin
      : CARD_H - frame.thickness - frame.innerMargin - lineH - (footer.visible ? footer.size + 10 : 0);
    const titleH = typography.titleSize + typography.bodySize + 14;
    if (x >= innerLeft && x <= CARD_W - innerLeft && y >= titleY - 4 && y <= titleY + titleH) {
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

  async renderThumbnail(blueprint: Blueprint): Promise<string> {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(container);
    const stage = new Konva.Stage({ container, width: CARD_W, height: CARD_H });
    rendererStub.render(blueprint, stage);
    const dataURL = stage.toDataURL({ pixelRatio: 0.25 });
    stage.destroy();
    document.body.removeChild(container);
    return dataURL;
  },
};
