# Pattern Forge — Figma Brand Pattern Generator

> A Figma plugin that procedurally generates on-brand generative-pattern compositions: layered semi-transparent color blocks, halftone dot-texture, Multiply-blend overlaps, gradient blocks, and scattered serif data-readout labels — all as **fully native, fully editable Figma nodes**.

---

## Setup

### Prerequisites

1. **Node.js 18+** — [Download from nodejs.org](https://nodejs.org/)
2. **Figma desktop app** — required to load plugins in development mode

### Install & Build

```bash
cd pattern-forge
npm install
npm run build
```

This produces:
- `dist/code.js` — plugin main thread (runs in Figma sandbox)
- `dist/ui.html` — self-contained plugin UI (React app, all JS/CSS inlined)

### Development (watch mode)

```bash
npm run dev
```

Rebuilds on every file save. Reload the plugin in Figma to pick up changes.

### Load in Figma

1. Open Figma desktop app
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select `pattern-forge/manifest.json`
4. Run via **Plugins → Development → Pattern Forge**

---

## How it works

### Architecture: One Generator, Two Renderers

```
Controls panel          Selected shape (optional)
      │                           │
      └─────────────┬─────────────┘
                    ▼
             Generator core
        (pure TS, seeded layout)
                    │
      ┌─────────────┴─────────────┐
      ▼                           ▼
Preview renderer          Figma renderer
(canvas/SVG, live in UI)  (creates native Figma nodes)
                                  │
                                  ▼
                            Figma canvas
                     (rectangle, text & frame layers)
```

The **generator core** (`src/generator/`) is pure TypeScript with no DOM or Figma API dependency. It produces a `SceneSpec` — a plain-data description of the composition. This same spec is used by:
- The **preview renderer** (HTML canvas in the plugin UI) for instant slider feedback
- The **Figma renderer** (plugin main thread) to create real editable nodes

Because the generator is deterministic (Mulberry32 seeded PRNG), the same `seed + params` always produces an identical `SceneSpec` in both renderers.

---

## Features

| Feature | FR | Status |
|---|---|---|
| Seeded deterministic generation | FR-1 | ✅ |
| Random mode end-to-end | FR-2 | ✅ |
| Selection-Fill mode (rectangular) | FR-3 | ✅ |
| Selection-Fill mode (non-rectangular, isMask) | FR-3 | ✅ |
| Selection-Mask mode | FR-4 | ✅ |
| Selection-Batch mode | FR-5 | ✅ |
| Native editable nodes (no raster output) | FR-6 | ✅ |
| Halftone dot texture (SVG vector, not image fill) | FR-7 | ✅ |
| Blend-mode overlap (MULTIPLY/SCREEN/DARKEN) | FR-8 | ✅ |
| Gradient block (GRADIENT_LINEAR, editable handles) | FR-9 | ✅ |
| Scattered data-readout labels (real TextNodes) | FR-10 | ✅ |
| Live preview (updates per slider change) | FR-11 | ✅ |
| Built-in + user presets (clientStorage) | FR-12 | ✅ |
| Recipe persistence (setPluginData/getPluginData) | FR-13 | ✅ |
| Session history strip (last 10) | FR-14 | ✅ |

---

## Swapping the brand palette

All colors are design tokens in `src/generator/palette.ts`. To use a different brand:

```ts
// src/generator/palette.ts
export const PALETTE: Record<PaletteToken, string> = {
  signalOrange: '#YOUR_HEX',  // ← swap any token
  alertRed:     '#YOUR_HEX',
  // ...
};
```

Nothing else needs to change — the generator references tokens by name, never by hex.

---

## File structure

```
pattern-forge/
├── manifest.json                   # Figma plugin manifest
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Multi-entry: ui.html + code.js
├── ui.html                         # Plugin UI shell (inlined at build)
└── src/
    ├── generator/                  # Pure TS — no DOM, no Figma API
    │   ├── scene-spec.ts           # All types (SceneSpec, GenerationParams, etc.)
    │   ├── rng.ts                  # Mulberry32 seeded PRNG
    │   ├── palette.ts              # 14 design tokens
    │   ├── layout.ts               # Block placement algorithm
    │   ├── texture.ts              # Dot-grid SVG builder
    │   ├── labels.ts               # Data-readout label generator
    │   └── generate.ts             # generateScene() entry point
    ├── main/                       # Figma plugin sandbox (no DOM)
    │   ├── code.ts                 # Entry point: figma.showUI + message router
    │   ├── figma-renderer.ts       # SceneSpec → real Figma nodes
    │   ├── selection-reader.ts     # figma.currentPage.selection → SelectionConstraints
    │   ├── plugin-data.ts          # Recipe setPluginData/getPluginData
    │   └── fonts.ts                # loadFontAsync helpers + fallback
    └── ui/                         # React plugin UI (iframe)
        ├── main.tsx
        ├── App.tsx                 # Full control panel (PRD §10)
        ├── App.css                 # Design token CSS + all layout
        ├── bridge.ts               # postMessage typed wrappers
        ├── components/             # Ported ToolCraft-style components
        │   ├── Slider.tsx/css
        │   ├── Panel.tsx/css
        │   ├── Button.tsx/css
        │   ├── SeedRow.tsx/css
        │   ├── SwatchGrid.tsx/css
        │   └── PresetChip.tsx/css
        ├── preview/
        │   └── CanvasPreviewRenderer.tsx/css
        └── state/
            └── params.ts           # Zustand store + built-in presets
```

---

## Open questions (PRD §16 — pending owner decision)

| # | Question | Default shipped |
|---|---|---|
| OQ-1 | Dot-texture: `createNodeFromSvg` vs. tiled instances | `createNodeFromSvg` (per FR-7) |
| OQ-2 | Node-count warning threshold | 400 nodes |
| OQ-3 | Display serif placeholder | `Times New Roman` |
| OQ-4 | Headline word-mash motif | Deferred past MVP |
| OQ-5 | Brand hex values | Provisional (PRD §4.2) — confirm against real brand file |

---

## QA checklist (PRD §15 — to run in Phase 6)

- [ ] Generate 5 Random-mode variations — at least 3 recognizably match reference family
- [ ] Star/ellipse selection → Fill respects true outline (not bounding box)
- [ ] Rectangle/frame selection → Fill cleans up; resizable without breaking
- [ ] 4+ empty frames → Batch fills all in one pass (coherent, non-identical)
- [ ] Pick any block → change Figma fill color → nothing else breaks
- [ ] Two overlapping blocks → change one's blend mode → overlap color updates
- [ ] Double-click a label → edit text → change persists
- [ ] Reselect old frame → "Load recipe" → panel repopulates exactly
- [ ] High-density generation → completes with progress feedback, no freeze
