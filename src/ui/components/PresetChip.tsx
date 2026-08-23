// ─── Preset chip ─────────────────────────────────────────────────────────────
import React from 'react';
import './PresetChip.css';

interface PresetChipProps {
  name: string;
  isBuiltIn?: boolean;
  isActive?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  id?: string;
}

export const PresetChip: React.FC<PresetChipProps> = ({
  name, isBuiltIn, isActive, onClick, onDelete, id,
}) => (
  <div
    className={`pf-preset-chip ${isActive ? 'pf-preset-chip--active' : ''} ${isBuiltIn ? 'pf-preset-chip--builtin' : ''}`}
    id={id}
  >
    <button className="pf-preset-chip__btn" onClick={onClick} title={`Load preset: ${name}`}>
      {name}
    </button>
    {!isBuiltIn && onDelete && (
      <button
        className="pf-preset-chip__delete"
        onClick={onDelete}
        title={`Delete preset: ${name}`}
        aria-label={`Delete ${name}`}
      >
        ×
      </button>
    )}
  </div>
);
