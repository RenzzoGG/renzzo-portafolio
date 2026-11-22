import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { devices, expect, test, type Page } from "@playwright/test";

const WORLD = '[data-led-slot][data-world="live"]';
const FLAT = '[data-led-slot][data-face="live"]';
const WEBGL_REQUEST = /world\.worker|\/scene\./;
const pixel = devices["Pixel 7"];

test.setTimeout(90_000);
test.use({ viewport: { width: 1440, height: 900 } });

const trackWebGL = (page: Page) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (WEBGL_REQUEST.test(request.url())) requests.push(request.url());
  });
  return requests;
};

const settle = async (page: Page) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(3000);
};

const filesIn = (folder: string): string[] =>
  readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    return statSync(path).isDirectory() ? filesIn(path) : [path];
  });

test("the FPS overlay is not in the production build", () => {
  const text = filesIn("dist").filter((file) => /\.(js|html)$/.test(file));
  expect(text.length).toBeGreaterThan(0);
  for (const file of text) {
    expect(readFileSync(file, "utf8"), file).not.toMatch(
      /LED-FPS-OVERLAY|fps-overlay|createFpsOverlay/,
    );
  }
});

test.describe("devices that must never load WebGL", () => {
  test.describe("phone", () => {
    test.use({
      viewport: pixel.viewport,
      userAgent: pixel.userAgent,
      deviceScaleFactor: pixel.deviceScaleFactor,
      isMobile: pixel.isMobile,
      hasTouch: pixel.hasTouch,
    });

    test("requests no WebGL chunk and runs the 2D face", async ({ page }) => {
      const requests = trackWebGL(page);
      await page.goto("/");
      await page.locator(FLAT).waitFor();
      await page.waitForTimeout(1500);
      expect(requests).toEqual([]);
      await expect(page.locator(".world-canvas")).toHaveCount(0);
      await expect(page.locator("[data-tilt-toggle]")).toBeVisible();
    });
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("requests no WebGL chunk", async ({ page }) => {
      const requests = trackWebGL(page);
      await settle(page);
      expect(requests).toEqual([]);
      await expect(page.locator(".world-canvas")).toHaveCount(0);
      await expect(page.locator(".led-slot__poster")).toBeVisible();
    });
  });

  test("a stored Motion off requests no WebGL chunk", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("motion", "off");
    });
    const requests = trackWebGL(page);
    await settle(page);
    expect(requests).toEqual([]);
    await expect(page.locator(".world-canvas")).toHaveCount(0);
  });

  test.describe("narrow desktop", () => {
    test.use({ viewport: { width: 1023, height: 800 } });

    test("requests no WebGL chunk below 1024 px", async ({ page }) => {
      const requests = trackWebGL(page);
      await page.goto("/");
      await page.locator(FLAT).waitFor();
      expect(requests).toEqual([]);
    });
  });
});

test("desktop loads WebGL after first paint, in a worker, with no shift", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { shift: number };
    state.shift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.shift += (entry as unknown as { value: number }).value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  const slot = page.locator("[data-led-slot]");
  const before = await slot.boundingBox();
  await page.locator(WORLD).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(700);
  expect(await slot.boundingBox()).toEqual(before);

  const timing = await page.evaluate(() => ({
    fcp:
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0,
    world:
      performance
        .getEntriesByType("resource")
        .find((entry) => entry.name.includes("world.worker"))?.startTime ?? -1,
    shift: (window as unknown as { shift: number }).shift,
    h1: getComputedStyle(document.querySelector("h1") as Element).opacity,
  }));
  expect(timing.world).toBeGreaterThan(timing.fcp);
  expect(timing.shift).toBeLessThan(0.05);
  expect(timing.h1).toBe("1");
  expect(page.workers().length).toBeGreaterThan(0);

  const canvas = page.locator(".world-canvas");
  await expect(canvas).toHaveAttribute("aria-hidden", "true");
  await expect(canvas).toHaveCSS("pointer-events", "none");
  await expect(page.locator(".led-slot__glow")).toHaveCSS("opacity", "0");
});

test("Motion off stops the world and Motion on restores it", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(WORLD).waitFor({ timeout: 60_000 });

  await page.locator("[data-motion-toggle]").click();
  await expect(page.locator(WORLD)).toHaveCount(0);
  await expect(page.locator(".world-canvas")).toHaveCount(0);
  await expect(page.locator(".led-slot__glow")).toHaveCSS("opacity", "1");
  await expect.poll(() => page.workers().length).toBe(0);

  await page.locator("[data-motion-toggle]").click();
  await page.locator(WORLD).waitFor({ timeout: 60_000 });
  await expect(page.locator(".world-canvas")).toHaveCount(1);
});

test("shrinking below desktop swaps the world for the 2D face", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(WORLD).waitFor({ timeout: 60_000 });
  await page.setViewportSize({ width: 900, height: 800 });
  await page.locator(FLAT).waitFor();
  await expect(page.locator(".world-canvas")).toHaveCount(0);
});

test("without OffscreenCanvas it renders on the main thread", async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>)
      .transferControlToOffscreen;
  });
  const requests = trackWebGL(page);
  await page.goto("/");
  await page.locator(WORLD).waitFor({ timeout: 60_000 });
  expect(requests.some((url) => url.includes("/scene."))).toBe(true);
  expect(requests.some((url) => url.includes("world.worker"))).toBe(false);
});

test("without WebGL 2 it falls back to the 2D face silently", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      if (type === "webgl2") return null;
      return (original as (...args: unknown[]) => unknown).call(
        this,
        type,
        ...rest,
      );
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  const requests = trackWebGL(page);
  await page.goto("/");
  await page.locator(FLAT).waitFor();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
