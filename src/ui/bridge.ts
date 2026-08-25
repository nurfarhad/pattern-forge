// ─── postMessage bridge ───────────────────────────────────────────────────────
// Typed wrappers around figma.ui.postMessage / window.onmessage.
// This runs in the UI iframe context.

import type {
  UIToMainMessage,
  MainToUIMessage,
  GenerationParams,
  SelectionConstraints,
} from '@generator/scene-spec';

// ─── UI → Main ────────────────────────────────────────────────────────────────

export function sendInsert(params: GenerationParams, seed: string, constraints?: SelectionConstraints): void {
  const msg: UIToMainMessage = { type: 'INSERT', params, seed, constraints };
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function sendLiveUpdate(params: GenerationParams, seed: string, targetFrameId: string): void {
  const msg: UIToMainMessage = { type: 'LIVE_UPDATE', params, seed, targetFrameId };
  parent.postMessage({ pluginMessage: msg }, '*');
}

export function sendRequestSelectionInfo(): void {
  const msg: UIToMainMessage = { type: 'REQUEST_SELECTION_INFO' };
  parent.postMessage({ pluginMessage: msg }, '*');
}

// ─── Main → UI ────────────────────────────────────────────────────────────────

type MessageHandler = (msg: MainToUIMessage) => void;

export function onPluginMessage(handler: MessageHandler): () => void {
  const listener = (event: MessageEvent) => {
    const msg = event.data?.pluginMessage as MainToUIMessage | undefined;
    if (msg?.type) handler(msg);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
