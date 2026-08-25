// ─── Figma renderer ───────────────────────────────────────────────────────────
// Converts a SceneSpec into real, independently-editable Figma nodes.
// PRD §6 / FR-2/3/4/5/6/7/8/9/10.
//
// CRITICAL: No node type in output is ever IMAGE-filled or a flat rasterized blob.
// All output: RECTANGLE, TEXT, FRAME, GROUP, or SVG vector (createNodeFromSvg).

import type { SceneSpec, BlockSpec, TextureSpec, LabelSpec, SelectionConstraints } from '../generator/scene-spec';
import { resolveToken } from '../generator/palette';
import { buildDotGridSvg } from '../generator/texture';
import { PALETTE } from '../generator/palette';
import { preloadSceneFonts } from './fonts';
import { saveRecipe } from './plugin-data';
import type { GenerationParams, SourceMode } from '../generator/scene-spec';

// ─── Helper: angle → Figma gradient transform ─────────────────────────────

function angleToGradientTransform(angleDeg: number, x: number, y: number, w: number, h: number): Transform {
  const rad = (angleDeg * Math.PI) / 180;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  // CSS/preview-style angle convention: 0°=up, 90°=right, 180°=down, 270°=left.
  // Must match CanvasPreviewRenderer.tsx's drawGradientBlock exactly — layout.ts's
  // angleDeg values are tuned against the preview's convention, and this renderer
  // has to agree or the same seed fades in a different direction in real Figma
  // than it does on screen (previously this used standard math angles, 0°=right/
  // 90°=down, a 90° offset from the preview — angleDeg:180 rendered as a
  // horizontal fade here instead of the vertical fade shown in preview).
  const dx = Math.sin(rad) * len;
  const dy = -Math.cos(rad) * len;

  // Figma gradient transform: maps [0,0]→[1,0] in gradient space to scene coords
  const startX = (cx - dx - x) / w;
  const startY = (cy - dy - y) / h;
  const endX   = (cx + dx - x) / w;
  const endY   = (cy + dy - y) / h;

  return [
    [endX - startX, endY - startY, startX],
    [-(endY - startY), endX - startX, startY],
  ];
}

// ─── Guard: ensure opacity is always a finite 0–1 number ─────────────────
// Figma's set_opacity validator rejects undefined, null, NaN, and Infinity.

function safeOpacity(v: unknown, fallback = 1): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return Math.min(1, Math.max(0, v));
  }
  const parsed = typeof v === 'string' ? parseFloat(v) : NaN;
  if (Number.isFinite(parsed)) {
    return Math.min(1, Math.max(0, parsed));
  }
  return fallback;
}

// ─── FR-6/FR-8: create a block RectangleNode ──────────────────────────────

function createBlockNode(block: BlockSpec, parentX: number, parentY: number): RectangleNode {
  const rect = figma.createRectangle();
  rect.name = block.id;
  // figma.group(nodes, frame) preserves each node's ABSOLUTE position (see
  // https://developers.figma.com/docs — "keeping all the grouped layers in
  // the same absolute x/y locations"). Since these rects are created directly
  // on figma.currentPage (absolute space) and only later grouped INTO `frame`
  // (which itself sits at absolute (parentX, parentY)), we must give each node
  // its true absolute position up front — block.x/y alone is only the
  // composition-LOCAL coordinate. Skipping the +parentX/+parentY here is what
  // caused the "clustered in one corner" bug: content ended up positioned at
  // absolute (block.x, block.y) regardless of where the target frame actually
  // sits on the page, so only the sliver that coincidentally overlapped the
  // frame's clip bounds survived.
  rect.x = block.x + parentX;
  rect.y = block.y + parentY;
  rect.resize(Math.max(1, block.width), Math.max(1, block.height));
  rect.opacity = safeOpacity(block.opacity, 1);
  rect.blendMode = block.blendMode || 'NORMAL';

  if (block.gradient != null) {
    // FR-9: GRADIENT_LINEAR paint — editable via Figma's gradient handle UI
    const { gradient } = block;
    const stops: ColorStop[] = gradient.stops.map((s) => ({
      position: Math.min(1, Math.max(0, s.position)),
      color: { ...resolveToken(s.color), a: safeOpacity(s.opacity, 1) },
    }));

    rect.fills = [{
      type: 'GRADIENT_LINEAR',
      gradientTransform: angleToGradientTransform(
        gradient.angleDeg,
        block.x,
        block.y,
        block.width,
        block.height,
      ),
      gradientStops: stops,
    }];
  } else {
    // FR-6: SOLID fill — independently recolorable
    const color = resolveToken(block.fill);
    rect.fills = [{ type: 'SOLID', color }];
  }

  return rect;
}

// ─── FR-7: create a texture node via createNodeFromSvg ──────────────────

function createTextureNode(tex: TextureSpec, parentX: number, parentY: number): SceneNode {
  const hex = PALETTE[tex.ink];
  const svgString = buildDotGridSvg(tex, hex);

  const node = figma.createNodeFromSvg(svgString);
  node.name = tex.id;
  // See createBlockNode: must supply true absolute position before grouping into frame.
  node.x = tex.region.x + parentX;
  node.y = tex.region.y + parentY;
  node.opacity = safeOpacity(tex.opacity, 0.15);

  // Resize to exact region (SVG intrinsic size matches, but be safe)
  node.resize(Math.max(1, tex.region.width), Math.max(1, tex.region.height));

  return node;
}

// ─── FR-10: create a label TextNode ──────────────────────────────────────

async function createLabelNode(
  label: LabelSpec,
  parentX: number,
  parentY: number,
  fontName: FontName,
): Promise<TextNode> {
  const text = figma.createText();
  text.name = label.id;
  text.fontName = fontName;
  text.fontSize = Math.max(1, label.size);
  text.characters = label.text;
  // See createBlockNode: must supply true absolute position before grouping into frame.
  text.x = label.x + parentX;
  text.y = label.y + parentY;
  text.opacity = safeOpacity(label.opacity, 0.85);
  text.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12 } }];
  return text;
}

// ─── Main render function ─────────────────────────────────────────────────

export interface RenderOptions {
  params: GenerationParams;
  mode: SourceMode;
  /** For fill/mask: the target node to place content inside/around */
  targetNode?: SceneNode;
  /** Whether the target shape is rectangular (true) or non-rectangular (false) */
  isRectangular?: boolean;
}

/**
 * Render a SceneSpec to Figma nodes.
 * Returns the created wrapper FrameNode.
 *
 * FR-6: All output is independently selectable/editable.
 * FR-7: Texture via createNodeFromSvg — no IMAGE paint.
 * FR-8: Blend mode set per-node — not pre-mixed colors.
 * FR-9: Gradient via GRADIENT_LINEAR — editable handles.
 * FR-10: Labels are real TextNodes — double-click to edit.
 */
export async function renderToFigma(
  spec: SceneSpec,
  options: RenderOptions,
): Promise<FrameNode> {
  const { params, mode, targetNode, isRectangular } = options;

  // ── Pre-load fonts ─────────────────────────────────────────────────────
  const fontName = await preloadSceneFonts(params.displayFont || 'Times New Roman');

  // ── Determine parent frame position ────────────────────────────────────
  let parentX = figma.viewport.center.x - spec.canvas.width / 2;
  let parentY = figma.viewport.center.y - spec.canvas.height / 2;

  if (targetNode && (mode === 'fill' || mode === 'mask')) {
    const bb = targetNode.absoluteBoundingBox;
    if (bb) {
      if (mode === 'mask') {
        // Mask mode's canvas is deliberately sized to the full requested output
        // (see resolveCanvasSize in layout.ts) so content can extend past the
        // anchor shape, and layout.ts centers the dense cluster at the canvas's
        // own center (width*0.5, height*0.5). If we anchor the frame at the
        // shape's top-left corner (as fill mode correctly does, since fill's
        // canvas is sized exactly to the shape), the shape ends up sitting at
        // the frame's top-left corner instead of at the visual center of the
        // generated field. Anchor the shape's own center to the frame's local
        // center instead, so it lines up with where layout.ts centers the cluster.
        const shapeCenterX = bb.x + bb.width / 2;
        const shapeCenterY = bb.y + bb.height / 2;
        parentX = shapeCenterX - spec.canvas.width / 2;
        parentY = shapeCenterY - spec.canvas.height / 2;
      } else {
        parentX = bb.x;
        parentY = bb.y;
      }
    }
  }

  // ── Create wrapper frame ────────────────────────────────────────────────
  // PRD §11: named "Pattern — seed XXXX"
  const frame = figma.createFrame();
  frame.name = `Pattern — seed ${spec.seed}`;
  frame.x = parentX;
  frame.y = parentY;
  frame.resize(Math.max(1, spec.canvas.width), Math.max(1, spec.canvas.height));
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.clipsContent = true;

  // Place frame on canvas immediately so it has a valid parent context
  figma.currentPage.appendChild(frame);

  try {
    // ── Blocks group ────────────────────────────────────────────────────────
    const allBlocksToRender = [
      ...spec.blocks,
      ...(spec.gradientBlock ? [spec.gradientBlock] : []),
    ];
    if (allBlocksToRender.length > 0) {
      const blockNodes: RectangleNode[] = allBlocksToRender.map((block) =>
        createBlockNode(block, parentX, parentY)
      );
      const blocksGroup = figma.group(blockNodes, frame);
      blocksGroup.name = 'Blocks';
    }

    // ── Texture group ────────────────────────────────────────────────────────
    if (spec.textureRegions.length > 0) {
      const texNodes: SceneNode[] = spec.textureRegions.map((tex) =>
        createTextureNode(tex, parentX, parentY)
      );
      const texGroup = figma.group(texNodes, frame);
      texGroup.name = 'Texture';
    }

    // ── Labels group ─────────────────────────────────────────────────────────
    if (spec.labels.length > 0) {
      const labelNodes = await Promise.all(
        spec.labels.map((label) => createLabelNode(label, parentX, parentY, fontName))
      );
      const labelsGroup = figma.group(labelNodes, frame);
      labelsGroup.name = 'Labels';
    }

    // ── Selection-Fill: apply isMask ONLY for non-rectangular shapes (FR-3) ──
    // Non-rectangular shapes (star, ellipse, vector) require isMask outline-masking.
    // Plain rectangles/frames do not need an inner mask because frame.clipsContent handles it.
    if (mode === 'fill' && targetNode && isRectangular === false) {
      try {
        const cloned = targetNode.clone();
        cloned.x = 0;
        cloned.y = 0;
        cloned.isMask = true;
        cloned.name = '_mask';
        // Insert mask at bottom of frame stack (Figma: mask clips nodes ABOVE it)
        frame.insertChild(0, cloned);
      } catch {
        // If cloning fails (e.g., component licensing), fall back to bounding-box clip
      }
    }

    // ── Stamp recipe for later reload (FR-13) ─────────────────────────────────
    saveRecipe(frame, params, spec.seed, mode);

    return frame;
  } catch (err) {
    // If anything fails during assembly, remove incomplete frame to avoid leaving broken artifacts
    try { frame.remove(); } catch { /* ignore */ }
    throw err;
  }
}

/**
 * Render a batch of scenes (Selection-Batch mode, FR-5).
 * Each shape gets its own frame; progress is reported via figma.notify.
 */
export async function renderBatchToFigma(
  specs: SceneSpec[],
  params: GenerationParams,
  constraints: SelectionConstraints,
): Promise<FrameNode[]> {
  const frames: FrameNode[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const shape = constraints.shapes[i];

    figma.notify(`Pattern Forge: generating ${i + 1} of ${specs.length}…`, { timeout: 1500 });

    // Find the target node on the canvas via O(1) getNodeById
    let targetNode: SceneNode | undefined;
    try {
      if (shape?.nodeId) {
        const found = figma.getNodeById(shape.nodeId);
        targetNode = (found && 'absoluteBoundingBox' in found) ? (found as SceneNode) : undefined;
      }
    } catch { /* ignore */ }

    const frame = await renderToFigma(spec, {
      params: { ...params, seed: spec.seed, outputSize: { width: shape.width, height: shape.height } },
      mode: 'fill',
      targetNode,
      isRectangular: shape?.isRectangular ?? true,
    });
    frames.push(frame);
  }

  if (frames.length > 0) {
    figma.currentPage.selection = frames;
    figma.viewport.scrollAndZoomIntoView(frames);
  }

  figma.notify(`Pattern Forge: inserted ${frames.length} patterns ✓`, { timeout: 2500 });
  return frames;
}
