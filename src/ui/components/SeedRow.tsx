// ─── Seed row ─────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import './SeedRow.css';

interface SeedRowProps {
  seed: string;
  onSeedChange: (seed: string) => void;
  onShuffle: () => void;
}

export const SeedRow: React.FC<SeedRowProps> = ({ seed, onSeedChange, onShuffle }) => {
  const [locked, setLocked] = useState(false);

  const handleShuffle = () => {
    if (!locked) onShuffle();
  };

  return (
    <div className="pf-seed-row">
      <label className="pf-seed-row__label" htmlFor="pf-seed-input">Seed</label>
      <div className="pf-seed-row__controls">
        <input
          id="pf-seed-input"
          className="pf-seed-row__input"
          type="text"
          value={seed}
          onChange={(e) => onSeedChange(e.target.value)}
          placeholder="e.g. 8842"
          maxLength={20}
        />
        <button
          className="pf-seed-row__btn"
          onClick={handleShuffle}
          title={locked ? 'Seed is locked' : 'Shuffle seed'}
          disabled={locked}
          id="pf-seed-shuffle"
          aria-label="Shuffle seed"
        >
          {/* Dice icon */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="5.5" cy="5.5" r="1" fill="currentColor"/>
            <circle cx="10.5" cy="10.5" r="1" fill="currentColor"/>
            <circle cx="10.5" cy="5.5" r="1" fill="currentColor"/>
            <circle cx="5.5" cy="10.5" r="1" fill="currentColor"/>
            <circle cx="8" cy="8" r="1" fill="currentColor"/>
          </svg>
        </button>
        <button
          className={`pf-seed-row__btn pf-seed-row__lock ${locked ? 'pf-seed-row__lock--on' : ''}`}
          onClick={() => setLocked(!locked)}
          title={locked ? 'Unlock seed' : 'Lock seed'}
          id="pf-seed-lock"
          aria-label={locked ? 'Unlock seed' : 'Lock seed'}
          aria-pressed={locked}
        >
          {locked ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <rect x="1" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M3 6V4.5a3 3 0 0 1 6 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <rect x="1" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M3 6V4.5a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
