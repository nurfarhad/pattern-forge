// ─── Selection reader ─────────────────────────────────────────────────────────
// Reads figma.currentPage.selection and produces SelectionConstraints.
// PRD §5.3 / FR-3/4/5.

import type { SelectionConstraints, ShapeConstraint, SourceMode } from '../generator/scene-spec';

/** Node types that are treated as rectangular (no masking needed) */
const RECTANGULAR_TYPES = new Set<SceneNode['type']>([
  'RECTANGLE', 'FRAME', 'COMPONENT', 'INSTANCE', 'GROUP',
]);

/**
 * Determine if a node is rectangular (no need for isMask outline-clipping).
 */
function isRectangular(node: SceneNode): boolean {
  return RECTANGULAR_TYPES.has(node.type);
}

/**
 * Extract geometry from a node using absoluteBoundingBox (handles nested nodes).
 */
function getGeometry(node: SceneNode): { x: number; y: number; width: number; height: number } | null {
  const bb = node.absoluteBoundingBox;
  if (!bb) return null;
  return { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
}

/**
 * Read the current Figma selection and return SelectionConstraints.
 *
 * - 0 selected → mode 'none'
 * - 1 rectangular → mode 'fill', isRectangular: true
 * - 1 non-rectangular → mode 'fill', isRectangular: false (isMask in renderer)
 * - N selected → mode 'batch'
 */
export function readSelection(): SelectionConstraints {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return { mode: 'none', shapes: [] };
  }

  if (selection.length === 1) {
    const node = selection[0];
    const geo = getGeometry(node);
    if (!geo) return { mode: 'none', shapes: [] };

    const shape: ShapeConstraint = {
      nodeId: node.id,
      x: geo.x,
      y: geo.y,
      width: geo.width,
      height: geo.height,
      isRectangular: isRectangular(node),
    };

    return { mode: 'fill', shapes: [shape] };
  }

  // Multiple selected → batch mode
  const shapes: ShapeConstraint[] = [];
  for (const node of selection) {
    const geo = getGeometry(node);
    if (!geo) continue;
    shapes.push({
      nodeId: node.id,
      x: geo.x,
      y: geo.y,
      width: geo.width,
      height: geo.height,
      isRectangular: isRectangular(node),
    });
  }

  return { mode: 'batch', shapes };
}
