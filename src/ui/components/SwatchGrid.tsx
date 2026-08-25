// ─── Palette swatch grid with customizable colors ─────────────────────────────
import React, { useRef } from 'react';
import type { PaletteToken } from '@generator/scene-spec';
import { getTokenHex, TOKEN_LABELS, ALL_ACTIVE_TOKENS } from '@generator/palette';
import './SwatchGrid.css';

interface SwatchGridProps {
  activeTokens: PaletteToken[];
  customColors?: Record<string, string>;
  onColorChange: (token: PaletteToken, hex: string) => void;
}

export const SwatchGrid: React.FC<SwatchGridProps> = ({
  activeTokens,
  customColors,
  onColorChange,
}) => {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSwatchClick = (token: PaletteToken) => {
    const input = inputRefs.current[token];
    if (input) {
      input.click();
    }
  };

  return (
    <div className="pf-swatch-grid" role="group" aria-label="11 color palette blocks">
      {ALL_ACTIVE_TOKENS.map((token) => {
        const hex = getTokenHex(token, customColors);
        return (
          <div
            key={token}
            className="pf-swatch-wrapper"
            title={`${TOKEN_LABELS[token]} (${hex}) — Click to change color`}
          >
            <button
              type="button"
              className="pf-swatch"
              style={{ '--swatch-color': hex } as React.CSSProperties}
              onClick={() => handleSwatchClick(token)}
              aria-label={`${TOKEN_LABELS[token]} (${hex}) — Click to change color`}
              id={`pf-swatch-${token}`}
            />
            <input
              ref={(el) => { inputRefs.current[token] = el; }}
              type="color"
              className="pf-swatch-color-input"
              value={hex.startsWith('#') && hex.length === 7 ? hex : '#FC4800'}
              onChange={(e) => onColorChange(token, e.target.value.toUpperCase())}
            />
          </div>
        );
      })}
    </div>
  );
};
