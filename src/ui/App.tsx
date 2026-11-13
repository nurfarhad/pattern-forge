// ─── Pattern Forge — Main UI App ─────────────────────────────────────────────
// Streamlined plugin interface with 11 customizable color blocks, live canvas editing,
// composition controls, blend modes, labels, output sizing, and presets.

import React, { useEffect, useState } from 'react';
import './App.css';

import { Slider } from './components/Slider';
import { Panel } from './components/Panel';
import { Button } from './components/Button';
import { SwatchGrid } from './components/SwatchGrid';
import { PresetChip } from './components/PresetChip';
import { Switch, Segmented, Field } from './components/Controls';
import { RangeSlider } from './components/Slider';
import { SeedRow } from './components/SeedRow';
import { CanvasPreviewRenderer } from './preview/CanvasPreviewRenderer';

import {
  useParamsStore,
  BUILT_IN_PRESETS,
} from './state/params';
import type { BlendMode, PaletteToken, SourceMode } from '@generator/scene-spec';
import { DEFAULT_PARAMS } from '@generator/scene-spec';
import { OUTPUT_PRESETS, type OutputPresetKey } from '@generator/scene-spec';
import { estimateNodeCount } from '@generator/layout';
import { interaction } from './state/interaction';
import { sendInsert, sendLiveUpdate, sendRequestSelectionInfo, onPluginMessage } from './bridge';

// ─── App ─────────────────────────────────────────────────────────────────────

const OUTPUT_PRESET_KEYS = Object.keys(OUTPUT_PRESETS) as OutputPresetKey[];

export const App: React.FC = () => {
  const store = useParamsStore();
  const {
    params, mode, currentSpec, userPresets,
    setParam, setMode, regenerate, shuffleSeed,
    applyPreset, addUserPreset, removeUserPreset, setUserPresets,
    loadRecipe, setInserting, isInserting, constraints, setConstraints,
  } = store;

  const [activePresetId, setActivePresetId] = useState<string | null>('dense-cluster');
  const [savePresetName, setSavePresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [activeOutputPreset, setActiveOutputPreset] = useState<OutputPresetKey | 'custom' | 'selection'>('square');

  const liveTimerRef = React.useRef<number | null>(null);
  const isSyncingRecipeRef = React.useRef(false);
  const isFirstRender = React.useRef(true);

  // ── Wire up bridge (receives messages from main thread) ──────────────────
  useEffect(() => {
    const unsub = onPluginMessage((msg) => {
      if (msg.type === 'SELECTION_INFO') {
        setConstraints(msg.constraints);
      } else if (msg.type === 'INSERT_COMPLETE') {
        setInserting(false);
      } else if (msg.type === 'LOADED_RECIPE') {
        isSyncingRecipeRef.current = true;
        loadRecipe(msg.params, msg.seed);
        setTimeout(() => {
          isSyncingRecipeRef.current = false;
        }, 150);
      } else if (msg.type === 'USER_PRESETS_LOADED') {
        setUserPresets(msg.presets);
      }
    });

    // Ask for initial selection state
    sendRequestSelectionInfo();
    return unsub;
  }, [setConstraints, setInserting, loadRecipe, setUserPresets]);

  // ── Debounced live update push to Figma canvas ───────────────────────────
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isSyncingRecipeRef.current) {
      return;
    }
    if (constraints?.canLiveUpdate && constraints.liveTargetId) {
      if (interaction.dragging) return; // pushed once on release instead
      if (liveTimerRef.current) {
        window.clearTimeout(liveTimerRef.current);
      }
      liveTimerRef.current = window.setTimeout(() => {
        sendLiveUpdate(params, params.seed, constraints.liveTargetId!);
      }, 90);
    }
    return () => {
      if (liveTimerRef.current) {
        window.clearTimeout(liveTimerRef.current);
      }
    };
  }, [params, constraints?.canLiveUpdate, constraints?.liveTargetId]);

  // ── Push the final value to the Figma frame once a drag ends ─────────────
  useEffect(() => interaction.subscribe((dragging) => {
    if (dragging) return;
    const s = useParamsStore.getState();
    const c = s.constraints;
    if (c?.canLiveUpdate && c.liveTargetId) sendLiveUpdate(s.params, s.params.seed, c.liveTargetId);
  }), []);

  // ── Estimated node count ─────────────────────────────────────────────────
  const nodeCount = estimateNodeCount(params);
  const nodeCountWarning = nodeCount > 400;

  // ── Color customization handler ──────────────────────────────────────────
  const handleColorChange = (token: PaletteToken, newHex: string) => {
    const updatedCustom = {
      ...(params.customColors || {}),
      [token]: newHex,
    };
    setParam('customColors', updatedCustom);
  };

  // ── Output size preset ────────────────────────────────────────────────────
  const applyOutputPreset = (key: OutputPresetKey) => {
    setActiveOutputPreset(key);
    setParam('outputSize', { width: OUTPUT_PRESETS[key].width, height: OUTPUT_PRESETS[key].height });
  };

  // ── Insert to canvas ──────────────────────────────────────────────────────
  const handleInsert = () => {
    if (nodeCountWarning) {
      const ok = window.confirm(
        `This will generate ~${nodeCount} nodes. Large generations may be slow. Proceed?`
      );
      if (!ok) return;
    }

    setInserting(true);
    sendInsert(params, params.seed, constraints);
  };

  // ── Regenerate (new seed, keep locked params) ─────────────────────────────
  const handleRegenerate = () => {
    regenerate();
  };

  // ── Save preset ──────────────────────────────────────────────────────────
  const handleSavePreset = () => {
    if (!savePresetName.trim()) return;
    addUserPreset({
      id: `user-${Date.now()}`,
      name: savePresetName.trim(),
      params,
      isBuiltIn: false,
    });
    setSavePresetName('');
    setShowSavePreset(false);
  };

  const isLiveArmed = Boolean(constraints?.canLiveUpdate && constraints.liveTargetId);
  const shapeCount = constraints?.shapes.length ?? 0;
  const D = DEFAULT_PARAMS;
  const resetKeys = (keys: (keyof typeof D)[]) => keys.forEach((k) => setParam(k, D[k] as never));

  const sourceOptions = [
    { value: 'none' as SourceMode, label: 'Random' },
    ...(shapeCount > 0 ? [{ value: 'fill' as SourceMode, label: 'Fill' }, { value: 'mask' as SourceMode, label: 'Anchor' }] : []),
    ...(shapeCount > 1 ? [{ value: 'batch' as SourceMode, label: 'Batch' }] : []),
  ];
  const sourceHint: Record<SourceMode, string> = {
    none: shapeCount ? 'Ignores the selection and drops a new frame.' : 'Select a shape to fill it or anchor around it.',
    fill: 'Pattern is clipped inside the selected shape.',
    mask: 'Blocks gather around the selected shape.',
    batch: `Fills each of the ${shapeCount} selected shapes.`,
  };

  const setSize = (dim: 'width' | 'height', raw: string, clamp: boolean) => {
    const n = Number(raw);
    const v = Number.isFinite(n) && n > 0 ? n : 100;
    setActiveOutputPreset('custom');
    setParam('outputSize', { ...params.outputSize, [dim]: clamp ? Math.min(8000, Math.max(100, Math.round(v))) : Math.min(8000, v) });
  };

  return (
    <div className="pf-app">
      <header className="pf-header">
        <span className="pf-wordmark">Pattern Forge <span>v1</span></span>
        <span
          className={`pf-status ${isLiveArmed ? 'pf-status--live' : ''}`}
          title={isLiveArmed ? `Edits update “${constraints?.liveTargetName || ''}” on the canvas` : 'Select a Pattern Forge frame to edit it live'}
        >
          <span className="pf-status__dot" />
          {isLiveArmed ? 'Live' : shapeCount ? `${shapeCount} selected` : 'No selection'}
        </span>
      </header>

      <div className="pf-body">
        <div className="pf-stage">
          <CanvasPreviewRenderer spec={currentSpec} />
          <div className="pf-stage__meta">
            <span className={`pf-meta ${nodeCountWarning ? 'pf-meta--warn' : ''}`}>~{nodeCount} layers{nodeCountWarning ? ' · heavy' : ''}</span>
            <span className="pf-meta">{params.outputSize.width}×{params.outputSize.height}</span>
          </div>
          <SeedRow seed={params.seed} onSeedChange={(s) => setParam('seed', s)} onShuffle={shuffleSeed} />
        </div>

        <Panel title="Source" id="pf-panel-source" onReset={() => setMode('none')}>
          {sourceOptions.length > 1 && <Segmented<SourceMode> options={sourceOptions} value={mode} onChange={setMode} id="pf-source" />}
          <p className="tc-hint">{sourceHint[mode]}</p>
        </Panel>

        <Panel title="Palette" id="pf-panel-palette" onReset={() => resetKeys(['customColors'])}>
          <SwatchGrid activeTokens={params.activeTokens} customColors={params.customColors} onColorChange={handleColorChange} />
        </Panel>

        <Panel title="Composition" id="pf-panel-composition" onReset={() => resetKeys(['density', 'gridStrictness', 'scaleRange'])}>
          <Slider id="pf-slider-density" label="Density" value={params.density} defaultValue={D.density}
            min={1} max={10} step={0.5} decimals={1} onChange={(v) => setParam('density', v)} />
          <Slider id="pf-slider-grid" label="Grid snap" value={params.gridStrictness} defaultValue={D.gridStrictness}
            min={0} max={1} step={0.05} decimals={2} onChange={(v) => setParam('gridStrictness', v)} />
          <RangeSlider id="pf-slider-scale" label="Block size" value={params.scaleRange as [number, number]}
            defaultValue={D.scaleRange as [number, number]} min={0.02} max={0.7} step={0.01} minGap={0.02}
            onChange={(v) => setParam('scaleRange', v)} />
        </Panel>

        <Panel title="Surface" id="pf-panel-blend" onReset={() => resetKeys(['blendModes', 'textureEnabled', 'gradientEnabled'])}>
          <Segmented<BlendMode>
            label="Blend modes"
            multi
            options={(['NORMAL', 'MULTIPLY', 'SCREEN', 'DARKEN'] as BlendMode[]).map((b) => ({ value: b, label: b[0] + b.slice(1).toLowerCase() }))}
            value={params.blendModes}
            onChange={(bm) => {
              const on = params.blendModes.includes(bm);
              if (on && params.blendModes.length <= 1) return;
              setParam('blendModes', on ? params.blendModes.filter((m) => m !== bm) : [...params.blendModes, bm]);
            }}
          />
          <Switch id="pf-toggle-texture" label="Halftone texture" checked={params.textureEnabled} onChange={(v) => setParam('textureEnabled', v)} />
          <Switch id="pf-toggle-gradient" label="Gradient block" checked={params.gradientEnabled} onChange={(v) => setParam('gradientEnabled', v)} />
        </Panel>

        <Panel title="Labels" id="pf-panel-labels" onReset={() => resetKeys(['labelsEnabled', 'labelSource', 'customLabels', 'displayFont'])}>
          <Switch id="pf-toggle-labels" label="Data readouts" checked={params.labelsEnabled} onChange={(v) => setParam('labelsEnabled', v)} />
          {params.labelsEnabled && (
            <>
              <Segmented
                label="Text"
                options={[{ value: 'generated', label: 'Generated' }, { value: 'custom', label: 'Custom' }]}
                value={params.labelSource}
                onChange={(v) => setParam('labelSource', v as typeof params.labelSource)}
              />
              {params.labelSource === 'custom' && (
                <Field label="Lines" htmlFor="pf-label-custom-input" hint="One label per line. Empty falls back to generated codes.">
                  <textarea
                    className="pf-textarea"
                    id="pf-label-custom-input"
                    placeholder={'BRAND 2045\nXC% R6.O2'}
                    value={params.customLabels?.join('\n') ?? ''}
                    onChange={(e) => setParam('customLabels', e.target.value.split('\n').filter(Boolean))}
                  />
                </Field>
              )}
              <Field label="Font" htmlFor="pf-label-font" hint="Any font installed in Figma.">
                <input className="pf-input" id="pf-label-font" type="text" value={params.displayFont}
                  onChange={(e) => setParam('displayFont', e.target.value)} placeholder="Times New Roman" />
              </Field>
            </>
          )}
        </Panel>

        <Panel title="Frame" id="pf-panel-output" onReset={() => applyOutputPreset('square')}>
          <Field label="Format" htmlFor="pf-size-select">
            <select id="pf-size-select" className="pf-select" value={activeOutputPreset}
              onChange={(e) => e.target.value === 'custom' ? setActiveOutputPreset('custom') : applyOutputPreset(e.target.value as OutputPresetKey)}>
              {OUTPUT_PRESET_KEYS.map((k) => <option key={k} value={k}>{OUTPUT_PRESETS[k].label}</option>)}
              <option value="custom">Custom</option>
              {activeOutputPreset === 'selection' && <option value="selection">From selection</option>}
            </select>
          </Field>
          <div className="pf-size-grid">
            {(['width', 'height'] as const).map((dim) => (
              <label key={dim} className="pf-affix">
                <span>{dim === 'width' ? 'W' : 'H'}</span>
                <input id={`pf-custom-${dim}`} className="pf-input" type="number" min={100} max={8000} aria-label={`${dim} in pixels`}
                  value={params.outputSize[dim]}
                  onChange={(e) => setSize(dim, e.target.value, false)}
                  onBlur={(e) => setSize(dim, e.target.value, true)} />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Presets" defaultOpen={false} id="pf-panel-presets">
          <div className="pf-presets-row">
            {BUILT_IN_PRESETS.map((preset) => (
              <PresetChip key={preset.id} id={`pf-preset-${preset.id}`} name={preset.name} isBuiltIn
                isActive={activePresetId === preset.id}
                onClick={() => { setActivePresetId(preset.id); applyPreset(preset); }} />
            ))}
            {userPresets.map((preset) => (
              <PresetChip key={preset.id} id={`pf-preset-${preset.id}`} name={preset.name}
                isActive={activePresetId === preset.id}
                onClick={() => { setActivePresetId(preset.id); applyPreset(preset); }}
                onDelete={() => removeUserPreset(preset.id)} />
            ))}
          </div>
          {showSavePreset ? (
            <div className="pf-save-preset">
              <input className="pf-input" id="pf-save-preset-input" type="text" placeholder="Preset name" value={savePresetName}
                onChange={(e) => setSavePresetName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowSavePreset(false); }}
                autoFocus />
              <Button size="sm" variant="primary" onClick={handleSavePreset} id="pf-save-preset-confirm">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSavePreset(false)} title="Cancel">Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setShowSavePreset(true)} id="pf-save-preset-btn">Save current as preset</Button>
          )}
        </Panel>
      </div>

      <footer className={`pf-footer ${isInserting ? 'is-busy' : ''}`}>
        <Button id="pf-btn-regenerate" variant="secondary" onClick={handleRegenerate} disabled={isInserting} title="New seed, same settings">
          Shuffle
        </Button>
        <Button id="pf-btn-insert" variant="primary" fullWidth onClick={handleInsert} disabled={isInserting}
          title={mode === 'batch' ? `Fill ${shapeCount} selected shapes` : 'Insert pattern to canvas'}>
          {isInserting ? 'Inserting…' : mode === 'batch' ? `Fill ${shapeCount} shapes` : isLiveArmed ? 'Insert new copy' : 'Insert to canvas'}
        </Button>
      </footer>
    </div>
  );
};
