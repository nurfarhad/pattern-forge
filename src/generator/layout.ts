import type {
  BlockSpec,
  GenerationParams,
  PaletteToken,
  SceneSpec,
  SelectionConstraints,
  TextureSpec,
} from './scene-spec';
import { rngFloat, rngInt, rngPick, rngShuffle } from './rng';
import { computeSpacing, DEFAULT_DOT_SIZE, MAX_TEXTURE_DOTS_PER_REGION } from './texture';

export interface LayoutResult {
  blocks: BlockSpec[];
  textureRegions: TextureSpec[];
  gradientBlock?: SceneSpec['gradientBlock'];
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function positiveDimension(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolveCanvasSize(
  params: GenerationParams,
  constraints?: SelectionConstraints,
): { width: number; height: number } {
  const fallback = {
    width: positiveDimension(params.outputSize.width, 1080),
    height: positiveDimension(params.outputSize.height, 1080),
  };

  // Fill previews use the selected shape's local bounds. Mask mode intentionally
  // keeps the requested output field so elements can extend around the anchor.
  if (constraints?.mode === 'fill' && constraints.shapes[0]) {
    return {
      width: positiveDimension(constraints.shapes[0].width, fallback.width),
      height: positiveDimension(constraints.shapes[0].height, fallback.height),
    };
  }

  return fallback;
}

function gridSnap(value: number, gridSize: number, strictness: number): number {
  const snapped = Math.round(value / gridSize) * gridSize;
  return value + (snapped - value) * clamp(strictness, 0, 1);
}

function normalizedRange(range: [number, number], min: number, max: number): [number, number] {
  const first = clamp(Number.isFinite(range[0]) ? range[0] : min, min, max);
  const second = clamp(Number.isFinite(range[1]) ? range[1] : max, min, max);
  return first <= second ? [first, second] : [second, first];
}

function blockCount(density: number, canvasW: number, canvasH: number): number {
  const normalizedDensity = clamp(Number.isFinite(density) ? density : 6, 1, 10);
  const base = Math.round(6 + normalizedDensity * 2.8);
  const areaFactor = Math.sqrt((canvasW * canvasH) / (1080 * 1080));
  return Math.max(1, Math.round(base * clamp(areaFactor, 0.7, 1.5)));
}

function textureSpacingForRegion(
  density: number,
  width: number,
  height: number,
): number {
  const requested = computeSpacing(density);
  const capped = Math.sqrt((width * height) / MAX_TEXTURE_DOTS_PER_REGION);
  return Math.max(requested, Math.ceil(capped), DEFAULT_DOT_SIZE * 2.5);
}

export function generateLayout(
  params: GenerationParams,
  constraints: SelectionConstraints | undefined,
  rng: () => number,
): LayoutResult {
  const canvas = resolveCanvasSize(params, constraints);
  const { width: width, height: height } = canvas;
  const gridSize = Math.max(1, width / 24);
  const [minScale, maxScaleRaw] = normalizedRange(params.scaleRange, 0.01, 0.8);
  const maxScale = Math.min(maxScaleRaw, 0.55);
  const [minOpacity, maxOpacity] = normalizedRange(params.opacityRange, 0, 1);
  const scatterMinOpacity = Math.min(maxOpacity, Math.max(0.7, minOpacity));
  const tokenSource: PaletteToken[] = params.activeTokens.length > 0
    ? params.activeTokens
    : ['alertRed'];
  const tokens = rngShuffle(rng, tokenSource);
  const totalBlocks = blockCount(params.density, width, height);
  const clusterCount = Math.round(totalBlocks * 0.64);
  const scatterCount = totalBlocks - clusterCount;

  // The renderer places a mask-mode field relative to the selected anchor. Within
  // the field, keep the cluster central so it can spill in every direction.
  const isMask = constraints?.mode === 'mask';
  const clusterCx = isMask ? width * 0.5 : rngFloat(rng, width * 0.22, width * 0.58);
  const clusterCy = isMask ? height * 0.5 : rngFloat(rng, height * 0.2, height * 0.66);
  const clusterRadius = Math.min(width, height) * rngFloat(rng, 0.26, 0.42);
  const blocks: BlockSpec[] = [];

  for (let index = 0; index < clusterCount; index += 1) {
    const blockWidth = gridSnap(
      rngFloat(rng, width * minScale, width * maxScale),
      gridSize,
      params.gridStrictness,
    );
    const blockHeight = gridSnap(
      rngFloat(rng, height * minScale * 0.6, height * maxScale * 0.86),
      gridSize,
      params.gridStrictness,
    );
    const angle = rngFloat(rng, 0, Math.PI * 2);
    const distance = clusterRadius * rng() * rng();
    const centerX = clusterCx + Math.cos(angle) * distance;
    const centerY = clusterCy + Math.sin(angle) * distance;

    blocks.push({
      id: `block-cluster-${index}`,
      x: gridSnap(centerX - blockWidth / 2, gridSize, params.gridStrictness),
      y: gridSnap(centerY - blockHeight / 2, gridSize, params.gridStrictness),
      width: Math.max(blockWidth, width * 0.04),
      height: Math.max(blockHeight, height * 0.04),
      fill: tokens[index % tokens.length],
      opacity: rngFloat(rng, minOpacity, maxOpacity),
      blendMode: params.blendMode,
    });
  }

  for (let index = 0; index < scatterCount; index += 1) {
    const isBar = rng() > 0.45;
    const blockWidth = gridSnap(
      isBar
        ? rngFloat(rng, width * 0.025, width * 0.15)
        : rngFloat(rng, width * 0.04, width * 0.12),
      gridSize,
      params.gridStrictness,
    );
    const blockHeight = gridSnap(
      isBar
        ? rngFloat(rng, height * 0.06, height * 0.22)
        : rngFloat(rng, height * 0.04, height * 0.12),
      gridSize,
      params.gridStrictness,
    );
    const safeWidth = Math.max(blockWidth, width * 0.02);
    const safeHeight = Math.max(blockHeight, height * 0.02);

    blocks.push({
      id: `block-scatter-${index}`,
      x: gridSnap(rngFloat(rng, 0, Math.max(0, width - safeWidth)), gridSize, params.gridStrictness),
      y: gridSnap(rngFloat(rng, 0, Math.max(0, height - safeHeight)), gridSize, params.gridStrictness),
      width: safeWidth,
      height: safeHeight,
      fill: rngPick(rng, tokens),
      opacity: rngFloat(rng, scatterMinOpacity, maxOpacity),
      blendMode: 'NORMAL',
    });
  }

  let gradientBlock: SceneSpec['gradientBlock'];
  if (params.gradientEnabled) {
    const gradientWidth = Math.max(
      gridSnap(rngFloat(rng, width * 0.06, width * 0.15), gridSize, params.gridStrictness),
      width * 0.04,
    );
    const gradientHeight = Math.max(
      gridSnap(rngFloat(rng, height * 0.18, height * 0.38), gridSize, params.gridStrictness),
      height * 0.12,
    );

    gradientBlock = {
      id: 'block-gradient',
      x: gridSnap(rngFloat(rng, 0, Math.max(0, width - gradientWidth)), gridSize, params.gridStrictness),
      y: gridSnap(rngFloat(rng, 0, Math.max(0, height - gradientHeight)), gridSize, params.gridStrictness),
      width: gradientWidth,
      height: gradientHeight,
      fill: 'forestGreen',
      opacity: 1,
      blendMode: 'NORMAL',
      gradient: {
        angleDeg: 180,
        stops: [
          { position: 0, color: 'forestGreen', opacity: 1 },
          { position: 0.6, color: 'sageMint', opacity: 0.7 },
          { position: 1, color: 'paper', opacity: 0 },
        ],
      },
    };
  }

  const textureRegions: TextureSpec[] = [];
  if (params.textureEnabled) {
    const patchCount = rngInt(rng, 2, 4);
    for (let index = 0; index < patchCount; index += 1) {
      const patchWidth = Math.max(
        gridSnap(rngFloat(rng, width * 0.12, width * 0.35), gridSize, 1),
        Math.min(40, width),
      );
      const patchHeight = Math.max(
        gridSnap(rngFloat(rng, height * 0.07, height * 0.22), gridSize, 1),
        Math.min(40, height),
      );
      textureRegions.push({
        id: `texture-${index}`,
        region: {
          x: gridSnap(rngFloat(rng, 0, Math.max(0, width - patchWidth)), gridSize, 1),
          y: gridSnap(rngFloat(rng, 0, Math.max(0, height - patchHeight)), gridSize, 1),
          width: patchWidth,
          height: patchHeight,
        },
        dotSize: DEFAULT_DOT_SIZE,
        spacing: textureSpacingForRegion(params.textureDensity, patchWidth, patchHeight),
        ink: 'ink',
      });
    }
  }

  return { blocks, textureRegions, gradientBlock };
}

export function estimateNodeCount(params: GenerationParams): number {
  const width = positiveDimension(params.outputSize.width, 1080);
  const height = positiveDimension(params.outputSize.height, 1080);
  return (
    blockCount(params.density, width, height) +
    (params.gradientEnabled ? 1 : 0) +
    (params.textureEnabled ? 4 : 0) +
    (params.labelsEnabled ? 8 : 0)
  );
}
