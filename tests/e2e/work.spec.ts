import { readFileSync, statSync } from "node:fs";
import { devices, expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { contrastRatio } from "../../src/lib/contrast.ts";
import { buildStops, journeyAt } from "../../src/lib/world/journey.ts";

const WORLD = '[data-led-slot][data-world="live"]';
const PROJECTS = [
  "clearline-dental",
  "pulse-theory",
  "fernwick-platform",
  "stocktill",
];
const BONE = "#f2eeea";
const WEBGL_REQUEST = /world\.worker|\/scene\./;
const pixel = devices["Pixel 7"];

test.setTimeout(120_000);

const textures = () =>
  [
    ...readFileSync("dist/index.html", "utf8").matchAll(
      /data-texture="([^"]+)"/g,
    ),
  ]
    .map((match) => match[1] ?? "")
    .filter(Boolean);

const trackTextures = (page: Page) => {
  const urls = new Set(textures());
  const seen: string[] = [];
  page.context().on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (urls.has(path)) seen.push(path);
  });
  return seen;
};

const jump = (page: Page, id: string) =>
  page.evaluate((target) => {
    const box = document.getElementById(target)?.getBoundingClientRect();
    if (box) {
      window.scrollTo({
        top: box.top + scrollY + box.height / 2 - innerHeight / 2,
        behavior: "instant",
      });
    }
  }, id);

const disableWebGL = ({ page }: { page: Page }) =>
  page.addInitScript(() => {
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

const current = (id: string) => `[data-index-link][href="#${id}"]`;

const expectIndexSync = async (page: Page) => {
  for (const id of [...PROJECTS, ...[...PROJECTS].reverse()]) {
    await jump(page, id);
    await expect(page.locator(current(id))).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.locator("[data-index-link][aria-current]")).toHaveCount(
      1,
    );
  }
};

test("the journey holds on each project and only moves forward", () => {
  const stops = buildStops({
    heroBottom: 900,
    cases: [
      { top: 3000, height: 900 },
      { top: 3900, height: 1400 },
    ],
    stageBottom: 7000,
    viewport: 900,
  });
  for (let index = 1; index < stops.length; index += 1) {
    expect(stops[index]?.scroll).toBeGreaterThan(stops[index - 1]?.scroll ?? 0);
  }
  expect(journeyAt(0, stops)).toBe(0);
  expect(journeyAt(900, stops)).toBe(1);
  expect(journeyAt(3000, stops)).toBe(2);
  // A tall project keeps its screen centered while its text scrolls.
  expect(journeyAt(3900, stops)).toBe(3);
  expect(journeyAt(4200, stops)).toBe(3);
  expect(journeyAt(7000, stops)).toBe(4);
});

test("project textures stay within the 800 KB budget", () => {
  const files = textures();
  expect(files).toHaveLength(4);
  const total = files.reduce(
    (sum, file) => sum + statSync(`dist${file}`).size,
    0,
  );
  expect(total).toBeLessThanOrEqual(800 * 1024);
});

test.describe("desktop with the live drum", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("index syncs in both directions", async ({ page }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    await expectIndexSync(page);
  });

  test("textures stream only as their section approaches", async ({ page }) => {
    const seen = trackTextures(page);
    const files = textures();
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    await page.waitForTimeout(800);
    expect(seen).toEqual([]);

    await jump(page, "clearline-dental");
    await expect.poll(() => seen).toContain(files[0]);
    expect(seen).not.toContain(files[3]);

    await jump(page, "stocktill");
    await expect.poll(() => seen).toContain(files[3]);
    expect(new Set(seen).size).toBe(seen.length);
  });

  test("the image and its alt stay in the DOM under the drum", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    const images = page.locator(".case__media img");
    await expect(images).toHaveCount(4);
    for (const image of await images.all()) {
      expect(await image.getAttribute("alt")).toBeTruthy();
    }
    await expect(page.locator(".case__media").first()).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(page.locator(".world-canvas")).toHaveCount(1);
  });

  test("text on bone keeps a solid background without the canvas", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    await expect(page.locator(".case__body").first()).toHaveCSS(
      "background-color",
      "rgb(242, 238, 234)",
    );
    await expect(page.locator(".work__rail")).toHaveCSS(
      "background-color",
      "rgb(242, 238, 234)",
    );
  });

  test("the face returns after jumping back to the top", async ({ page }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    await jump(page, "stocktill");
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    const box = await page.locator("[data-led-slot]").boundingBox();
    if (!box) throw new Error("No face slot");
    await expect
      .poll(
        async () => {
          const { data, info } = await sharp(
            await page.screenshot({ clip: box }),
          )
            .raw()
            .toBuffer({ resolveWithObject: true });
          let lit = 0;
          for (let at = 0; at < data.length; at += info.channels) {
            if ((data[at] ?? 0) > 150 && (data[at + 1] ?? 0) < 110) lit += 1;
          }
          return lit;
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(2000);
  });

  test("Motion stays reachable mid-journey and keeps the project", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    await jump(page, "fernwick-platform");
    const toggle = page.locator("[data-motion-toggle]");
    await expect(toggle).toBeInViewport();
    await toggle.click();
    await expect(page.locator(".world-canvas")).toHaveCount(0);
    await expect(page.locator("#fernwick-platform h3")).toBeInViewport();
  });

  test("Motion off collapses the tunnel and restores the images", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    await expect(page.locator("[data-signal-tunnel]")).toBeAttached();
    await page.locator("[data-motion-toggle]").click();
    await expect(page.locator(".world-canvas")).toHaveCount(0);
    await expect(page.locator("[data-signal-tunnel]")).toBeHidden();
    await expect(page.locator(".case__media").first()).toHaveCSS(
      "opacity",
      "1",
    );
  });
});

test.describe("keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(disableWebGL);

  test("index links are reachable and move to their project", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("load");
    for (const id of [...PROJECTS].reverse()) {
      const link = page.locator(current(id));
      await link.focus();
      await expect(link).toBeFocused();
      const outline = await link.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      );
      expect(outline).toBe("solid");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id} h3`)).toBeInViewport();
      await expect(link).toHaveAttribute("aria-current", "true");
    }
  });

  test("Tab walks through a project's links in order", async ({ page }) => {
    await page.goto("/");
    await page.locator(current("stocktill")).focus();
    await page.keyboard.press("Tab");
    await expect(page.locator("#clearline-dental summary")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#clearline-dental .btn").first()).toBeFocused();
    await expect(
      page.locator("#clearline-dental .btn").first(),
    ).toBeInViewport();
  });
});

test.describe("fallbacks", () => {
  test.describe("phone", () => {
    test.use({
      viewport: pixel.viewport,
      userAgent: pixel.userAgent,
      deviceScaleFactor: pixel.deviceScaleFactor,
      isMobile: pixel.isMobile,
      hasTouch: pixel.hasTouch,
    });

    test("shows index and stacked VHS cards, with no WebGL", async ({
      page,
    }) => {
      const webgl: string[] = [];
      page.on("request", (request) => {
        if (WEBGL_REQUEST.test(request.url())) webgl.push(request.url());
      });
      const seen = trackTextures(page);
      await page.goto("/");
      await page.waitForTimeout(1500);
      await expectIndexSync(page);

      expect(webgl).toEqual([]);
      expect(seen).toEqual([]);
      await expect(page.locator(".world-canvas")).toHaveCount(0);
      await expect(page.locator("[data-signal-tunnel]")).toBeHidden();
      await expect(page.locator(".case")).toHaveCount(4);
      const overlay = await page
        .locator(".case__media")
        .first()
        .evaluate(
          (element) => getComputedStyle(element, "::after").backgroundImage,
        );
      expect(overlay).toContain("repeating-linear-gradient");
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test.describe("desktop without WebGL", () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test.beforeEach(disableWebGL);

    test("collapses the tunnel and keeps every project", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute(
        "data-world-failed",
        "",
      );
      await expect(page.locator("[data-signal-tunnel]")).toBeHidden();
      await expectIndexSync(page);
      await expect(page.locator(".case__media").first()).toHaveCSS(
        "opacity",
        "1",
      );
    });
  });

  test.describe("without JavaScript", () => {
    test.use({
      viewport: { width: 1440, height: 900 },
      javaScriptEnabled: false,
    });

    test("projects and index anchors still work", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("[data-signal-tunnel]")).toBeHidden();
      await expect(page.locator("[data-index-link]")).toHaveCount(4);
      await expect(page.locator(".case h3")).toHaveCount(4);
      await page.locator(current("fernwick-platform")).click();
      await expect(page.locator("#fernwick-platform h3")).toBeInViewport();
    });
  });

  test.describe("reduced motion", () => {
    test.use({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });

    test("is static, with no tunnel and no running motion", async ({
      page,
    }) => {
      const seen = trackTextures(page);
      await page.goto("/");
      await page.waitForTimeout(1500);
      await jump(page, "pulse-theory");
      await expect(page.locator("[data-signal-tunnel]")).toBeHidden();
      await expect(page.locator(".world-canvas")).toHaveCount(0);
      expect(seen).toEqual([]);
      // A zero-length color transition may still be finishing for one frame.
      await expect
        .poll(() =>
          page
            .locator("[data-work-stage]")
            .evaluate((stage) => stage.getAnimations({ subtree: true }).length),
        )
        .toBe(0);
    });
  });
});

test.describe("contrast on bone", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test.beforeEach(disableWebGL);

  test("all text in the stage passes AA", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      for (const item of document.querySelectorAll("details")) item.open = true;
    });
    const colors = await page.locator("[data-work-stage]").evaluate((stage) => {
      const probe = document.createElement("canvas").getContext("2d");
      const toHex = (color: string) => {
        if (!probe) return "#000000";
        probe.fillStyle = "#000";
        probe.fillStyle = color;
        probe.clearRect(0, 0, 1, 1);
        probe.fillRect(0, 0, 1, 1);
        const [r = 0, g = 0, b = 0] = probe.getImageData(0, 0, 1, 1).data;
        return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
      };
      const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      const found: { text: string; color: string; onDark: boolean }[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!parent || !node.textContent?.trim()) continue;
        found.push({
          text: node.textContent.trim().slice(0, 40),
          color: toHex(getComputedStyle(parent).color),
          onDark: Boolean(parent.closest(".btn:not(.btn--ghost)")),
        });
      }
      return found;
    });
    expect(colors.length).toBeGreaterThan(40);
    for (const item of colors) {
      const ground = item.onDark ? "#0b0a0c" : BONE;
      expect(
        contrastRatio(item.color, ground),
        item.text,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("the focus ring is signal, never glow", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("[data-index-link]").first();
    await link.focus();
    await expect(link).toHaveCSS("outline-color", "rgb(194, 29, 58)");
  });
});
