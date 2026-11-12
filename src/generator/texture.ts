import type { TextureSpec } from './scene-spec';
import { getTokenHex } from './palette';

export const DEFAULT_DOT_SIZE = 1.5;
export const MAX_TEXTURE_DOTS_PER_REGION = 2400;

export function buildDotGridSvg(spec: TextureSpec, resolvedInkHex: string): string {
  const width = Math.max(1, spec.region.width);
  const height = Math.max(1, spec.region.height);
  const spacing = Math.max(spec.dotSize * 2.5, spec.spacing, 1);
  const columns = Math.ceil(width / spacing);
  const rows = Math.ceil(height / spacing);
  const circles: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const centerX = column * spacing + spacing / 2;
      const centerY = row * spacing + spacing / 2;
      circles.push(
        `<circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${spec.dotSize}" fill="${resolvedInkHex}"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${circles.join('')}</svg>`;
}

export function textureSpecToDataUrl(spec: TextureSpec, customColors?: Record<string, string>): string {
  const inkHex = getTokenHex(spec.ink, customColors);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildDotGridSvg(spec, inkHex))}`;
}

export function estimateTextureDotCount(spec: TextureSpec): number {
  const spacing = Math.max(spec.dotSize * 2.5, spec.spacing, 1);
  return Math.ceil(spec.region.width / spacing) * Math.ceil(spec.region.height / spacing);
}

export function computeSpacing(textureDensity: number): number {
  const safeDensity = Number.isFinite(textureDensity)
    ? Math.min(4, Math.max(0.25, textureDensity))
    : 1;
  return 16 / safeDensity;
}
