# Progress

- **CONTRACT FREEZE - read before editing:** `SceneSpec`, `GenerationParams`, `SelectionConstraints`, and their nested specs must remain literal PRD Section 9 shapes. Use `SceneSpec.gradientBlock`; `GenerationParams.blendMode` is singular; `TextureSpec` and `LabelSpec` do not have `opacity`; `GenerationParams` does not have `displayFont`. Renderer code must adapt to this contract, not extend it.

- 2026-08-23 — Codex lane: audited `src/generator/` and `src/ui/` against the full PRD; found the draft Section 9 contract had extra/renamed fields and queued a correction to the literal PRD shapes before renderer integration.
