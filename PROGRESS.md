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
- **Gradient Parity, Label Anchoring & Mask Centering Fixes (2026-08-25):**
  1. *Gradient angle convention mismatch*: `angleToGradientTransform` in `figma-renderer.ts` computed
     `dx = cos(rad)*len, dy = sin(rad)*len` — standard math angles (0°=right, 90°=down) — while
     `CanvasPreviewRenderer.tsx`'s `drawGradientBlock` used CSS-style angles (0°=up, 90°=right, via
     `dx = sin(rad), dy = -cos(rad)`), a 90° offset between the two renderers. `layout.ts` hardcodes
     `angleDeg: 180` for the signature gradient block, tuned against the preview (180°→straight down
     there); fed through the old Figma math, 180° meant "left" — the real inserted node would render
     that gradient horizontally instead of vertically. **Fix**: changed `angleToGradientTransform` to
     use the same `dx = sin(rad)*len, dy = -cos(rad)*len` convention as the preview, so both renderers
     agree on every angle, not just 180°. No change needed to `layout.ts` — 180° already means "down" in
     the shared convention now. Verified analytically: for `angleDeg: 180` the resulting gradient
     transform has a purely vertical direction vector (zero horizontal component, start above center /
     end below), matching the preview's top-to-bottom, dark-to-light fade for the same seed.
  2. *Labels detaching from their anchor block*: `labels.ts` computed each label's position relative to
     a random anchor block, then clamped it to stay within canvas bounds, then ran collision-avoidance
     against the *clamped* position only — never re-checking whether clamping had moved the label away
     from the block it was supposed to be anchored to. A block sitting near a canvas edge could compute
     a raw position off-canvas, get clamp-shoved into empty space, trivially pass the "doesn't overlap
     anything" check out there, and get placed fully disconnected from any block (the floating "e300-"
     label seen in an earlier test). **Fix**: added a drift check right after clamping — if clamping
     moved the label more than 20px from its pre-clamp (anchor-relative) position, that attempt is
     rejected and the loop retries a different anchor/side, falling through to skip the label entirely
     if no attempt succeeds. Stress-tested with a simulation of the same algorithm against 8 blocks
     deliberately hugging every canvas edge/corner across 300 seeds (2,400 labels placed) — max observed
     distance from any placed label to its anchor block was 16px (within the intended 4–16px gap range);
     no orphaned labels.
  3. *Selection-Mask anchor point*: in `figma-renderer.ts`, `renderToFigma` positioned the mask-mode
     wrapper frame at the selected shape's top-left corner (`targetNode.absoluteBoundingBox.x/y`), while
     `layout.ts` centers the dense cluster at the canvas's own center (`width*0.5, height*0.5`) for mask
     mode. Since mask mode's canvas is intentionally sized to the full requested output (not the shape's
     own size), anchoring at the shape's top-left left the shape sitting near a corner of the generated
     field instead of at its visual center. **Fix**: for mask mode specifically, the frame origin is now
     computed so the shape's own center lands on the frame's local center
     (`parentX = shapeCenterX - canvas.width/2`, same for Y), instead of anchoring at the shape's
     top-left. Fill mode is unchanged (its canvas is sized exactly to the shape, so top-left anchoring is
     already correct there). Verified analytically for shapes in several different page positions
     (including off-canvas/negative coordinates) — shape center now always coincides with frame center.
  - **Verification caveat**: all three fixes were confirmed by build (`npm run build`, both `dist/ui.html`
    and `dist/code.js` compile clean) and by standalone numerical simulation of the exact formulas/algorithms
    involved (see above). None of the three were confirmed with an actual Insert-to-Canvas / Live-Edit test
    inside the real Figma desktop app — that requires a human (or a Figma-side agent) driving the plugin UI,
    which wasn't available in this session. **Still to do before calling this fully done**: insert a scene with
    the gradient block and visually confirm top-to-bottom fade; generate a few high-density scenes and visually
    confirm no floating labels; generate a Mask-mode composition against shapes in different canvas positions and
    visually confirm the shape reads as centered in the field.
