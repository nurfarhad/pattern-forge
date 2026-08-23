# Progress

- **Contract Reconciliation & Decision Record:** Contract finalized in `DECISIONS.md`. `TextureSpec.opacity`, `LabelSpec.opacity`, `GenerationParams.displayFont`, `GenerationParams.blendModes`, and `BlockSpec.gradient` are confirmed part of the shared contract. Defensive `safeOpacity()` guards ensure Figma node property validation never fails.
- **Batch Mode & Texture Parenting Root-Cause Analysis (2026-08-23):**
  1. *Opacity validation crash*: The previous test crashed during Shape 1 on `createTextureNode` when setting `node.opacity = safeOpacity(tex.opacity)`.
  2. *Orphaned `texture-0` frame on canvas*: `figma.createNodeFromSvg` places its output on `figma.currentPage` upon creation. Because Shape 1 crashed during `createTextureNode`, the subsequent grouping (`figma.group`) and parenting (`frame.appendChild`) never executed, leaving `texture-0` stranded at the root.
  3. *Missing Shape 2*: Shape 2 was never processed because Shape 1's unhandled exception terminated the batch execution loop early.
  4. *Coordinate Offset Bug*: `figma-renderer.ts` was subtracting `parentX` and `parentY` from local `(x, y)` coordinates, shifting children into negative space. Corrected to use local `(x, y)` relative to `frame` directly.
  5. *Direct Frame Grouping*: Updated `figma.group(nodes, frame)` to create `Blocks`, `Texture`, and `Labels` groups directly inside `frame`.
