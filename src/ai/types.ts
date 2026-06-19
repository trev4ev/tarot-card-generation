import type { Blueprint, SymbolDef } from '../types/blueprint';

export interface AIClient {
  generateCard(prompt: string): Promise<Blueprint>;
  generateSymbol(description: string, context: Blueprint): Promise<SymbolDef>;
  reimagineCard(blueprint: Blueprint, instruction: string): Promise<Blueprint>;
}
