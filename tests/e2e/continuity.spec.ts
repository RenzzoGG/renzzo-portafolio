import { devices, expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import {
  actAt,
  buildStops,
  journeyAt,
  type JourneyStop,
} from "../../src/lib/world/journey.ts";

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

/** Reads the same layout the world uses, so tests can scroll to a journey value. */
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

function scrollForJourney(value: number, stops: JourneyStop[]) {
  for (let index = 1; index < stops.length; index += 1) {
    const start = stops[index - 1];
    const end = stops[index];
    if (start && end && value >= start.value && value <= end.value) {
      if (end.value === start.value) return start.scroll;
      const span = (value - start.value) / (end.value - start.value);
      return start.scroll + (end.scroll - start.scroll) * span;
    }
  }
  throw new Error(`No scroll position for journey ${value}`);
}

/** Pinned content still painted inside the viewport, with its real opacity. */
async function visiblePinned(page: Page, selectors: string[]) {
  return page.evaluate((list) => {
    const shown: string[] = [];
    for (const selector of list) {
      for (const element of document.querySelectorAll(selector)) {
        const box = element.getBoundingClientRect();
        if (box.bottom <= 0 || box.top >= innerHeight || box.width === 0) {
          continue;
        }
        let opacity = 1;
        for (
          let node: Element | null = element;
          node;
          node = node.parentElement
        ) {
          opacity *= Number(getComputedStyle(node).opacity);
        }
        if (opacity > 0.04) {
          shown.push(`${selector} (opacity ${opacity.toFixed(2)})`);
        }
      }
    }
    return shown;
  }, selectors);
}

/**
 * Share of the upper frame that is still the bone page color. The lower part is
 * left out because the next section's bone tape labels are already arriving.
 */
async function boneShare(shot: Buffer) {
  const image = sharp(shot);
  const { width = 0, height = 0 } = await image.metadata();
  const { data, info } = await image
    .extract({ left: 0, top: 0, width, height: Math.round(height * 0.75) })
    .resize(160, undefined, { kernel: "nearest" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bone = 0;
  for (let index = 0; index < data.length; index += 3) {
    if (
      (data[index] ?? 0) > 215 &&
      (data[index + 1] ?? 0) > 210 &&
      (data[index + 2] ?? 0) > 205
    ) {
      bone += 1;
    }
  }
  return bone / (info.width * info.height);
}

const PINNED_TRANSITIONS = [
  {
    name: "Featured Work to More work",
    selectors: [".work__rail", ".case__body"],
    journeys: [5.4, 5.55, 5.7, 5.85],
  },
  {
    name: "More work to About",
    selectors: [".shelf__monitor"],
    journeys: [6.4, 6.6, 6.8],
  },
];

test.describe("pinned content leaves with its section", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const { name, selectors, journeys } of PINNED_TRANSITIONS) {
    for (const direction of ["down", "up"] as const) {
      test(`${name}, scrolling ${direction}`, async ({ page }) => {
        await page.goto("/");
        await page.locator(WORLD).waitFor({ timeout: 60_000 });
        const stops = await readStops(page);
        const order = direction === "down" ? journeys : [...journeys].reverse();
        // Start on the far side, so each sample is reached in this direction.
        const startAt = direction === "down" ? 4.99 : 7;
        await page.evaluate(
          (y) => {
            window.scrollTo({ top: y, behavior: "instant" });
          },
          scrollForJourney(startAt, stops),
        );
        await page.waitForTimeout(SETTLE_MS);

        const leftovers: string[] = [];
        for (const journey of order) {
          await page.evaluate(
            (y) => {
              window.scrollTo({ top: y, behavior: "instant" });
            },
            scrollForJourney(journey, stops),
          );
          await page.waitForTimeout(SETTLE_MS);
          for (const item of await visiblePinned(page, selectors)) {
            leftovers.push(`journey ${journey}: ${item}`);
          }
          if (journey >= 5.75 && journey < 6) {
            const share = await boneShare(await page.screenshot());
            if (share > 0.03) {
              leftovers.push(
                `journey ${journey}: ${(share * 100).toFixed(1)}% bone`,
              );
            }
          }
        }
        expect(leftovers, "pinned content during the transition").toEqual([]);
      });
    }
  }

  test("focus keeps a released panel reachable", async ({ page }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    const stops = await readStops(page);
    await page.evaluate(
      (y) => {
        window.scrollTo({ top: y, behavior: "instant" });
      },
      scrollForJourney(5.7, stops),
    );
    const link = page.locator(".case").last().locator(".actions a").first();
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
    await expect
      .poll(() =>
        link.evaluate((element) => {
          let opacity = 1;
          for (
            let node: Element | null = element;
            node;
            node = node.parentElement
          ) {
            opacity *= Number(getComputedStyle(node).opacity);
          }
          return opacity;
        }),
      )
      .toBeGreaterThan(0.95);
  });
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
