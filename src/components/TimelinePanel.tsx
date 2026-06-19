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

interface TransferTarget {
  id: string;
  label: string;
}

interface NodeRowProps {
  node: TimelineNode;
  isActive: boolean;
  isActiveBranch: boolean;
  showBranchButton: boolean;
  transferTargets: TransferTarget[];
  onSelect: () => void;
  onBranch: () => void;
  onTransfer: (toBranchId: string) => void;
}

function NodeRow({
  node, isActive, isActiveBranch, showBranchButton,
  transferTargets, onSelect, onBranch, onTransfer,
}: NodeRowProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const liRef = useRef<HTMLLIElement | null>(null);
  const highlight = isActive && isActiveBranch;
  const canTransfer = transferTargets.length > 0;

  // Auto-scroll into view when this node becomes active
  useEffect(() => {
    if (isActive && liRef.current) {
      liRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  return (
    <li
      ref={liRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); }}
      style={{ listStyle: 'none', position: 'relative' }}
    >
      {/* Select row — no nested interactive elements so clicks reach buttons below */}
      <div
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
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
        </div>
      </div>

      {/* Hover actions — sibling of select row so buttons are not nested in a button */}
      {hovered && (showBranchButton || canTransfer) && (
        <div style={{ display: 'flex', gap: '4px', padding: '0 12px 6px 68px' }}>
          {showBranchButton && (
            <button
              onClick={(e) => { e.stopPropagation(); onBranch(); }}
              title="Branch from here"
              style={{
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
          {canTransfer && (
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              title="Send this edit to another branch"
              style={{
                background: '#1e3a2a',
                border: '1px solid #2e6a4a',
                color: '#6ee7b7',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              ↗ send
            </button>
          )}
        </div>
      )}

      {/* Transfer dropdown */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            right: 8,
            top: '100%',
            zIndex: 50,
            background: '#0f1a2e',
            border: '1px solid #2e6a4a',
            borderRadius: '5px',
            padding: '4px 0',
            minWidth: '120px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ padding: '4px 10px 6px', fontSize: '9px', color: '#4a9a7a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Send edit to
          </div>
          {transferTargets.map((t) => (
            <button
              key={t.id}
              onClick={(e) => {
                e.stopPropagation();
                onTransfer(t.id);
                setMenuOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '5px 10px',
                background: 'transparent',
                border: 'none',
                color: '#a7f3d0',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1a3a2a'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

// ── BranchSection ──────────────────────────────────────────────────────────────

interface BranchSectionProps {
  branch: Branch;
  isActiveBranch: boolean;
  canBranch: boolean;
  allBranches: Branch[];
}

function BranchSection({ branch, isActiveBranch, canBranch, allBranches }: BranchSectionProps) {
  const setActiveNode = useStore((s) => s.setActiveNode);
  const branchFrom = useStore((s) => s.branchFrom);
  const renameBranch = useStore((s) => s.renameBranch);
  const toggleBranchCollapse = useStore((s) => s.toggleBranchCollapse);
  const transferEdit = useStore((s) => s.transferEdit);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(branch.label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

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
  const transferTargets = allBranches
    .filter((b) => b.id !== branch.id)
    .map((b) => ({ id: b.id, label: b.label }));

  return (
    <div style={{ borderBottom: '1px solid #2a2a4e' }}>
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
              if (e.key === 'Escape') { setRenameValue(branch.label); setRenaming(false); }
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
            onClick={() => { setRenameValue(branch.label); setRenaming(true); }}
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

      {/* Nodes */}
      {branch.collapsed ? (
        <div style={{ padding: '6px 12px', fontSize: '10px', color: '#555' }}>
          {branch.nodes.length} node{branch.nodes.length !== 1 ? 's' : ''}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0 }}>
          {reversedNodes.map((node) => {
            // Only show transfer if node's parent is within this same branch
            const parentInBranch = node.parentId !== null &&
              branch.nodes.some((n) => n.id === node.parentId);
            return (
              <NodeRow
                key={node.id}
                node={node}
                isActive={node.id === branch.activeNodeId}
                isActiveBranch={isActiveBranch}
                showBranchButton={canBranch}
                transferTargets={parentInBranch ? transferTargets : []}
                onSelect={() => setActiveNode(node.id)}
                onBranch={() => branchFrom(node.id, branch.id)}
                onTransfer={(toBranchId) => transferEdit(branch.id, node.id, toBranchId)}
              />
            );
          })}
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
            allBranches={branches}
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
