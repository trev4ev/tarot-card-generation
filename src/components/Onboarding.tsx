import { useState } from 'react';
import { useStore } from '../store';
import { aiClient } from '../ai';

const EXAMPLE_PROMPT =
  'The Moon — a dreamlike card of mystery, intuition, and hidden depths, in deep indigo and silver';

export function Onboarding() {
  const prompt = useStore((s) => s.prompt);
  const setPrompt = useStore((s) => s.setPrompt);
  const isGenerating = useStore((s) => s.isGenerating);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const startCard = useStore((s) => s.startCard);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    try {
      const generated = await aiClient.generateCard(prompt);
      startCard(generated, `"${prompt.slice(0, 28)}"`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#0f0f1e',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 700,
              color: '#e0d8ff',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Tarot Card Studio
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#9c8fc0', lineHeight: 1.5 }}>
            Describe the tarot card you want to create to get started.
          </p>
        </div>

        <textarea
          autoFocus
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`e.g. ${EXAMPLE_PROMPT}`}
          style={{
            resize: 'vertical',
            width: '100%',
            boxSizing: 'border-box',
            background: '#16213e',
            border: '1px solid #2a2a4e',
            borderRadius: 8,
            color: '#e0e0e0',
            fontSize: 15,
            lineHeight: 1.5,
            padding: '14px 16px',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleGenerate();
          }}
        />

        <button
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !prompt.trim()}
          style={{
            background: isGenerating || !prompt.trim() ? '#3a3458' : '#6d5fb5',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {isGenerating ? 'Generating…' : 'Generate Card'}
        </button>

        {error && (
          <p style={{ fontSize: 12, color: '#f87171', lineHeight: 1.4, textAlign: 'center' }}>{error}</p>
        )}
      </div>
    </div>
  );
}
