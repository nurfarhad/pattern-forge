// ─── Toolcraft-style Switch, Segmented and Field primitives ──────────────────
import React from 'react';
import './Controls.css';

export const Switch: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; id?: string }> = ({ label, checked, onChange, id }) => (
  <label className="tc-switch-row" htmlFor={id}>
    <span className="tc-label">{label}</span>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      className={`tc-switch ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="tc-switch__thumb" />
    </button>
  </label>
);

interface SegOption<T extends string> { value: T; label: string }

export function Segmented<T extends string>({ label, options, value, onChange, multi, id }: {
  label?: string;
  options: SegOption<T>[];
  value: T | T[];
  onChange: (v: T) => void;
  multi?: boolean;
  id?: string;
}) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className="tc-field" id={id}>
      {label && <div className="tc-field__row"><span className="tc-label">{label}</span></div>}
      <div className="tc-segmented" role={multi ? 'group' : 'radiogroup'} aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role={multi ? undefined : 'radio'}
            aria-checked={multi ? undefined : isOn(o.value)}
            aria-pressed={multi ? isOn(o.value) : undefined}
            className={`tc-segmented__item ${isOn(o.value) ? 'is-on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string; htmlFor?: string }> = ({ label, children, hint, htmlFor }) => (
  <div className="tc-field">
    <div className="tc-field__row"><label className="tc-label" htmlFor={htmlFor}>{label}</label></div>
    {children}
    {hint && <p className="tc-hint">{hint}</p>}
  </div>
);
