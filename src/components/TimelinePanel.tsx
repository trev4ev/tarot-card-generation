import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
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

interface TransferTarget {
  id: string;
  label: string;
}

interface HorizontalNodeCardProps {
  node: TimelineNode;
  isActive: boolean;
  isActiveBranch: boolean;
  showBranchButton: boolean;
  transferTargets: TransferTarget[];
  slotColor: string;
  onSelect: () => void;
  onBranch: () => void;
  onTransfer: (toBranchId: string) => void;
}

const THUMB_W = 34;
const THUMB_H = 58;

function HorizontalNodeCard({
  node,
  isActive,
  isActiveBranch,
  showBranchButton,
  transferTargets,
  slotColor,
  onSelect,
  onBranch,
  onTransfer,
}: HorizontalNodeCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const highlight = isActive && isActiveBranch;
  const canTransfer = transferTargets.length > 0;
  const showOverlay = hovered && (showBranchButton || canTransfer);

  // Scroll into view when this node becomes the active one
  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  return (
    <div
      ref={cardRef}
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        cursor: 'pointer',
        padding: '0 3px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
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

        {/* Hover action overlay — rendered inside the thumbnail so no clipping */}
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
            {showBranchButton && (
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
            )}
            {canTransfer && transferTargets.map((t) => (
              <button
                key={t.id}
                onClick={(e) => { e.stopPropagation(); onTransfer(t.id); }}
                title={`Send to ${t.label}`}
                style={{
                  background: '#1a3a28',
                  border: '1px solid #2a5a3a',
                  color: '#6ee7b7',
                  borderRadius: 2,
                  padding: '2px 0',
                  fontSize: 7,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                → {t.label.length > 6 ? t.label.substring(0, 5) + '…' : t.label}
              </button>
            ))}
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
  allBranches: Branch[];
}

function HorizontalBranchRow({ branch, slotIndex, isActiveBranch, canBranch, allBranches }: HorizontalBranchRowProps) {
  const setActiveNode = useStore((s) => s.setActiveNode);
  const branchFrom = useStore((s) => s.branchFrom);
  const renameBranch = useStore((s) => s.renameBranch);
  const transferEdit = useStore((s) => s.transferEdit);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(branch.label);
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

  function confirmRename() {
    const trimmed = renameValue.trim();
    if (trimmed) renameBranch(branch.id, trimmed);
    else setRenameValue(branch.label);
    setRenaming(false);
  }

  const transferTargets = allBranches
    .filter((b) => b.id !== branch.id)
    .map((b) => ({ id: b.id, label: b.label }));

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
          gap: 4,
        }}
      >
        {branch.nodes.map((node) => {
          const parentInBranch =
            node.parentId !== null &&
            branch.nodes.some((n) => n.id === node.parentId);
          return (
            <HorizontalNodeCard
              key={node.id}
              node={node}
              isActive={node.id === branch.activeNodeId}
              isActiveBranch={isActiveBranch}
              showBranchButton={canBranch}
              transferTargets={parentInBranch ? transferTargets : []}
              slotColor={color}
              onSelect={() => setActiveNode(node.id)}
              onBranch={() => branchFrom(node.id, branch.id)}
              onTransfer={(toBranchId) => transferEdit(branch.id, node.id, toBranchId)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── TimelinePanel ──────────────────────────────────────────────────────────────

export function TimelinePanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const branches = useStore((s) => s.branches);
  const activeBranchId = useStore((s) => s.activeBranchId);

  const canBranch = branches.length < 4;
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
        <button
          onClick={onToggle}
          title="Expand timeline"
          style={{
            background: 'none',
            border: 'none',
            color: '#9c8fc0',
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ▲
        </button>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#555', letterSpacing: '0.08em' }}>
          TIMELINE
        </span>
        <span style={{ fontSize: 10, color: '#444' }}>
          {branches.length} branch{branches.length !== 1 ? 'es' : ''} · {totalNodes} node{totalNodes !== 1 ? 's' : ''}
        </span>
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
            {' · '}
            <span style={{ color: '#444' }}>⌘Z undo</span>
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
          allBranches={branches}
        />
      ))}
    </div>
  );
}
