import { CanvasGrid } from './CanvasGrid';
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

      {/* Center: Canvas Grid */}
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

      {/* Right: Timeline */}
      <TimelinePanel />
    </div>
  );
}
