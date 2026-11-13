import React, { useCallback, useEffect, useRef } from 'react';
import type { BlockSpec, GradientSpec, SceneSpec, TextureSpec } from '@generator/scene-spec';
import { tokenToCss } from '@generator/palette';
import { getTokenHex } from '@generator/palette';
import './CanvasPreviewRenderer.css';

const BLEND_MAP: Record<BlockSpec['blendMode'], GlobalCompositeOperation> = {
  NORMAL: 'source-over',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  DARKEN: 'darken',
};

interface CanvasPreviewRendererProps {
  spec: SceneSpec;
  onRender?: (dataUrl: string) => void;
}

// Halftone texture drawn synchronously from a cached 1-cell tile pattern.
// (The old path decoded an SVG data-URL per region asynchronously, which
// blanked the canvas and flickered on every slider move.)
const tileCache = new Map<string, HTMLCanvasElement>();

function getTile(spec: TextureSpec, customColors?: Record<string, string>): HTMLCanvasElement {
  const ink = getTokenHex(spec.ink, customColors);
  const spacing = Math.max(spec.dotSize * 2.5, spec.spacing, 1);
  const key = `${spec.dotSize}:${spacing}:${ink}`;
  let tile = tileCache.get(key);
  if (!tile) {
    const res = 4; // supersample so dots stay crisp when scaled down
    tile = document.createElement('canvas');
    tile.width = Math.max(1, Math.round(spacing * res));
    tile.height = tile.width;
    const c = tile.getContext('2d')!;
    c.fillStyle = ink;
    c.beginPath();
    c.arc(tile.width / 2, tile.height / 2, spec.dotSize * res, 0, Math.PI * 2);
    c.fill();
    if (tileCache.size > 64) tileCache.clear();
    tileCache.set(key, tile);
  }
  return tile;
}

function drawTexture(context: CanvasRenderingContext2D, spec: TextureSpec, customColors?: Record<string, string>) {
  const tile = getTile(spec, customColors);
  const pattern = context.createPattern(tile, 'repeat');
  if (!pattern) return;
  const spacing = Math.max(spec.dotSize * 2.5, spec.spacing, 1);
  const k = spacing / tile.width;
  pattern.setTransform(new DOMMatrix([k, 0, 0, k, spec.region.x, spec.region.y]));
  context.save();
  context.globalAlpha = spec.opacity;
  context.fillStyle = pattern;
  context.fillRect(spec.region.x, spec.region.y, spec.region.width, spec.region.height);
  context.restore();
}

function drawSolidBlock(
  context: CanvasRenderingContext2D,
  block: BlockSpec,
  customColors?: Record<string, string>,
): void {
  context.save();
  context.globalAlpha = block.opacity;
  context.globalCompositeOperation = BLEND_MAP[block.blendMode] || 'source-over';
  context.fillStyle = tokenToCss(block.fill, customColors);
  context.fillRect(block.x, block.y, block.width, block.height);
  context.restore();
}

function drawGradientBlock(
  context: CanvasRenderingContext2D,
  block: BlockSpec,
  gradientSpec: GradientSpec,
  customColors?: Record<string, string>,
): void {
  const radians = (gradientSpec.angleDeg * Math.PI) / 180;
  // CSS/Figma-style degrees: 0 points up, 90 right, 180 down.
  const directionX = Math.sin(radians);
  const directionY = -Math.cos(radians);
  const length = Math.abs(block.width * directionX) + Math.abs(block.height * directionY);
  const centerX = block.x + block.width / 2;
  const centerY = block.y + block.height / 2;
  const startX = centerX - directionX * length / 2;
  const startY = centerY - directionY * length / 2;
  const endX = centerX + directionX * length / 2;
  const endY = centerY + directionY * length / 2;
  const gradient = context.createLinearGradient(startX, startY, endX, endY);

  gradientSpec.stops.forEach((stop) => {
    gradient.addColorStop(
      Math.min(1, Math.max(0, stop.position)),
      tokenToCss(stop.color, customColors, stop.opacity),
    );
  });

  context.save();
  context.globalAlpha = block.opacity;
  context.globalCompositeOperation = BLEND_MAP[block.blendMode] || 'source-over';
  context.fillStyle = gradient;
  context.fillRect(block.x, block.y, block.width, block.height);
  context.restore();
}

export const CanvasPreviewRenderer: React.FC<CanvasPreviewRendererProps> = ({ spec, onRender }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const specRef = useRef(spec);
  specRef.current = spec;
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    rafRef.current = 0;
    const spec = specRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const sceneWidth = Math.max(1, spec.canvas.width);
    const sceneHeight = Math.max(1, spec.canvas.height);
    const inset = 24;
    const availableWidth = Math.max(1, container.clientWidth - inset);
    const availableHeight = Math.max(1, container.clientHeight - inset);
    const scale = Math.min(availableWidth / sceneWidth, availableHeight / sceneHeight);
    const cssWidth = Math.max(1, Math.round(sceneWidth * scale));
    const cssHeight = Math.max(1, Math.round(sceneHeight * scale));
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
    const bw = Math.round(cssWidth * pixelRatio);
    const bh = Math.round(cssHeight * pixelRatio);

    // Only reallocate the backing store when its size actually changes.
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.setTransform(scale * pixelRatio, 0, 0, scale * pixelRatio, 0, 0);
    context.fillStyle = tokenToCss('paper', spec.customColors);
    context.fillRect(0, 0, sceneWidth, sceneHeight);

    for (const block of spec.blocks) drawSolidBlock(context, block, spec.customColors);
    if (spec.gradientBlock) drawGradientBlock(context, spec.gradientBlock, spec.gradientBlock.gradient, spec.customColors);
    for (const texture of spec.textureRegions) drawTexture(context, texture, spec.customColors);

    context.fillStyle = tokenToCss('ink', spec.customColors);
    context.textBaseline = 'top';
    for (const label of spec.labels) {
      context.globalAlpha = label.opacity;
      context.font = `${label.size}px "${label.fontFamily}", "Times New Roman", serif`;
      context.fillText(label.text, label.x, label.y);
    }
    context.globalAlpha = 1;

    if (onRender) onRender(canvas.toDataURL('image/png'));
  }, [onRender]);

  const schedule = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => { schedule(); }, [spec, schedule]);

  useEffect(() => {
    const container = containerRef.current;
    const observer = container && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (observer && container) observer.observe(container);
    return () => { observer?.disconnect(); cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
  }, [schedule]);

  return (
    <div ref={containerRef} className="pf-preview-container">
      <canvas
        ref={canvasRef}
        className="pf-preview-canvas"
        aria-label={`Live preview for seed ${spec.seed}`}
        role="img"
      />
    </div>
  );
};
