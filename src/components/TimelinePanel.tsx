import { useEffect, useRef, useState } from 'react';
import { useStore, MAX_BRANCHES } from '../store';
import { rendererStub } from '../renderer/stub';
import { SLOT_COLORS } from '../slotColors';
import type { Branch, TimelineNode } from '../types/blueprint';

// ── Thumbnail cache ───────────────────────────────────────────────────────────
const thumbnailCache = new Map<string, string>();

// ── NodeThumbnail ─────────────────────────────────────────────────────────────

function NodeThumbnail({ node, width, height }: { node: TimelineNode; width: number; height: number }) {
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
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [node.blueprint]);

  return (
    <div
      style={{
        width,
        height,
        flexShrink: 0,
        background: '#0f0f1e',
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid #2a2a4e',
      }}
    >
      {src ? (
        <img src={src} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <span style={{ fontSize: 7, color: '#444' }}>···</span>
        </div>
      )}
    </div>
  );
}

// ── HorizontalNodeCard ────────────────────────────────────────────────────────

interface HorizontalNodeCardProps {
  node: TimelineNode;
  branchId: string;
  isActive: boolean;
  isActiveBranch: boolean;
  showBranchButton: boolean;
  slotColor: string;
  onSelect: () => void;
  onBranch: () => void;
}

const THUMB_W = 34;
const THUMB_H = 58;

function HorizontalNodeCard({
  node,
  branchId,
  isActive,
  isActiveBranch,
  showBranchButton,
  slotColor,
  onSelect,
  onBranch,
}: HorizontalNodeCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const highlight = isActive && isActiveBranch;
  const showOverlay = hovered && showBranchButton;

  // Scroll into view when this node becomes the active one
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  return (
    <div
      ref={cardRef}
      draggable
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        cursor: 'grab',
        padding: '0 3px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData(
          'application/x-tarot-node',
          JSON.stringify({ fromBranchId: branchId, nodeId: node.id })
        );
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div
        style={{
          border: highlight
            ? `2px solid ${slotColor}`
            : hovered
            ? '2px solid #3a3a5e'
            : '2px solid transparent',
          borderRadius: 4,
          position: 'relative',
          flexShrink: 0,
          transition: 'border-color 0.12s',
        }}
      >
        <NodeThumbnail node={node} width={THUMB_W} height={THUMB_H} />

        {/* Hover action overlay */}
        {showOverlay && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8, 8, 24, 0.82)',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '3px',
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onBranch(); }}
              title="Branch from here"
              style={{
                background: '#2a2a4e',
                border: '1px solid #4a3f7e',
                color: '#c4b5fd',
                borderRadius: 2,
                padding: '2px 0',
                fontSize: 8,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              ⎇ branch
            </button>
          </div>
        )}
      </div>

      {/* Active indicator dot */}
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: highlight ? slotColor : 'transparent', flexShrink: 0 }} />

      {/* Node label */}
      <div
        style={{
          fontSize: 7,
          color: highlight ? '#bbb' : '#555',
          maxWidth: THUMB_W + 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        {node.label}
      </div>
    </div>
  );
}

// ── HorizontalBranchRow ───────────────────────────────────────────────────────

interface HorizontalBranchRowProps {
  branch: Branch;
  slotIndex: number;
  isActiveBranch: boolean;
  canBranch: boolean;
}

function HorizontalBranchRow({ branch, slotIndex, isActiveBranch, canBranch }: HorizontalBranchRowProps) {
  const setActiveNode = useStore((s) => s.setActiveNode);
  const branchFrom = useStore((s) => s.branchFrom);
  const renameBranch = useStore((s) => s.renameBranch);
  const insertEditAt = useStore((s) => s.insertEditAt);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(branch.label);
  const [dragOverInsertAfterIdx, setDragOverInsertAfterIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const color = SLOT_COLORS[slotIndex] ?? '#9c8fc0';

  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  useEffect(() => {
    if (!renaming) setRenameValue(branch.label);
  }, [branch.label, renaming]);

  // Clear drop highlight when any drag ends globally
  useEffect(() => {
    function handleDragEnd() { setDragOverInsertAfterIdx(null); }
    window.addEventListener('dragend', handleDragEnd);
    return () => window.removeEventListener('dragend', handleDragEnd);
  }, []);

  function confirmRename() {
    const trimmed = renameValue.trim();
    if (trimmed) renameBranch(branch.id, trimmed);
    else setRenameValue(branch.label);
    setRenaming(false);
  }

  function handleDrop(e: React.DragEvent, insertAfterNodeId: string) {
    e.preventDefault();
    setDragOverInsertAfterIdx(null);
    const raw = e.dataTransfer.getData('application/x-tarot-node');
    if (!raw) return;
    try {
      const { fromBranchId, nodeId } = JSON.parse(raw) as { fromBranchId: string; nodeId: string };
      if (fromBranchId === branch.id) return;
      insertEditAt(fromBranchId, nodeId, branch.id, insertAfterNodeId);
    } catch { /* ignore malformed drag data */ }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 86,
        borderTop: '1px solid #2a2a4e',
        background: isActiveBranch ? 'rgba(26, 22, 50, 0.7)' : 'transparent',
      }}
    >
      {/* Left: branch identity (fixed width, non-scrolling) */}
      <div
        style={{
          width: 140,
          flexShrink: 0,
          borderLeft: `3px solid ${color}`,
          borderRight: '1px solid #2a2a4e',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        {/* Canvas slot label */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Canvas {slotIndex + 1}
        </div>

        {/* Branch name — editable */}
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
              background: '#0f0f1e',
              border: '1px solid #4a3f7e',
              color: '#e0e0e0',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 3,
              padding: '2px 4px',
            }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                flex: 1,
                fontSize: 11,
                fontWeight: 600,
                color: isActiveBranch ? '#e0e0e0' : '#aaa',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {branch.label}
            </span>
            <button
              onClick={() => { setRenameValue(branch.label); setRenaming(true); }}
              title="Rename branch"
              style={{
                background: 'none',
                border: 'none',
                color: '#444',
                cursor: 'pointer',
                fontSize: 10,
                padding: 0,
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              ✎
            </button>
          </div>
        )}

        {/* Node count */}
        <div style={{ fontSize: 9, color: '#555' }}>
          {branch.nodes.length} node{branch.nodes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Right: horizontally scrollable node list, oldest → newest left-to-right */}
      <div
        style={{
          flex: 1,
          overflowX: 'auto',
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          gap: 0,
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverInsertAfterIdx(null);
          }
        }}
      >
        {branch.nodes.flatMap((node, i) => {
          const isDropActive = dragOverInsertAfterIdx === i;
          return [
            <HorizontalNodeCard
              key={node.id}
              node={node}
              branchId={branch.id}
              isActive={node.id === branch.activeNodeId}
              isActiveBranch={isActiveBranch}
              showBranchButton={canBranch}
              slotColor={color}
              onSelect={() => setActiveNode(node.id)}
              onBranch={() => branchFrom(node.id, branch.id)}
            />,
            // Drop zone after each node (including last = append to end)
            <div
              key={`dz-${node.id}`}
              style={{
                width: 14,
                alignSelf: 'stretch',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onDragEnter={(e) => { e.preventDefault(); setDragOverInsertAfterIdx(i); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverInsertAfterIdx(i); }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverInsertAfterIdx((prev) => (prev === i ? null : prev));
                }
              }}
              onDrop={(e) => handleDrop(e, node.id)}
            >
              <div
                style={{
                  width: 2,
                  height: 38,
                  borderRadius: 1,
                  background: isDropActive ? '#6ee7b7' : 'rgba(90, 80, 140, 0.25)',
                  transition: 'background 0.1s',
                }}
              />
            </div>,
          ];
        })}
      </div>
    </div>
  );
}

// ── TimelinePanel ──────────────────────────────────────────────────────────────

export function TimelinePanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const branches = useStore((s) => s.branches);
  const activeBranchId = useStore((s) => s.activeBranchId);

  const canBranch = branches.length < MAX_BRANCHES;
  const totalNodes = branches.reduce((acc, b) => acc + b.nodes.length, 0);

  // ── Collapsed strip ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <div
        style={{
          height: 28,
          flexShrink: 0,
          background: '#16213e',
          borderTop: '1px solid #2a2a4e',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 600, color: '#9c8fc0', letterSpacing: '0.08em' }}>
          TIMELINE
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#444' }}>
          {branches.length} branch{branches.length !== 1 ? 'es' : ''} · {totalNodes} node{totalNodes !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onToggle}
          title="Expand timeline"
          style={{
            background: 'none',
            border: 'none',
            color: '#555',
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ▲
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#16213e',
        borderTop: '1px solid #2a2a4e',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 16px',
          borderBottom: '1px solid #2a2a4e',
          flexShrink: 0,
          background: '#111928',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9c8fc0', letterSpacing: '0.08em' }}>
          TIMELINE
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, color: '#555' }}>
            {branches.length} branch{branches.length !== 1 ? 'es' : ''}
            {' · '}
            {totalNodes} node{totalNodes !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onToggle}
            title="Collapse timeline"
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ▼
          </button>
        </div>
      </div>

      {/* One row per existing branch — rows only appear when the branch exists */}
      {branches.map((branch, i) => (
        <HorizontalBranchRow
          key={branch.id}
          branch={branch}
          slotIndex={i}
          isActiveBranch={branch.id === activeBranchId}
          canBranch={canBranch}
        />
      ))}
    </div>
  );
}
