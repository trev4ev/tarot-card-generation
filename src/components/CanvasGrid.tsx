import { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage } from 'react-konva';
import { useStore } from '../store';
import { rendererStub } from '../renderer/stub';
import { SLOT_COLORS } from '../slotColors';
import type { Branch, Blueprint, ElementRef, SymbolDef } from '../types/blueprint';

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

// ── BranchCard ─────────────────────────────────────────────────────────────────

interface BranchCardProps {
  branch: Branch;
  blueprint: Blueprint;
  isActive: boolean;
  slotIndex: number;
  selectedElement: ElementRef | null;
  onActivate: () => void;
  onElementClick: (el: ElementRef | null) => void;
  onSymbolDragLive: (symbols: SymbolDef[]) => void;
  onSymbolDragCommit: (symbolId: string, x: number, y: number) => void;
}

function BranchCard({
  branch, blueprint, isActive, slotIndex, selectedElement,
  onActivate, onElementClick, onSymbolDragLive, onSymbolDragCommit,
}: BranchCardProps) {
  const slotColor = SLOT_COLORS[slotIndex] ?? '#7c6f9f';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const selLayerRef = useRef<Konva.Layer | null>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Stable refs so window listeners always see the latest values
  const blueprintRef = useRef(blueprint);
  blueprintRef.current = blueprint;
  const onSymbolDragLiveRef = useRef(onSymbolDragLive);
  onSymbolDragLiveRef.current = onSymbolDragLive;
  const onSymbolDragCommitRef = useRef(onSymbolDragCommit);
  onSymbolDragCommitRef.current = onSymbolDragCommit;
  const onElementClickRef = useRef(onElementClick);
  onElementClickRef.current = onElementClick;

  // Drag tracking
  const draggingRef = useRef<{
    symbolId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const hasDraggedRef = useRef(false);

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

  // Main blueprint render
  useEffect(() => {
    if (stageRef.current && blueprint) {
      rendererStub.render(blueprint, stageRef.current);
      selLayerRef.current = null;
    }
  }, [blueprint]);

  // Selection overlay
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

  // Window-level drag handlers (stable, use refs to access latest state)
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag || !innerRef.current) return;
      const rect = innerRef.current.getBoundingClientRect();
      const dx = (e.clientX - drag.startClientX) / rect.width;
      const dy = (e.clientY - drag.startClientY) / rect.height;
      if (!hasDraggedRef.current && Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005) return;
      hasDraggedRef.current = true;
      const newX = Math.max(0, Math.min(1, drag.origX + dx));
      const newY = Math.max(0, Math.min(1, drag.origY + dy));
      const symbols = blueprintRef.current.symbols.map((s) =>
        s.id === drag.symbolId ? { ...s, x: newX, y: newY } : s
      );
      onSymbolDragLiveRef.current(symbols);
    }

    function handleMouseUp(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      if (hasDraggedRef.current && innerRef.current) {
        const rect = innerRef.current.getBoundingClientRect();
        const dx = (e.clientX - drag.startClientX) / rect.width;
        const dy = (e.clientY - drag.startClientY) / rect.height;
        const newX = Math.max(0, Math.min(1, drag.origX + dx));
        const newY = Math.max(0, Math.min(1, drag.origY + dy));
        onSymbolDragCommitRef.current(drag.symbolId, newX, newY);
      } else {
        // No significant movement: treat as a click to select
        onElementClickRef.current({ type: 'symbol', symbolId: drag.symbolId });
      }
      draggingRef.current = null;
      hasDraggedRef.current = false;
      setIsDragging(false);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    onActivate();
    const inner = innerRef.current;
    if (!inner || !blueprint) return;
    const rect = inner.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = (e.clientX - rect.left) * (CARD_W / rect.width);
    const y = (e.clientY - rect.top) * (CARD_H / rect.height);
    const hit = rendererStub.hitTest(x, y, blueprint);

    if (hit?.type === 'symbol') {
      const sym = blueprint.symbols.find((s) => s.id === hit.symbolId);
      if (sym) {
        draggingRef.current = {
          symbolId: hit.symbolId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          origX: sym.x,
          origY: sym.y,
        };
        hasDraggedRef.current = false;
        setIsDragging(true);
        e.preventDefault();
        return;
      }
    }

    // Non-symbol: select immediately
    onElementClick(hit?.type === 'background' ? null : hit ?? null);
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'pointer',
        border: isActive ? `2px solid ${slotColor}` : '2px solid transparent',
        borderRadius: '10px',
        boxSizing: 'border-box',
        outline: isActive ? '1px solid #c4b5fd' : 'none',
        transition: 'border-color 0.15s, outline 0.15s',
        userSelect: isDragging ? 'none' : undefined,
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
          color: isActive ? slotColor : '#9c8fc0',
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
  const updateLiveBlueprint = useStore((s) => s.updateLiveBlueprint);
  const updateSymbol = useStore((s) => s.updateSymbol);

  // Only render canvases for branches that actually exist — unused canvases stay
  // hidden (like the timeline rows) and the active ones sit side by side.
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        width: '100%',
        height: '100%',
        gap: '12px',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {branches.map((branch, i) => {
        const activeNode = branch.nodes.find((n) => n.id === branch.activeNodeId);
        if (!activeNode) return null;
        const isActive = branch.id === activeBranchId;
        return (
          <div key={branch.id} style={{ flex: 1, minWidth: 0, height: '100%' }}>
            <BranchCard
              branch={branch}
              blueprint={activeNode.blueprint}
              isActive={isActive}
              slotIndex={i}
              selectedElement={isActive ? selectedElement : null}
              onActivate={() => setActiveBranch(branch.id)}
              onElementClick={(el) => setSelectedElement(el)}
              onSymbolDragLive={(symbols) => updateLiveBlueprint({ symbols })}
              onSymbolDragCommit={(symbolId, x, y) => updateSymbol(symbolId, { x, y })}
            />
          </div>
        );
      })}
    </div>
  );
}
