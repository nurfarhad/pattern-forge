import type { GenerationParams, SceneSpec, SelectionConstraints } from './scene-spec';
import { generateLabels } from './labels';
import { estimateNodeCount, generateLayout, resolveCanvasSize } from './layout';
import { createRng } from './rng';

export const NODE_COUNT_WARNING_THRESHOLD = 400;

export interface GenerateResult {
  spec: SceneSpec;
  estimatedNodeCount: number;
  exceedsThreshold: boolean;
}

/**
 * Pure deterministic entry point shared by the UI and Figma main contexts.
 * It does not read the DOM, call the Figma API, mutate params, or use Math.random.
 */
export function generateScene(
  params: GenerationParams,
  constraints?: SelectionConstraints,
): GenerateResult {
  const rng = createRng(params.seed);
  const canvas = resolveCanvasSize(params, constraints);
  const { blocks, textureRegions, gradientBlock } = generateLayout(params, constraints, rng);
  const labels = generateLabels(rng, params, blocks, canvas);
  const spec: SceneSpec = {
    seed: params.seed,
    canvas,
    blocks,
    textureRegions,
    labels,
    ...(gradientBlock ? { gradientBlock } : {}),
  };
  const estimatedNodeCount = estimateNodeCount(params);

  return {
    spec,
    estimatedNodeCount,
    exceedsThreshold: estimatedNodeCount > NODE_COUNT_WARNING_THRESHOLD,
  };
}

export function generateBatch(
  params: GenerationParams,
  constraints: SelectionConstraints,
): GenerateResult[] {
  return constraints.shapes.map((shape, index) => {
    const derivedParams: GenerationParams = {
      ...params,
      seed: `${params.seed}-${index}`,
      activeTokens: [...params.activeTokens],
      scaleRange: [...params.scaleRange],
      opacityRange: [...params.opacityRange],
      blendModes: [...params.blendModes],
      customLabels: params.customLabels ? [...params.customLabels] : undefined,
      outputSize: { width: shape.width, height: shape.height },
      displayFont: params.displayFont,
    };
    return generateScene(derivedParams, { mode: 'fill', shapes: [shape] });
  });
}
