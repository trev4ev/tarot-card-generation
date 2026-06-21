import { useState } from 'react';
import { useStore } from '../store';
import { aiClient } from '../ai';
import { getRandomBlurb } from '../data/randomizeBlurbs';

interface OnboardingScreenProps {
  onDismiss: () => void;
}

export function OnboardingScreen({ onDismiss }: OnboardingScreenProps) {
  const addNode = useStore((s) => s.addNode);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleRandomize() {
    const blurb = getRandomBlurb();
    setPrompt(blurb.prompt);
    setError(null);
  }

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    try {
      const generated = await aiClient.generateCard(prompt);
      addNode(generated, `"${prompt.slice(0, 28)}"`);
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setIsGenerating(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 8, 24, 0.88)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: '#16213e',
          border: '1px solid #2e2b5e',
          borderRadius: '12px',
          padding: '40px 44px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>✦</div>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: '#e2daf5',
              letterSpacing: '0.04em',
            }}
          >
            Tarot Card Studio
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '13px',
              color: '#7b6fa0',
              lineHeight: 1.5,
            }}
          >
            Describe the card you want to create, or randomize a suggestion to get started.
          </p>
        </div>

        {/* Textarea */}
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe a tarot card…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleGenerate();
          }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#0f0f1e',
            border: '1px solid #2e2b5e',
            borderRadius: '7px',
            color: '#e2daf5',
            fontSize: '14px',
            lineHeight: 1.6,
            padding: '12px 14px',
            resize: 'vertical',
            outline: 'none',
            marginBottom: '16px',
            fontFamily: 'inherit',
          }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRandomize}
            style={{
              flex: '0 0 auto',
              background: '#1e1b3a',
              border: '1px solid #3d3770',
              color: '#b8aedd',
              padding: '10px 18px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#27244a';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#5a54a0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#1e1b3a';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#3d3770';
            }}
          >
            ⚄ Randomize
          </button>

          <button
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !prompt.trim()}
            style={{
              flex: 1,
              background: isGenerating || !prompt.trim() ? '#2a2648' : '#6d5fb5',
              color: isGenerating || !prompt.trim() ? '#5a5480' : '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '7px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              letterSpacing: '0.03em',
            }}
          >
            {isGenerating ? 'Generating…' : 'Generate Card  ⌘↵'}
          </button>
        </div>

        {error && (
          <p
            style={{
              marginTop: '12px',
              marginBottom: 0,
              fontSize: '12px',
              color: '#f87171',
              lineHeight: 1.4,
            }}
          >
            {error}
          </p>
        )}

        {/* Skip link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a4470',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Skip — use the example card
          </button>
        </div>
      </div>
    </div>
  );
}
