import { devices, expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { actAt, buildStops, journeyAt } from "../../src/lib/world/journey.ts";

const WORLD = '[data-led-slot][data-world="live"]';
const STEP = 0.35;
const SETTLE_MS = 380;
const TOLERANCE = 10;
const MAX_UNIFORM = 0.985;

test.setTimeout(600_000);

/** Share of pixels within a small distance of the most common color. */
async function uniformity(shot: Buffer) {
  const { data, info } = await sharp(shot)
    .resize(160, undefined, { kernel: "nearest" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  const counts = new Map<number, number>();
  for (let index = 0; index < data.length; index += 3) {
    const key =
      (((data[index] ?? 0) >> 3) << 10) |
      (((data[index + 1] ?? 0) >> 3) << 5) |
      ((data[index + 2] ?? 0) >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const mode = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const center = [
    ((mode >> 10) << 3) + 4,
    (((mode >> 5) & 31) << 3) + 4,
    ((mode & 31) << 3) + 4,
  ];
  let near = 0;
  for (let index = 0; index < data.length; index += 3) {
    const close = center.every(
      (value, channel) =>
        Math.abs((data[index + channel] ?? 0) - value) <= TOLERANCE,
    );
    if (close) near += 1;
  }
  return near / total;
}

async function expectNoBlankViewport(page: Page) {
  const { height, viewport } = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    viewport: innerHeight,
  }));
  const end = height - viewport;
  const blank: string[] = [];
  for (let top = 0; ; top = Math.min(end, top + viewport * STEP)) {
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: "instant" });
    }, top);
    await page.waitForTimeout(SETTLE_MS);
    const share = await uniformity(await page.screenshot());
    if (share > MAX_UNIFORM) {
      blank.push(`${Math.round(top)}px (${(share * 100).toFixed(1)}%)`);
    }
    if (top >= end) break;
  }
  expect(blank, "viewports that are a near-uniform color").toEqual([]);
}

test("section transitions follow the page in order", () => {
  const stops = buildStops({
    heroBottom: 900,
    cases: [2000, 2900, 3800, 4700].map((top) => ({ top, height: 900 })),
    stageBottom: 5960,
    viewport: 900,
    sections: [6100, 7400, 8700, 10000, 11300, 11900],
    maxScroll: 12000,
  });
  for (let index = 1; index < stops.length; index += 1) {
    expect(stops[index]?.scroll).toBeGreaterThan(stops[index - 1]?.scroll ?? 0);
  }
  expect(journeyAt(4700, stops)).toBe(5);
  expect(journeyAt(6100, stops)).toBe(6);
  expect(journeyAt(12000, stops)).toBe(11);
});

test("every settled section shows the scene, with no effect running", () => {
  for (const value of [6, 7, 8, 9, 10, 11]) {
    const act = actAt(value);
    expect(
      Math.max(act.wall, act.stream, act.dots, act.curtain),
      `journey ${value}`,
    ).toBeGreaterThan(0.5);
    expect(act.squeeze + act.roll + act.slice + act.noise).toBeCloseTo(0, 5);
    expect(act.distance).toBeCloseTo(1, 5);
  }
});

test("no moment between sections leaves the scene empty", () => {
  for (let value = 5; value <= 11; value += 0.01) {
    const act = actAt(value);
    const shown = Math.max(
      act.bone,
      act.wall,
      act.stream,
      act.dots,
      act.curtain,
      act.noise,
      act.squeeze,
    );
    expect(shown, `journey ${value.toFixed(2)}`).toBeGreaterThan(0.02);
  }
});

test.describe("no blank viewport", () => {
  test.describe("desktop with the live world", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("across the whole page", async ({ page }) => {
      await page.goto("/");
      await page.locator(WORLD).waitFor({ timeout: 60_000 });
      await expectNoBlankViewport(page);
    });
  });

  test.describe("mobile", () => {
    const pixel = devices["Pixel 7"];
    test.use({
      viewport: pixel.viewport,
      userAgent: pixel.userAgent,
      deviceScaleFactor: pixel.deviceScaleFactor,
      isMobile: pixel.isMobile,
      hasTouch: pixel.hasTouch,
    });

    test("across the whole page", async ({ page }) => {
      await page.goto("/");
      await expectNoBlankViewport(page);
    });
  });

  test.describe("reduced motion", () => {
    test.use({
      viewport: { width: 1440, height: 900 },
      contextOptions: { reducedMotion: "reduce" },
    });

    test("across the whole page", async ({ page }) => {
      await page.goto("/");
      await expectNoBlankViewport(page);
    });
  });
});
