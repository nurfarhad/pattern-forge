# Progress

- **Contract Reconciliation & Decision Record:** Contract finalized in `DECISIONS.md`. `TextureSpec.opacity`, `LabelSpec.opacity`, `GenerationParams.displayFont`, `GenerationParams.blendModes`, and `BlockSpec.gradient` are confirmed part of the shared contract.
- **Composition & Selection-Batch Fixes (2026-08-23):**
  1. *Balanced Totem Cluster Centering*: `clusterCx` and `clusterCy` in `layout.ts` were constrained to `[0.38..0.62 * width]` and `[0.35..0.65 * height]`, with block coordinates clamped inside `[0.02..0.98 * canvas]`.
  2. *Label Anchoring*: `labels.ts` was revised to strictly anchor labels 4–16px away from real block edges, clamped to canvas boundaries.
  3. *Rectangular Masking Fix*: Fixed `renderToFigma` to only apply `isMask` on non-rectangular shapes (`isRectangular === false`). Rectangular frames rely cleanly on native `frame.clipsContent = true`.
  4. *O(1) Batch Lookup*: Replaced recursive `currentPage.findOne` in `renderBatchToFigma` with `figma.getNodeById(shape.nodeId)`.
- **Live Canvas Editing (2026-08-25):**
  1. *In-Place Frame Re-rendering (`renderInPlace`)*: Implemented in `src/main/figma-renderer.ts`. When editing a selected Pattern Forge frame, new elements are generated into a temporary container and swapped into the existing frame (`children` replaced, `fills` and `clipsContent` updated, recipe re-saved). The target frame's identity, position, dimensions, and selection state are completely preserved without flicker or re-creation.
  2. *Selection & Recipe Arming*: `selection-reader.ts` detects single frame selections with stored recipe metadata (`hasRecipe(node)`), providing `canLiveUpdate: true` and `liveTargetId` to the UI.
  3. *Debounced Live Push*: In `src/ui/App.tsx`, slider and control updates trigger a 90ms debounced `LIVE_UPDATE` message via `src/ui/bridge.ts` to the main thread while preserving instant local HTML canvas preview redraws.
  4. *Live Status Indicator*: The header badge dynamically reflects `● LIVE` with distinct emerald badge styling whenever a valid live-target frame is selected on canvas.
