// ─── Recipe persistence ───────────────────────────────────────────────────────
// Stores/retrieves generation recipes via Figma plugin data on wrapper frames.
// PRD §5.3 / FR-13: plugin data is inert metadata — does not lock the frame.

import type { Recipe, GenerationParams, SourceMode } from '../generator/scene-spec';

const RECIPE_KEY = 'patternForgeRecipe';
const RECIPE_VERSION = 1;

/**
 * Stamp a recipe onto a FrameNode so it can be reloaded later.
 */
export function saveRecipe(
  frame: FrameNode,
  params: GenerationParams,
  seed: string,
  mode: SourceMode,
): void {
  const recipe: Recipe = { seed, params, mode, version: RECIPE_VERSION };
  frame.setPluginData(RECIPE_KEY, JSON.stringify(recipe));
}

/**
 * Load a recipe from a FrameNode. Returns null if no recipe is stored.
 */
export function loadRecipe(node: SceneNode): Recipe | null {
  try {
    const raw = node.getPluginData(RECIPE_KEY);
    if (!raw) return null;
    const recipe = JSON.parse(raw) as Recipe;
    // Basic version check — could add migration here in future
    if (recipe.version !== RECIPE_VERSION) return null;
    return recipe;
  } catch {
    return null;
  }
}

/**
 * Check whether a node has a stored recipe.
 */
export function hasRecipe(node: SceneNode): boolean {
  return !!node.getPluginData(RECIPE_KEY);
}
