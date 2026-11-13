// ─── Slider — Toolcraft hairline track, square thumb, editable value ─────────
import React, { useEffect, useRef, useState } from 'react';
import { interaction } from '../state/interaction';
import './Slider.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  unit?: string;
  defaultValue?: number;
  discrete?: boolean;
  onChange: (value: number) => void;
  id?: string;
}

const clampStep = (v: number, min: number, max: number, step: number) => {
  const s = Math.round((v - min) / step) * step + min;
  return Math.min(max, Math.max(min, Number(s.toFixed(6))));
};

/** Coalesce many pointer events into at most one onChange per animation frame. */
export function useFrameEmitter<T>(onChange: (v: T) => void) {
  const pending = useRef<{ v: T } | null>(null);
  const raf = useRef(0);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const flush = () => { raf.current = 0; if (pending.current) { const { v } = pending.current; pending.current = null; cb.current(v); } };
  return {
    emit(v: T) { pending.current = { v }; if (!raf.current) raf.current = requestAnimationFrame(flush); },
    flushNow() { if (raf.current) { cancelAnimationFrame(raf.current); flush(); } },
  };
}

export function useTrackDrag(min: number, max: number, step: number) {
  const ref = useRef<HTMLDivElement>(null);
  const valueAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return clampStep(min + t * (max - min), min, max, step);
  };
  return { ref, valueAt };
}

export const ValueLabel: React.FC<{ text: string; numeric: number; onCommit: (v: number) => void; label: string }> = ({ text, numeric, onCommit, label }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  if (editing) {
    return (
      <input
        className="tc-value tc-value--input"
        autoFocus
        value={draft}
        aria-label={`${label} value`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { const n = parseFloat(draft); if (Number.isFinite(n)) onCommit(n); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <button type="button" className="tc-value" title="Click to type a value" onClick={() => { setDraft(String(numeric)); setEditing(true); }}>
      {text}
    </button>
  );
};

export const Slider: React.FC<SliderProps> = ({
  label, value, min, max, step = 0.01, decimals = 1, unit = '', defaultValue, discrete, onChange, id,
}) => {
  const { ref, valueAt } = useTrackDrag(min, max, step);
  const [dragging, setDragging] = useState(false);
  const [local, setLocal] = useState<number | null>(null);
  const out = useFrameEmitter(onChange);
  const shown = local ?? value;
  const pct = ((shown - min) / (max - min)) * 100;
  const move = (v: number) => { setLocal(v); if (v !== shown) out.emit(v); };
  const end = () => { out.flushNow(); setDragging(false); setLocal(null); interaction.set(false); };
  const fmt = (v: number) => (decimals === 0 ? Math.round(v) : v.toFixed(decimals)) + unit;
  const positions = Math.round((max - min) / step) + 1;
  const ticks = discrete && positions <= 32 ? Array.from({ length: positions - 2 }, (_, i) => ((i + 1) / (positions - 1)) * 100) : [];

  const onKey = (e: React.KeyboardEvent) => {
    const mult = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(clampStep(value + step * mult, min, max, step)); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(clampStep(value - step * mult, min, max, step)); }
    if (e.key === 'Home') onChange(min);
    if (e.key === 'End') onChange(max);
  };

  return (
    <div className="tc-field" id={id}>
      <div className="tc-field__row">
        <span className="tc-label">{label}</span>
        <ValueLabel text={fmt(shown)} numeric={Number(value.toFixed(decimals))} label={label} onCommit={(v) => onChange(clampStep(v, min, max, step))} />
      </div>
      <div
        ref={ref}
        className={`tc-slider ${dragging ? 'is-dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={fmt(shown)}
        onKeyDown={onKey}
        onDoubleClick={() => defaultValue !== undefined && onChange(defaultValue)}
        onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); interaction.set(true); setDragging(true); move(valueAt(e.clientX)); }}
        onPointerMove={(e) => { if (dragging) move(valueAt(e.clientX)); }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={() => dragging && end()}
      >
        <div className="tc-slider__track" />
        <div className="tc-slider__range" style={{ width: `${pct}%` }} />
        {ticks.map((t) => <span key={t} className="tc-slider__tick" style={{ left: `${t}%` }} />)}
        <span className="tc-slider__thumb" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
};

interface RangeSliderProps {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  minGap?: number;
  defaultValue?: [number, number];
  onChange: (value: [number, number]) => void;
  id?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label, value, min, max, step = 0.01, decimals = 2, minGap = step, defaultValue, onChange, id,
}) => {
  const { ref, valueAt } = useTrackDrag(min, max, step);
  const [active, setActive] = useState<0 | 1 | null>(null);
  const [local, setLocal] = useState<[number, number] | null>(null);
  const out = useFrameEmitter(onChange);
  const cur = local ?? value;
  const [lo, hi] = cur;
  const p = (v: number) => ((v - min) / (max - min)) * 100;
  const set = (which: 0 | 1, v: number) => {
    const next: [number, number] = which === 0 ? [Math.max(min, Math.min(v, hi - minGap)), hi] : [lo, Math.min(max, Math.max(v, lo + minGap))];
    if (active === null && local === null) { onChange(next); return; }
    setLocal(next); out.emit(next);
  };
  const end = () => { out.flushNow(); setActive(null); setLocal(null); interaction.set(false); };
  const text = `${lo.toFixed(decimals)} – ${hi.toFixed(decimals)}`;

  return (
    <div className="tc-field" id={id}>
      <div className="tc-field__row">
        <span className="tc-label">{label}</span>
        <span className="tc-value tc-value--static">{text}</span>
      </div>
      <div
        ref={ref}
        className={`tc-slider ${active !== null ? 'is-dragging' : ''}`}
        onDoubleClick={() => defaultValue && onChange(defaultValue)}
        onPointerDown={(e) => {
          const v = valueAt(e.clientX);
          const which: 0 | 1 = Math.abs(v - lo) <= Math.abs(v - hi) ? 0 : 1;
          if (e.button !== 0) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          interaction.set(true);
          setActive(which);
          const next: [number, number] = which === 0 ? [Math.min(v, hi - minGap), hi] : [lo, Math.max(v, lo + minGap)];
          setLocal(next); out.emit(next);
        }}
        onPointerMove={(e) => { if (active !== null) set(active, valueAt(e.clientX)); }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={() => active !== null && end()}
      >
        <div className="tc-slider__track" />
        <div className="tc-slider__range" style={{ left: `${p(lo)}%`, width: `${p(hi) - p(lo)}%` }} />
        {([0, 1] as const).map((i) => (
          <span
            key={i}
            className="tc-slider__thumb"
            style={{ left: `${p(cur[i])}%` }}
            role="slider"
            tabIndex={0}
            aria-label={`${label} ${i === 0 ? 'minimum' : 'maximum'}`}
            aria-valuenow={cur[i]}
            aria-valuemin={min}
            aria-valuemax={max}
            onKeyDown={(e) => {
              const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0;
              if (d) { e.preventDefault(); set(i, clampStep(cur[i] + d * (e.shiftKey ? 10 : 1), min, max, step)); }
            }}
          />
        ))}
      </div>
    </div>
  );
};
