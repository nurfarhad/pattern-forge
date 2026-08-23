// ─── Font helpers ─────────────────────────────────────────────────────────────
// Loads required fonts before creating TextNodes.
// Falls back gracefully to Times New Roman if the preferred font isn't available.

/**
 * Try to load a font; fall back to Times New Roman if unavailable.
 */
export async function loadDisplayFont(family: string): Promise<FontName> {
  const candidates: FontName[] = [
    { family, style: 'Regular' },
    { family, style: 'Normal' },
    { family: 'Times New Roman', style: 'Regular' },
  ];

  for (const fontName of candidates) {
    try {
      await figma.loadFontAsync(fontName);
      return fontName;
    } catch {
      // Font not available — try next
    }
  }

  // Last resort: Inter (always available in Figma)
  const fallback: FontName = { family: 'Inter', style: 'Regular' };
  await figma.loadFontAsync(fallback);
  return fallback;
}

/**
 * Pre-load all fonts needed for a scene before rendering.
 * Called once before figma-renderer.ts starts creating TextNodes.
 */
export async function preloadSceneFonts(displayFont: string): Promise<FontName> {
  return loadDisplayFont(displayFont);
}
