import { CanvasGrid } from './CanvasGrid';
import { ControlsPanel } from './ControlsPanel';
import { TimelinePanel } from './TimelinePanel';

export function App() {
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
      {/* Top: Controls (left) + Canvas grid (center) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <ControlsPanel />
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

      {/* Bottom: Timeline spanning full width */}
      <TimelinePanel />
    </div>
  );
}
