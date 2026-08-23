# Progress

- **Contract Reconciliation & Decision Record:** Contract finalized in `DECISIONS.md`. `TextureSpec.opacity`, `LabelSpec.opacity`, `GenerationParams.displayFont`, `GenerationParams.blendModes`, and `BlockSpec.gradient` are confirmed part of the shared contract. Defensive `safeOpacity()` guards ensure Figma node property validation never fails.
- 2026-08-23 - Codex generator: implemented deterministic cluster/scatter layout, separate gradient block, capped vector-dot texture regions, collision-aware generated/custom labels, fill/mask sizing, and deterministic batch seed lineage.
- 2026-08-23 - Codex UI: wired generator state to a DPR-aware/resizable canvas preview and ported seed, palette, slider, panel, preset, history, output-size, label, blend, and texture controls.
- 2026-08-23 - Bug Fix & Verification: Fixed `Property "opacity" failed validation` on Figma Insert. Rebuilt `dist/ui.html` and `dist/code.js`.
