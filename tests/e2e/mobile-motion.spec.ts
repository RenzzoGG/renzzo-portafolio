import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { devices, expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

const FACE = '[data-led-slot][data-face="live"]';

/** iOS-style permission, and synthetic events, since browsers have no sensor. */
async function fakeSensor(page: Page, answer: "granted" | "denied") {
  await page.addInitScript((result) => {
    Object.assign(DeviceOrientationEvent, {
      requestPermission: () => Promise.resolve(result),
    });
  }, answer);
}

const orient = (page: Page, beta: number, gamma: number) =>
  page.evaluate(
    ([b, g]) => {
      dispatchEvent(
        Object.assign(new Event("deviceorientation"), {
          alpha: 0,
          beta: b,
          gamma: g,
        }),
      );
    },
    [beta, gamma],
  );

/** A real sensor streams events, so keep sending until Tilt confirms one. */
async function enableTilt(page: Page) {
  await page.locator("[data-tilt-toggle]").tap();
  await expect
    .poll(async () => {
      await orient(page, 45, 0);
      return page.locator("[data-tilt-state]").textContent();
    })
    .toBe("On");
}

async function motionReady(page: Page) {
  await page.goto("/");
  await expect(page.locator("[data-carousel]")).toHaveCount(1, {
    timeout: 15_000,
  });
}

async function scrollThrough(page: Page, selector: string) {
  await page
    .locator(selector)
    .first()
    .evaluate((element) => {
      element.scrollIntoView({ block: "center", behavior: "instant" });
    });
}

const swipeTo = (page: Page, index: number) =>
  page.locator("[data-screens]").evaluate((track, at) => {
    const card = track.children[at] as HTMLElement;
    track.scrollLeft =
      card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
  }, index);

const PROJECTS = [
  "clearline-dental",
  "pulse-theory",
  "fernwick-platform",
  "stocktill",
];

test.describe("the LED face", () => {
  test("assembles, shimmers and drifts while idle", async ({ page }) => {
    await page.goto("/");
    await page.locator(FACE).waitFor({ timeout: 15_000 });
    await expect(page.locator(".led-slot__live canvas")).toHaveCount(6);
    const names = await page
      .locator('.led-slot__live canvas[data-layer="3"]')
      .evaluate((canvas) =>
        canvas
          .getAnimations()
          .map((item) => (item as CSSAnimation).animationName),
      );
    expect(names).toContain("led-shimmer");
    const drift = await page
      .locator('.led-slot__live canvas[data-layer="2"]')
      .evaluate((canvas) =>
        canvas
          .getAnimations()
          .map((item) => (item as CSSAnimation).animationName),
      );
    expect(drift).toContain("led-drift");
  });

  test("a tilt turns the face and separates its depth layers", async ({
    page,
  }) => {
    await fakeSensor(page, "granted");
    await page.goto("/");
    await page.locator(FACE).waitFor({ timeout: 15_000 });
    await enableTilt(page);
    await orient(page, 45, 10);
    await expect
      .poll(() =>
        page.locator("[data-led-slot]").evaluate((slot) => {
          const rotate = /rotateY\((-?[\d.]+)deg/.exec(slot.style.transform);
          return Number(rotate?.[1] ?? 0);
        }),
      )
      .toBeGreaterThan(9);
    const shift = (layer: string) =>
      page
        .locator(`.led-slot__live canvas[data-layer="${layer}"]`)
        .evaluate((canvas) =>
          Number.parseFloat(getComputedStyle(canvas).translate),
        );
    const near = await shift("2");
    const far = await shift("0");
    expect(near).toBeGreaterThan(12);
    expect(far).toBeLessThan(0);
  });

  test("a fast tilt glitches, at most twice a second", async ({ page }) => {
    await fakeSensor(page, "granted");
    await page.goto("/");
    await page.locator(FACE).waitFor({ timeout: 15_000 });
    await enableTilt(page);
    await page.locator("[data-led-slot]").evaluate((slot) => {
      const state = { count: 0 };
      new MutationObserver(() => {
        if (slot.hasAttribute("data-face-glitch")) state.count += 1;
      }).observe(slot, {
        attributes: true,
        attributeFilter: ["data-face-glitch"],
      });
      Object.assign(window, { glitches: state });
    });
    // Separate quick turns: a sustained shake is damped instead of glitching.
    const started = Date.now();
    let angle = 0;
    while (Date.now() - started < 2000) {
      angle = angle >= 60 ? 0 : angle + 15;
      await orient(page, 45, angle);
      await page.waitForTimeout(angle === 0 ? 700 : 30);
    }
    const count = await page.evaluate(
      () =>
        (window as unknown as { glitches: { count: number } }).glitches.count,
    );
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(5);
  });

  test("a sustained shake calms the face", async ({ page }) => {
    await fakeSensor(page, "granted");
    await page.goto("/");
    await page.locator(FACE).waitFor({ timeout: 15_000 });
    await enableTilt(page);
    const started = Date.now();
    let side = 1;
    while (Date.now() - started < 1400) {
      await orient(page, 45, side * 14);
      side *= -1;
      await page.waitForTimeout(60);
    }
    const turn = await page.locator("[data-led-slot]").evaluate((slot) => {
      const rotate = /rotateY\((-?[\d.]+)deg/.exec(slot.style.transform);
      return Math.abs(Number(rotate?.[1] ?? 0));
    });
    expect(turn).toBeLessThan(4);
  });

  test("a denied permission keeps Tilt off", async ({ page }) => {
    await fakeSensor(page, "denied");
    await page.goto("/");
    await page.locator("[data-tilt-toggle]").tap();
    await page.waitForTimeout(300);
    await expect(page.locator("[data-tilt-state]")).toHaveText("Off");
  });

  test("Tilt only reads On once the sensor reports", async ({ page }) => {
    await fakeSensor(page, "granted");
    await page.goto("/");
    await page.locator("[data-tilt-toggle]").tap();
    await page.waitForTimeout(600);
    await expect(page.locator("[data-tilt-state]")).toHaveText("Off");
    await page.waitForTimeout(1800);
    await expect(page.locator("[data-tilt-state]")).toHaveText("Off");
  });
});

test.describe("the composited face", () => {
  // A screenshot repaints the page, so only recorded frames show this failure.
  test("its bright dot layers reach the screen", async ({
    browser,
    browserName,
    baseURL,
  }, testInfo) => {
    test.skip(browserName !== "webkit", "A WebKit compositing regression");
    const context = await browser.newContext({
      ...devices["iPhone 14"],
      baseURL,
      recordVideo: {
        dir: testInfo.outputDir,
        size: { width: 780, height: 1328 },
      },
    });
    const page = await context.newPage();
    await page.goto("/");
    await page.locator(FACE).waitFor({ timeout: 15_000 });
    await page.addStyleTag({
      content: ".led-slot { transform: scale(3); z-index: 9; }",
    });
    await page.waitForTimeout(2500);
    const box = await page.locator("[data-led-slot]").boundingBox();
    const view = page.viewportSize();
    const video = page.video();
    if (!box || !view || !video) throw new Error("Missing capture data");
    const startX = Math.max(0, box.x);
    const startY = Math.max(0, box.y);
    const endX = Math.min(view.width, box.x + box.width);
    const endY = Math.min(view.height, box.y + box.height);
    await context.close();
    const cache = join(homedir(), ".cache", "ms-playwright");
    const folder = readdirSync(cache)
      .filter((name) => name.startsWith("ffmpeg"))
      .at(-1);
    if (!folder) throw new Error("Playwright ffmpeg is missing");
    const frame = testInfo.outputPath("face-frame.png");
    execFileSync(join(cache, folder, "ffmpeg-linux"), [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-sseof",
      "-0.3",
      "-i",
      await video.path(),
      "-frames:v",
      "1",
      frame,
    ]);
    const { width = 0 } = await sharp(frame).metadata();
    const scale = width / view.width;
    const { data } = await sharp(frame)
      .extract({
        left: Math.round(startX * scale),
        top: Math.round(startY * scale),
        width: Math.floor((endX - startX) * scale),
        height: Math.floor((endY - startY) * scale),
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let brightest = 0;
    for (let at = 0; at < data.length; at += 3) {
      brightest = Math.max(brightest, data[at] ?? 0);
    }
    // The glow alone peaks near 105. The real dots are #FF3B5C.
    expect(brightest).toBeGreaterThan(200);
  });
});

test.describe("scroll entrances", () => {
  test("cassettes wait off to the side, then slide in", async ({ page }) => {
    await motionReady(page);
    const tape = page.locator(".tape").nth(1);
    const armed = await tape.evaluate((element) => ({
      opacity: getComputedStyle(element).opacity,
      x: new DOMMatrix(getComputedStyle(element).transform).m41,
    }));
    expect(armed.opacity).toBe("0");
    expect(Math.abs(armed.x)).toBeGreaterThan(40);
    await scrollThrough(page, ".tape:nth-child(2)");
    await expect(tape).toHaveCSS("opacity", "1", { timeout: 4000 });
    await expect(tape).toHaveCSS("transform", "none");
  });

  test("CRT cards power on as they enter", async ({ page }) => {
    await motionReady(page);
    const channel = page.locator("[data-channel]").first();
    await expect(channel).toHaveAttribute("data-crt-off", "");
    await scrollThrough(page, "[data-channel]");
    await expect(channel).toHaveAttribute("data-on", "");
    await expect(channel).not.toHaveAttribute("data-crt-off", "");
  });

  test("a section heading tunes in on screen", async ({ page }) => {
    await motionReady(page);
    const heading = page.locator("#services-title");
    await heading.evaluate((element) => {
      const state = { tuned: false };
      new MutationObserver(() => {
        state.tuned ||= element.hasAttribute("data-tuning");
      }).observe(element, { attributes: true });
      Object.assign(window, { tune: state });
    });
    await scrollThrough(page, "#services-title");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { tune: { tuned: boolean } }).tune.tuned,
        ),
      )
      .toBe(true);
    await expect(heading).toHaveCSS("opacity", "1");
  });

  test("seams play one CRT wipe", async ({ page }) => {
    await motionReady(page);
    const seam = page.locator("[data-seam]").nth(1);
    await seam.evaluate((element) => {
      element.scrollIntoView({ block: "center", behavior: "instant" });
    });
    await expect(seam).toHaveAttribute("data-on", "");
    const name = await seam.evaluate(
      (element) => getComputedStyle(element, "::before").animationName,
    );
    expect(name).toBe("seam-wipe");
  });

  test("nothing stays hidden after a full scroll", async ({ page }) => {
    await motionReady(page);
    const end = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    // Every position is held long enough for the browser to report what entered.
    for (let top = 0; top < end; top += 300) {
      await page.evaluate((y) => {
        window.scrollTo({ top: y, behavior: "instant" });
      }, top);
      await page.evaluate(
        () =>
          new Promise((done) => {
            requestAnimationFrame(() => requestAnimationFrame(done));
          }),
      );
      await page.waitForTimeout(120);
    }
    await page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: "instant" });
    }, end);
    await page.waitForTimeout(2200);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll("[data-act-item], [data-reveal]")]
        .filter((element) => getComputedStyle(element).opacity !== "1")
        .map((element) => element.className),
    );
    expect(hidden).toEqual([]);
    await expect(page.locator("[data-crt-off]")).toHaveCount(0);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("Featured work carousel", () => {
  test("is a horizontal 3D carousel with every project", async ({ page }) => {
    await motionReady(page);
    const track = page.locator("[data-screens]");
    await expect(track).toHaveCSS("scroll-snap-type", /x mandatory/);
    await expect(page.locator("[data-screens] > .case")).toHaveCount(4);
    const side = await page
      .locator("#pulse-theory")
      .evaluate((card) => card.style.transform);
    expect(side).toContain("perspective");
    expect(side).toContain("rotateY");
    const overlay = await page
      .locator(".case__media")
      .first()
      .evaluate((media) => getComputedStyle(media, "::after").backgroundImage);
    expect(overlay).toContain("repeating-linear-gradient");
  });

  test("a swipe keeps the index on the centered card", async ({ page }) => {
    await motionReady(page);
    await scrollThrough(page, "[data-screens]");
    for (const index of [1, 2, 3, 2, 0]) {
      await swipeTo(page, index);
      await expect(
        page.locator("[data-index-link][aria-current]"),
      ).toHaveAttribute("href", `#${PROJECTS[index] ?? ""}`);
      await expect(page.locator(".case[data-active]")).toHaveAttribute(
        "id",
        PROJECTS[index] ?? "",
      );
    }
  });

  test("the index moves the carousel", async ({ page }) => {
    await motionReady(page);
    await scrollThrough(page, "[data-screens]");
    await page.locator('[data-index-link][href="#stocktill"]').tap();
    await expect(page.locator(".case[data-active]")).toHaveAttribute(
      "id",
      "stocktill",
      { timeout: 4000 },
    );
    await expect(page.locator("#stocktill h3")).toBeInViewport();
    await expect(page).toHaveURL(/#stocktill$/);
  });

  test("a project's readouts count up when its card arrives", async ({
    page,
  }) => {
    await motionReady(page);
    await scrollThrough(page, "[data-screens]");
    const display = page.locator("#stocktill [data-seg]").first();
    await expect(display).toHaveAttribute("data-signal-armed", "");
    await swipeTo(page, 3);
    await expect(display).not.toHaveAttribute("data-signal-armed", "", {
      timeout: 4000,
    });
  });

  test("keyboard focus reaches a link on another card", async ({ page }) => {
    await motionReady(page);
    const link = page.locator("#fernwick-platform .actions a").first();
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
    await expect
      .poll(() =>
        page
          .locator("#fernwick-platform")
          .evaluate((card) => getComputedStyle(card).opacity),
      )
      .toBe("1");
  });

  test("Motion off returns to plain stacked cards", async ({ page }) => {
    await motionReady(page);
    await page
      .locator("[data-motion-toggle]")
      .first()
      .evaluate((button) => {
        (button as HTMLButtonElement).click();
      });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator("[data-carousel]")).toHaveCount(0);
    await expect(page.locator("[data-screens]")).toHaveCSS("display", "grid");
    const transform = await page
      .locator("#pulse-theory")
      .evaluate((card) => card.style.transform);
    expect(transform).toBe("");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("has no animation, carousel, tilt or GSAP", async ({ page }) => {
    const motionCode: string[] = [];
    page.on("request", (request) => {
      if (/\/core\.[^/]+\.js|canvas-renderer|tilt\./.test(request.url())) {
        motionCode.push(request.url());
      }
    });
    await page.goto("/");
    await page.waitForTimeout(2500);
    expect(motionCode).toEqual([]);
    await expect(page.locator("[data-carousel]")).toHaveCount(0);
    await expect(page.locator("[data-screens]")).toHaveCSS("display", "grid");
    await expect(page.locator("[data-tilt-toggle]")).toBeHidden();
    await expect(page.locator(".led-slot__live canvas")).toHaveCount(0);
    const end = await page.evaluate(
      () => document.documentElement.scrollHeight - innerHeight,
    );
    await page.evaluate((y) => {
      window.scrollTo({ top: y / 2, behavior: "instant" });
    }, end);
    await page.waitForTimeout(400);
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    );
    expect(running).toBe(0);
    await expect(page.locator("[data-crt-off]")).toHaveCount(0);
  });
});
