import { useState, useEffect } from 'react';
import { CanvasGrid } from './CanvasGrid';
import { ControlsPanel } from './ControlsPanel';
import { TimelinePanel } from './TimelinePanel';
import { Onboarding } from './Onboarding';
import { useStore } from '../store';
import { assertAllBlurbsValid } from '../data/randomizeBlurbs';

export function App() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const hasCard = useStore((s) => s.branches.length > 0);

  useEffect(() => {
    if (import.meta.env.DEV) {
      try { assertAllBlurbsValid(); } catch { /* errors already logged */ }
    }
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  if (!hasCard) {
    return <Onboarding />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#1a1a2e',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <ControlsPanel open={leftOpen} onToggle={() => setLeftOpen((v) => !v)} />
        <main
          style={{
            flex: 1,
            overflow: 'hidden',
            background: '#0f0f1e',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
          }}
        >
          <CanvasGrid />
        </main>
      </div>
      <TimelinePanel open={bottomOpen} onToggle={() => setBottomOpen((v) => !v)} />
    </div>
  );
}
