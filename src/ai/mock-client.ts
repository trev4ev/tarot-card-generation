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

export const mockAIClient: AIClient = {
  async generateCard(prompt: string): Promise<Blueprint> {
    await delay(500);
    return pickByKeyword(prompt);
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
