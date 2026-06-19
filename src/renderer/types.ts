import type Konva from 'konva';
import type { Blueprint, ElementRef } from '../types/blueprint';

export interface RendererAPI {
  render(blueprint: Blueprint, stage: Konva.Stage): void;
  hitTest(x: number, y: number): ElementRef | null;
  renderThumbnail(blueprint: Blueprint): Promise<string>;
}
