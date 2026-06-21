import type { AIClient } from './types';
import type { Blueprint, SymbolDef } from '../types/blueprint';
import { theFool, theMoon, aceOfWands, fixtureCards } from '../fixtures/cards';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickByKeyword(prompt: string): Blueprint {
  const lower = prompt.toLowerCase();
  if (lower.includes('fool') || lower.includes('adventure') || lower.includes('journey')) {
    return { ...theFool, id: crypto.randomUUID() };
  }
  if (lower.includes('moon') || lower.includes('dream') || lower.includes('night') || lower.includes('mystery')) {
    return { ...theMoon, id: crypto.randomUUID() };
  }
  if (lower.includes('wand') || lower.includes('fire') || lower.includes('passion') || lower.includes('spark')) {
    return { ...aceOfWands, id: crypto.randomUUID() };
  }
  const random = fixtureCards[Math.floor(Math.random() * fixtureCards.length)];
  return { ...random, id: crypto.randomUUID() };
}

const KEYWORD_ILLUSTRATION: Array<[RegExp, string]> = [
  [/hermit|sage|lantern|solitude|wisdom/i, 'the-hermit'],
  [/moon|dream|night|wolf|illusion/i, 'the-moon'],
  [/sun|joy|child|radiant|warmth/i, 'the-sun'],
  [/star|hope|renewal|serenity/i, 'the-star'],
  [/tower|chaos|lightning|upheaval/i, 'the-tower'],
  [/death|transform|ending|rebirth/i, 'death'],
  [/devil|shadow|bondage|temptation/i, 'the-devil'],
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

export function pickIllustration(prompt: string): string {
  for (const [re, id] of KEYWORD_ILLUSTRATION) {
    if (re.test(prompt)) return id;
  }
  return 'the-fool';
}

export const mockAIClient: AIClient = {
  async generateCard(prompt: string): Promise<Blueprint> {
    await delay(500);
    const bp = pickByKeyword(prompt);
    return { ...bp, illustration: pickIllustration(prompt) };
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
