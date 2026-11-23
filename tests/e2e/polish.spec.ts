import { devices, expect, test, type Page } from "@playwright/test";

const WORLD = '[data-led-slot][data-world="live"]';
const GSAP_CHUNK = /\/_astro\/core\.[^/]+\.js/;
const SCROLL_TRIGGER_CHUNK = /\/_astro\/desktop\.[^/]+\.js/;
const pixel = devices["Pixel 7"];

test.setTimeout(120_000);
test.use({ viewport: { width: 1440, height: 900 } });

const noWebGL = ({ page }: { page: Page }) =>
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

const track = (page: Page, pattern: RegExp) => {
  const seen: string[] = [];
  page.on("request", (request) => {
    if (pattern.test(request.url())) seen.push(request.url());
  });
  return seen;
};

const scrollThrough = async (page: Page) => {
  const height = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => {
      window.scrollTo({ top, behavior: "instant" });
    }, y);
    await page.waitForTimeout(60);
  }
};

const expectFinalState = async (page: Page) => {
  await expect(page.locator(".motion-ghost")).toHaveCount(0);
  await expect(page.locator("[data-signal-busy]")).toHaveCount(0);
  await expect(page.locator(".reveal-line")).toHaveCount(0);
  const hidden = await page
    .locator("[data-reveal]")
    .evaluateAll(
      (items) =>
        items.filter((item) => getComputedStyle(item).opacity !== "1").length,
    );
  expect(hidden).toBe(0);
};

test.describe("GSAP loading", () => {
  test("loads after first paint on desktop, with ScrollTrigger", async ({
    page,
  }) => {
    await page.goto("/");
    await expect
      .poll(() =>
        page.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .some((entry) => /\/desktop\./.test(entry.name)),
        ),
      )
      .toBe(true);
    const timing = await page.evaluate(() => ({
      fcp:
        performance.getEntriesByName("first-contentful-paint")[0]?.startTime ??
        0,
      gsap:
        performance
          .getEntriesByType("resource")
          .find((entry) => /\/_astro\/core\./.test(entry.name))?.startTime ??
        -1,
    }));
    expect(timing.fcp).toBeGreaterThan(0);
    expect(timing.gsap).toBeGreaterThan(timing.fcp);
  });

  test("is not referenced by the document", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).not.toMatch(GSAP_CHUNK);
    expect(html).not.toMatch(SCROLL_TRIGGER_CHUNK);
  });

  test.describe("phone", () => {
    test.use({
      viewport: pixel.viewport,
      userAgent: pixel.userAgent,
      deviceScaleFactor: pixel.deviceScaleFactor,
      isMobile: pixel.isMobile,
      hasTouch: pixel.hasTouch,
    });

    test("loads GSAP but never ScrollTrigger", async ({ page }) => {
      const gsap = track(page, GSAP_CHUNK);
      const scrollTrigger = track(page, SCROLL_TRIGGER_CHUNK);
      await page.goto("/");
      await expect.poll(() => gsap.length).toBeGreaterThan(0);
      await page.waitForTimeout(800);
      expect(scrollTrigger).toEqual([]);
    });
  });

  test("a stored Motion off never requests GSAP", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("motion", "off");
    });
    const gsap = track(page, /\/_astro\/(core|desktop)\./);
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(3000);
    expect(gsap).toEqual([]);
  });
});

test.describe("final states", () => {
  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows everything with no GSAP or running motion", async ({
      page,
    }) => {
      const gsap = track(page, /\/_astro\/(core|desktop)\./);
      await page.goto("/", { waitUntil: "load" });
      await page.waitForTimeout(2500);
      await scrollThrough(page);
      expect(gsap).toEqual([]);
      await expectFinalState(page);
      const running = await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((animation) => animation.playState === "running").length,
      );
      expect(running).toBe(0);
      await expect(
        page.getByRole("heading", { name: "Let's work together" }),
      ).toBeVisible();
    });
  });

  test("Motion off mid-page reverts armed and running text", async ({
    page,
  }) => {
    await noWebGL({ page });
    await page.goto("/");
    await expect
      .poll(() => page.locator('[data-reveal][style*="opacity"]').count())
      .toBeGreaterThan(0);
    await page.evaluate(() => {
      document.querySelector("#about")?.scrollIntoView({ behavior: "instant" });
    });
    await page.locator("[data-motion-toggle]").evaluate((toggle) => {
      (toggle as HTMLButtonElement).click();
    });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expectFinalState(page);
    await expect(page.locator("#about-title")).toHaveText("About");
  });
});

test("animated text ends as the original text", async ({ page }) => {
  await noWebGL({ page });
  await page.goto("/");
  const before = await page.evaluate(
    () => document.querySelector("main")?.textContent,
  );
  await expect
    .poll(() => page.locator('[data-reveal][style*="opacity"]').count())
    .toBeGreaterThan(0);
  await scrollThrough(page);
  await expect(page.locator(".motion-ghost")).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(page.locator(".reveal-line")).toHaveCount(0, { timeout: 8000 });
  await expectFinalState(page);
  const after = await page.evaluate(
    () => document.querySelector("main")?.textContent,
  );
  expect(after).toBe(before);
  for (const name of ["About", "Services", "Skills", "Let's work together"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(
      1,
    );
  }
  await expect(page.locator("[data-reveal][aria-label]")).toHaveCount(0);
});

test.describe("menu", () => {
  test.beforeEach(noWebGL);

  test("Escape closes it and focus returns to its button", async ({ page }) => {
    await page.goto("/");
    const button = page.locator("[data-menu-open]");
    const menu = page.locator("[data-menu]");
    await button.click();
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("focus stays inside while it's open", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    const controls = await page.locator("[data-menu] :is(a, button)").count();
    for (let step = 0; step < controls * 2 + 2; step += 1) {
      await page.keyboard.press("Tab");
      const escaped = await page.evaluate(() => {
        const active = document.activeElement;
        return active !== document.body && !active?.closest("[data-menu]");
      });
      expect(escaped).toBe(false);
    }
  });

  test("a link closes it and goes to the section", async ({ page }) => {
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    await page.locator("[data-menu] a", { hasText: "Services" }).click();
    await expect(page.locator("[data-menu]")).toBeHidden();
    await expect(page).toHaveURL(/#services$/);
    await expect(page.locator("#services-title")).toBeInViewport();
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the plain nav stays and Menu is hidden", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      await expect(page.locator("[data-menu-open]")).toBeHidden();
      await expect(page.locator(".header__nav a").first()).toBeVisible();
    });
  });

  test("phones use Menu instead of the inline nav", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("[data-menu-open]")).toBeVisible();
    await expect(page.locator(".header__nav")).toBeHidden();
  });
});

test.describe("project detail", () => {
  test("every project has a real route that works without JS", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const [id, name] of [
      ["clearline-dental", "Clearline Dental"],
      ["pulse-theory", "Pulse Theory"],
      ["fernwick-platform", "Fernwick Platform"],
      ["stocktill", "Stocktill"],
    ] as const) {
      const response = await page.goto(`/work/${id}/`);
      expect(response?.ok()).toBe(true);
      await expect(page.locator("h1")).toHaveText(name);
      await expect(page.locator(".detail__study dt").first()).toBeVisible();
      await expect(page.locator("[data-detail-back]")).toHaveAttribute(
        "href",
        `/#${id}`,
      );
    }
    await context.close();
  });

  test("opens in place and Escape returns to the project", async ({ page }) => {
    await page.goto("/");
    await page.locator(WORLD).waitFor({ timeout: 60_000 });
    await page.evaluate(() => {
      document
        .querySelector("#pulse-theory")
        ?.scrollIntoView({ behavior: "instant" });
    });
    const link = page.locator("#pulse-theory [data-detail-link]");
    const y = await page.evaluate(() => scrollY);
    await link.click();
    const dialog = page.locator("[data-detail-dialog]");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("h1")).toHaveText("Pulse Theory");
    await expect(page).toHaveURL(/\/work\/pulse-theory\/$/);
    await expect(page.locator(".world-canvas")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
    await expect(link).toBeFocused();
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(
      120,
    );
  });

  test("browser Back and the back link close it", async ({ page }) => {
    await noWebGL({ page });
    await page.goto("/");
    const link = page.locator("#stocktill [data-detail-link]");
    const dialog = page.locator("[data-detail-dialog]");

    await link.click();
    await expect(dialog).toBeVisible();
    await page.goBack();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/$/);

    await link.click();
    await expect(dialog).toBeVisible();
    await dialog.locator("[data-detail-back]").click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
    await expect(link).toBeFocused();
  });
});
