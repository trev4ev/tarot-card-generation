import { mockAIClient } from './mock-client';
import type { AIClient } from './types';

// AI generation is stubbed for production. The mock client returns a
// deterministic card built from the local fixtures, so clicking "Generate"
// produces a tarot card without needing an Anthropic API key. Swap in
// `realAIClient` from './client' to call the live model.
export const aiClient: AIClient = mockAIClient;
