import faceUrl from "../../assets/face/face.bin?url";
import {
  buildStops,
  journeyAt,
  smoothstep,
  type JourneyStop,
} from "./journey.ts";
import type {
  DrumLayout,
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
  /** True while the visitor is between the tunnel and the end of the drum. */
  inJourney(): boolean;
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
    journey: init.journey,
    drum: init.drum,
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
      else if (message.type === "journey") scene.setJourney(message.value);
      else if (message.type === "drum") scene.setDrum(message.drum);
      else if (message.type === "texture") {
        scene.loadTexture(message.index, message.url);
      } else if (message.type === "pointer") {
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
  const root = document.documentElement;
  const stage = document.querySelector<HTMLElement>("[data-work-stage]");
  const tunnelSpace = document.querySelector<HTMLElement>(
    "[data-signal-tunnel]",
  );
  const cases = [...document.querySelectorAll<HTMLElement>("[data-texture]")];
  const requested = new Set<number>();
  const showing = new Set<Element>([hero]);
  let stops: JourneyStop[] = [];
  let journey = 0;
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
    const textBottom = Math.max(
      ...[...hero.querySelectorAll(".hero__identity, .hero__copy")].map(
        (part) => part.getBoundingClientRect().bottom,
      ),
    );
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      textBottom,
      headerBottom: header?.getBoundingClientRect().bottom ?? 0,
    };
  };
  const readView = (): View => ({
    width: canvas?.clientWidth || document.documentElement.clientWidth,
    height: canvas?.clientHeight || window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  });

  const readDrum = (): DrumLayout => {
    const media = cases[0]?.querySelector("[data-screen-slot]");
    const box = media?.getBoundingClientRect();
    return {
      x: box ? box.x + box.width / 2 : window.innerWidth / 2,
      width: box?.width ?? 640,
      accents: cases.map((item) => {
        const hex = getComputedStyle(item)
          .getPropertyValue("--accent")
          .trim()
          .replace("#", "");
        const value = Number.parseInt(hex, 16) || 0xc21d3a;
        return [
          ((value >> 16) & 255) / 255,
          ((value >> 8) & 255) / 255,
          (value & 255) / 255,
        ];
      }),
    };
  };

  /** Layout is read only when it changes, never on each scroll event. */
  const measure = () => {
    const top = (element: Element) =>
      element.getBoundingClientRect().top + scrollY;
    stops = buildStops({
      heroBottom: top(hero) + hero.offsetHeight,
      cases: cases.map((item) => ({
        top: top(item),
        height: item.offsetHeight,
      })),
      stageBottom: stage ? top(stage) + stage.offsetHeight : 0,
      viewport: window.innerHeight,
    });
  };

  const applyJourney = () => {
    journey = journeyAt(scrollY, stops);
    link?.send({ type: "journey", value: journey });
    // Textures stream in for the project in view and its neighbors.
    if (journey >= 1) {
      const position = journey - 2;
      cases.forEach((item, index) => {
        const url = item.dataset.texture;
        if (url && !requested.has(index) && Math.abs(index - position) <= 1.2) {
          requested.add(index);
          link?.send({
            type: "texture",
            index,
            url: new URL(url, location.href).href,
          });
        }
      });
    }
    if (canvas && live) {
      // Past the drum the page is dark again, and the frozen frame must go.
      canvas.style.opacity = String(1 - smoothstep(5.82, 6, journey));
    }
  };

  const flush = () => {
    frame = 0;
    if (scrollDirty) {
      scrollDirty = false;
      // Journey first: a jump back to the top must still re-place the face.
      applyJourney();
      if (journey < 1.3) link?.send({ type: "slot", slot: readSlot() });
      // The header is gone, so the Motion control stays within reach.
      root.toggleAttribute(
        "data-motion-pinned",
        live && (header?.getBoundingClientRect().bottom ?? 1) <= 0,
      );
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
    relayout();
  };
  const relayout = () => {
    measure();
    link?.send({ type: "drum", drum: readDrum() });
    applyJourney();
  };
  // Catches anything that changes height, such as an opened <details>.
  const resizes = new ResizeObserver(() => {
    relayout();
  });
  const syncActive = () => {
    link?.send({ type: "active", active: onScreen && !document.hidden });
  };
  // The world runs from the hero to the end of Featured Work, then rests.
  const visibility = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) showing.add(entry.target);
      else showing.delete(entry.target);
    }
    onScreen = showing.size > 0;
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
    resizes.disconnect();
    link?.close();
    link = null;
    canvas?.remove();
    canvas = null;
    live = false;
    delete slot.dataset.world;
    delete root.dataset.worldLive;
    root.removeAttribute("data-motion-pinned");
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
      applyJourney();
      if (canvas) canvas.dataset.live = "";
      slot.dataset.world = "live";
      root.dataset.worldLive = "";
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
    journey,
    drum: readDrum(),
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

  measure();
  journey = journeyAt(scrollY, stops);
  const first = makeCanvas();
  link = openWorker(first, options(), handle);
  armTimeout();
  if (!link) void fallBack();

  addEventListener("pointermove", onPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", syncActive);
  for (const part of [hero, tunnelSpace, stage]) {
    if (part) visibility.observe(part);
  }
  resizes.observe(document.body);

  if (import.meta.env.DEV && showStats) {
    void import("./fps-overlay.ts").then(({ createFpsOverlay }) => {
      if (!destroyed) renderStats = createFpsOverlay();
    });
  }

  return {
    ready,
    inJourney: () => journey >= 1 && journey < 6,
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
