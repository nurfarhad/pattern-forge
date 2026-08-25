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
import { CanvasPreviewRenderer } from './preview/CanvasPreviewRenderer';

import {
  useParamsStore,
  BUILT_IN_PRESETS,
} from './state/params';
import type { BlendMode, PaletteToken, SourceMode } from '@generator/scene-spec';
import { OUTPUT_PRESETS, type OutputPresetKey } from '@generator/scene-spec';
import { estimateNodeCount } from '@generator/layout';
import { sendInsert, sendLiveUpdate, sendRequestSelectionInfo, onPluginMessage } from './bridge';

// ─── App ─────────────────────────────────────────────────────────────────────

const OUTPUT_PRESET_KEYS = Object.keys(OUTPUT_PRESETS) as OutputPresetKey[];

export const App: React.FC = () => {
  const store = useParamsStore();
  const {
    params, mode, currentSpec, userPresets,
    setParam, setMode, regenerate,
    applyPreset, addUserPreset, removeUserPreset,
    loadRecipe, setInserting, isInserting, constraints,
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
        store.setConstraints(msg.constraints);
      } else if (msg.type === 'INSERT_COMPLETE') {
        setInserting(false);
      } else if (msg.type === 'LOADED_RECIPE') {
        isSyncingRecipeRef.current = true;
        loadRecipe(msg.params, msg.seed);
        setTimeout(() => {
          isSyncingRecipeRef.current = false;
        }, 150);
      }
    });

    // Ask for initial selection state
    sendRequestSelectionInfo();
    return unsub;
  }, []);

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

  // ── Mode badge & Live status indicator ───────────────────────────────────
  const isLiveArmed = Boolean(constraints?.canLiveUpdate && constraints.liveTargetId);

  const modeBadgeClass = isLiveArmed
    ? 'pf-header__mode-badge--live'
    : {
        none: 'pf-header__mode-badge--random',
        fill: 'pf-header__mode-badge--fill',
        mask: 'pf-header__mode-badge--mask',
        batch: 'pf-header__mode-badge--batch',
      }[mode];

  const modeLabel = isLiveArmed
    ? '● Live'
    : {
        none: 'Random',
        fill: 'Fill Selection',
        mask: 'Mask Mode',
        batch: `Batch (${constraints?.shapes.length ?? 0})`,
      }[mode];

  return (
    <div className="pf-app">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="pf-header">
        <div className="pf-header__title">
          <span className="pf-header__wordmark">Pattern<span>Forge</span></span>
        </div>
        <div className="pf-header__mode-control">
          <span className={`pf-header__mode-badge ${modeBadgeClass}`} title={isLiveArmed ? `Live updating frame "${constraints?.liveTargetName || ''}"` : undefined}>
            {modeLabel}
          </span>
          <select
            className="pf-header__mode-select"
            value={mode}
            onChange={(event) => setMode(event.target.value as SourceMode)}
            aria-label="Generation source mode"
            title="Generation source mode"
          >
            <option value="none">Random</option>
            {(constraints?.shapes.length ?? 0) > 0 && <option value="fill">Fill Selection</option>}
            {(constraints?.shapes.length ?? 0) > 0 && <option value="mask">Anchor Around Selection</option>}
            {(constraints?.shapes.length ?? 0) > 1 && <option value="batch">Batch Selection</option>}
          </select>
        </div>
      </header>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="pf-body">

        {/* 1. Live Preview */}
        <div className="pf-preview-section">
          <CanvasPreviewRenderer spec={currentSpec} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span className="pf-node-count">~{nodeCount} nodes</span>
            {nodeCountWarning && (
              <span style={{ fontSize: 10, color: 'var(--pf-warning)' }}>⚠ High node count</span>
            )}
          </div>
        </div>

        {/* 2. Palette with 11 customizable blocks */}
        <Panel title="Palette" id="pf-panel-palette">
          <SwatchGrid
            activeTokens={params.activeTokens}
            customColors={params.customColors}
            onColorChange={handleColorChange}
          />
          <p className="pf-help">Click swatches to change colors.</p>
        </Panel>

        {/* 3. Composition */}
        <Panel title="Composition" id="pf-panel-composition">
          <Slider
            id="pf-slider-density"
            label="Density"
            value={params.density}
            min={1} max={10} step={0.5} decimals={1}
            onChange={(v) => setParam('density', v)}
          />
          <Slider
            id="pf-slider-grid"
            label="Grid Strictness"
            value={params.gridStrictness}
            min={0} max={1} step={0.05} decimals={2}
            onChange={(v) => setParam('gridStrictness', v)}
          />
          <div>
            <div style={{ fontSize: 10, color: 'var(--pf-text-secondary)', marginBottom: 6, fontWeight: 500, letterSpacing: '0.03em' }}>
              Block Scale Range
            </div>
            <div className="pf-range-row">
              <Slider
                id="pf-slider-scale-min"
                label="Min"
                value={params.scaleRange[0]}
                min={0.02} max={params.scaleRange[1] - 0.02} step={0.01} decimals={2}
                onChange={(v) => setParam('scaleRange', [v, params.scaleRange[1]])}
              />
              <Slider
                id="pf-slider-scale-max"
                label="Max"
                value={params.scaleRange[1]}
                min={params.scaleRange[0] + 0.02} max={0.7} step={0.01} decimals={2}
                onChange={(v) => setParam('scaleRange', [params.scaleRange[0], v])}
              />
            </div>
          </div>
        </Panel>

        {/* 4. Blend & Texture */}
        <Panel title="Blend & Texture" id="pf-panel-blend">
          <div>
            <div style={{ fontSize: 10, color: 'var(--pf-text-secondary)', marginBottom: 4, fontWeight: 500 }}>
              Blend Mode
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(['NORMAL', 'MULTIPLY', 'SCREEN', 'DARKEN'] as BlendMode[]).map((bm) => {
                const isActive = params.blendModes.includes(bm);
                return (
                  <button
                    key={bm}
                    id={`pf-blend-${bm.toLowerCase()}`}
                    className={`pf-size-chip ${isActive ? 'pf-size-chip--active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => {
                      if (isActive && params.blendModes.length <= 1) return; // always keep at least 1
                      const next = isActive
                        ? params.blendModes.filter((m) => m !== bm)
                        : [...params.blendModes, bm];
                      setParam('blendModes', next);
                    }}
                  >
                    {bm}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pf-toggle-row">
            <span className="pf-toggle-row__label">Halftone Texture</span>
            <label className="pf-toggle">
              <input
                type="checkbox"
                checked={params.textureEnabled}
                onChange={(e) => setParam('textureEnabled', e.target.checked)}
                id="pf-toggle-texture"
              />
              <span className="pf-toggle__slider" />
            </label>
          </div>

          <div className="pf-toggle-row">
            <span className="pf-toggle-row__label">Gradient Block</span>
            <label className="pf-toggle">
              <input
                type="checkbox"
                checked={params.gradientEnabled}
                onChange={(e) => setParam('gradientEnabled', e.target.checked)}
                id="pf-toggle-gradient"
              />
              <span className="pf-toggle__slider" />
            </label>
          </div>
        </Panel>

        {/* 5. Labels */}
        <Panel title="Labels" id="pf-panel-labels">
          <div className="pf-toggle-row">
            <span className="pf-toggle-row__label">Data-readout Labels</span>
            <label className="pf-toggle">
              <input
                type="checkbox"
                checked={params.labelsEnabled}
                onChange={(e) => setParam('labelsEnabled', e.target.checked)}
                id="pf-toggle-labels"
              />
              <span className="pf-toggle__slider" />
            </label>
          </div>

          {params.labelsEnabled && (
            <>
              <div className="pf-mode-tabs">
                <button
                  className={`pf-mode-tab ${params.labelSource === 'generated' ? 'pf-mode-tab--active' : ''}`}
                  onClick={() => setParam('labelSource', 'generated')}
                  id="pf-label-source-generated"
                >
                  Generated
                </button>
                <button
                  className={`pf-mode-tab ${params.labelSource === 'custom' ? 'pf-mode-tab--active' : ''}`}
                  onClick={() => setParam('labelSource', 'custom')}
                  id="pf-label-source-custom"
                >
                  Custom
                </button>
              </div>

              {params.labelSource === 'custom' && (
                <>
                  <textarea
                    className="pf-textarea"
                    id="pf-label-custom-input"
                    placeholder="One label per line&#10;e.g. BRAND 2045&#10;XC% R6.O2"
                    value={params.customLabels?.join('\n') ?? ''}
                    onChange={(e) =>
                      setParam('customLabels', e.target.value.split('\n').filter(Boolean))
                    }
                  />
                  <p className="pf-help">One entry per line. Leave empty to fall back to generated codes.</p>
                </>
              )}

              <div>
                <div style={{ fontSize: 10, color: 'var(--pf-text-secondary)', marginBottom: 4, fontWeight: 500 }}>
                  Font (display serif)
                </div>
                <input
                  className="pf-input"
                  id="pf-label-font"
                  type="text"
                  value={params.displayFont}
                  onChange={(e) => setParam('displayFont', e.target.value)}
                  placeholder="Times New Roman"
                />
                <p className="pf-help">Must be installed in Figma. Times New Roman is the default placeholder.</p>
              </div>
            </>
          )}
        </Panel>

        {/* 6. Output Size */}
        <Panel title="Output Size" id="pf-panel-output">
          <div className="pf-size-presets">
            {OUTPUT_PRESET_KEYS.map((key) => (
              <button
                key={key}
                id={`pf-size-${key}`}
                className={`pf-size-chip ${activeOutputPreset === key ? 'pf-size-chip--active' : ''}`}
                onClick={() => applyOutputPreset(key)}
              >
                {OUTPUT_PRESETS[key].label}
              </button>
            ))}
            <button
              id="pf-size-custom"
              className={`pf-size-chip ${activeOutputPreset === 'custom' ? 'pf-size-chip--active' : ''}`}
              onClick={() => setActiveOutputPreset('custom')}
            >
              Custom
            </button>
          </div>

          {activeOutputPreset === 'custom' && (
            <div className="pf-output-custom">
              <div>
                <div style={{ fontSize: 10, color: 'var(--pf-text-secondary)', marginBottom: 4 }}>W (px)</div>
                <input
                  className="pf-input"
                  type="number"
                  min={100} max={8000}
                  value={params.outputSize.width}
                  onChange={(e) => setParam('outputSize', { ...params.outputSize, width: Number(e.target.value) })}
                  id="pf-custom-width"
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--pf-text-secondary)', marginBottom: 4 }}>H (px)</div>
                <input
                  className="pf-input"
                  type="number"
                  min={100} max={8000}
                  value={params.outputSize.height}
                  onChange={(e) => setParam('outputSize', { ...params.outputSize, height: Number(e.target.value) })}
                  id="pf-custom-height"
                />
              </div>
            </div>
          )}
        </Panel>

        {/* 7. Presets */}
        <Panel title="Presets" defaultOpen={false} id="pf-panel-presets">
          <div className="pf-presets-row">
            {BUILT_IN_PRESETS.map((preset) => (
              <PresetChip
                key={preset.id}
                id={`pf-preset-${preset.id}`}
                name={preset.name}
                isBuiltIn
                isActive={activePresetId === preset.id}
                onClick={() => {
                  setActivePresetId(preset.id);
                  applyPreset(preset);
                }}
              />
            ))}
            {userPresets.map((preset) => (
              <PresetChip
                key={preset.id}
                id={`pf-preset-${preset.id}`}
                name={preset.name}
                isActive={activePresetId === preset.id}
                onClick={() => {
                  setActivePresetId(preset.id);
                  applyPreset(preset);
                }}
                onDelete={() => removeUserPreset(preset.id)}
              />
            ))}
          </div>

          {showSavePreset ? (
            <div className="pf-save-preset">
              <input
                className="pf-input"
                id="pf-save-preset-input"
                type="text"
                placeholder="Preset name…"
                value={savePresetName}
                onChange={(e) => setSavePresetName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowSavePreset(false); }}
                autoFocus
              />
              <Button size="sm" variant="primary" onClick={handleSavePreset} id="pf-save-preset-confirm">Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowSavePreset(false)}>✕</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setShowSavePreset(true)} id="pf-save-preset-btn">
              + Save current as preset
            </Button>
          )}
        </Panel>

      </div>

      {/* ── Footer / action bar ──────────────────────────────────────────── */}
      <footer className="pf-footer">
        <Button
          id="pf-btn-regenerate"
          variant="secondary"
          onClick={handleRegenerate}
          disabled={isInserting}
          title="Generate new layout with same settings"
        >
          ↺ Regenerate
        </Button>
        <Button
          id="pf-btn-insert"
          variant="primary"
          fullWidth
          onClick={handleInsert}
          disabled={isInserting}
          title={
            mode === 'batch'
              ? `Fill ${constraints?.shapes.length ?? 0} selected shapes`
              : 'Insert pattern to canvas'
          }
        >
          {isInserting
            ? 'Inserting…'
            : mode === 'batch'
            ? `Fill ${constraints?.shapes.length ?? 0} Shapes`
            : '↓ Insert to Canvas'}
        </Button>
      </footer>
    </div>
  );
};
