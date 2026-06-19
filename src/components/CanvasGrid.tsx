import { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage } from 'react-konva';
import { useStore } from '../store';
import { rendererStub } from '../renderer/stub';
import type { Branch, Blueprint, ElementRef } from '../types/blueprint';

const CARD_W = 300;
const CARD_H = 520;

// ── Selection overlay ──────────────────────────────────────────────────────────

function drawSelectionOnLayer(
  layer: Konva.Layer,
  el: ElementRef,
  blueprint: Blueprint,
): void {
  const { frame, footer, layout, typography } = blueprint;
  const innerLeft = frame.thickness + frame.innerMargin;
  const innerWidth = CARD_W - innerLeft * 2;

  const SEL_COLOR = '#c4b5fd';
  const DASH: number[] = [5, 4];

  if (el.type === 'symbol') {
    const sym = blueprint.symbols.find((s) => s.id === el.symbolId);
    if (!sym) return;
    const r = 28 * sym.scale * 1.4;
    const cx = sym.x * CARD_W;
    const cy = sym.y * CARD_H;
    layer.add(new Konva.Rect({
      x: cx - r, y: cy - r, width: r * 2, height: r * 2,
      stroke: SEL_COLOR, strokeWidth: 1.5, dash: DASH,
      cornerRadius: 3, listening: false,
    }));
    for (const [hx, hy] of [
      [cx - r, cy - r], [cx + r, cy - r],
      [cx - r, cy + r], [cx + r, cy + r],
    ] as [number, number][]) {
      layer.add(new Konva.Rect({
        x: hx - 3, y: hy - 3, width: 6, height: 6,
        fill: SEL_COLOR, cornerRadius: 1, listening: false,
      }));
    }
  } else if (el.type === 'title') {
    const lineH = typography.titleSize + 6;
    const titleY = layout.titlePosition === 'top'
      ? frame.thickness + frame.innerMargin
      : CARD_H - frame.thickness - frame.innerMargin - lineH - (footer.visible ? footer.size + 10 : 0);
    const titleH = typography.titleSize + typography.bodySize + 14;
    layer.add(new Konva.Rect({
      x: innerLeft - 4, y: titleY - 2,
      width: innerWidth + 8, height: titleH,
      stroke: SEL_COLOR, strokeWidth: 1.5, dash: DASH,
      cornerRadius: 3, listening: false,
    }));
  } else if (el.type === 'footer') {
    if (!footer.visible) return;
    const footerY = CARD_H - frame.thickness - frame.innerMargin - footer.size - 3;
    layer.add(new Konva.Rect({
      x: innerLeft - 4, y: footerY - 4,
      width: innerWidth + 8, height: footer.size + 10,
      stroke: SEL_COLOR, strokeWidth: 1.5, dash: DASH,
      cornerRadius: 3, listening: false,
    }));
  } else if (el.type === 'frame') {
    const t = frame.thickness;
    layer.add(new Konva.Rect({
      x: t / 2, y: t / 2,
      width: CARD_W - t, height: CARD_H - t,
      stroke: SEL_COLOR, strokeWidth: 2, dash: DASH,
      listening: false,
    }));
  } else if (el.type === 'background') {
    layer.add(new Konva.Rect({
      x: 2, y: 2, width: CARD_W - 4, height: CARD_H - 4,
      stroke: SEL_COLOR, strokeWidth: 1.5, dash: [4, 6],
      opacity: 0.5, listening: false,
    }));
  }
}

// ── EmptySlot ──────────────────────────────────────────────────────────────────

function EmptySlot({ slot }: { slot: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        border: '1px dashed #252545',
        borderRadius: '10px',
        textAlign: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        gap: '10px',
      }}
    >
      <div style={{ fontSize: '28px', color: '#2a2a4e', lineHeight: 1 }}>⊕</div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#3a3a5e', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Branch {slot + 1}
      </div>
      <div style={{ fontSize: '11px', color: '#2e2e50', lineHeight: 1.6, maxWidth: '120px' }}>
        Branch from a timeline node to open this slot
      </div>
    </div>
  );
}

// ── BranchCard ─────────────────────────────────────────────────────────────────

interface BranchCardProps {
  branch: Branch;
  blueprint: Blueprint;
  isActive: boolean;
  selectedElement: ElementRef | null;
  onActivate: () => void;
  onElementClick: (el: ElementRef | null) => void;
}

function BranchCard({ branch, blueprint, isActive, selectedElement, onActivate, onElementClick }: BranchCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const selLayerRef = useRef<Konva.Layer | null>(null);
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

  // Main blueprint render — always destroys all layers
  useEffect(() => {
    if (stageRef.current && blueprint) {
      rendererStub.render(blueprint, stageRef.current);
      selLayerRef.current = null; // destroyed by render's destroyChildren
    }
  }, [blueprint]);

  // Selection overlay — runs after main render when blueprint or selection changes
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (selLayerRef.current) {
      selLayerRef.current.destroy();
      selLayerRef.current = null;
    }

    if (!selectedElement || !blueprint) return;

    const selLayer = new Konva.Layer({ listening: false });
    selLayerRef.current = selLayer;
    stage.add(selLayer);
    drawSelectionOnLayer(selLayer, selectedElement, blueprint);
    selLayer.batchDraw();
  }, [selectedElement, blueprint]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    onActivate();
    const inner = innerRef.current;
    if (!inner || !blueprint) return;
    const rect = inner.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = (e.clientX - rect.left) * (CARD_W / rect.width);
    const y = (e.clientY - rect.top) * (CARD_H / rect.height);
    const hit = rendererStub.hitTest(x, y, blueprint);
    onElementClick(hit?.type === 'background' ? null : hit);
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
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
        ref={innerRef}
        style={{
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          borderRadius: '8px',
          overflow: 'hidden',
          transform: `scale(${scale}) translateZ(0)`,
          transformOrigin: 'center center',
          flexShrink: 0,
          width: CARD_W,
          height: CARD_H,
        }}
      >
        <Stage
          width={CARD_W}
          height={CARD_H}
          ref={(node) => { stageRef.current = node; }}
        />
        {blueprint.illustration && (() => {
          const ia = blueprint.layout.illustrationArea;
          return (
            <img
              key={blueprint.illustration}
              src={`/illustrations/${blueprint.illustration}.png`}
              alt={blueprint.illustration}
              style={{
                position: 'absolute',
                left: `${ia.x * 100}%`,
                top: `${ia.y * 100}%`,
                width: `${ia.width * 100}%`,
                height: `${ia.height * 100}%`,
                objectFit: 'cover',
                pointerEvents: 'none',
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          );
        })()}
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
  const selectedElement = useStore((s) => s.selectedElement);
  const setSelectedElement = useStore((s) => s.setSelectedElement);

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
          return <EmptySlot key={`empty-${i}`} slot={i} />;
        }
        const activeNode = branch.nodes.find((n) => n.id === branch.activeNodeId);
        if (!activeNode) {
          return <EmptySlot key={branch.id} slot={i} />;
        }
        const isActive = branch.id === activeBranchId;
        return (
          <BranchCard
            key={branch.id}
            branch={branch}
            blueprint={activeNode.blueprint}
            isActive={isActive}
            selectedElement={isActive ? selectedElement : null}
            onActivate={() => setActiveBranch(branch.id)}
            onElementClick={(el) => setSelectedElement(el)}
          />
        );
      })}
    </div>
  );
}
