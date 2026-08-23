# Progress

- **Contract Reconciliation & Decision Record:** Contract finalized in `DECISIONS.md`. `TextureSpec.opacity`, `LabelSpec.opacity`, `GenerationParams.displayFont`, `GenerationParams.blendModes`, and `BlockSpec.gradient` are confirmed part of the shared contract.
- **Composition & Selection-Batch Fixes (2026-08-23):**
  1. *Balanced Totem Cluster Centering*: `clusterCx` and `clusterCy` in `layout.ts` were constrained to `[0.38..0.62 * width]` and `[0.35..0.65 * height]`, with block coordinates clamped inside `[0.02..0.98 * canvas]`. This centers the dense overlapping totem glyph in the main visual area and distributes secondary blocks evenly across the frame.
  2. *Label Anchoring*: `labels.ts` was revised to strictly anchor labels 4–16px away from real block edges, clamped to canvas boundaries. Removed arbitrary fallback jumps into empty canvas corners.
  3. *Rectangular Masking Fix*: Fixed `renderToFigma` to only apply `isMask` on non-rectangular shapes (`isRectangular === false`, e.g. stars/ellipses). Rectangular frames now rely cleanly on native `frame.clipsContent = true` without cloning redundant mask layers.
  4. *O(1) Batch Lookup*: Replaced recursive `currentPage.findOne` in `renderBatchToFigma` with `figma.getNodeById(shape.nodeId)`.
