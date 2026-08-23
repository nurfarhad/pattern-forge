var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
(function() {
  "use strict";
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash >>> 0;
  }
  function createRng(seed) {
    let state = typeof seed === "string" ? hashString(seed) : seed >>> 0 || 1;
    return function mulberry32() {
      state += 1831565813;
      let z = state;
      z = Math.imul(z ^ z >>> 15, z | 1);
      z ^= z + Math.imul(z ^ z >>> 7, z | 61);
      return ((z ^ z >>> 14) >>> 0) / 4294967296;
    };
  }
  function rngInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }
  function rngFloat(rng, min, max) {
    return rng() * (max - min) + min;
  }
  function rngPick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }
  function rngShuffle(rng, arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  const DEFAULT_LABEL_FONT = "Times New Roman";
  const PREFIXES = ["R", "E", "LG", "ARS", "CLD", "M", "XC", "z", "e", "y", "B", "AGR"];
  const NUMBERS = ["3045", "500", "81", "6.O2", "8R", "300", "2M", "4890", "1078", "42"];
  const SUFFIXES = ["%", "cM%", "RAM", "YN", "M.", "XC%", "", "-", ".", "cloud"];
  const CONNECTORS = ["-", " ", ".", "/"];
  function overlaps(first, second, margin = 6) {
    return first.x < second.x + second.width + margin && first.x + first.width + margin > second.x && first.y < second.y + second.height + margin && first.y + first.height + margin > second.y;
  }
  function generateCode(rng) {
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
  function customSource(params) {
    var _a;
    if (params.labelSource !== "custom") return [];
    return ((_a = params.customLabels) != null ? _a : []).map((label) => label.trim()).filter(Boolean);
  }
  function generateLabels(rng, params, blocks, canvas) {
    if (!params.labelsEnabled || blocks.length === 0) return [];
    const desiredCount = Math.round(rngFloat(rng, 4, 8 + Math.max(1, params.density) * 0.4));
    const occupiedByBlocks = blocks.map((block) => ({
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height
    }));
    const occupiedByLabels = [];
    const labels = [];
    const suppliedLabels = customSource(params);
    const fontFamily = params.displayFont || DEFAULT_LABEL_FONT;
    for (let index = 0; index < desiredCount; index += 1) {
      const text = suppliedLabels.length > 0 ? suppliedLabels[index % suppliedLabels.length] : generateCode(rng);
      const size = Math.round(rngFloat(rng, 8, 13));
      const width = Math.max(size, text.length * size * 0.54);
      const height = size * 1.3;
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const anchor = rngPick(rng, blocks);
        const gap = rngFloat(rng, 4, 16);
        let x;
        let y;
        const side = rngInt(rng, 0, 3);
        switch (side) {
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
        x = Math.max(4, Math.min(x, Math.max(4, canvas.width - width - 4)));
        y = Math.max(4, Math.min(y, Math.max(4, canvas.height - height - 4)));
        const candidate = { x, y, width, height };
        const collides = occupiedByLabels.some((placed) => overlaps(candidate, placed, 4)) || occupiedByBlocks.some((block) => overlaps(candidate, block, 2));
        if (!collides) {
          occupiedByLabels.push(candidate);
          labels.push({
            id: `label-${index}`,
            x,
            y,
            text,
            size,
            fontFamily,
            opacity: 0.85
          });
          break;
        }
      }
    }
    return labels;
  }
  const PALETTE = {
    signalOrange: "#FC4800",
    // most-used accent
    alertRed: "#FC3018",
    // dominant block color, largest area coverage
    electricViolet: "#8400FC",
    // secondary
    orchidMagenta: "#B43CD8",
    // secondary
    hotPink: "#FC4890",
    // secondary
    blush: "#F0D8E4",
    // pale pastel accent
    forestGreen: "#3C9054",
    // dark end of signature gradient block
    sageMint: "#A8C0A8",
    // light end of gradient block
    sand: "#FCE4C0",
    // cream/tan bars
    amber: "#F0B400",
    // rare gold accent
    slateBlueGray: "#6C9CCC",
    // cool block, pairs with orange
    ink: "#1E1E1E",
    // headline type, dots, hairline rules
    paper: "#FFFFFF",
    // canvas background
    fog: "#F0F0F0"
    // light gray panel background
  };
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255
    };
  }
  function resolveToken(token) {
    return hexToRgb(PALETTE[token]);
  }
  const DEFAULT_DOT_SIZE = 1.5;
  const MAX_TEXTURE_DOTS_PER_REGION = 2400;
  function buildDotGridSvg(spec, resolvedInkHex) {
    const width = Math.max(1, spec.region.width);
    const height = Math.max(1, spec.region.height);
    const spacing = Math.max(spec.dotSize * 2.5, spec.spacing, 1);
    const columns = Math.ceil(width / spacing);
    const rows = Math.ceil(height / spacing);
    const circles = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const centerX = column * spacing + spacing / 2;
        const centerY = row * spacing + spacing / 2;
        circles.push(
          `<circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${spec.dotSize}" fill="${resolvedInkHex}"/>`
        );
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${circles.join("")}</svg>`;
  }
  function computeSpacing(textureDensity) {
    const safeDensity = Number.isFinite(textureDensity) ? Math.min(4, Math.max(0.25, textureDensity)) : 1;
    return 16 / safeDensity;
  }
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  function positiveDimension(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  function resolveCanvasSize(params, constraints) {
    const fallback = {
      width: positiveDimension(params.outputSize.width, 1080),
      height: positiveDimension(params.outputSize.height, 1080)
    };
    if ((constraints == null ? void 0 : constraints.mode) === "fill" && constraints.shapes[0]) {
      return {
        width: positiveDimension(constraints.shapes[0].width, fallback.width),
        height: positiveDimension(constraints.shapes[0].height, fallback.height)
      };
    }
    return fallback;
  }
  function gridSnap(value, gridSize, strictness) {
    const snapped = Math.round(value / gridSize) * gridSize;
    return value + (snapped - value) * clamp(strictness, 0, 1);
  }
  function normalizedRange(range, min, max) {
    const first = clamp(Number.isFinite(range[0]) ? range[0] : min, min, max);
    const second = clamp(Number.isFinite(range[1]) ? range[1] : max, min, max);
    return first <= second ? [first, second] : [second, first];
  }
  function blockCount(density, canvasW, canvasH) {
    const normalizedDensity = clamp(Number.isFinite(density) ? density : 6, 1, 10);
    const base = Math.round(6 + normalizedDensity * 2.8);
    const areaFactor = Math.sqrt(canvasW * canvasH / (1080 * 1080));
    return Math.max(1, Math.round(base * clamp(areaFactor, 0.7, 1.5)));
  }
  function textureSpacingForRegion(density, width, height) {
    const requested = computeSpacing(density);
    const capped = Math.sqrt(width * height / MAX_TEXTURE_DOTS_PER_REGION);
    return Math.max(requested, Math.ceil(capped), DEFAULT_DOT_SIZE * 2.5);
  }
  function generateLayout(params, constraints, rng) {
    const canvas = resolveCanvasSize(params, constraints);
    const { width, height } = canvas;
    const gridSize = Math.max(1, width / 24);
    const [minScale, maxScaleRaw] = normalizedRange(params.scaleRange, 0.01, 0.8);
    const maxScale = Math.min(maxScaleRaw, 0.55);
    const [minOpacity, maxOpacity] = normalizedRange(params.opacityRange, 0, 1);
    const scatterMinOpacity = Math.min(maxOpacity, Math.max(0.7, minOpacity));
    const tokenSource = params.activeTokens.length > 0 ? params.activeTokens : ["alertRed"];
    const tokens = rngShuffle(rng, tokenSource);
    const blendModeSource = params.blendModes.length > 0 ? params.blendModes : ["NORMAL"];
    const totalBlocks = blockCount(params.density, width, height);
    const clusterCount = Math.round(totalBlocks * 0.64);
    const scatterCount = totalBlocks - clusterCount;
    const isMask = (constraints == null ? void 0 : constraints.mode) === "mask";
    const clusterCx = isMask ? width * 0.5 : rngFloat(rng, width * 0.38, width * 0.62);
    const clusterCy = isMask ? height * 0.5 : rngFloat(rng, height * 0.35, height * 0.65);
    const clusterRadius = Math.min(width, height) * rngFloat(rng, 0.22, 0.38);
    const blocks = [];
    for (let index = 0; index < clusterCount; index += 1) {
      const blockWidth = gridSnap(
        rngFloat(rng, width * minScale, width * maxScale),
        gridSize,
        params.gridStrictness
      );
      const blockHeight = gridSnap(
        rngFloat(rng, height * minScale * 0.6, height * maxScale * 0.86),
        gridSize,
        params.gridStrictness
      );
      const angle = rngFloat(rng, 0, Math.PI * 2);
      const distance = clusterRadius * Math.sqrt(rng());
      const centerX = clusterCx + Math.cos(angle) * distance;
      const centerY = clusterCy + Math.sin(angle) * distance;
      const rawX = centerX - blockWidth / 2;
      const rawY = centerY - blockHeight / 2;
      const safeX = clamp(rawX, width * 0.02, Math.max(width * 0.02, width * 0.98 - blockWidth));
      const safeY = clamp(rawY, height * 0.02, Math.max(height * 0.02, height * 0.98 - blockHeight));
      blocks.push({
        id: `block-cluster-${index}`,
        x: gridSnap(safeX, gridSize, params.gridStrictness),
        y: gridSnap(safeY, gridSize, params.gridStrictness),
        width: Math.max(blockWidth, width * 0.04),
        height: Math.max(blockHeight, height * 0.04),
        fill: tokens[index % tokens.length],
        opacity: rngFloat(rng, minOpacity, maxOpacity),
        blendMode: rngPick(rng, blendModeSource)
      });
    }
    for (let index = 0; index < scatterCount; index += 1) {
      const isBar = rng() > 0.45;
      const blockWidth = gridSnap(
        isBar ? rngFloat(rng, width * 0.025, width * 0.15) : rngFloat(rng, width * 0.04, width * 0.12),
        gridSize,
        params.gridStrictness
      );
      const blockHeight = gridSnap(
        isBar ? rngFloat(rng, height * 0.06, height * 0.22) : rngFloat(rng, height * 0.04, height * 0.12),
        gridSize,
        params.gridStrictness
      );
      const safeWidth = Math.max(blockWidth, width * 0.02);
      const safeHeight = Math.max(blockHeight, height * 0.02);
      blocks.push({
        id: `block-scatter-${index}`,
        x: gridSnap(rngFloat(rng, width * 0.02, Math.max(width * 0.02, width * 0.98 - safeWidth)), gridSize, params.gridStrictness),
        y: gridSnap(rngFloat(rng, height * 0.02, Math.max(height * 0.02, height * 0.98 - safeHeight)), gridSize, params.gridStrictness),
        width: safeWidth,
        height: safeHeight,
        fill: rngPick(rng, tokens),
        opacity: rngFloat(rng, scatterMinOpacity, maxOpacity),
        blendMode: "NORMAL"
      });
    }
    let gradientBlock;
    if (params.gradientEnabled) {
      const gradientWidth = Math.max(
        gridSnap(rngFloat(rng, width * 0.06, width * 0.15), gridSize, params.gridStrictness),
        width * 0.04
      );
      const gradientHeight = Math.max(
        gridSnap(rngFloat(rng, height * 0.18, height * 0.38), gridSize, params.gridStrictness),
        height * 0.12
      );
      const gradX = rng() > 0.5 ? rngFloat(rng, width * 0.65, Math.max(width * 0.65, width * 0.95 - gradientWidth)) : rngFloat(rng, width * 0.05, Math.max(width * 0.05, width * 0.35 - gradientWidth));
      const gradY = rngFloat(rng, height * 0.08, Math.max(height * 0.08, height * 0.7 - gradientHeight));
      gradientBlock = {
        id: "block-gradient",
        x: gridSnap(gradX, gridSize, params.gridStrictness),
        y: gridSnap(gradY, gridSize, params.gridStrictness),
        width: gradientWidth,
        height: gradientHeight,
        fill: "forestGreen",
        opacity: 1,
        blendMode: "NORMAL",
        gradient: {
          angleDeg: 180,
          stops: [
            { position: 0, color: "forestGreen", opacity: 1 },
            { position: 0.6, color: "sageMint", opacity: 0.7 },
            { position: 1, color: "paper", opacity: 0 }
          ]
        }
      };
    }
    const textureRegions = [];
    if (params.textureEnabled) {
      const patchCount = rngInt(rng, 2, 4);
      for (let index = 0; index < patchCount; index += 1) {
        const patchWidth = Math.max(
          gridSnap(rngFloat(rng, width * 0.12, width * 0.35), gridSize, 1),
          Math.min(40, width)
        );
        const patchHeight = Math.max(
          gridSnap(rngFloat(rng, height * 0.07, height * 0.22), gridSize, 1),
          Math.min(40, height)
        );
        textureRegions.push({
          id: `texture-${index}`,
          region: {
            x: gridSnap(rngFloat(rng, width * 0.04, Math.max(width * 0.04, width * 0.96 - patchWidth)), gridSize, 1),
            y: gridSnap(rngFloat(rng, height * 0.04, Math.max(height * 0.04, height * 0.96 - patchHeight)), gridSize, 1),
            width: patchWidth,
            height: patchHeight
          },
          dotSize: DEFAULT_DOT_SIZE,
          spacing: textureSpacingForRegion(params.textureDensity, patchWidth, patchHeight),
          ink: "ink",
          opacity: rngFloat(rng, 0.08, 0.22)
        });
      }
    }
    return { blocks, textureRegions, gradientBlock };
  }
  function estimateNodeCount(params) {
    const width = positiveDimension(params.outputSize.width, 1080);
    const height = positiveDimension(params.outputSize.height, 1080);
    return blockCount(params.density, width, height) + (params.gradientEnabled ? 1 : 0) + (params.textureEnabled ? 4 : 0) + (params.labelsEnabled ? 8 : 0);
  }
  const NODE_COUNT_WARNING_THRESHOLD = 400;
  function generateScene(params, constraints) {
    const rng = createRng(params.seed);
    const canvas = resolveCanvasSize(params, constraints);
    const { blocks, textureRegions, gradientBlock } = generateLayout(params, constraints, rng);
    const labels = generateLabels(rng, params, blocks, canvas);
    const spec = __spreadValues({
      seed: params.seed,
      canvas,
      blocks,
      textureRegions,
      labels
    }, gradientBlock ? { gradientBlock } : {});
    const estimatedNodeCount = estimateNodeCount(params);
    return {
      spec,
      estimatedNodeCount,
      exceedsThreshold: estimatedNodeCount > NODE_COUNT_WARNING_THRESHOLD
    };
  }
  function generateBatch(params, constraints) {
    return constraints.shapes.map((shape, index) => {
      const derivedParams = __spreadProps(__spreadValues({}, params), {
        seed: `${params.seed}-${index}`,
        activeTokens: [...params.activeTokens],
        scaleRange: [...params.scaleRange],
        opacityRange: [...params.opacityRange],
        blendModes: [...params.blendModes],
        customLabels: params.customLabels ? [...params.customLabels] : void 0,
        outputSize: { width: shape.width, height: shape.height },
        displayFont: params.displayFont
      });
      return generateScene(derivedParams, { mode: "fill", shapes: [shape] });
    });
  }
  const RECTANGULAR_TYPES = /* @__PURE__ */ new Set([
    "RECTANGLE",
    "FRAME",
    "COMPONENT",
    "INSTANCE",
    "GROUP"
  ]);
  function isRectangular(node) {
    return RECTANGULAR_TYPES.has(node.type);
  }
  function getGeometry(node) {
    const bb = node.absoluteBoundingBox;
    if (!bb) return null;
    return { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
  }
  function readSelection() {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      return { mode: "none", shapes: [] };
    }
    if (selection.length === 1) {
      const node = selection[0];
      const geo = getGeometry(node);
      if (!geo) return { mode: "none", shapes: [] };
      const shape = {
        nodeId: node.id,
        x: geo.x,
        y: geo.y,
        width: geo.width,
        height: geo.height,
        isRectangular: isRectangular(node)
      };
      return { mode: "fill", shapes: [shape] };
    }
    const shapes = [];
    for (const node of selection) {
      const geo = getGeometry(node);
      if (!geo) continue;
      shapes.push({
        nodeId: node.id,
        x: geo.x,
        y: geo.y,
        width: geo.width,
        height: geo.height,
        isRectangular: isRectangular(node)
      });
    }
    return { mode: "batch", shapes };
  }
  async function loadDisplayFont(family) {
    const candidates = [
      { family, style: "Regular" },
      { family, style: "Normal" },
      { family: "Times New Roman", style: "Regular" }
    ];
    for (const fontName of candidates) {
      try {
        await figma.loadFontAsync(fontName);
        return fontName;
      } catch (e) {
      }
    }
    const fallback = { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(fallback);
    return fallback;
  }
  async function preloadSceneFonts(displayFont) {
    return loadDisplayFont(displayFont);
  }
  const RECIPE_KEY = "patternForgeRecipe";
  const RECIPE_VERSION = 1;
  function saveRecipe(frame, params, seed, mode) {
    const recipe = { seed, params, mode, version: RECIPE_VERSION };
    frame.setPluginData(RECIPE_KEY, JSON.stringify(recipe));
  }
  function loadRecipe(node) {
    try {
      const raw = node.getPluginData(RECIPE_KEY);
      if (!raw) return null;
      const recipe = JSON.parse(raw);
      if (recipe.version !== RECIPE_VERSION) return null;
      return recipe;
    } catch (e) {
      return null;
    }
  }
  function hasRecipe(node) {
    return !!node.getPluginData(RECIPE_KEY);
  }
  function angleToGradientTransform(angleDeg, x, y, w, h) {
    const rad = angleDeg * Math.PI / 180;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const len = Math.sqrt(w * w + h * h) / 2;
    const dx = Math.cos(rad) * len;
    const dy = Math.sin(rad) * len;
    const startX = (cx - dx - x) / w;
    const startY = (cy - dy - y) / h;
    const endX = (cx + dx - x) / w;
    const endY = (cy + dy - y) / h;
    return [
      [endX - startX, endY - startY, startX],
      [-(endY - startY), endX - startX, startY]
    ];
  }
  function safeOpacity(v, fallback = 1) {
    if (typeof v === "number" && Number.isFinite(v)) {
      return Math.min(1, Math.max(0, v));
    }
    const parsed = typeof v === "string" ? parseFloat(v) : NaN;
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
    return fallback;
  }
  function createBlockNode(block, parentX, parentY) {
    const rect = figma.createRectangle();
    rect.name = block.id;
    rect.x = block.x + parentX;
    rect.y = block.y + parentY;
    rect.resize(Math.max(1, block.width), Math.max(1, block.height));
    rect.opacity = safeOpacity(block.opacity, 1);
    rect.blendMode = block.blendMode || "NORMAL";
    if (block.gradient != null) {
      const { gradient } = block;
      const stops = gradient.stops.map((s) => ({
        position: Math.min(1, Math.max(0, s.position)),
        color: __spreadProps(__spreadValues({}, resolveToken(s.color)), { a: safeOpacity(s.opacity, 1) })
      }));
      rect.fills = [{
        type: "GRADIENT_LINEAR",
        gradientTransform: angleToGradientTransform(
          gradient.angleDeg,
          block.x,
          block.y,
          block.width,
          block.height
        ),
        gradientStops: stops
      }];
    } else {
      const color = resolveToken(block.fill);
      rect.fills = [{ type: "SOLID", color }];
    }
    return rect;
  }
  function createTextureNode(tex, parentX, parentY) {
    const hex = PALETTE[tex.ink];
    const svgString = buildDotGridSvg(tex, hex);
    const node = figma.createNodeFromSvg(svgString);
    node.name = tex.id;
    node.x = tex.region.x + parentX;
    node.y = tex.region.y + parentY;
    node.opacity = safeOpacity(tex.opacity, 0.15);
    node.resize(Math.max(1, tex.region.width), Math.max(1, tex.region.height));
    return node;
  }
  async function createLabelNode(label, parentX, parentY, fontName) {
    const text = figma.createText();
    text.name = label.id;
    text.fontName = fontName;
    text.fontSize = Math.max(1, label.size);
    text.characters = label.text;
    text.x = label.x + parentX;
    text.y = label.y + parentY;
    text.opacity = safeOpacity(label.opacity, 0.85);
    text.fills = [{ type: "SOLID", color: { r: 0.12, g: 0.12, b: 0.12 } }];
    return text;
  }
  async function renderToFigma(spec, options) {
    const { params, mode, targetNode, isRectangular: isRectangular2 } = options;
    const fontName = await preloadSceneFonts(params.displayFont || "Times New Roman");
    let parentX = figma.viewport.center.x - spec.canvas.width / 2;
    let parentY = figma.viewport.center.y - spec.canvas.height / 2;
    if (targetNode && (mode === "fill" || mode === "mask")) {
      const bb = targetNode.absoluteBoundingBox;
      if (bb) {
        parentX = bb.x;
        parentY = bb.y;
      }
    }
    const frame = figma.createFrame();
    frame.name = `Pattern — seed ${spec.seed}`;
    frame.x = parentX;
    frame.y = parentY;
    frame.resize(Math.max(1, spec.canvas.width), Math.max(1, spec.canvas.height));
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    frame.clipsContent = true;
    figma.currentPage.appendChild(frame);
    try {
      const allBlocksToRender = [
        ...spec.blocks,
        ...spec.gradientBlock ? [spec.gradientBlock] : []
      ];
      if (allBlocksToRender.length > 0) {
        const blockNodes = allBlocksToRender.map(
          (block) => createBlockNode(block, parentX, parentY)
        );
        const blocksGroup = figma.group(blockNodes, frame);
        blocksGroup.name = "Blocks";
      }
      if (spec.textureRegions.length > 0) {
        const texNodes = spec.textureRegions.map(
          (tex) => createTextureNode(tex, parentX, parentY)
        );
        const texGroup = figma.group(texNodes, frame);
        texGroup.name = "Texture";
      }
      if (spec.labels.length > 0) {
        const labelNodes = await Promise.all(
          spec.labels.map((label) => createLabelNode(label, parentX, parentY, fontName))
        );
        const labelsGroup = figma.group(labelNodes, frame);
        labelsGroup.name = "Labels";
      }
      if (mode === "fill" && targetNode && isRectangular2 === false) {
        try {
          const cloned = targetNode.clone();
          cloned.x = 0;
          cloned.y = 0;
          cloned.isMask = true;
          cloned.name = "_mask";
          frame.insertChild(0, cloned);
        } catch (e) {
        }
      }
      saveRecipe(frame, params, spec.seed, mode);
      return frame;
    } catch (err) {
      try {
        frame.remove();
      } catch (e) {
      }
      throw err;
    }
  }
  async function renderBatchToFigma(specs, params, constraints) {
    var _a;
    const frames = [];
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const shape = constraints.shapes[i];
      figma.notify(`Pattern Forge: generating ${i + 1} of ${specs.length}…`, { timeout: 1500 });
      let targetNode;
      try {
        if (shape == null ? void 0 : shape.nodeId) {
          const found = figma.getNodeById(shape.nodeId);
          targetNode = found && "absoluteBoundingBox" in found ? found : void 0;
        }
      } catch (e) {
      }
      const frame = await renderToFigma(spec, {
        params: __spreadProps(__spreadValues({}, params), { seed: spec.seed, outputSize: { width: shape.width, height: shape.height } }),
        mode: "fill",
        targetNode,
        isRectangular: (_a = shape == null ? void 0 : shape.isRectangular) != null ? _a : true
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
  figma.showUI(__html__, {
    width: 320,
    height: 580,
    themeColors: true,
    title: "Pattern Forge"
  });
  function sendSelectionInfo() {
    const constraints = readSelection();
    const msg = { type: "SELECTION_INFO", constraints };
    figma.ui.postMessage(msg);
  }
  figma.on("selectionchange", () => {
    sendSelectionInfo();
    const selection = figma.currentPage.selection;
    if (selection.length === 1 && hasRecipe(selection[0])) {
      const recipe = loadRecipe(selection[0]);
      if (recipe) {
        const msg = {
          type: "LOADED_RECIPE",
          params: recipe.params,
          seed: recipe.seed
        };
        figma.ui.postMessage(msg);
      }
    }
  });
  figma.ui.onmessage = async (rawMsg) => {
    var _a, _b, _c;
    switch (rawMsg.type) {
      case "REQUEST_SELECTION_INFO": {
        sendSelectionInfo();
        break;
      }
      case "INSERT": {
        const msg = rawMsg;
        const { params, seed, constraints } = msg;
        const paramsWithSeed = __spreadProps(__spreadValues({}, params), { seed });
        try {
          if ((constraints == null ? void 0 : constraints.mode) === "batch" && constraints.shapes.length > 1) {
            const results = generateBatch(paramsWithSeed, constraints);
            const exceedsThreshold = results.some((r) => r.exceedsThreshold);
            if (exceedsThreshold) {
              figma.notify("⚠ High node count — this may take a moment…", { timeout: 3e3 });
            }
            const specs = results.map((r) => r.spec);
            await renderBatchToFigma(specs, paramsWithSeed, constraints);
          } else {
            const { spec, exceedsThreshold } = generateScene(paramsWithSeed, constraints);
            if (exceedsThreshold) {
              figma.notify("⚠ High node count — this may take a moment…", { timeout: 3e3 });
            }
            const mode = (_a = constraints == null ? void 0 : constraints.mode) != null ? _a : "none";
            let targetNode;
            let isRectangular2 = true;
            if ((constraints == null ? void 0 : constraints.mode) === "fill" || (constraints == null ? void 0 : constraints.mode) === "mask") {
              const shape = constraints.shapes[0];
              if (shape) {
                isRectangular2 = shape.isRectangular;
                try {
                  const found = figma.getNodeById(shape.nodeId);
                  targetNode = found && "absoluteBoundingBox" in found ? found : void 0;
                } catch (e) {
                }
              }
            }
            await renderToFigma(spec, { params: paramsWithSeed, mode, targetNode, isRectangular: isRectangular2 });
          }
          const msg2 = {
            type: "INSERT_COMPLETE",
            frameId: (_c = (_b = figma.currentPage.selection[0]) == null ? void 0 : _b.id) != null ? _c : ""
          };
          figma.ui.postMessage(msg2);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          figma.notify(`Pattern Forge error: ${message}`, { error: true });
          const completeMsg = { type: "INSERT_COMPLETE", frameId: "" };
          figma.ui.postMessage(completeMsg);
        }
        break;
      }
    }
  };
})();
