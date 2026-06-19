import { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage } from 'react-konva';
import { useStore } from '../store';
import { rendererStub } from '../renderer/stub';
import type { Branch, Blueprint } from '../types/blueprint';

const CARD_W = 300;
const CARD_H = 520;

// ── EmptySlot ──────────────────────────────────────────────────────────────────

function EmptySlot() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        border: '2px dashed #2a2a4e',
        borderRadius: '8px',
        color: '#4a4a6e',
        fontSize: '13px',
        textAlign: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      Branch from timeline →
    </div>
  );
}

// ── BranchCard ─────────────────────────────────────────────────────────────────

interface BranchCardProps {
  branch: Branch;
  blueprint: Blueprint;
  isActive: boolean;
  onActivate: () => void;
}

function BranchCard({ branch, blueprint, isActive, onActivate }: BranchCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const newScale = Math.min((width - 16) / CARD_W, (height - 16) / CARD_H);
      setScale(Math.max(newScale, 0.1));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (stageRef.current && blueprint) {
      rendererStub.render(blueprint, stageRef.current);
    }
  }, [blueprint]);

  return (
    <div
      ref={containerRef}
      onClick={onActivate}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'pointer',
        border: isActive ? '2px solid #7c6f9f' : '2px solid transparent',
        borderRadius: '10px',
        boxSizing: 'border-box',
        outline: isActive ? '1px solid #c4b5fd' : 'none',
        transition: 'border-color 0.15s, outline 0.15s',
      }}
    >
      <div
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          borderRadius: '8px',
          overflow: 'hidden',
          transform: `scale(${scale}) translateZ(0)`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        <Stage
          width={CARD_W}
          height={CARD_H}
          ref={(node) => {
            stageRef.current = node;
          }}
        />
      </div>

      {/* Branch label overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: isActive ? 600 : 400,
          color: isActive ? '#c4b5fd' : '#9c8fc0',
          background: 'rgba(19,18,42,0.7)',
          borderRadius: '4px',
          padding: '2px 6px',
          pointerEvents: 'none',
        }}
      >
        {branch.label}
      </div>
    </div>
  );
}

// ── CanvasGrid ─────────────────────────────────────────────────────────────────

export function CanvasGrid() {
  const branches = useStore((s) => s.branches);
  const activeBranchId = useStore((s) => s.activeBranchId);
  const setActiveBranch = useStore((s) => s.setActiveBranch);

  const slots = Array.from({ length: 4 }, (_, i) => branches[i] ?? null);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        width: '100%',
        height: '100%',
        gap: '12px',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {slots.map((branch, i) => {
        if (!branch) {
          return <EmptySlot key={`empty-${i}`} />;
        }
        const activeNode = branch.nodes.find((n) => n.id === branch.activeNodeId);
        if (!activeNode) {
          return <EmptySlot key={branch.id} />;
        }
        return (
          <BranchCard
            key={branch.id}
            branch={branch}
            blueprint={activeNode.blueprint}
            isActive={branch.id === activeBranchId}
            onActivate={() => setActiveBranch(branch.id)}
          />
        );
      })}
    </div>
  );
}
