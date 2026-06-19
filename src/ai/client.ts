import type { AIClient } from './types';
import type { Blueprint, SymbolDef } from '../types/blueprint';

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

function parseJson<T>(text: string): T {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/);
  const raw = match ? match[1] : text;
  return JSON.parse(raw.trim()) as T;
}

const GENERATE_CARD_SYSTEM = `You are a tarot card design expert. Given a prompt, return a JSON Blueprint object that describes a tarot card's visual design. The Blueprint must strictly follow this TypeScript type:

{
  id: string (use "generated"),
  identity: { name: string, archetype: string, number: number | null, suit: string | null },
  palette: { background: string, primaryAccent: string, secondaryAccent: string, text: string, border: string },
  typography: { fontFamily: one of ["Cinzel","IM Fell English","UnifrakturMaguntia","Metamorphous","Pirata One","Almendra","Berkshire Swash","Uncial Antiqua","MedievalSharp","Eater"], titleSize: number, titleWeight: "300"|"400"|"500"|"600"|"700", bodySize: number, bodyWeight: "300"|"400"|"500"|"600"|"700", letterSpacing: number, titleCase: "upper"|"title"|"asGenerated", titleAlign: "left"|"center"|"right", titlePosition: "top"|"bottom"|"overlay" },
  frame: { style: "simple"|"ornate"|"celtic"|"gothic"|"art-nouveau"|"minimal"|"double", thickness: number, cornerMotif: "none"|"fleur"|"star"|"spiral"|"celtic-knot"|"moon"|"sun"|"pentagram", color: string | null, innerMargin: number },
  background: { baseColor: string, texture: "none"|"grain"|"parchment"|"canvas"|"linen"|"marble"|"watercolor", textureDensity: number (0-1), pattern: "none"|"stars"|"pentagrams"|"circles"|"diamonds"|"waves"|"vines"|"runes", patternOpacity: number (0-1) },
  symbols: Array<{ id: string, kind: string, x: number (0-1), y: number (0-1), scale: number, opacity: number (0-1), flipX: boolean, flipY: boolean }>,
  footer: { text: string, fontFamily: same as above, size: number, visible: boolean },
  layout: { titlePosition: "top"|"bottom", illustrationArea: { x: number, y: number, width: number, height: number } },
  mood: number (0-100)
}

Return ONLY valid JSON wrapped in a \`\`\`json\`\`\` block.`;

const REIMAGINE_SYSTEM = `You are a tarot card design expert. Given an existing Blueprint JSON and an instruction, return a modified Blueprint JSON. Apply the instruction while preserving the overall structure. Return ONLY valid JSON wrapped in a \`\`\`json\`\`\` block.`;

export const realAIClient: AIClient = {
  async generateCard(prompt: string): Promise<Blueprint> {
    const text = await callClaude(GENERATE_CARD_SYSTEM, `Design a tarot card for: ${prompt}`);
    const bp = parseJson<Blueprint>(text);
    bp.id = crypto.randomUUID();
    return bp;
  },

  async generateSymbol(description: string, context: Blueprint): Promise<SymbolDef> {
    const system = `You are a tarot card symbol designer. Given a symbol description and card context, return a SymbolDef JSON: { id: "generated", kind: string, x: number (0-1), y: number (0-1), scale: number, opacity: number (0-1), flipX: boolean, flipY: boolean }. Return ONLY valid JSON wrapped in a \`\`\`json\`\`\` block.`;
    const text = await callClaude(
      system,
      `Add symbol: "${description}" to card: ${context.identity.name}`,
    );
    const sym = parseJson<SymbolDef>(text);
    sym.id = crypto.randomUUID();
    return sym;
  },

  async reimagineCard(blueprint: Blueprint, instruction: string): Promise<Blueprint> {
    const text = await callClaude(
      REIMAGINE_SYSTEM,
      `Instruction: ${instruction}\n\nBlueprint: ${JSON.stringify(blueprint, null, 2)}`,
    );
    const bp = parseJson<Blueprint>(text);
    bp.id = crypto.randomUUID();
    return bp;
  },
};
