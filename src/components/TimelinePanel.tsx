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
  isActive: boolean;
  isActiveBranch: boolean;
  isSelected: boolean;
  showBranchButton: boolean;
  slotColor: string;
  onSelect: () => void;
  onBranch: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  nodeRef: (el: HTMLDivElement | null) => void;
}

const THUMB_W = 34;
const THUMB_H = 58;

function HorizontalNodeCard({
  node,
  isActive,
  isActiveBranch,
  isSelected,
  showBranchButton,
  slotColor,
  onSelect,
  onBranch,
  onDragStart,
  nodeRef,
}: HorizontalNodeCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const highlight = isActive && isActiveBranch;
  const showOverlay = hovered && showBranchButton && !isSelected;

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [isActive]);

  const borderColor = highlight
    ? slotColor
    : isSelected
    ? '#6ee7b7'
    : hovered
    ? '#3a3a5e'
    : 'transparent';

  return (
    <div
      ref={(el) => { cardRef.current = el; nodeRef(el); }}
      data-node-card="true"
      draggable
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        cursor: isSelected ? 'grab' : 'pointer',
        padding: '0 3px',
        userSelect: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      onDragStart={onDragStart}
    >
      <div
        style={{
          border: `2px solid ${borderColor}`,
          borderRadius: 4,
          position: 'relative',
          flexShrink: 0,
          transition: 'border-color 0.12s',
        }}
      >
        <NodeThumbnail node={node} width={THUMB_W} height={THUMB_H} />

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

      <div
        style={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: highlight ? slotColor : isSelected ? '#6ee7b7' : 'transparent',
          flexShrink: 0,
        }}
      />

      <div
        style={{
          fontSize: 7,
          color: highlight ? '#bbb' : isSelected ? '#6ee7b7' : '#555',
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
  const insertEditsAt = useStore((s) => s.insertEditsAt);

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(branch.label);
  const [dragOverInsertAfterIdx, setDragOverInsertAfterIdx] = useState<number | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<ReadonlySet<string>>(new Set());
  // marquee: x coords relative to scrollable content (accounts for scrollLeft)
  const [marquee, setMarquee] = useState<{ startX: number; endX: number } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const nodeElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Non-stale ref to marquee.startX for use inside event handler effects
  const marqueeStartXRef = useRef<number | null>(null);

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

  // Global mousemove/mouseup for marquee selection
  useEffect(() => {
    if (!marquee) return;

    function onMouseMove(e: MouseEvent) {
      const startX = marqueeStartXRef.current;
      if (startX === null) return;
      const container = scrollContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      setMarquee({ startX, endX: x });

      const selLeft = Math.min(startX, x);
      const selRight = Math.max(startX, x);
      const newSel = new Set<string>();
      for (const [nodeId, el] of nodeElRefs.current) {
        const elRect = el.getBoundingClientRect();
        const elLeft = elRect.left - rect.left + container.scrollLeft;
        const elRight = elLeft + elRect.width;
        if (elRight > selLeft && elLeft < selRight) newSel.add(nodeId);
      }
      setSelectedNodeIds(newSel);
    }

    function onMouseUp(e: MouseEvent) {
      // A tiny movement = click on background → clear selection
      const startX = marqueeStartXRef.current ?? 0;
      const container = scrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left + container.scrollLeft;
        if (Math.abs(x - startX) < 4) setSelectedNodeIds(new Set());
      }
      marqueeStartXRef.current = null;
      setMarquee(null);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [marquee !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selection and drop highlight when any drag ends
  useEffect(() => {
    function handleDragEnd() {
      setDragOverInsertAfterIdx(null);
      setSelectedNodeIds(new Set());
    }
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
      const { fromBranchId, nodeIds } = JSON.parse(raw) as { fromBranchId: string; nodeIds: string[] };
      if (fromBranchId === branch.id) return;
      insertEditsAt(fromBranchId, nodeIds, branch.id, insertAfterNodeId);
    } catch { /* ignore malformed drag data */ }
  }

  function buildDragStart(node: TimelineNode) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.stopPropagation();
      // If this node is part of a multi-selection, drag the whole selection
      const nodeIds = selectedNodeIds.has(node.id) && selectedNodeIds.size > 1
        ? [...selectedNodeIds]
        : [node.id];
      e.dataTransfer.setData(
        'application/x-tarot-node',
        JSON.stringify({ fromBranchId: branch.id, nodeIds })
      );
      e.dataTransfer.effectAllowed = 'copy';
    };
  }

  const selCount = selectedNodeIds.size;

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
        <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Canvas {slotIndex + 1}
        </div>

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

        <div style={{ fontSize: 9, color: selCount > 1 ? '#6ee7b7' : '#555' }}>
          {selCount > 1 ? `${selCount} selected` : `${branch.nodes.length} node${branch.nodes.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Right: horizontally scrollable node list */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowX: 'auto',
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          gap: 0,
          position: 'relative',
          userSelect: 'none',
        }}
        onMouseDown={(e) => {
          // Only start marquee on background clicks (not on node cards)
          const target = e.target as HTMLElement;
          if (target.closest('[data-node-card]')) return;
          e.preventDefault();
          const container = e.currentTarget;
          const rect = container.getBoundingClientRect();
          const x = e.clientX - rect.left + container.scrollLeft;
          marqueeStartXRef.current = x;
          setMarquee({ startX: x, endX: x });
          setSelectedNodeIds(new Set());
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverInsertAfterIdx(null);
          }
        }}
      >
        {/* Marquee selection rectangle */}
        {marquee && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: Math.min(marquee.startX, marquee.endX),
              width: Math.abs(marquee.endX - marquee.startX),
              background: 'rgba(110, 231, 183, 0.1)',
              border: '1px solid rgba(110, 231, 183, 0.45)',
              borderRadius: 2,
              pointerEvents: 'none',
              zIndex: 8,
            }}
          />
        )}

        {branch.nodes.flatMap((node, i) => {
          const isDropActive = dragOverInsertAfterIdx === i;
          return [
            <HorizontalNodeCard
              key={node.id}
              node={node}
              isActive={node.id === branch.activeNodeId}
              isActiveBranch={isActiveBranch}
              isSelected={selectedNodeIds.has(node.id)}
              showBranchButton={canBranch}
              slotColor={color}
              onSelect={() => setActiveNode(node.id)}
              onBranch={() => branchFrom(node.id, branch.id)}
              onDragStart={buildDragStart(node)}
              nodeRef={(el) => {
                if (el) nodeElRefs.current.set(node.id, el);
                else nodeElRefs.current.delete(node.id);
              }}
            />,
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
