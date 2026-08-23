// ─── Slider component ─────────────────────────────────────────────────────────
import React from 'react';
import './Slider.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  unit?: string;
  onChange: (value: number) => void;
  id?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label, value, min, max, step = 0.01, decimals = 1, unit = '', onChange, id,
}) => {
  const percent = ((value - min) / (max - min)) * 100;
  const displayVal = Number.isInteger(value) && decimals === 0
    ? value
    : value.toFixed(decimals);

  return (
    <div className="pf-slider" id={id}>
      <div className="pf-slider__header">
        <span className="pf-slider__label">{label}</span>
        <span className="pf-slider__value">{displayVal}{unit}</span>
      </div>
      <div className="pf-slider__track-wrap">
        <div className="pf-slider__fill" style={{ width: `${percent}%` }} />
        <input
          type="range"
          className="pf-slider__input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
        />
      </div>
    </div>
  );
};
