export type FontEnum =
  | 'Cinzel'
  | 'IM Fell English'
  | 'UnifrakturMaguntia'
  | 'Metamorphous'
  | 'Pirata One'
  | 'Almendra'
  | 'Berkshire Swash'
  | 'Uncial Antiqua'
  | 'Cinzel Decorative'
  | 'Eater';

export type WeightEnum = '300' | '400' | '500' | '600' | '700';
export type FrameStyleEnum = 'simple' | 'ornate' | 'celtic' | 'gothic' | 'art-nouveau' | 'minimal' | 'double';
export type CornerMotifEnum = 'none' | 'fleur' | 'star' | 'spiral' | 'celtic-knot' | 'moon' | 'sun' | 'pentagram';
export type TextureEnum = 'none' | 'grain' | 'parchment' | 'canvas' | 'linen' | 'marble' | 'watercolor';
export type PatternEnum = 'none' | 'stars' | 'pentagrams' | 'circles' | 'diamonds' | 'waves' | 'vines' | 'runes';

export type SymbolDef = {
  id: string;
  kind: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
};

export type Blueprint = {
  id: string;
  identity: {
    name: string;
    archetype: string;
    number: number | null;
    suit: string | null;
  };
  palette: {
    background: string;
    primaryAccent: string;
    secondaryAccent: string;
    text: string;
    border: string;
  };
  typography: {
    fontFamily: FontEnum;
    titleSize: number;
    titleWeight: WeightEnum;
    bodySize: number;
    bodyWeight: WeightEnum;
    letterSpacing: number;
    titleCase: 'upper' | 'title' | 'asGenerated';
    titleAlign: 'left' | 'center' | 'right';
    titlePosition: 'top' | 'bottom' | 'overlay';
  };
  frame: {
    style: FrameStyleEnum;
    thickness: number;
    cornerMotif: CornerMotifEnum;
    color: string | null;
    innerMargin: number;
  };
  background: {
    baseColor: string;
    texture: TextureEnum;
    textureDensity: number;
    pattern: PatternEnum;
    patternOpacity: number;
  };
  symbols: SymbolDef[];
  footer: {
    text: string;
    fontFamily: FontEnum;
    size: number;
    visible: boolean;
  };
  layout: {
    titlePosition: 'top' | 'bottom';
    illustrationArea: { x: number; y: number; width: number; height: number };
  };
  mood: number;
};

export type DiffEntry = {
  path: string[];
  oldValue: unknown;
  newValue: unknown;
};

export type BlueprintDiff = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  entries: DiffEntry[];
  label: string;
};

export type TimelineNode = {
  id: string;
  blueprint: Blueprint;
  parentId: string | null;
  label: string;
  timestamp: number;
};

export type ElementRef =
  | { type: 'symbol'; symbolId: string }
  | { type: 'title' }
  | { type: 'footer' }
  | { type: 'frame' }
  | { type: 'background' };

export type Branch = {
  id: string;
  label: string;
  nodes: TimelineNode[];
  activeNodeId: string;
  collapsed: boolean;
  sourceNodeId: string | null;
  sourceBranchId: string | null;
};
