// ─── Palette swatch grid ──────────────────────────────────────────────────────
import React from 'react';
import type { PaletteToken } from '@generator/scene-spec';
import { PALETTE, TOKEN_LABELS, ALL_ACTIVE_TOKENS } from '@generator/palette';
import './SwatchGrid.css';

interface SwatchGridProps {
  activeTokens: PaletteToken[];
  onChange: (tokens: PaletteToken[]) => void;
}

export const SwatchGrid: React.FC<SwatchGridProps> = ({ activeTokens, onChange }) => {
  const toggleToken = (token: PaletteToken) => {
    const isActive = activeTokens.includes(token);
    if (isActive && activeTokens.length <= 1) return; // always keep at least 1
    const next = isActive
      ? activeTokens.filter((t) => t !== token)
      : [...activeTokens, token];
    onChange(next);
  };

  return (
    <div className="pf-swatch-grid" role="group" aria-label="Active palette tokens">
      {ALL_ACTIVE_TOKENS.map((token) => {
        const isActive = activeTokens.includes(token);
        const hex = PALETTE[token];
        return (
          <button
            key={token}
            className={`pf-swatch ${isActive ? 'pf-swatch--active' : 'pf-swatch--inactive'}`}
            style={{ '--swatch-color': hex } as React.CSSProperties}
            onClick={() => toggleToken(token)}
            title={`${TOKEN_LABELS[token]} (${hex}) — ${isActive ? 'click to remove' : 'click to add'}`}
            aria-label={`${TOKEN_LABELS[token]} — ${isActive ? 'active' : 'inactive'}`}
            aria-pressed={isActive}
            id={`pf-swatch-${token}`}
          />
        );
      })}
    </div>
  );
};
