import faceUrl from "../../assets/face/face.bin?url";
import type {
  FromWorld,
  SlotRect,
  ToWorld,
  View,
  WorldInit,
  WorldStats,
} from "./protocol.ts";

const FIRST_FRAME_TIMEOUT = 20000;

export interface WorldHandle {
  /** True after the first frame is on screen, false if WebGL couldn't start. */
  ready: Promise<boolean>;
  destroy(): void;
}

interface Link {
  send(message: ToWorld): void;
  close(): void;
}

type Listener = (message: FromWorld) => void;

function openWorker(
  canvas: HTMLCanvasElement,
  init: Omit<WorldInit, "type" | "canvas">,
  listen: Listener,
): Link | null {
  if (
    typeof Worker === "undefined" ||
    typeof OffscreenCanvas === "undefined" ||
    !("transferControlToOffscreen" in canvas)
  ) {
    return null;
  }
  try {
    const worker = new Worker(new URL("./world.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<FromWorld>) => {
      listen(event.data);
    };
    worker.onerror = () => {
      listen({ type: "failed" });
    };
    const offscreen = canvas.transferControlToOffscreen();
    const message: WorldInit = { type: "init", canvas: offscreen, ...init };
    worker.postMessage(message, [offscreen]);
    return {
      send: (next) => {
        worker.postMessage(next);
      },
      close() {
        // Let it free its GPU resources, but never wait on a stuck worker.
        const timer = setTimeout(() => {
          worker.terminate();
        }, 400);
        worker.onmessage = (event: MessageEvent<FromWorld>) => {
          if (event.data.type === "disposed") {
            clearTimeout(timer);
            worker.terminate();
          }
        };
        worker.onerror = null;
        worker.postMessage({ type: "dispose" } satisfies ToWorld);
      },
    };
  } catch {
    return null;
  }
}

async function openMainThread(
  canvas: HTMLCanvasElement,
  init: Omit<WorldInit, "type" | "canvas">,
  listen: Listener,
): Promise<Link> {
  const [{ createScene }, { decodeFace }] = await Promise.all([
    import("./scene.ts"),
    import("../face/decode.ts"),
  ]);
  const response = await fetch(init.faceUrl);
  if (!response.ok) throw new Error("Face data unavailable");
  const scene = createScene({
    canvas,
    face: decodeFace(await response.arrayBuffer()),
    view: init.view,
    slot: init.slot,
    onFirstFrame: () => {
      listen({ type: "first-frame" });
    },
    onFailed: () => {
      listen({ type: "failed" });
    },
    onStats: init.stats
      ? (stats) => {
          listen({ type: "stats", stats });
        }
      : undefined,
  });
  return {
    send(message) {
      if (message.type === "view") scene.setView(message.view, message.slot);
      else if (message.type === "slot") scene.setSlot(message.slot);
      else if (message.type === "pointer") {
        scene.setPointer(message.x, message.y, message.inside);
      } else if (message.type === "active") scene.setActive(message.active);
    },
    close() {
      scene.dispose();
    },
  };
}

export function startWorld(slot: HTMLElement, onLost: () => void): WorldHandle {
  const hero = slot.closest<HTMLElement>("[data-hero]") ?? slot;
  const header = document.querySelector("header");
  const showStats =
    import.meta.env.DEV && new URLSearchParams(location.search).has("fps");

  let canvas: HTMLCanvasElement | null = null;
  let link: Link | null = null;
  let live = false;
  let destroyed = false;
  let frame = 0;
  let pendingPointer: { x: number; y: number; inside: boolean } | null = null;
  let scrollDirty = false;
  let onScreen = true;
  let timer = 0;
  let settle = 0;
  let renderStats: ((stats: WorldStats, thread: string) => void) | null = null;
  let thread = "worker";
  let finish: (ok: boolean) => void = () => undefined;
  const ready = new Promise<boolean>((resolve) => {
    finish = resolve;
  });

  const readSlot = (): SlotRect => {
    const box = slot.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  };
  const readView = (): View => ({
    width: canvas?.clientWidth || document.documentElement.clientWidth,
    height: canvas?.clientHeight || window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    top: header?.getBoundingClientRect().bottom ?? 0,
  });

  const fadeWithScroll = () => {
    if (!canvas || !live) return;
    const box = hero.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -box.top / (box.height * 0.72)));
    canvas.style.opacity = String(1 - progress);
  };

  const flush = () => {
    frame = 0;
    if (scrollDirty) {
      scrollDirty = false;
      link?.send({ type: "slot", slot: readSlot() });
      fadeWithScroll();
    }
    if (pendingPointer) {
      link?.send({ type: "pointer", ...pendingPointer });
      pendingPointer = null;
    }
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(flush);
  };

  const onPointer = (event: PointerEvent) => {
    pendingPointer = { x: event.clientX, y: event.clientY, inside: true };
    schedule();
  };
  const onLeave = () => {
    pendingPointer = { x: 0, y: 0, inside: false };
    schedule();
  };
  const onScroll = () => {
    scrollDirty = true;
    schedule();
  };
  const onResize = () => {
    link?.send({ type: "view", view: readView(), slot: readSlot() });
    fadeWithScroll();
  };
  const syncActive = () => {
    link?.send({ type: "active", active: onScreen && !document.hidden });
  };
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    syncActive();
  });

  const teardown = () => {
    clearTimeout(timer);
    clearTimeout(settle);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    removeEventListener("pointermove", onPointer);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", syncActive);
    visibility.disconnect();
    link?.close();
    link = null;
    canvas?.remove();
    canvas = null;
    live = false;
    delete slot.dataset.world;
  };

  const makeCanvas = () => {
    canvas?.remove();
    const next = document.createElement("canvas");
    next.className = "world-canvas";
    next.setAttribute("aria-hidden", "true");
    document.body.append(next);
    canvas = next;
    return next;
  };

  const handle = (message: FromWorld) => {
    if (destroyed) return;
    if (message.type === "stats") {
      renderStats?.(message.stats, thread);
    } else if (message.type === "first-frame" && !live) {
      clearTimeout(timer);
      live = true;
      // One crossfade: the frame fades in as the poster and panel fade out.
      fadeWithScroll();
      if (canvas) canvas.dataset.live = "";
      slot.dataset.world = "live";
      syncActive();
      settle = window.setTimeout(() => {
        if (canvas) canvas.dataset.settled = "";
      }, 220);
      finish(true);
    } else if (message.type === "failed") {
      if (!live && thread === "worker") {
        void fallBack();
      } else {
        const wasLive = live;
        teardown();
        destroyed = true;
        finish(false);
        if (wasLive) onLost();
      }
    }
  };

  const options = () => ({
    faceUrl: new URL(faceUrl, location.href).href,
    view: readView(),
    slot: readSlot(),
    stats: showStats,
  });

  const armTimeout = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      handle({ type: "failed" });
    }, FIRST_FRAME_TIMEOUT);
  };

  /** The canvas was transferred, so the fallback always needs a fresh one. */
  async function fallBack() {
    thread = "main";
    link?.close();
    link = null;
    const next = makeCanvas();
    armTimeout();
    try {
      const opened = await openMainThread(next, options(), handle);
      if (destroyed) opened.close();
      else link = opened;
    } catch {
      handle({ type: "failed" });
    }
  }

  const first = makeCanvas();
  link = openWorker(first, options(), handle);
  armTimeout();
  if (!link) void fallBack();

  addEventListener("pointermove", onPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", syncActive);
  visibility.observe(hero);

  if (import.meta.env.DEV && showStats) {
    void import("./fps-overlay.ts").then(({ createFpsOverlay }) => {
      if (!destroyed) renderStats = createFpsOverlay();
    });
  }

  return {
    ready,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      teardown();
      finish(false);
      if (import.meta.env.DEV) {
        document.querySelector("[data-fps-overlay]")?.remove();
      }
    },
  };
}
