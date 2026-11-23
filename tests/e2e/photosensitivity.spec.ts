import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { devices, expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { buildStops, type JourneyStop } from "../../src/lib/world/journey.ts";
import {
  analyzeFlashes,
  type FlashMode,
  type FlashResult,
} from "../support/flash.ts";

const FPS = 60;
const FRAME_MS = 1000 / FPS;
const SAMPLE_WIDTH = 256;
const REPORT = "docs/reports/phase-7/photosensitivity.json";
const WORLD = '[data-led-slot][data-world="live"]';

test.setTimeout(900_000);

/** Advances page time by exactly one frame: timers, rAF and CSS animations. */
async function stepFrame(page: Page) {
  await page.evaluate((ms) => {
    for (const animation of document.getAnimations()) {
      // The section release is scrubbed by scroll, so time must not move it.
      if (
        "animationName" in animation &&
        animation.animationName === "section-release"
      ) {
        continue;
      }
      if (animation.playState === "running") animation.pause();
      if (animation.playState === "paused") {
        animation.currentTime = Number(animation.currentTime ?? 0) + ms;
      }
    }
  }, FRAME_MS);
  await page.clock.runFor(FRAME_MS);
}

async function grab(page: Page) {
  // PNG: JPEG chroma subsampling would blur red cells and understate the risk.
  const shot = await page.screenshot({ type: "png" });
  const { data, info } = await sharp(shot)
    .resize(SAMPLE_WIDTH, undefined, { kernel: "nearest" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

/** Plays a scripted scroll frame by frame and analyzes every captured frame. */
async function capture(
  page: Page,
  frameCount: number,
  scrollAt?: (frame: number) => number,
  mode: FlashMode = "concurrent",
) {
  const frames: Uint8Array[] = [];
  let width = 0;
  let height = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    if (scrollAt) {
      await page.evaluate((y) => {
        window.scrollTo({ top: y, behavior: "instant" });
        dispatchEvent(new Event("scroll"));
      }, scrollAt(frame));
    }
    await stepFrame(page);
    const image = await grab(page);
    frames.push(image.data);
    width = image.width;
    height = image.height;
  }
  return {
    result: analyzeFlashes({ width, height, frames, fps: FPS }, mode),
    count: frames.length,
  };
}

function save(name: string, entry: Record<string, unknown>) {
  mkdirSync("docs/reports/phase-7", { recursive: true });
  const saved = existsSync(REPORT)
    ? (JSON.parse(readFileSync(REPORT, "utf8")) as Record<string, unknown>)
    : {};
  saved[name] = entry;
  writeFileSync(REPORT, `${JSON.stringify(saved, null, 2)}\n`);
}

function record(name: string, result: FlashResult, frames: number) {
  save(name, { ...result, frames, gated: true });
  expect(
    result,
    `${name}: general ${result.general}, red ${result.red} flashes per second`,
  ).toMatchObject({ passes: true });
}

/**
 * Native page movement with every effect included. A fling slides light and dark
 * blocks past each other, which no effect causes, so this is reported, not gated.
 */
function inform(name: string, result: FlashResult, frames: number) {
  save(name, { ...result, frames, gated: false });
}

async function readStops(page: Page) {
  const layout = await page.evaluate(() => {
    const top = (element: Element) =>
      element.getBoundingClientRect().top + scrollY;
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    const stage = document.querySelector<HTMLElement>("[data-work-stage]");
    if (!hero || !stage) throw new Error("Missing hero or stage");
    return {
      heroBottom: top(hero) + hero.offsetHeight,
      cases: [...document.querySelectorAll<HTMLElement>("[data-texture]")].map(
        (item) => ({ top: top(item), height: item.offsetHeight }),
      ),
      stageBottom: top(stage) + stage.offsetHeight,
      viewport: innerHeight,
      sections: [...document.querySelectorAll("[data-act]")].map(top),
      maxScroll: document.documentElement.scrollHeight - innerHeight,
    };
  });
  return buildStops(layout);
}

function scrollFor(value: number, stops: JourneyStop[]) {
  for (let index = 1; index < stops.length; index += 1) {
    const start = stops[index - 1];
    const end = stops[index];
    if (start && end && value >= start.value && value <= end.value) {
      if (end.value === start.value) return start.scroll;
      const span = (value - start.value) / (end.value - start.value);
      return start.scroll + (end.scroll - start.scroll) * span;
    }
  }
  return stops.at(-1)?.scroll ?? 0;
}

/** An installed clock keeps ticking in real time until it is paused. */
async function pauseClock(page: Page) {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
}

/** Loads the page on a fake clock, with the world on the main thread. */
async function openWorld(page: Page) {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "OffscreenCanvas");
  });
  await page.clock.install();
  await page.goto("/");
  for (let tries = 0; tries < 600; tries += 1) {
    if ((await page.locator(WORLD).count()) > 0) break;
    await page.clock.runFor(100);
    await page.waitForTimeout(25);
  }
  await expect(page.locator(WORLD)).toHaveCount(1);
  await pauseClock(page);
  await page.clock.runFor(1500);
}

/** Leaves only the WebGL canvas painted, for the strict per-pixel measure. */
const canvasOnly = (page: Page) =>
  page.addStyleTag({
    content: "body *:not(canvas) { visibility: hidden !important; }",
  });

test.describe("calibration", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  for (const [name, hertz, passes, color] of [
    ["5 Hz white flash fails", 5, false, "#fff"],
    ["5 Hz saturated red flash fails", 5, false, "#c21d3a"],
    ["2 Hz saturated red flash passes", 2, true, "#c21d3a"],
  ] as const) {
    test(name, async ({ page }) => {
      await page.clock.install();
      await page.setContent(`<style>
        html, body { margin: 0; height: 100%; background: #0b0a0c; }
        div { height: 100%; background: ${color};
          animation: f ${1000 / hertz}ms steps(1, end) infinite; }
        @keyframes f { 0% { opacity: 1 } 50% { opacity: 0 } }
      </style><div></div>`);
      await pauseClock(page);
      const { result } = await capture(page, 90);
      expect(result.passes).toBe(passes);
    });
  }
});

test.describe("the live world", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("slow sweeps across every boundary", async ({ page }) => {
    await openWorld(page);
    await canvasOnly(page);
    const stops = await readStops(page);
    for (const boundary of [5, 6, 7, 8, 9, 10]) {
      await page.evaluate(
        (y) => {
          window.scrollTo({ top: y, behavior: "instant" });
          dispatchEvent(new Event("scroll"));
        },
        scrollFor(boundary, stops),
      );
      await page.clock.runFor(1200);
      const frames = 120;
      const { result, count } = await capture(
        page,
        frames,
        (frame) => scrollFor(boundary + (frame / frames) * 1, stops),
        "pixel",
      );
      record(`sweep ${boundary}-${boundary + 1}`, result, count);
    }
  });

  test("a fast scroll: canvas effects over the whole page", async ({
    page,
  }) => {
    await openWorld(page);
    await canvasOnly(page);
    const end = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    const frames = 300;
    const { result, count } = await capture(
      page,
      frames,
      (frame) => (frame / frames) * end,
    );
    record("fast scroll (canvas, concurrent)", result, count);
  });

  test("a fast scroll: every transition, per pixel", async ({ page }) => {
    await openWorld(page);
    await canvasOnly(page);
    const stops = await readStops(page);
    const start = scrollFor(5, stops);
    const end = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: "instant" });
      dispatchEvent(new Event("scroll"));
    }, start);
    await page.clock.runFor(1200);
    const frames = 180;
    const { result, count } = await capture(
      page,
      frames,
      (frame) => start + (frame / frames) * (end - start),
      "pixel",
    );
    record("fast scroll transitions (canvas, per pixel)", result, count);
  });

  test("a fast scroll: full page, for the report", async ({ page }) => {
    await openWorld(page);
    const end = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    const frames = 300;
    const { result, count } = await capture(
      page,
      frames,
      (frame) => (frame / frames) * end,
    );
    inform("fast scroll (full page, native movement)", result, count);
  });

  test("scroll jitter at the strongest effects", async ({ page }) => {
    await openWorld(page);
    await canvasOnly(page);
    const stops = await readStops(page);
    const viewport = await page.evaluate(() => innerHeight);
    for (const value of [5.5, 7.5, 8.5, 9.5, 10.3]) {
      const center = scrollFor(value, stops);
      await page.evaluate((y) => {
        window.scrollTo({ top: y, behavior: "instant" });
        dispatchEvent(new Event("scroll"));
      }, center);
      await page.clock.runFor(1200);
      // Four direction changes per second, the fastest a wheel plausibly does.
      const { result, count } = await capture(
        page,
        120,
        (frame) =>
          center + Math.sin((frame / FPS) * Math.PI * 4) * viewport * 0.12,
        "pixel",
      );
      record(`jitter at ${value}`, result, count);
    }
  });

  test("CRT hover effects", async ({ page }) => {
    await openWorld(page);
    await page.locator(".tape").first().scrollIntoViewIfNeeded();
    await page.clock.runFor(1500);
    await page.locator(".tape").first().hover();
    const { result, count } = await capture(page, 150);
    record("tape hover", result, count);
  });
});

test.describe("mobile", () => {
  const pixel = devices["Pixel 7"];
  test.use({
    viewport: pixel.viewport,
    userAgent: pixel.userAgent,
    deviceScaleFactor: 1,
    isMobile: pixel.isMobile,
    hasTouch: pixel.hasTouch,
  });

  const fling = async (page: Page, mode: FlashMode) => {
    const end = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    const frames = 300;
    return capture(page, frames, (frame) => (frame / frames) * end, mode);
  };

  test("a fast scroll through every seam burst", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await pauseClock(page);
    await page.clock.runFor(3000);
    await page.addStyleTag({
      content: `body *:not(.seam) { visibility: hidden !important; }
        .seam { visibility: visible !important; }`,
    });
    const { result, count } = await fling(page, "pixel");
    record("mobile seam bursts (per pixel)", result, count);
  });

  test("a fast scroll: full page, for the report", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await pauseClock(page);
    await page.clock.runFor(3000);
    const { result, count } = await fling(page, "concurrent");
    inform("mobile fast scroll (full page, native movement)", result, count);
  });
});
