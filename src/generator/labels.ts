import type { BlockSpec, GenerationParams, LabelSpec } from './scene-spec';
import { rngFloat, rngInt, rngPick } from './rng';

export const DEFAULT_LABEL_FONT = 'Times New Roman';

const PREFIXES = ['R', 'E', 'LG', 'ARS', 'CLD', 'M', 'XC', 'z', 'e', 'y', 'B', 'AGR'];
const NUMBERS = ['3045', '500', '81', '6.O2', '8R', '300', '2M', '4890', '1078', '42'];
const SUFFIXES = ['%', 'cM%', 'RAM', 'YN', 'M.', 'XC%', '', '-', '.', 'cloud'];
const CONNECTORS = ['-', ' ', '.', '/'];

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(first: Bounds, second: Bounds, margin = 8): boolean {
  return (
    first.x < second.x + second.width + margin &&
    first.x + first.width + margin > second.x &&
    first.y < second.y + second.height + margin &&
    first.y + first.height + margin > second.y
  );
}

function generateCode(rng: () => number): string {
  switch (rngInt(rng, 0, 4)) {
    case 0:
      return `${rngPick(rng, PREFIXES)}${rngPick(rng, NUMBERS)}${rngPick(rng, SUFFIXES)}`;
    case 1:
      return `${rngPick(rng, CONNECTORS)}${rngPick(rng, NUMBERS)} ${rngPick(rng, SUFFIXES)}`;
    case 2:
      return `${rngPick(rng, PREFIXES)}${rngPick(rng, NUMBERS)} ${rngPick(rng, NUMBERS)}`;
    case 3:
      return `${rngPick(rng, PREFIXES)}${rngPick(rng, PREFIXES)}${rngPick(rng, SUFFIXES)}`;
    default:
      return `${rngPick(rng, PREFIXES)}${rngPick(rng, CONNECTORS)}${rngPick(rng, NUMBERS)} ${rngPick(rng, PREFIXES)}.`;
  }
}

function customSource(params: GenerationParams): string[] {
  if (params.labelSource !== 'custom') return [];
  return (params.customLabels ?? []).map((label) => label.trim()).filter(Boolean);
}

export function generateLabels(
  rng: () => number,
  params: GenerationParams,
  blocks: BlockSpec[],
  canvas: { width: number; height: number },
): LabelSpec[] {
  if (!params.labelsEnabled) return [];

  const desiredCount = Math.round(rngFloat(rng, 4, 8 + Math.max(1, params.density) * 0.4));
  const occupiedByBlocks: Bounds[] = blocks.map((block) => ({
    x: block.x,
    y: block.y,
    width: block.width,
    height: block.height,
  }));
  const occupiedByLabels: Bounds[] = [];
  const labels: LabelSpec[] = [];
  const suppliedLabels = customSource(params);

  for (let index = 0; index < desiredCount; index += 1) {
    const text = suppliedLabels.length > 0
      ? suppliedLabels[index % suppliedLabels.length]
      : generateCode(rng);
    const size = Math.round(rngFloat(rng, 8, 13));
    const width = Math.max(size, text.length * size * 0.52);
    const height = size * 1.3;
    const anchor = blocks.length > 0 ? rngPick(rng, blocks) : undefined;

    for (let attempt = 0; attempt < 18; attempt += 1) {
      let x: number;
      let y: number;

      if (anchor && attempt < 12) {
        const gap = rngFloat(rng, 6, 22);
        switch (rngInt(rng, 0, 3)) {
          case 0:
            x = anchor.x + rngFloat(rng, 0, Math.max(0, anchor.width - width));
            y = anchor.y - height - gap;
            break;
          case 1:
            x = anchor.x + anchor.width + gap;
            y = anchor.y + rngFloat(rng, 0, Math.max(0, anchor.height - height));
            break;
          case 2:
            x = anchor.x + rngFloat(rng, 0, Math.max(0, anchor.width - width));
            y = anchor.y + anchor.height + gap;
            break;
          default:
            x = anchor.x - width - gap;
            y = anchor.y + rngFloat(rng, 0, Math.max(0, anchor.height - height));
            break;
        }
      } else {
        x = rngFloat(rng, 4, Math.max(4, canvas.width - width - 4));
        y = rngFloat(rng, 4, Math.max(4, canvas.height - height - 4));
      }

      x = Math.max(4, Math.min(x, Math.max(4, canvas.width - width - 4)));
      y = Math.max(4, Math.min(y, Math.max(4, canvas.height - height - 4)));
      const candidate = { x, y, width, height };
      const collides = occupiedByLabels.some((placed) => overlaps(candidate, placed, 6)) ||
        occupiedByBlocks.some((block) => overlaps(candidate, block, 3));

      if (!collides) {
        occupiedByLabels.push(candidate);
        labels.push({
          id: `label-${index}`,
          x,
          y,
          text,
          size,
          fontFamily: DEFAULT_LABEL_FONT,
        });
        break;
      }
    }
  }

  return labels;
}
