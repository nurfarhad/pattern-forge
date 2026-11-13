// Tracks whether the user is mid-gesture (dragging a slider). Heavy work —
// rebuilding the Figma frame — waits until the gesture ends (Toolcraft rule:
// live preview stays instant, expensive refinement happens on release).
type Listener = (dragging: boolean) => void;
let dragging = false;
const listeners = new Set<Listener>();

export const interaction = {
  get dragging() { return dragging; },
  set(next: boolean) {
    if (dragging === next) return;
    dragging = next;
    listeners.forEach((l) => l(next));
  },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
};
