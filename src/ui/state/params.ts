// ─── Zustand param store ──────────────────────────────────────────────────────
// Holds all generation params, current SceneSpec, mode, and session history.

import { create } from 'zustand';
import type { GenerationParams, SceneSpec, SourceMode, SelectionConstraints } from '@generator/scene-spec';
import { DEFAULT_PARAMS } from '@generator/scene-spec';
import { generateScene } from '@generator/generate';

// ─── History entry ────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  seed: string;
  params: GenerationParams;
  spec: SceneSpec;
  timestamp: number;
  thumbnailDataUrl?: string; // set after preview renders
}

// ─── Built-in presets ─────────────────────────────────────────────────────────

export interface Preset {
  id: string;
  name: string;
  params: Partial<GenerationParams>;
  isBuiltIn: boolean;
}

export const BUILT_IN_PRESETS: Preset[] = [
  {
    id: 'dense-cluster',
    name: 'Dense Cluster',
    isBuiltIn: true,
    params: {
      density: 9,
      scaleRange: [0.08, 0.48],
      gridStrictness: 0.3,
      blendModes: ['MULTIPLY'],
      opacityRange: [0.1, 1.0],
      textureEnabled: true,
      textureDensity: 2.5,
      activeTokens: ['signalOrange', 'alertRed', 'electricViolet', 'orchidMagenta', 'hotPink'],
    },
  },
  {
    id: 'scattered-minimal',
    name: 'Scattered Minimal',
    isBuiltIn: true,
    params: {
      density: 3,
      scaleRange: [0.04, 0.22],
      gridStrictness: 0.7,
      blendModes: ['NORMAL'],
      opacityRange: [0.1, 1.0],
      textureEnabled: true,
      textureDensity: 2.5,
      activeTokens: ['signalOrange', 'slateBlueGray', 'sand', 'alertRed'],
    },
  },
  {
    id: 'high-contrast-mono',
    name: 'High Contrast Mono-Block',
    isBuiltIn: true,
    params: {
      density: 5,
      scaleRange: [0.15, 0.55],
      gridStrictness: 0.85,
      blendModes: ['DARKEN'],
      opacityRange: [0.1, 1.0],
      textureEnabled: false,
      textureDensity: 2.5,
      activeTokens: ['alertRed', 'electricViolet', 'ink'],
    },
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

interface ParamsStore {
  params: GenerationParams;
  mode: SourceMode;
  constraints: SelectionConstraints | undefined;
  currentSpec: SceneSpec;
  history: HistoryEntry[];
  userPresets: Preset[];
  isInserting: boolean;

  // Actions
  setParam: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  setParams: (partial: Partial<GenerationParams>) => void;
  shuffleSeed: () => void;
  setMode: (mode: SourceMode) => void;
  setConstraints: (c: SelectionConstraints | undefined) => void;
  regenerate: () => string;
  applyPreset: (preset: Preset) => void;
  addToHistory: (entry: HistoryEntry) => void;
  setHistoryThumbnail: (id: string, dataUrl: string) => void;
  loadFromHistory: (entry: HistoryEntry) => void;
  addUserPreset: (preset: Preset) => void;
  removeUserPreset: (id: string) => void;
  loadRecipe: (params: GenerationParams, seed: string) => void;
  setInserting: (v: boolean) => void;
}

// Simple random seed generator for the shuffle button
function randomSeed(): string {
  return String(Math.floor(Math.random() * 99999));
}

function regenSpec(params: GenerationParams, constraints?: SelectionConstraints): SceneSpec {
  return generateScene(params, constraints).spec;
}

export const useParamsStore = create<ParamsStore>((set, get) => {
  const initialSpec = regenSpec(DEFAULT_PARAMS);

  return {
    params: DEFAULT_PARAMS,
    mode: 'none',
    constraints: undefined,
    currentSpec: initialSpec,
    history: [],
    userPresets: [],
    isInserting: false,

    setParam(key, value) {
      set((s) => {
        const newParams = { ...s.params, [key]: value };
        return { params: newParams, currentSpec: regenSpec(newParams, s.constraints) };
      });
    },

    setParams(partial) {
      set((s) => {
        const newParams = { ...s.params, ...partial };
        return { params: newParams, currentSpec: regenSpec(newParams, s.constraints) };
      });
    },

    shuffleSeed() {
      set((s) => {
        const newParams = { ...s.params, seed: randomSeed() };
        return { params: newParams, currentSpec: regenSpec(newParams, s.constraints) };
      });
    },

    setMode(mode) {
      set((s) => {
        const nextConstraints = mode === 'none'
          ? undefined
          : { mode, shapes: s.constraints?.shapes ?? [] };
        return {
          mode,
          constraints: nextConstraints,
          currentSpec: regenSpec(s.params, nextConstraints),
        };
      });
    },

    setConstraints(c) {
      set((s) => {
        const newSpec = regenSpec(s.params, c);
        return {
          mode: c?.mode ?? 'none',
          constraints: c,
          currentSpec: newSpec,
        };
      });
    },

    regenerate() {
      const { params, constraints } = get();
      const newParams = { ...params, seed: randomSeed() };
      const currentSpec = regenSpec(newParams, constraints);
      const id = newHistoryId();
      const entry: HistoryEntry = {
        id,
        seed: newParams.seed,
        params: newParams,
        spec: currentSpec,
        timestamp: Date.now(),
      };
      set((s) => ({
        params: newParams,
        currentSpec,
        history: [entry, ...s.history].slice(0, 10),
      }));
      return id;
    },

    applyPreset(preset) {
      set((s) => {
        const newParams = { ...s.params, ...preset.params };
        return { params: newParams, currentSpec: regenSpec(newParams, s.constraints) };
      });
    },

    addToHistory(entry) {
      set((s) => ({
        history: [entry, ...s.history].slice(0, 10), // keep last 10 (FR-14)
      }));
    },

    setHistoryThumbnail(id, dataUrl) {
      set((s) => ({
        history: s.history.map((h) => h.id === id ? { ...h, thumbnailDataUrl: dataUrl } : h),
      }));
    },

    loadFromHistory(entry) {
      set((s) => ({
        params: entry.params,
        currentSpec: entry.spec,
        constraints: s.constraints, // keep current mode
      }));
    },

    addUserPreset(preset) {
      set((s) => ({ userPresets: [...s.userPresets, preset] }));
    },

    removeUserPreset(id) {
      set((s) => ({ userPresets: s.userPresets.filter((p) => p.id !== id) }));
    },

    loadRecipe(params, seed) {
      const newParams = { ...params, seed };
      set({ params: newParams, currentSpec: regenSpec(newParams) });
    },

    setInserting(v) { set({ isInserting: v }); },
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a new unique entry id for history */
export function newHistoryId(): string {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
