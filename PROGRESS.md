# Progress

- **Contract Reconciliation & Decision Record:** Contract finalized in `DECISIONS.md`. `TextureSpec.opacity`, `LabelSpec.opacity`, `GenerationParams.displayFont`, `GenerationParams.blendModes`, and `BlockSpec.gradient` are confirmed part of the shared contract.
- **Composition & Selection-Batch Fixes (2026-08-23):**
  1. *Balanced Totem Cluster Centering*: `clusterCx` and `clusterCy` in `layout.ts` were constrained to `[0.38..0.62 * width]` and `[0.35..0.65 * height]`, with block coordinates clamped inside `[0.02..0.98 * canvas]`.
  2. *Label Anchoring*: `labels.ts` was revised to strictly anchor labels 4–16px away from real block edges, clamped to canvas boundaries.
  3. *Rectangular Masking Fix*: Fixed `renderToFigma` to only apply `isMask` on non-rectangular shapes (`isRectangular === false`). Rectangular frames rely cleanly on native `frame.clipsContent = true`.
  4. *O(1) Batch Lookup*: Replaced recursive `currentPage.findOne` in `renderBatchToFigma` with `figma.getNodeById(shape.nodeId)`.
- **Live Canvas Editing (2026-08-25):**
  1. *In-Place Frame Re-rendering (`renderInPlace`)*: Implemented in `src/main/figma-renderer.ts`.
  2. *Selection & Recipe Arming*: `selection-reader.ts` detects single frame selections with stored recipe metadata (`hasRecipe(node)`), providing `canLiveUpdate: true` and `liveTargetId` to the UI.
  3. *Debounced Live Push*: In `src/ui/App.tsx`, slider and control updates trigger a 90ms debounced `LIVE_UPDATE` message via `src/ui/bridge.ts` to the main thread.
  4. *Live Status Indicator*: The header badge dynamically reflects `● LIVE` with emerald styling.
- **Minimal UI & 11-Block Editable Color Palette (2026-08-25):**
  1. *Fully Minimal UI*: Removed all non-essential panels (Composition, Blend & Texture, Labels, Output Size, Presets, Seed, History).
  2. *Fixed Optimal Defaults*: Fixed Blend Modes to all 4 modes (`NORMAL`, `MULTIPLY`, `SCREEN`, `DARKEN`), Halftone Texture (`true`), Texture Density (`2.5`), Gradient Block (`true`), Data Labels (`true`), Density (`6`), and Grid Strictness (`0.4`).
  3. *11-Block User-Editable Color Palette*: Swatch grid displays exactly 11 color blocks. Clicking any swatch opens the color picker, allowing the user to customize each palette color in real time. Changes propagate immediately across local preview, live canvas updates, and batch rendering.
