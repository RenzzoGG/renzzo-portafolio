/**
 * Critical entry for the LED face. It only watches the motion settings. The
 * data and renderer load after first paint, and never while motion is off.
 */
import type { FaceRenderer } from "./canvas-renderer.ts";

const slot = document.querySelector<HTMLElement>("[data-led-slot]");
const canvas = slot?.querySelector("canvas");

if (slot && canvas) {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let renderer: FaceRenderer | null = null;
  let loading = false;

  const allowed = () => !reduced.matches && root.dataset.motion !== "off";

  const activate = async () => {
    loading = true;
    try {
      const [{ loadFace }, { createCanvasRenderer }] = await Promise.all([
        import("./load.ts"),
        import("./canvas-renderer.ts"),
      ]);
      const face = await loadFace();
      if (allowed() && !renderer) {
        renderer = createCanvasRenderer(canvas, face);
        renderer.start();
        slot.dataset.face = "live";
      }
    } catch {
      // The poster stays in place, so the hero is never empty.
      renderer = null;
    } finally {
      loading = false;
    }
  };

  const sync = () => {
    if (allowed()) {
      if (!renderer && !loading) void activate();
    } else if (renderer) {
      renderer.destroy();
      renderer = null;
      delete slot.dataset.face;
    }
  };

  const begin = () => {
    new MutationObserver(sync).observe(root, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    reduced.addEventListener("change", sync);
    sync();
  };

  const whenIdle = () => {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(begin, { timeout: 2000 });
    } else {
      setTimeout(begin, 200);
    }
  };

  if (document.readyState === "complete") whenIdle();
  else addEventListener("load", whenIdle, { once: true });
}
