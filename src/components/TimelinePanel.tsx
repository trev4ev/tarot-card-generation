import { useStore } from '../store';

export function TimelinePanel() {
  const nodes = useStore((s) => s.nodes);
  const activeNodeId = useStore((s) => s.activeNodeId);
  const setActiveNode = useStore((s) => s.setActiveNode);

  return (
    <aside
      style={{
        width: '220px',
        minWidth: '180px',
        background: '#16213e',
        borderLeft: '1px solid #2a2a4e',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #2a2a4e',
          fontSize: '14px',
          fontWeight: 600,
          color: '#9c8fc0',
          letterSpacing: '0.05em',
        }}
      >
        TIMELINE
      </div>

      <ul style={{ listStyle: 'none', padding: '8px 0', flex: 1 }}>
        {[...nodes].reverse().map((node) => {
          const isActive = node.id === activeNodeId;
          return (
            <li key={node.id}>
              <button
                onClick={() => setActiveNode(node.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  background: isActive ? '#2a2a4e' : 'transparent',
                  borderLeft: isActive ? '3px solid #7c6f9f' : '3px solid transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  transition: 'background 0.15s',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#e0e0e0' : '#aaa',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.blueprint.identity.name}
                </span>
                <span style={{ fontSize: '11px', color: '#666' }}>{node.label}</span>
                <span style={{ fontSize: '10px', color: '#555' }}>
                  {new Date(node.timestamp).toLocaleTimeString()}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #2a2a4e',
          fontSize: '11px',
          color: '#555',
        }}
      >
        {nodes.length} node{nodes.length !== 1 ? 's' : ''}
      </div>
    </aside>
  );
}
