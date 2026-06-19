import { mockAIClient } from './mock-client';
import { realAIClient } from './client';
import type { AIClient } from './types';

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

export const aiClient: AIClient = apiKey ? realAIClient : mockAIClient;
