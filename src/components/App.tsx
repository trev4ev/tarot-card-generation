import { CardCanvas } from './CardCanvas';
import { ControlsPanel } from './ControlsPanel';
import { TimelinePanel } from './TimelinePanel';

export function App() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#1a1a2e',
      }}
    >
      {/* Left: Controls */}
      <ControlsPanel />

      {/* Center: Canvas */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#0f0f1e',
        }}
      >
        <CardCanvas />
      </main>

      {/* Right: Timeline */}
      <TimelinePanel />
    </div>
  );
}
