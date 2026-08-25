// ─── Palette tokens ───────────────────────────────────────────────────────────
// PRD §4.2 — measured from flat (non-photographed) reference files.
// All values are provisional; swapping for real brand hex is a config change.
// Colors stored as hex strings; resolved to Figma 0–1 RGB at render time.

import type { PaletteToken, RGBColor } from './scene-spec';

// ─── Token map ────────────────────────────────────────────────────────────────

export const PALETTE: Record<PaletteToken, string> = {
  signalOrange:   '#FC4800',   // most-used accent
  alertRed:       '#FC3018',   // dominant block color, largest area coverage
  electricViolet: '#8400FC',   // secondary
  orchidMagenta:  '#B43CD8',   // secondary
  hotPink:        '#FC4890',   // secondary
  blush:          '#F0D8E4',   // pale pastel accent
  forestGreen:    '#3C9054',   // dark end of signature gradient block
  sageMint:       '#A8C0A8',   // light end of gradient block
  sand:           '#FCE4C0',   // cream/tan bars
  amber:          '#F0B400',   // rare gold accent
  slateBlueGray:  '#6C9CCC',   // cool block, pairs with orange
  ink:            '#1E1E1E',   // headline type, dots, hairline rules
  paper:          '#FFFFFF',   // canvas background
  fog:            '#F0F0F0',   // light gray panel background
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a hex string (#RRGGBB) → Figma-compatible 0–1 RGB object.
 */
export function hexToRgb(hex: string): RGBColor {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

/**
 * Get hex color string for a token, taking user custom palette into account.
 */
export function getTokenHex(token: PaletteToken, customColors?: Record<string, string>): string {
  if (customColors && customColors[token]) {
    return customColors[token];
  }
  return PALETTE[token] || '#000000';
}

/**
 * Resolve a PaletteToken to a Figma 0–1 RGB object.
 */
export function resolveToken(token: PaletteToken, customColors?: Record<string, string>): RGBColor {
  return hexToRgb(getTokenHex(token, customColors));
}

/**
 * Resolve a PaletteToken to a CSS rgba() string for preview rendering.
 */
export function tokenToCss(
  token: PaletteToken,
  customColorsOrOpacity?: Record<string, string> | number,
  opacity = 1,
): string {
  const custom = typeof customColorsOrOpacity === 'object' ? customColorsOrOpacity : undefined;
  const op = typeof customColorsOrOpacity === 'number' ? customColorsOrOpacity : opacity;
  const { r, g, b } = resolveToken(token, custom);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${op})`;
}

/**
 * All tokens in the default rotation (excludes paper/fog which are structural).
 */
export const ALL_ACTIVE_TOKENS: PaletteToken[] = [
  'signalOrange', 'alertRed', 'electricViolet', 'orchidMagenta',
  'hotPink', 'blush', 'forestGreen', 'sageMint', 'sand',
  'amber', 'slateBlueGray',
];

/**
 * Token display names for the UI swatch grid.
 */
export const TOKEN_LABELS: Record<PaletteToken, string> = {
  signalOrange:   'Signal Orange',
  alertRed:       'Alert Red',
  electricViolet: 'Electric Violet',
  orchidMagenta:  'Orchid Magenta',
  hotPink:        'Hot Pink',
  blush:          'Blush',
  forestGreen:    'Forest Green',
  sageMint:       'Sage Mint',
  sand:           'Sand',
  amber:          'Amber',
  slateBlueGray:  'Slate Blue-Gray',
  ink:            'Ink',
  paper:          'Paper',
  fog:            'Fog',
};
