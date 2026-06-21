import type { AIClient } from './types';
import type { Blueprint, SymbolDef } from '../types/blueprint';
import { theFool, theMoon, aceOfWands, fixtureCards } from '../fixtures/cards';
import { ILLUSTRATIONS } from '../illustrations/catalog';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


const KEYWORD_ILLUSTRATION: Array<[RegExp, string]> = [
  [/hermit|sage|lantern|solitude|wisdom/i, 'the-hermit'],
  [/moon|dream|night|wolf|illusion/i, 'the-moon'],
  [/sun|joy|child|radiant|warmth/i, 'the-sun'],
  [/star|hope|renewal|serenity/i, 'the-star'],
  [/tower|chaos|lightning|upheaval/i, 'the-tower'],
  [/death|transform|ending|rebirth/i, 'death'],
  [/fool|adventure|journey|innocen/i, 'the-fool'],
  [/magician|power|will|manifest/i, 'the-magician'],
  [/empress|nature|abundance|fertile/i, 'the-empress'],
  [/emperor|authority|leader|order/i, 'the-emperor'],
  [/love|union|couple|heart/i, 'the-lovers'],
  [/justice|law|balance|truth/i, 'justice'],
  [/wheel|fate|fortune|karma|cycle/i, 'wheel-of-fortune'],
  [/strength|courage|lion|inner/i, 'strength'],
  [/temperance|moderat|flow|angel/i, 'temperance'],
  [/high priestess|mystery|intuition|veil/i, 'the-high-priestess'],
  [/hierophant|tradition|ritual|teach/i, 'the-hierophant'],
  [/chariot|victory|conquest|warrior/i, 'the-chariot'],
  [/hang|sacrifice|surrender|perspective/i, 'the-hanged-man'],
];

// When nothing in the prompt matches a specific card, fall back to a neutral
// "fate / mystery" illustration rather than The Fool.
const FALLBACK_ILLUSTRATION = 'wheel-of-fortune';

export function pickIllustration(prompt: string): string {
  for (const [re, id] of KEYWORD_ILLUSTRATION) {
    if (re.test(prompt)) return id;
  }
  return FALLBACK_ILLUSTRATION;
}

export const mockAIClient: AIClient = {
  async generateCard(prompt: string): Promise<Blueprint> {
    await delay(500);
    const illustrationId = pickIllustration(prompt);
    const illEntry = ILLUSTRATIONS.find((i) => i.id === illustrationId) ?? ILLUSTRATIONS[0];
    const lower = prompt.toLowerCase();
    const base = lower.includes('fool') || lower.includes('adventure') || lower.includes('journey')
      ? { ...theFool, id: crypto.randomUUID() }
      : lower.includes('moon') || lower.includes('dream') || lower.includes('night') || lower.includes('mystery')
      ? { ...theMoon, id: crypto.randomUUID() }
      : lower.includes('wand') || lower.includes('fire') || lower.includes('passion') || lower.includes('spark')
      ? { ...aceOfWands, id: crypto.randomUUID() }
      : { ...fixtureCards[Math.floor(Math.random() * fixtureCards.length)], id: crypto.randomUUID() };
    return {
      ...base,
      symbols: [],
      id: crypto.randomUUID(),
      seed: crypto.randomUUID(),
      illustration: illustrationId,
      identity: {
        name: illEntry.name,
        archetype: illEntry.tags[0]
          ? illEntry.tags[0].charAt(0).toUpperCase() + illEntry.tags[0].slice(1)
          : base.identity.archetype,
        number: base.identity.number,
        suit: base.identity.suit,
      },
      footer: {
        ...base.footer,
        text: illEntry.name.toUpperCase(),
      },
    };
  },

  async generateSymbol(description: string, _context: Blueprint): Promise<SymbolDef> {
    await delay(500);
    return {
      id: crypto.randomUUID(),
      kind: description.toLowerCase().split(' ')[0] ?? 'symbol',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      opacity: 1.0,
      flipX: false,
      flipY: false,
    };
  },

  async reimagineCard(blueprint: Blueprint, _instruction: string): Promise<Blueprint> {
    await delay(500);
    return { ...blueprint, id: crypto.randomUUID() };
  },
};
