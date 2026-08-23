// ─── Plugin main thread entry point ──────────────────────────────────────────
// figma.showUI + message router.
// All Figma API calls happen here (plugin sandbox / main thread).
// The UI iframe communicates via postMessage (bridge.ts on the UI side).

import type { UIToMainMessage, MainToUIMessage, InsertMessage } from '../generator/scene-spec';
import { generateScene, generateBatch } from '../generator/generate';
import { readSelection } from './selection-reader';
import { renderToFigma, renderBatchToFigma } from './figma-renderer';
import { loadRecipe, hasRecipe } from './plugin-data';

// ─── Show UI ─────────────────────────────────────────────────────────────────

figma.showUI(__html__, {
  width: 320,
  height: 580,
  themeColors: true,
  title: 'Pattern Forge',
});

// ─── Send initial selection info ──────────────────────────────────────────────

function sendSelectionInfo(): void {
  const constraints = readSelection();
  const msg: MainToUIMessage = { type: 'SELECTION_INFO', constraints };
  figma.ui.postMessage(msg);
}

// ─── Watch for selection changes ──────────────────────────────────────────────

figma.on('selectionchange', () => {
  sendSelectionInfo();

  // FR-13: if the newly-selected node has a recipe, offer to reload it
  const selection = figma.currentPage.selection;
  if (selection.length === 1 && hasRecipe(selection[0])) {
    const recipe = loadRecipe(selection[0]);
    if (recipe) {
      const msg: MainToUIMessage = {
        type: 'LOADED_RECIPE',
        params: recipe.params,
        seed: recipe.seed,
      };
      figma.ui.postMessage(msg);
    }
  }
});

// ─── Message handler ──────────────────────────────────────────────────────────

figma.ui.onmessage = async (rawMsg: UIToMainMessage) => {
  switch (rawMsg.type) {

    case 'REQUEST_SELECTION_INFO': {
      sendSelectionInfo();
      break;
    }

    case 'INSERT': {
      const msg = rawMsg as InsertMessage;
      const { params, seed, constraints } = msg;
      const paramsWithSeed = { ...params, seed };

      try {
        if (constraints?.mode === 'batch' && constraints.shapes.length > 1) {
          // ── Batch mode (FR-5) ───────────────────────────────────────────
          const results = generateBatch(paramsWithSeed, constraints);
          const exceedsThreshold = results.some((r) => r.exceedsThreshold);
          if (exceedsThreshold) {
            figma.notify('⚠ High node count — this may take a moment…', { timeout: 3000 });
          }
          const specs = results.map((r) => r.spec);
          await renderBatchToFigma(specs, paramsWithSeed, constraints);

        } else {
          // ── Single insert (Random, Fill, Mask modes) ────────────────────
          const { spec, exceedsThreshold } = generateScene(paramsWithSeed, constraints);

          if (exceedsThreshold) {
            figma.notify('⚠ High node count — this may take a moment…', { timeout: 3000 });
          }

          const mode = constraints?.mode ?? 'none';
          let targetNode: SceneNode | undefined;
          let isRectangular = true;

          if (constraints?.mode === 'fill' || constraints?.mode === 'mask') {
            const shape = constraints.shapes[0];
            if (shape) {
              isRectangular = shape.isRectangular;
              try {
                const found = figma.getNodeById(shape.nodeId);
                targetNode = (found && 'absoluteBoundingBox' in found) ? (found as SceneNode) : undefined;
              } catch { /* ignore */ }
            }
          }

          await renderToFigma(spec, { params: paramsWithSeed, mode, targetNode, isRectangular });
        }

        const msg: MainToUIMessage = {
          type: 'INSERT_COMPLETE',
          frameId: figma.currentPage.selection[0]?.id ?? '',
        };
        figma.ui.postMessage(msg);

      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        figma.notify(`Pattern Forge error: ${message}`, { error: true });
        const completeMsg: MainToUIMessage = { type: 'INSERT_COMPLETE', frameId: '' };
        figma.ui.postMessage(completeMsg);
      }
      break;
    }
  }
};
