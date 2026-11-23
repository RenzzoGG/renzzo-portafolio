/**
 * Critical entry for the LED face. It only decides what this visit may run:
 * the WebGL world, the 2D canvas, or the static poster. Everything heavier
 * loads after first paint and idle, and never while motion is off.
 */
import {
  desktopDevice,
  hasWebGL2,
  motionAllowed,
  onDeviceChange,
} from "../world/gate.ts";
import type { WorldHandle } from "../world/host.ts";
import type { FaceRenderer } from "./canvas-renderer.ts";
import type { FaceTilt } from "./tilt.ts";

const slot = document.querySelector<HTMLElement>("[data-led-slot]");
const host = slot?.querySelector<HTMLElement>("[data-face-layers]");

if (slot && host) {
  const root = document.documentElement;
  let world: WorldHandle | null = null;
  let flat: FaceRenderer | null = null;
  let flatLoading = false;
  let flatFailed = false;
  let worldLoading = false;
  let worldFailed = false;

  const wantsWorld = () =>
    motionAllowed() && desktopDevice() && !worldFailed && hasWebGL2();
  const wantsFlat = () => motionAllowed() && !wantsWorld();

  const stopFlat = () => {
    flat?.destroy();
    flat = null;
    delete slot.dataset.face;
  };

  const startFlat = async () => {
    flatLoading = true;
    try {
      const [{ loadFace }, { createCanvasRenderer }] = await Promise.all([
        import("./load.ts"),
        import("./canvas-renderer.ts"),
      ]);
      const face = await loadFace();
      if (wantsFlat() && !flat) {
        const next = createCanvasRenderer(host, face);
        const ready = await next.start();
        if (ready && wantsFlat()) {
          flat = next;
          slot.dataset.face = "live";
        } else {
          next.destroy();
        }
      }
    } catch {
      // The poster stays in place, so the hero is never empty.
      flat = null;
      flatFailed = true;
    } finally {
      flatLoading = false;
      sync();
    }
  };

  const failWorld = () => {
    worldFailed = true;
    world = null;
    sync();
  };

  const startWorld = async () => {
    worldLoading = true;
    try {
      const { startWorld: start } = await import("../world/host.ts");
      if (wantsWorld()) {
        const next = start(slot, failWorld);
        world = next;
        const ok = await next.ready;
        // A failed start falls back silently. A cancelled one just ends.
        if (!ok && world === next) failWorld();
      }
    } catch {
      failWorld();
    } finally {
      worldLoading = false;
      sync();
    }
  };

  function sync() {
    // Without a world, the tunnel's reserved scroll space collapses.
    root.toggleAttribute(
      "data-world-failed",
      worldFailed || (motionAllowed() && desktopDevice() && !hasWebGL2()),
    );
    if (wantsWorld()) {
      if (!world && !worldLoading) void startWorld();
    } else if (world) {
      // The tunnel's space collapses, so keep the reader on their project.
      const keepPlace = world.inJourney();
      world.destroy();
      world = null;
      if (keepPlace) {
        document
          .querySelector(".case[data-active]")
          ?.scrollIntoView({ behavior: "instant" });
      }
    }
    if (wantsFlat()) {
      if (!flat && !flatLoading && !flatFailed) void startFlat();
    } else if (flat) {
      stopFlat();
    }
  }

  setupTilt(slot, motionAllowed);

  const begin = () => {
    new MutationObserver(sync).observe(root, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    onDeviceChange(sync);
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

/** Phones get a visible control, because iOS needs a tap to allow motion data. */
function setupTilt(target: HTMLElement, allowed: () => boolean) {
  const button =
    document.querySelector<HTMLButtonElement>("[data-tilt-toggle]");
  const state = button?.querySelector("[data-tilt-state]");
  if (
    !button ||
    !state ||
    !("DeviceOrientationEvent" in window) ||
    !matchMedia("(pointer: coarse)").matches
  ) {
    return;
  }
  let tilt: FaceTilt | null = null;

  const render = () => {
    button.hidden = !allowed();
    button.setAttribute("aria-pressed", String(Boolean(tilt)));
    state.textContent = (tilt ? button.dataset.on : button.dataset.off) ?? "";
  };
  const stop = () => {
    tilt?.stop();
    tilt = null;
    render();
  };

  button.addEventListener("click", () => {
    if (tilt) {
      stop();
      return;
    }
    void import("./tilt.ts")
      .then(({ startTilt }) => startTilt(target))
      .then((next) => {
        tilt = next;
        render();
      })
      .catch(stop);
  });
  new MutationObserver(() => {
    if (!allowed()) stop();
    else render();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  render();
}
