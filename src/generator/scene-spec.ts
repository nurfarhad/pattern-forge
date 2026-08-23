// Shared, renderer-agnostic data contract from PRD Section 9.
// These three root shapes are intentionally literal: do not extend them in place.

export type PaletteToken =
  | 'signalOrange'
  | 'alertRed'
  | 'electricViolet'
  | 'orchidMagenta'
  | 'hotPink'
  | 'blush'
  | 'forestGreen'
  | 'sageMint'
  | 'sand'
  | 'amber'
  | 'slateBlueGray'
  | 'ink'
  | 'paper'
  | 'fog';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export type BlendMode = 'NORMAL' | 'MULTIPLY' | 'SCREEN' | 'DARKEN';

export type BlockSpec = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: PaletteToken;
  opacity: number;
  blendMode: BlendMode;
};

export type TextureSpec = {
  id: string;
  region: { x: number; y: number; width: number; height: number };
  dotSize: number;
  spacing: number;
  ink: PaletteToken;
};

export type LabelSpec = {
  id: string;
  x: number;
  y: number;
  text: string;
  size: number;
  fontFamily: string;
};

export type GradientSpec = {
  angleDeg: number;
  stops: { position: number; color: PaletteToken; opacity: number }[];
};

export type SceneSpec = {
  seed: string;
  canvas: { width: number; height: number };
  blocks: BlockSpec[];
  textureRegions: TextureSpec[];
  labels: LabelSpec[];
  gradientBlock?: BlockSpec & { gradient: GradientSpec };
};

export type GenerationParams = {
  seed: string;
  activeTokens: PaletteToken[];
  density: number;
  scaleRange: [number, number];
  gridStrictness: number;
  blendMode: BlockSpec['blendMode'];
  opacityRange: [number, number];
  textureEnabled: boolean;
  textureDensity: number;
  gradientEnabled: boolean;
  labelsEnabled: boolean;
  labelSource: 'generated' | 'custom';
  customLabels?: string[];
  outputSize: { width: number; height: number };
};

export type SelectionConstraints = {
  mode: 'none' | 'fill' | 'mask' | 'batch';
  shapes: {
    x: number;
    y: number;
    width: number;
    height: number;
    isRectangular: boolean;
    nodeId: string;
  }[];
};

export type SourceMode = SelectionConstraints['mode'];
export type ShapeConstraint = SelectionConstraints['shapes'][number];

export interface InsertMessage {
  type: 'INSERT';
  params: GenerationParams;
  seed: string;
  constraints?: SelectionConstraints;
}

export interface RequestSelectionInfoMessage {
  type: 'REQUEST_SELECTION_INFO';
}

export interface SelectionInfoMessage {
  type: 'SELECTION_INFO';
  constraints: SelectionConstraints;
}

export interface InsertCompleteMessage {
  type: 'INSERT_COMPLETE';
  frameId: string;
}

export interface LoadedRecipeMessage {
  type: 'LOADED_RECIPE';
  params: GenerationParams;
  seed: string;
}

export type UIToMainMessage = InsertMessage | RequestSelectionInfoMessage;
export type MainToUIMessage = SelectionInfoMessage | InsertCompleteMessage | LoadedRecipeMessage;

export interface Recipe {
  seed: string;
  params: GenerationParams;
  mode: SourceMode;
  version: number;
}

export const OUTPUT_PRESETS = {
  square: { width: 1080, height: 1080, label: 'Square 1:1' },
  widescreen: { width: 1920, height: 1080, label: 'Widescreen 16:9' },
  portrait: { width: 1080, height: 1920, label: 'Portrait 9:16' },
  social: { width: 1200, height: 628, label: 'Social OG 1.9:1' },
} as const;

export type OutputPresetKey = keyof typeof OUTPUT_PRESETS;

export const DEFAULT_PARAMS: GenerationParams = {
  seed: '8842',
  activeTokens: [
    'signalOrange',
    'alertRed',
    'electricViolet',
    'orchidMagenta',
    'hotPink',
    'forestGreen',
    'slateBlueGray',
    'sand',
  ],
  density: 6,
  scaleRange: [0.05, 0.45],
  gridStrictness: 0.4,
  blendMode: 'MULTIPLY',
  opacityRange: [0.55, 1],
  textureEnabled: true,
  textureDensity: 1,
  gradientEnabled: true,
  labelsEnabled: true,
  labelSource: 'generated',
  outputSize: { width: 1080, height: 1080 },
};
