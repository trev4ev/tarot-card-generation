import type { AIClient } from './types';
import type {
  Blueprint, SymbolDef,
  FontEnum, FrameStyleEnum, CornerMotifEnum,
  TextureEnum, PatternEnum, WeightEnum,
} from '../types/blueprint';
import { ILLUSTRATIONS, ILLUSTRATION_MAP } from '../illustrations/catalog';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

function getApiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set');
  return key;
}

async function callClaude(system: string, userMessage: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  const block = data.content.find((b) => b.type === 'text');
  if (!block) throw new Error('No text block in response');
  return block.text;
}

function extractJson(text: string): unknown {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  const raw = match ? match[1] : text;
  return JSON.parse(raw.trim());
}

// ── Illustration catalog for the system prompt ────────────────────────────────

const ILLUSTRATION_LIST = ILLUSTRATIONS
  .map((ill) => `  - id: "${ill.id}" — ${ill.name}: ${ill.description}`)
  .join('\n');

// ── Structured AI response type ───────────────────────────────────────────────

interface AICardResponse {
  illustrationId: string;
  identity: Blueprint['identity'];
  palette: Blueprint['palette'];
  typography: Blueprint['typography'];
  frame: Blueprint['frame'];
  background: Blueprint['background'];
  footer: Blueprint['footer'];
  mood: number;
  symbols: SymbolDef[];
}

// ── Runtime sanitization ──────────────────────────────────────────────────────
// Validates every field against the same sets TypeScript enforces at compile
// time. Invalid enums fall back to safe defaults; numbers are clamped.

const VALID_FONTS = new Set<string>([
  'Cinzel', 'IM Fell English', 'UnifrakturMaguntia', 'Metamorphous',
  'Pirata One', 'Almendra', 'Berkshire Swash', 'Uncial Antiqua',
  'Cinzel Decorative', 'Eater',
]);
const VALID_FRAME_STYLES = new Set<string>([
  'simple', 'ornate', 'celtic', 'gothic', 'art-nouveau', 'minimal', 'double',
]);
const VALID_CORNER_MOTIFS = new Set<string>([
  'none', 'fleur', 'star', 'spiral', 'celtic-knot', 'moon', 'sun', 'pentagram',
]);
const VALID_TEXTURES = new Set<string>([
  'none', 'grain', 'parchment', 'canvas', 'linen', 'marble', 'watercolor',
]);
const VALID_PATTERNS = new Set<string>([
  'none', 'stars', 'pentagrams', 'circles', 'diamonds', 'waves', 'vines', 'runes',
]);
const VALID_WEIGHTS = new Set<string>(['300', '400', '500', '600', '700']);
const VALID_TITLE_CASE = new Set<string>(['upper', 'title', 'asGenerated']);
const VALID_TITLE_ALIGN = new Set<string>(['left', 'center', 'right']);
const VALID_TITLE_POS = new Set<string>(['top', 'bottom', 'overlay']);

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function pick<T extends string>(v: unknown, valid: Set<string>, fallback: T): T {
  return typeof v === 'string' && valid.has(v) ? (v as T) : fallback;
}

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  return isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function hexColor(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX_RE.test(v) ? v : fallback;
}

function hexOrNull(v: unknown): string | null {
  return typeof v === 'string' && HEX_RE.test(v) ? v : null;
}

function safeStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function obj(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function sanitize(raw: unknown): AICardResponse {
  const r = obj(raw);
  const identity = obj(r.identity);
  const palette = obj(r.palette);
  const typo = obj(r.typography);
  const frame = obj(r.frame);
  const bg = obj(r.background);
  const footer = obj(r.footer);
  const rawSymbols = Array.isArray(r.symbols) ? r.symbols : [];

  return {
    illustrationId: ILLUSTRATION_MAP.has(r.illustrationId as string)
      ? (r.illustrationId as string)
      : ILLUSTRATIONS[0].id,

    identity: {
      name: safeStr(identity.name, 'Unknown'),
      archetype: safeStr(identity.archetype, 'The Mystery'),
      number: identity.number === null || identity.number === undefined
        ? null
        : (isFinite(Number(identity.number)) ? Number(identity.number) : null),
      suit: identity.suit === null || identity.suit === undefined
        ? null
        : safeStr(identity.suit, null as unknown as string),
    },

    palette: {
      background:      hexColor(palette.background,      '#1a1a2e'),
      primaryAccent:   hexColor(palette.primaryAccent,   '#7c6f9f'),
      secondaryAccent: hexColor(palette.secondaryAccent, '#4a3f6e'),
      text:            hexColor(palette.text,            '#e0d8f0'),
      border:          hexColor(palette.border,          '#3d3560'),
    },

    typography: {
      fontFamily:    pick<FontEnum>(typo.fontFamily,   VALID_FONTS,       'Cinzel'),
      titleSize:     clamp(typo.titleSize,             14, 42, 24),
      titleWeight:   pick<WeightEnum>(typo.titleWeight, VALID_WEIGHTS,    '600'),
      bodySize:      clamp(typo.bodySize,              8,  20, 13),
      bodyWeight:    pick<WeightEnum>(typo.bodyWeight,  VALID_WEIGHTS,    '400'),
      letterSpacing: clamp(typo.letterSpacing,         0,  10,  2),
      titleCase:     pick<'upper' | 'title' | 'asGenerated'>(typo.titleCase,  VALID_TITLE_CASE,  'upper'),
      titleAlign:    pick<'left' | 'center' | 'right'>(typo.titleAlign, VALID_TITLE_ALIGN, 'center'),
      titlePosition: pick<'top' | 'bottom' | 'overlay'>(typo.titlePosition, VALID_TITLE_POS, 'top'),
    },

    frame: {
      style:       pick<FrameStyleEnum>(frame.style,        VALID_FRAME_STYLES,  'simple'),
      thickness:   clamp(frame.thickness,                   1, 20, 6),
      cornerMotif: pick<CornerMotifEnum>(frame.cornerMotif, VALID_CORNER_MOTIFS, 'none'),
      color:       hexOrNull(frame.color),
      innerMargin: clamp(frame.innerMargin,                 4, 28, 12),
    },

    background: {
      baseColor:      hexColor(bg.baseColor,      '#1a1a2e'),
      texture:        pick<TextureEnum>(bg.texture,  VALID_TEXTURES, 'none'),
      textureDensity: clamp(bg.textureDensity,    0, 1, 0.3),
      pattern:        pick<PatternEnum>(bg.pattern,  VALID_PATTERNS, 'none'),
      patternOpacity: clamp(bg.patternOpacity,    0, 1, 0.2),
    },

    footer: {
      text:       safeStr(footer.text, ''),
      fontFamily: pick<FontEnum>(footer.fontFamily, VALID_FONTS, 'Cinzel'),
      size:       clamp(footer.size,                8, 18, 11),
      visible:    typeof footer.visible === 'boolean' ? footer.visible : true,
    },

    mood: clamp(r.mood, 0, 100, 50),

    symbols: rawSymbols.map((s: unknown) => {
      const sym = obj(s);
      return {
        id:      safeStr(sym.id, crypto.randomUUID()),
        kind:    safeStr(sym.kind, 'unknown'),
        x:       clamp(sym.x,       0,   1,   0.5),
        y:       clamp(sym.y,       0,   1,   0.5),
        scale:   clamp(sym.scale,   0.1, 4,   1),
        opacity: clamp(sym.opacity, 0,   1,   1),
        flipX:   typeof sym.flipX === 'boolean' ? sym.flipX : false,
        flipY:   typeof sym.flipY === 'boolean' ? sym.flipY : false,
      };
    }),
  };
}

// ── Map sanitized response → Blueprint ───────────────────────────────────────

function responseToBlueprintPatch(r: AICardResponse): Omit<Blueprint, 'id'> {
  const titlePosition = r.typography.titlePosition;
  return {
    illustration: r.illustrationId,
    identity: r.identity,
    palette: r.palette,
    typography: r.typography,
    frame: r.frame,
    background: r.background,
    footer: r.footer,
    mood: r.mood,
    symbols: r.symbols,
    layout: {
      titlePosition: titlePosition === 'overlay' ? 'top' : titlePosition,
      illustrationArea: { x: 0.05, y: 0.14, width: 0.9, height: 0.66 },
    },
  };
}

// ── System prompts ────────────────────────────────────────────────────────────

const GENERATE_CARD_SYSTEM = `You are a tarot card design expert. Given a prompt, return a JSON object that describes a tarot card's visual design and selects one pre-made illustration from the list below.

AVAILABLE ILLUSTRATIONS (pick the one that best fits the prompt):
${ILLUSTRATION_LIST}

Return a JSON object with this exact shape (wrapped in a \`\`\`json\`\`\` block):
{
  "illustrationId": string,  // must be one of the ids listed above
  "identity": {
    "name": string,
    "archetype": string,
    "number": number | null,
    "suit": string | null
  },
  "palette": {
    "background": string (hex #rrggbb),
    "primaryAccent": string (hex #rrggbb),
    "secondaryAccent": string (hex #rrggbb),
    "text": string (hex #rrggbb),
    "border": string (hex #rrggbb)
  },
  "typography": {
    "fontFamily": one of ["Cinzel","IM Fell English","UnifrakturMaguntia","Metamorphous","Pirata One","Almendra","Berkshire Swash","Uncial Antiqua","Cinzel Decorative","Eater"],
    "titleSize": number (18-32),
    "titleWeight": "300"|"400"|"500"|"600"|"700",
    "bodySize": number (10-16),
    "bodyWeight": "300"|"400"|"500"|"600"|"700",
    "letterSpacing": number (0-6),
    "titleCase": "upper"|"title"|"asGenerated",
    "titleAlign": "left"|"center"|"right",
    "titlePosition": "top"|"bottom"
  },
  "frame": {
    "style": "simple"|"ornate"|"celtic"|"gothic"|"art-nouveau"|"minimal"|"double",
    "thickness": number (4-14),
    "cornerMotif": "none"|"fleur"|"star"|"spiral"|"celtic-knot"|"moon"|"sun"|"pentagram",
    "color": string (hex #rrggbb) | null,
    "innerMargin": number (8-20)
  },
  "background": {
    "baseColor": string (hex #rrggbb),
    "texture": "none"|"grain"|"parchment"|"canvas"|"linen"|"marble"|"watercolor",
    "textureDensity": number (0-1),
    "pattern": "none"|"stars"|"pentagrams"|"circles"|"diamonds"|"waves"|"vines"|"runes",
    "patternOpacity": number (0-1)
  },
  "footer": {
    "text": string,
    "fontFamily": same font options as above,
    "size": number (9-14),
    "visible": boolean
  },
  "mood": number (0-100, where 0=shadow/dark, 50=neutral, 100=radiant/light),
  "symbols": []
}

Choose colors, fonts, frame, and texture to match the thematic feel of the chosen illustration.`;

const REIMAGINE_SYSTEM = `You are a tarot card design expert. Given an existing card design and an instruction, return a modified design in the same JSON format.

AVAILABLE ILLUSTRATIONS:
${ILLUSTRATION_LIST}

Return ONLY a JSON object (in a \`\`\`json\`\`\` block) with the same shape as the input, updated per the instruction. You may change illustrationId if the instruction calls for a different subject.`;

// ── Real AI client ────────────────────────────────────────────────────────────

export const realAIClient: AIClient = {
  async generateCard(prompt: string): Promise<Blueprint> {
    const text = await callClaude(GENERATE_CARD_SYSTEM, `Design a tarot card for: ${prompt}`);
    const response = sanitize(extractJson(text));
    return { ...responseToBlueprintPatch(response), id: crypto.randomUUID() };
  },

  async generateSymbol(description: string, context: Blueprint): Promise<SymbolDef> {
    const system = `You are a tarot card symbol designer. Given a symbol description and card context, return a SymbolDef JSON: { id: "generated", kind: string, x: number (0-1), y: number (0-1), scale: number (0.1-4), opacity: number (0-1), flipX: boolean, flipY: boolean }. Return ONLY valid JSON wrapped in a \`\`\`json\`\`\` block.`;
    const text = await callClaude(
      system,
      `Add symbol: "${description}" to card: ${context.identity.name}`,
    );
    const raw = obj(extractJson(text));
    return {
      id:      crypto.randomUUID(),
      kind:    safeStr(raw.kind, description.split(' ')[0] ?? 'symbol'),
      x:       clamp(raw.x,       0,   1,   0.5),
      y:       clamp(raw.y,       0,   1,   0.5),
      scale:   clamp(raw.scale,   0.1, 4,   1),
      opacity: clamp(raw.opacity, 0,   1,   1),
      flipX:   typeof raw.flipX === 'boolean' ? raw.flipX : false,
      flipY:   typeof raw.flipY === 'boolean' ? raw.flipY : false,
    };
  },

  async reimagineCard(blueprint: Blueprint, instruction: string): Promise<Blueprint> {
    const current: AICardResponse = {
      illustrationId: blueprint.illustration ?? '',
      identity:    blueprint.identity,
      palette:     blueprint.palette,
      typography:  blueprint.typography,
      frame:       blueprint.frame,
      background:  blueprint.background,
      footer:      blueprint.footer,
      mood:        blueprint.mood,
      symbols:     blueprint.symbols,
    };
    const text = await callClaude(
      REIMAGINE_SYSTEM,
      `Instruction: ${instruction}\n\nCurrent design: ${JSON.stringify(current, null, 2)}`,
    );
    const response = sanitize(extractJson(text));
    return { ...responseToBlueprintPatch(response), id: crypto.randomUUID() };
  },
};
