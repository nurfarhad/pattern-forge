import React, { useCallback, useEffect, useRef } from 'react';
import type { BlockSpec, GradientSpec, SceneSpec, TextureSpec } from '@generator/scene-spec';
import { tokenToCss } from '@generator/palette';
import { textureSpecToDataUrl } from '@generator/texture';
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

const textureCache = new Map<string, HTMLImageElement>();

function loadTexture(spec: TextureSpec, customColors?: Record<string, string>): Promise<HTMLImageElement> {
  const inkHex = (customColors && customColors[spec.ink]) || spec.ink;
  const key = [
    spec.dotSize,
    spec.spacing,
    inkHex,
    spec.region.width,
    spec.region.height,
  ].join(':');
  const cached = textureCache.get(key);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      textureCache.set(key, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error('Texture preview failed to load'));
    image.src = textureSpecToDataUrl(spec, customColors);
  });
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
  const renderIdRef = useRef(0);

  const draw = useCallback(async (renderId: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const sceneWidth = Math.max(1, spec.canvas.width);
    const sceneHeight = Math.max(1, spec.canvas.height);
    const availableWidth = Math.max(1, container.clientWidth);
    const availableHeight = Math.max(1, container.clientHeight);
    const scale = Math.min(availableWidth / sceneWidth, availableHeight / sceneHeight);
    const cssWidth = Math.max(1, Math.round(sceneWidth * scale));
    const cssHeight = Math.max(1, Math.round(sceneHeight * scale));
    const pixelRatio = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.round(cssWidth * pixelRatio);
    canvas.height = Math.round(cssHeight * pixelRatio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(scale * pixelRatio, 0, 0, scale * pixelRatio, 0, 0);
    context.fillStyle = tokenToCss('paper', spec.customColors);
    context.fillRect(0, 0, sceneWidth, sceneHeight);

    for (const block of spec.blocks) {
      if (renderId !== renderIdRef.current) return;
      drawSolidBlock(context, block, spec.customColors);
    }

    if (spec.gradientBlock) {
      if (renderId !== renderIdRef.current) return;
      drawGradientBlock(context, spec.gradientBlock, spec.gradientBlock.gradient, spec.customColors);
    }

    for (const texture of spec.textureRegions) {
      if (renderId !== renderIdRef.current) return;
      try {
        const image = await loadTexture(texture, spec.customColors);
        if (renderId !== renderIdRef.current) return;
        context.save();
        context.globalAlpha = texture.opacity;
        context.drawImage(
          image,
          texture.region.x,
          texture.region.y,
          texture.region.width,
          texture.region.height,
        );
        context.restore();
      } catch {
        // The rest of the preview remains useful if one SVG cannot be decoded.
      }
    }

    context.save();
    context.fillStyle = tokenToCss('ink', spec.customColors);
    context.textBaseline = 'top';
    for (const label of spec.labels) {
      if (renderId !== renderIdRef.current) return;
      context.save();
      context.globalAlpha = label.opacity;
      context.font = `${label.size}px "${label.fontFamily}", "Times New Roman", serif`;
      context.fillText(label.text, label.x, label.y);
      context.restore();
    }
    context.restore();

    if (onRender && renderId === renderIdRef.current) {
      onRender(canvas.toDataURL('image/png'));
    }
  }, [onRender, spec]);

  useEffect(() => {
    const redraw = () => {
      const renderId = ++renderIdRef.current;
      void draw(renderId);
    };
    redraw();

    const container = containerRef.current;
    if (container && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(redraw);
      observer.observe(container);
      return () => {
        observer.disconnect();
        renderIdRef.current += 1;
      };
    }

    window.addEventListener('resize', redraw);
    return () => {
      window.removeEventListener('resize', redraw);
      renderIdRef.current += 1;
    };
  }, [draw]);

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
