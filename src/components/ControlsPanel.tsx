import { useState } from 'react';
import { useStore } from '../store';
import { mockAIClient } from '../ai/mock-client';

export function ControlsPanel() {
  const prompt = useStore((s) => s.prompt);
  const setPrompt = useStore((s) => s.setPrompt);
  const isGenerating = useStore((s) => s.isGenerating);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const addNode = useStore((s) => s.addNode);
  const patchBlueprint = useStore((s) => s.patchBlueprint);
  const resetToFixture = useStore((s) => s.resetToFixture);
  const activeBlueprint = useStore((s) => s.activeBlueprint());

  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    try {
      const bp = await mockAIClient.generateCard(prompt);
      addNode(bp, `"${prompt.slice(0, 30)}"`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleMoodChange(e: React.ChangeEvent<HTMLInputElement>) {
    patchBlueprint({ mood: Number(e.target.value) });
  }

  return (
    <aside
      style={{
        width: '280px',
        minWidth: '220px',
        background: '#16213e',
        borderRight: '1px solid #2a2a4e',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '16px',
        overflowY: 'auto',
      }}
    >
      <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#9c8fc0', letterSpacing: '0.05em' }}>
        CONTROLS
      </h2>

      {/* Prompt */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px', color: '#888' }}>Prompt</label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe a tarot card…"
          style={{ resize: 'vertical', width: '100%' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              void handleGenerate();
            }
          }}
        />
        <button
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !prompt.trim()}
          style={{
            background: '#7c6f9f',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '13px',
            opacity: isGenerating || !prompt.trim() ? 0.5 : 1,
          }}
        >
          {isGenerating ? 'Generating…' : 'Generate (⌘↵)'}
        </button>
        {error && <p style={{ fontSize: '12px', color: '#e57373' }}>{error}</p>}
      </section>

      {/* Mood slider */}
      {activeBlueprint && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: '#888' }}>
            Mood: {activeBlueprint.mood}
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={activeBlueprint.mood}
            onChange={handleMoodChange}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
            <span>Shadow</span>
            <span>Radiant</span>
          </div>
        </section>
      )}

      {/* Card info */}
      {activeBlueprint && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '12px', color: '#888' }}>Card</p>
          <p style={{ fontSize: '14px', fontWeight: 600 }}>{activeBlueprint.identity.name}</p>
          <p style={{ fontSize: '12px', color: '#9c8fc0' }}>{activeBlueprint.identity.archetype}</p>
          {activeBlueprint.identity.suit && (
            <p style={{ fontSize: '11px', color: '#666' }}>Suit: {activeBlueprint.identity.suit}</p>
          )}
        </section>
      )}

      {/* Reset */}
      <button
        onClick={resetToFixture}
        style={{
          marginTop: 'auto',
          background: 'transparent',
          border: '1px solid #444',
          color: '#888',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        Reset to Fixture
      </button>
    </aside>
  );
}
