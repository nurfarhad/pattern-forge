# Progress

- **Contract Reconciliation & Decision Record:** Contract finalized in `DECISIONS.md`. `TextureSpec.opacity`, `LabelSpec.opacity`, `GenerationParams.displayFont`, `GenerationParams.blendModes`, and `BlockSpec.gradient` are confirmed part of the shared contract.
- **Composition & Selection-Batch Fixes (2026-08-23):**
  1. *Balanced Totem Cluster Centering*: `clusterCx` and `clusterCy` in `layout.ts` were constrained to `[0.38..0.62 * width]` and `[0.35..0.65 * height]`, with block coordinates clamped inside `[0.02..0.98 * canvas]`. This centers the dense overlapping totem glyph in the main visual area and distributes secondary blocks evenly across the frame.
  2. *Label Anchoring*: `labels.ts` was revised to strictly anchor labels 4–16px away from real block edges, clamped to canvas boundaries. Removed arbitrary fallback jumps into empty canvas corners.
  3. *Rectangular Masking Fix*: Fixed `renderToFigma` to only apply `isMask` on non-rectangular shapes (`isRectangular === false`, e.g. stars/ellipses). Rectangular frames now rely cleanly on native `frame.clipsContent = true` without cloning redundant mask layers.
  4. *O(1) Batch Lookup*: Replaced recursive `currentPage.findOne` in `renderBatchToFigma` with `figma.getNodeById(shape.nodeId)`.
- **Frame Registration Fix (2026-08-23) — the actual fix for "content clustered in one corner / batch fills collided":**
  The pass above (and the `85faa5c` commit it came from) did **not** fix this bug, despite its commit message. Verified
  root cause, confirmed directly from `@figma/plugin-typings/plugin-api.d.ts`: `figma.group(nodes, parent)` preserves
  each node's **absolute** page position (that's the documented reason it takes a `parent` argument at all — see the
  JSDoc on `PluginAPI.group()`). `createBlockNode` / `createTextureNode` / `createLabelNode` created their node
  directly (implicit parent = the page) using only `block.x` — a composition-*local* coordinate in `0..canvasWidth`
  — as the absolute position, then grouped into `frame` via `figma.group()`. Final position relative to the frame
  worked out to `block.x - parentX`, which only lands inside the frame's `clipsContent` bounds when the target shape
  happens to sit near page-origin — everything else is silently clipped to white. This was true identically before
  and after `85faa5c`; that commit restructured *where* the grouping happened but never added the missing offset.
  **Fix**: give each node its true absolute position before grouping — `rect.x = block.x + parentX` (and `+parentY`,
  and the same in `createTextureNode`/`createLabelNode`). Verified two ways: (1) simulated both the pre-fix and
  `85faa5c` code against the documented `group()`/`appendChild()` position rules — mathematically identical, both
  broken; the `+parentX/+parentY` fix resolves it for arbitrary parent positions. (2) Ran real `generateScene()` /
  `generateBatch()` output through both transforms for two different canvas sizes (1080×1080, 640×1400) plus a
  3-shape batch. **Do not remove the `+parentX`/`+parentY` offset in those three functions — it is the fix, not
  leftover cruft from an older coordinate scheme.**
