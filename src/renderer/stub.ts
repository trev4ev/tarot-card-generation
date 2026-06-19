import Konva from 'konva';
import type { RendererAPI } from './types';
import type { Blueprint, ElementRef } from '../types/blueprint';

// ── helpers ──────────────────────────────────────────────────────────────────
const CARD_W = 300;
const CARD_H = 520;

function applyTitleCase(text: string, mode: Blueprint['typography']['titleCase']): string {
  switch (mode) {
    case 'upper':
      return text.toUpperCase();
    case 'title':
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

// ── renderer ─────────────────────────────────────────────────────────────────
export const rendererStub: RendererAPI = {
  render(blueprint: Blueprint, stage: Konva.Stage): void {
    // Clear existing layers
    stage.destroyChildren();

    const layer = new Konva.Layer();
    stage.add(layer);

    const { palette, typography, frame, background: bg, symbols, identity, footer, layout } = blueprint;

    // Background rect
    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width: CARD_W,
        height: CARD_H,
        fill: bg.baseColor,
        id: 'background',
      }),
    );

    // Frame border
    if (frame.style !== 'minimal') {
      layer.add(
        new Konva.Rect({
          x: frame.thickness / 2,
          y: frame.thickness / 2,
          width: CARD_W - frame.thickness,
          height: CARD_H - frame.thickness,
          stroke: frame.color ?? palette.border,
          strokeWidth: frame.thickness,
          fill: 'transparent',
          cornerRadius: frame.style === 'ornate' ? 8 : frame.style === 'gothic' ? 0 : 4,
          id: 'frame',
        }),
      );
    }

    // Illustration area background
    const ia = layout.illustrationArea;
    layer.add(
      new Konva.Rect({
        x: ia.x * CARD_W,
        y: ia.y * CARD_H,
        width: ia.width * CARD_W,
        height: ia.height * CARD_H,
        fill: palette.primaryAccent,
        opacity: 0.15,
        id: 'illustration-area',
      }),
    );

    // Symbols (rendered as colored circles as stubs)
    symbols.forEach((sym) => {
      const r = 20 * sym.scale;
      const g = layer.add(
        new Konva.Circle({
          x: sym.x * CARD_W,
          y: sym.y * CARD_H,
          radius: r,
          fill: palette.primaryAccent,
          opacity: sym.opacity,
          id: `symbol-${sym.id}`,
          name: `symbol::${sym.id}`,
          scaleX: sym.flipX ? -1 : 1,
          scaleY: sym.flipY ? -1 : 1,
        }),
      );
      // Label the symbol kind
      layer.add(
        new Konva.Text({
          x: sym.x * CARD_W - r,
          y: sym.y * CARD_H - 6,
          width: r * 2,
          text: sym.kind,
          fontSize: 9,
          align: 'center',
          fill: palette.text,
          opacity: sym.opacity,
          listening: false,
        }),
      );
      void g; // suppress unused var
    });

    // Title
    const titleText = applyTitleCase(identity.name, typography.titleCase);
    const titleY = layout.titlePosition === 'top'
      ? frame.thickness + frame.innerMargin
      : CARD_H - frame.thickness - frame.innerMargin - typography.titleSize - 4;

    layer.add(
      new Konva.Text({
        x: frame.thickness + frame.innerMargin,
        y: titleY,
        width: CARD_W - (frame.thickness + frame.innerMargin) * 2,
        text: titleText,
        fontSize: typography.titleSize,
        fontFamily: typography.fontFamily,
        fontStyle: typography.titleWeight === '700' ? 'bold' : 'normal',
        fill: palette.text,
        align: typography.titleAlign,
        letterSpacing: typography.letterSpacing,
        id: 'title',
      }),
    );

    // Footer
    if (footer.visible) {
      layer.add(
        new Konva.Text({
          x: frame.thickness + frame.innerMargin,
          y: CARD_H - frame.thickness - frame.innerMargin - footer.size - 4,
          width: CARD_W - (frame.thickness + frame.innerMargin) * 2,
          text: footer.text,
          fontSize: footer.size,
          fontFamily: footer.fontFamily,
          fill: palette.text,
          align: 'center',
          id: 'footer',
        }),
      );
    }

    // Archetype subtitle
    layer.add(
      new Konva.Text({
        x: frame.thickness + frame.innerMargin,
        y: titleY + typography.titleSize + 4,
        width: CARD_W - (frame.thickness + frame.innerMargin) * 2,
        text: identity.archetype,
        fontSize: typography.bodySize,
        fontFamily: typography.fontFamily,
        fill: palette.secondaryAccent,
        align: typography.titleAlign,
        letterSpacing: typography.letterSpacing * 0.5,
        id: 'archetype',
      }),
    );

    layer.batchDraw();
  },

  hitTest(x: number, y: number): ElementRef | null {
    // Stub: always returns null — real impl would use stage.getIntersection
    void x;
    void y;
    return null;
  },

  async renderThumbnail(blueprint: Blueprint): Promise<string> {
    // Create an off-screen stage for thumbnail rendering
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);

    const stage = new Konva.Stage({
      container,
      width: CARD_W,
      height: CARD_H,
    });

    rendererStub.render(blueprint, stage);

    const dataURL = stage.toDataURL({ pixelRatio: 0.5 });
    stage.destroy();
    document.body.removeChild(container);
    return dataURL;
  },
};
