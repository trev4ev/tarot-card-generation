import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { rendererStub } from '../renderer/stub';
import type { Branch, TimelineNode } from '../types/blueprint';

// ── Thumbnail cache ───────────────────────────────────────────────────────────
const thumbnailCache = new Map<string, string>();

// ── NodeThumbnail ─────────────────────────────────────────────────────────────

function NodeThumbnail({ node }: { node: TimelineNode }) {
  const [src, setSrc] = useState<string | null>(thumbnailCache.get(node.blueprint.id) ?? null);

  useEffect(() => {
    const cached = thumbnailCache.get(node.blueprint.id);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    rendererStub.renderThumbnail(node.blueprint).then((dataURL) => {
      if (!cancelled) {
        thumbnailCache.set(node.blueprint.id, dataURL);
        setSrc(dataURL);
      }
    }).catch(() => {
      // ignore thumbnail errors
    });
    return () => { cancelled = true; };
  }, [node.blueprint]);

  return (
    <div
      style={{
        width: 48,
        height: 83,
        flexShrink: 0,
        background: '#0f0f1e',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #2a2a4e',
      }}
    >
      {src ? (
        <img
          src={src}
          alt="thumbnail"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '8px', color: '#444' }}>...</span>
        </div>
      )}
    </div>
  );
}

// ── NodeRow ────────────────────────────────────────────────────────────────────

interface NodeRowProps {
  node: TimelineNode;
  isActive: boolean;
  isActiveBranch: boolean;
  showBranchButton: boolean;
  onSelect: () => void;
  onBranch: () => void;
}

function NodeRow({ node, isActive, isActiveBranch, showBranchButton, onSelect, onBranch }: NodeRowProps) {
  const [hovered, setHovered] = useState(false);
  const highlight = isActive && isActiveBranch;

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ listStyle: 'none' }}
    >
      <button
        onClick={onSelect}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '8px 12px',
          background: highlight ? '#2a2a4e' : hovered ? 'rgba(42,42,78,0.4)' : 'transparent',
          borderLeft: highlight ? '3px solid #7c6f9f' : '3px solid transparent',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          alignItems: 'flex-start',
          transition: 'background 0.15s',
          cursor: 'pointer',
          border: 'none',
          borderRight: 'none',
          borderTop: 'none',
          borderBottom: 'none',
        }}
      >
        <NodeThumbnail node={node} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '4px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: highlight ? 600 : 400,
              color: highlight ? '#e0e0e0' : '#aaa',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.blueprint.identity.name}
          </span>
          <span style={{ fontSize: '10px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.label}
          </span>
          <span style={{ fontSize: '10px', color: '#555' }}>
            {new Date(node.timestamp).toLocaleTimeString()}
          </span>
          {showBranchButton && hovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBranch();
              }}
              title="Branch from here"
              style={{
                alignSelf: 'flex-start',
                marginTop: '4px',
                background: '#2a2a4e',
                border: '1px solid #4a3f7e',
                color: '#c4b5fd',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              branch
            </button>
          )}
        </div>
      </button>
    </li>
  );
}

// ── BranchSection ──────────────────────────────────────────────────────────────

interface BranchSectionProps {
  branch: Branch;
  isActiveBranch: boolean;
  canBranch: boolean;
}

function BranchSection({ branch, isActiveBranch, canBranch }: BranchSectionProps) {
  const setActiveNode = useStore((s) => s.setActiveNode);
  const branchFrom = useStore((s) => s.branchFrom);
  const renameBranch = useStore((s) => s.renameBranch);
  const toggleBranchCollapse = useStore((s) => s.toggleBranchCollapse);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(branch.label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  // Keep rename value in sync when branch.label changes externally
  useEffect(() => {
    if (!renaming) setRenameValue(branch.label);
  }, [branch.label, renaming]);

  function confirmRename() {
    const trimmed = renameValue.trim();
    if (trimmed) renameBranch(branch.id, trimmed);
    else setRenameValue(branch.label);
    setRenaming(false);
  }

  const reversedNodes = [...branch.nodes].reverse();

  return (
    <div
      style={{
        borderBottom: '1px solid #2a2a4e',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          background: isActiveBranch ? '#1e1d3a' : '#16213e',
          borderLeft: isActiveBranch ? '3px solid #c4b5fd' : '3px solid transparent',
          gap: '6px',
        }}
      >
        <button
          onClick={() => toggleBranchCollapse(branch.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9c8fc0',
            cursor: 'pointer',
            fontSize: '12px',
            padding: '0',
            lineHeight: 1,
            flexShrink: 0,
          }}
          title={branch.collapsed ? 'Expand' : 'Collapse'}
        >
          {branch.collapsed ? '▸' : '▾'}
        </button>

        {renaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={confirmRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename();
              if (e.key === 'Escape') {
                setRenameValue(branch.label);
                setRenaming(false);
              }
            }}
            style={{
              flex: 1,
              background: '#0f0f1e',
              border: '1px solid #4a3f7e',
              color: '#e0e0e0',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '3px',
              padding: '2px 5px',
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              fontSize: '12px',
              fontWeight: 600,
              color: isActiveBranch ? '#c4b5fd' : '#9c8fc0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
            }}
          >
            {branch.label}
          </span>
        )}

        {!renaming && (
          <button
            onClick={() => {
              setRenameValue(branch.label);
              setRenaming(true);
            }}
            title="Rename branch"
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '0',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {'✎'}
          </button>
        )}
      </div>

      {/* Nodes or collapsed summary */}
      {branch.collapsed ? (
        <div
          style={{
            padding: '6px 12px',
            fontSize: '10px',
            color: '#555',
          }}
        >
          {branch.nodes.length} node{branch.nodes.length !== 1 ? 's' : ''}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0 }}>
          {reversedNodes.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              isActive={node.id === branch.activeNodeId}
              isActiveBranch={isActiveBranch}
              showBranchButton={canBranch}
              onSelect={() => setActiveNode(node.id)}
              onBranch={() => branchFrom(node.id, branch.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── TimelinePanel ──────────────────────────────────────────────────────────────

export function TimelinePanel() {
  const branches = useStore((s) => s.branches);
  const activeBranchId = useStore((s) => s.activeBranchId);

  const canBranch = branches.length < 4;

  return (
    <aside
      style={{
        width: '260px',
        minWidth: '220px',
        background: '#16213e',
        borderLeft: '1px solid #2a2a4e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
          flexShrink: 0,
        }}
      >
        TIMELINE
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {branches.map((branch) => (
          <BranchSection
            key={branch.id}
            branch={branch}
            isActiveBranch={branch.id === activeBranchId}
            canBranch={canBranch}
          />
        ))}
      </div>

      <div
        style={{
          padding: '8px 16px',
          borderTop: '1px solid #2a2a4e',
          fontSize: '11px',
          color: '#555',
          flexShrink: 0,
        }}
      >
        {branches.length} branch{branches.length !== 1 ? 'es' : ''}
        {' · '}
        {branches.reduce((acc, b) => acc + b.nodes.length, 0)} nodes
      </div>
    </aside>
  );
}
