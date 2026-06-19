import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { aiClient } from '../ai';
import type {
  Blueprint,
  FontEnum,
  FrameStyleEnum,
  CornerMotifEnum,
  TextureEnum,
  PatternEnum,
  SymbolDef,
} from '../types/blueprint';

// ── Option lists ──────────────────────────────────────────────────────────────

const FONTS: FontEnum[] = [
  'Cinzel', 'Cinzel Decorative', 'IM Fell English', 'UnifrakturMaguntia',
  'Metamorphous', 'Pirata One', 'Almendra', 'Berkshire Swash',
  'Uncial Antiqua', 'Eater',
];
const FRAME_STYLES: FrameStyleEnum[] = [
  'simple', 'double', 'ornate', 'gothic', 'celtic', 'art-nouveau', 'minimal',
];
const CORNER_MOTIFS: CornerMotifEnum[] = [
  'none', 'star', 'fleur', 'moon', 'sun', 'spiral', 'celtic-knot', 'pentagram',
];
const TEXTURES: TextureEnum[] = [
  'none', 'grain', 'parchment', 'canvas', 'linen', 'marble', 'watercolor',
];
const PATTERNS: PatternEnum[] = [
  'none', 'stars', 'pentagrams', 'circles', 'diamonds', 'waves', 'vines', 'runes',
];

// ── Sub-components ────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: '#16213e',
  borderBottom: '1px solid #2a2a4e',
};

const summaryStyle: React.CSSProperties = {
  padding: '9px 16px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  color: '#9c8fc0',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  userSelect: 'none',
  listStyle: 'none',
  display: 'flex',
  justifyContent: 'space-between',
};

function Section({
  title,
  open = true,
  children,
}: {
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(open);
  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.currentTarget as HTMLDetailsElement).open)}
      style={panelStyle}
    >
      <summary style={summaryStyle}>
        {title}
        <span style={{ transition: 'transform 0.15s', display: 'inline-block', transform: isOpen ? 'none' : 'rotate(-90deg)' }}>▾</span>
      </summary>
      <div
        style={{
          padding: '4px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {children}
      </div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '10px', color: '#666', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Slider({
  label, value, min, max, step = 1,
  onChange, onLiveChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; onChange: (v: number) => void; onLiveChange?: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);

  return (
    <Row label={`${label}: ${local}`}>
      <input
        type="range" min={min} max={max} step={step} value={local}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          onLiveChange?.(v);
        }}
        onMouseUp={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onChange(Number((e.currentTarget as HTMLInputElement).value))}
      />
    </Row>
  );
}

function Sel<T extends string>({
  label, value, options, onChange,
}: {
  label: string; value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <Row label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Row>
  );
}

function ColorRow({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 30, height: 26, padding: '1px', cursor: 'pointer', borderRadius: 3 }}
      />
      <span style={{ fontSize: '11px', color: '#888', flex: 1 }}>{label}</span>
      <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ControlsPanel() {
  const prompt = useStore((s) => s.prompt);
  const setPrompt = useStore((s) => s.setPrompt);
  const isGenerating = useStore((s) => s.isGenerating);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const addNode = useStore((s) => s.addNode);
  const patchBlueprint = useStore((s) => s.patchBlueprint);
  const updateLiveBlueprint = useStore((s) => s.updateLiveBlueprint);
  const resetToFixture = useStore((s) => s.resetToFixture);
  const selectedElement = useStore((s) => s.selectedElement);
  const setSelectedElement = useStore((s) => s.setSelectedElement);
  const updateSymbol = useStore((s) => s.updateSymbol);
  const addSymbol = useStore((s) => s.addSymbol);
  const removeSymbol = useStore((s) => s.removeSymbol);
  const bp = useStore((s) => s.activeBlueprint());
  const [error, setError] = useState<string | null>(null);
  const [symDesc, setSymDesc] = useState('');
  const [addingSymbol, setAddingSymbol] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    try {
      const generated = await aiClient.generateCard(prompt);
      addNode(generated, `"${prompt.slice(0, 28)}"`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }

  function patch<K extends keyof Blueprint>(
    key: K,
    value: Blueprint[K],
    label: string,
  ) {
    patchBlueprint({ [key]: value } as Partial<Blueprint>, label);
  }

  function patchPalette(key: keyof Blueprint['palette'], value: string) {
    patchBlueprint({ palette: { [key]: value } as Partial<Blueprint['palette']> }, `Palette: ${key}`);
  }
  function patchFrame(key: keyof Blueprint['frame'], value: Blueprint['frame'][typeof key]) {
    patchBlueprint({ frame: { [key]: value } as Partial<Blueprint['frame']> }, `Frame: ${key}`);
  }
  function patchTypo(key: keyof Blueprint['typography'], value: Blueprint['typography'][typeof key]) {
    patchBlueprint({ typography: { [key]: value } as Partial<Blueprint['typography']> }, `Typography: ${key}`);
  }
  function patchBg(key: keyof Blueprint['background'], value: Blueprint['background'][typeof key]) {
    patchBlueprint({ background: { [key]: value } as Partial<Blueprint['background']> }, `Background: ${key}`);
  }
  function patchFooter(key: keyof Blueprint['footer'], value: Blueprint['footer'][typeof key]) {
    patchBlueprint({ footer: { [key]: value } as Partial<Blueprint['footer']> }, `Footer: ${key}`);
  }

  function liveFrame(key: keyof Blueprint['frame'], value: Blueprint['frame'][typeof key]) {
    updateLiveBlueprint({ frame: { [key]: value } as Partial<Blueprint['frame']> });
  }
  function liveTypo(key: keyof Blueprint['typography'], value: Blueprint['typography'][typeof key]) {
    updateLiveBlueprint({ typography: { [key]: value } as Partial<Blueprint['typography']> });
  }
  function liveBg(key: keyof Blueprint['background'], value: Blueprint['background'][typeof key]) {
    updateLiveBlueprint({ background: { [key]: value } as Partial<Blueprint['background']> });
  }
  function liveFooter(key: keyof Blueprint['footer'], value: Blueprint['footer'][typeof key]) {
    updateLiveBlueprint({ footer: { [key]: value } as Partial<Blueprint['footer']> });
  }

  function liveSymbol(symbolId: string, patch: Partial<SymbolDef>) {
    if (!bp) return;
    const symbols = bp.symbols.map((s) => s.id === symbolId ? { ...s, ...patch } : s);
    updateLiveBlueprint({ symbols });
  }

  async function handleAddSymbol() {
    if (!symDesc.trim() || !bp || addingSymbol) return;
    setAddingSymbol(true);
    try {
      const sym = await aiClient.generateSymbol(symDesc, bp);
      addSymbol(sym);
      setSelectedElement({ type: 'symbol', symbolId: sym.id });
      setSymDesc('');
    } catch {
      // ignore
    } finally {
      setAddingSymbol(false);
    }
  }

  // Derive selected symbol for controls
  const selectedSym =
    selectedElement?.type === 'symbol' && bp
      ? bp.symbols.find((s) => s.id === selectedElement.symbolId) ?? null
      : null;

  const selLabel =
    selectedElement?.type === 'title' ? 'Title'
    : selectedElement?.type === 'footer' ? 'Footer'
    : selectedElement?.type === 'frame' ? 'Frame'
    : selectedElement?.type === 'background' ? 'Background'
    : null;

  return (
    <aside
      style={{
        width: '300px',
        minWidth: '240px',
        background: '#13122a',
        borderRight: '1px solid #2a2a4e',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid #2a2a4e',
          fontSize: '13px',
          fontWeight: 700,
          color: '#c4b5fd',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Controls
      </div>

      {/* Selection */}
      {selectedElement && (
        <div style={{ background: '#1a1a3e', borderBottom: '1px solid #2a2a4e', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#c4b5fd', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {selectedSym ? `Symbol: ${selectedSym.kind}` : `Selected: ${selLabel}`}
            </span>
            <button
              onClick={() => setSelectedElement(null)}
              title="Deselect"
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', padding: '0 2px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {selectedSym && (
            <>
              <Slider
                label="X position"
                value={Math.round(selectedSym.x * 100)}
                min={0} max={100}
                onLiveChange={(v) => liveSymbol(selectedSym.id, { x: v / 100 })}
                onChange={(v) => updateSymbol(selectedSym.id, { x: v / 100 })}
              />
              <Slider
                label="Y position"
                value={Math.round(selectedSym.y * 100)}
                min={0} max={100}
                onLiveChange={(v) => liveSymbol(selectedSym.id, { y: v / 100 })}
                onChange={(v) => updateSymbol(selectedSym.id, { y: v / 100 })}
              />
              <Slider
                label="Scale"
                value={Math.round(selectedSym.scale * 100)}
                min={10} max={300}
                onLiveChange={(v) => liveSymbol(selectedSym.id, { scale: v / 100 })}
                onChange={(v) => updateSymbol(selectedSym.id, { scale: v / 100 })}
              />
              <Slider
                label="Opacity"
                value={Math.round(selectedSym.opacity * 100)}
                min={0} max={100}
                onLiveChange={(v) => liveSymbol(selectedSym.id, { opacity: v / 100 })}
                onChange={(v) => updateSymbol(selectedSym.id, { opacity: v / 100 })}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', color: '#aaa' }}>
                  <input
                    type="checkbox"
                    checked={selectedSym.flipX}
                    onChange={(e) => updateSymbol(selectedSym.id, { flipX: e.target.checked })}
                    style={{ width: 13, height: 13 }}
                  />
                  Flip X
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', color: '#aaa' }}>
                  <input
                    type="checkbox"
                    checked={selectedSym.flipY}
                    onChange={(e) => updateSymbol(selectedSym.id, { flipY: e.target.checked })}
                    style={{ width: 13, height: 13 }}
                  />
                  Flip Y
                </label>
              </div>
              <button
                onClick={() => {
                  removeSymbol(selectedSym.id);
                  setSelectedElement(null);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #5a2a2a',
                  color: '#f87171',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                Delete Symbol
              </button>
            </>
          )}

          {selLabel && (
            <span style={{ fontSize: '11px', color: '#666' }}>
              Edit in the {selLabel} section below
            </span>
          )}
        </div>
      )}

      {/* Add Symbol */}
      {bp && (
        <div style={{ background: '#16213e', borderBottom: '1px solid #2a2a4e', padding: '8px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <input
            type="text"
            value={symDesc}
            onChange={(e) => setSymDesc(e.target.value)}
            placeholder="Add symbol…"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAddSymbol(); }}
            style={{ flex: 1, fontSize: '12px', padding: '4px 7px' }}
          />
          <button
            onClick={() => void handleAddSymbol()}
            disabled={!symDesc.trim() || addingSymbol}
            style={{
              background: addingSymbol || !symDesc.trim() ? '#3a3458' : '#6d5fb5',
              color: '#fff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: addingSymbol || !symDesc.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {addingSymbol ? '…' : '+ Add'}
          </button>
        </div>
      )}

      {/* AI Generation */}
      <Section title="AI Generation">
        <Row label="Prompt">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe a tarot card…"
            style={{ resize: 'vertical', width: '100%' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleGenerate();
            }}
          />
        </Row>
        <button
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !prompt.trim()}
          style={{
            background: isGenerating || !prompt.trim() ? '#3a3458' : '#6d5fb5',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '5px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isGenerating || !prompt.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {isGenerating ? 'Generating…' : 'Generate (⌘↵)'}
        </button>
        {error && (
          <p style={{ fontSize: '11px', color: '#f87171', lineHeight: 1.4 }}>{error}</p>
        )}
      </Section>

      {bp && (
        <>
          {/* Mood */}
          <Section title="Mood">
            <Slider
              label="Mood"
              value={bp.mood} min={0} max={100}
              onLiveChange={(v) => updateLiveBlueprint({ mood: v })}
              onChange={(v) => patch('mood', v, `Mood → ${v}`)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#555' }}>
              <span>Shadow</span>
              <span>Neutral</span>
              <span>Radiant</span>
            </div>
          </Section>

          {/* Palette */}
          <Section title="Palette">
            <ColorRow
              label="Background"
              value={bp.palette.background}
              onChange={(v) => patchPalette('background', v)}
            />
            <ColorRow
              label="Primary accent"
              value={bp.palette.primaryAccent}
              onChange={(v) => patchPalette('primaryAccent', v)}
            />
            <ColorRow
              label="Secondary accent"
              value={bp.palette.secondaryAccent}
              onChange={(v) => patchPalette('secondaryAccent', v)}
            />
            <ColorRow
              label="Text"
              value={bp.palette.text}
              onChange={(v) => patchPalette('text', v)}
            />
            <ColorRow
              label="Border"
              value={bp.palette.border}
              onChange={(v) => patchPalette('border', v)}
            />
          </Section>

          {/* Frame */}
          <Section title="Frame" open={false}>
            <Sel
              label="Style"
              value={bp.frame.style}
              options={FRAME_STYLES}
              onChange={(v) => patchFrame('style', v)}
            />
            <Sel
              label="Corner motif"
              value={bp.frame.cornerMotif}
              options={CORNER_MOTIFS}
              onChange={(v) => patchFrame('cornerMotif', v)}
            />
            <Slider
              label="Thickness"
              value={bp.frame.thickness}
              min={1} max={20}
              onLiveChange={(v) => liveFrame('thickness', v)}
              onChange={(v) => patchFrame('thickness', v)}
            />
            <Slider
              label="Inner margin"
              value={bp.frame.innerMargin}
              min={4} max={28}
              onLiveChange={(v) => liveFrame('innerMargin', v)}
              onChange={(v) => patchFrame('innerMargin', v)}
            />
            <ColorRow
              label="Frame color (blank = border)"
              value={bp.frame.color ?? bp.palette.border}
              onChange={(v) => patchFrame('color', v)}
            />
          </Section>

          {/* Typography */}
          <Section title="Typography" open={false}>
            <Sel
              label="Font family"
              value={bp.typography.fontFamily}
              options={FONTS}
              onChange={(v) => patchTypo('fontFamily', v)}
            />
            <Slider
              label="Title size"
              value={bp.typography.titleSize}
              min={14} max={42}
              onLiveChange={(v) => liveTypo('titleSize', v)}
              onChange={(v) => patchTypo('titleSize', v)}
            />
            <Sel
              label="Title case"
              value={bp.typography.titleCase}
              options={['upper', 'title', 'asGenerated'] as const}
              onChange={(v) => patchTypo('titleCase', v)}
            />
            <Sel
              label="Title align"
              value={bp.typography.titleAlign}
              options={['left', 'center', 'right'] as const}
              onChange={(v) => patchTypo('titleAlign', v)}
            />
            <Sel
              label="Title position"
              value={bp.layout.titlePosition}
              options={['top', 'bottom'] as const}
              onChange={(v) =>
                patchBlueprint(
                  { layout: { ...bp.layout, titlePosition: v } },
                  `Title position: ${v}`,
                )
              }
            />
            <Slider
              label="Letter spacing"
              value={bp.typography.letterSpacing}
              min={0} max={8} step={0.5}
              onLiveChange={(v) => liveTypo('letterSpacing', v)}
              onChange={(v) => patchTypo('letterSpacing', v)}
            />
          </Section>

          {/* Background */}
          <Section title="Background" open={false}>
            <ColorRow
              label="Base color"
              value={bp.background.baseColor}
              onChange={(v) => patchBg('baseColor', v)}
            />
            <Sel
              label="Texture"
              value={bp.background.texture}
              options={TEXTURES}
              onChange={(v) => patchBg('texture', v)}
            />
            <Sel
              label="Pattern"
              value={bp.background.pattern}
              options={PATTERNS}
              onChange={(v) => patchBg('pattern', v)}
            />
            <Slider
              label="Pattern opacity"
              value={Math.round(bp.background.patternOpacity * 100)}
              min={0} max={100}
              onLiveChange={(v) => liveBg('patternOpacity', v / 100)}
              onChange={(v) => patchBg('patternOpacity', v / 100)}
            />
          </Section>

          {/* Footer */}
          <Section title="Footer" open={false}>
            <Row label="Visible">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={bp.footer.visible}
                  onChange={(e) => patchFooter('visible', e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                <span style={{ fontSize: '12px', color: '#aaa' }}>Show footer</span>
              </label>
            </Row>
            {bp.footer.visible && (
              <>
                <Row label="Footer text">
                  <input
                    type="text"
                    value={bp.footer.text}
                    onChange={(e) =>
                      patchFooter('text', e.target.value)
                    }
                  />
                </Row>
                <Sel
                  label="Footer font"
                  value={bp.footer.fontFamily}
                  options={FONTS}
                  onChange={(v) => patchFooter('fontFamily', v)}
                />
                <Slider
                  label="Footer size"
                  value={bp.footer.size}
                  min={8} max={18}
                  onLiveChange={(v) => liveFooter('size', v)}
                  onChange={(v) => patchFooter('size', v)}
                />
              </>
            )}
          </Section>

          {/* Card info (read-only) */}
          <Section title="Card" open={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#e0d8ff' }}>
                {bp.identity.name}
              </p>
              <p style={{ fontSize: '12px', color: '#9c8fc0' }}>{bp.identity.archetype}</p>
              {bp.identity.suit && (
                <p style={{ fontSize: '11px', color: '#666' }}>Suit: {bp.identity.suit}</p>
              )}
              {bp.identity.number !== null && (
                <p style={{ fontSize: '11px', color: '#666' }}>Number: {bp.identity.number}</p>
              )}
            </div>
          </Section>
        </>
      )}

      {/* Reset */}
      <div style={{ padding: '12px 16px', marginTop: 'auto', borderTop: '1px solid #2a2a4e' }}>
        <button
          onClick={resetToFixture}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px solid #3a3458',
            color: '#666',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          Reset to Fixture
        </button>
      </div>
    </aside>
  );
}
