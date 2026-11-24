import type { WorldStats } from "./protocol.ts";

/**
 * Dev-only readout, opened with `npm run dev` and `/?fps`.
 * It's imported behind `import.meta.env.DEV`, so production builds drop it.
 */
export function createFpsOverlay() {
  const panel = document.createElement("output");
  panel.dataset.fpsOverlay = "LED-FPS-OVERLAY";
  panel.style.cssText =
    "position:fixed;right:12px;bottom:12px;z-index:9999;padding:8px 10px;" +
    "background:#0b0a0c;border:1px solid #736c72;border-radius:4px;color:#f2eeea;" +
    "font:12px/1.5 ui-monospace,monospace;white-space:pre;pointer-events:none";
  panel.textContent = "WebGL: starting";
  document.body.append(panel);
  return (stats: WorldStats, thread: string) => {
    panel.textContent =
      `${stats.fps} fps  ${stats.frameMs} ms JS\n` +
      `${thread} · DPR ${stats.dpr} · ${stats.quality ? "full" : "reduced"} fx`;
  };
}
