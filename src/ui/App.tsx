// ─── Pattern Forge — Minimal UI App ──────────────────────────────────────────
// Clean, streamlined plugin interface with 11 customizable color blocks and live canvas updates.

import React, { useEffect } from 'react';
import './App.css';

import { Panel } from './components/Panel';
import { Button } from './components/Button';
import { SwatchGrid } from './components/SwatchGrid';
import { CanvasPreviewRenderer } from './preview/CanvasPreviewRenderer';

import { useParamsStore } from './state/params';
import type { PaletteToken, SourceMode } from '@generator/scene-spec';
import { estimateNodeCount } from '@generator/layout';
import { sendInsert, sendLiveUpdate, sendRequestSelectionInfo, onPluginMessage } from './bridge';

export const App: React.FC = () => {
  const store = useParamsStore();
  const {
    params, mode, currentSpec,
    setParam, setParams, setMode, regenerate,
    loadRecipe, setInserting, isInserting, constraints,
  } = store;

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
