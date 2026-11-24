import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Page } from "@playwright/test";

const ROUTES = [
  "/",
  "/cv/",
  "/work/clearline-dental/",
  "/work/pulse-theory/",
  "/work/fernwick-platform/",
  "/work/stocktill/",
];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze();
  const summary = violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")}`),
  );
  expect(summary).toEqual([]);
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("axe", () => {
  test.use({ reducedMotion: "reduce" });

  for (const route of ROUTES) {
    test(`desktop ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(route);
      await expectNoViolations(page);
    });

    test(`phone width ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(route);
      await expectNoViolations(page);
    });
  }

  test("with the menu open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.locator("[data-menu-open]").click();
    await expect(page.locator("dialog[open]")).toBeVisible();
    await expectNoViolations(page);
  });

  test("with a project detail open", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator("[data-detail-link]").first().click();
    await expect(page.locator("[data-detail-dialog][open]")).toBeVisible();
    await expect(page.locator("[data-detail-dialog] h1")).toBeVisible();
    await expectNoViolations(page);
  });
});

test("axe with Motion off", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator("[data-motion-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expectNoViolations(page);
});

test.describe("reflow", () => {
  for (const route of ROUTES) {
    test(`200% zoom ${route}`, async ({ page }) => {
      // A 1280px window at 200% zoom lays out as 640 CSS pixels.
      await page.setViewportSize({ width: 640, height: 400 });
      await page.goto(route);
      await expectNoOverflow(page);
    });

    test(`320px ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(route);
      await expectNoOverflow(page);
    });
  }
});

test.describe("screen reader structure", () => {
  test("the page exposes landmarks, headings and named links", async ({
    page,
  }) => {
    await page.goto("/");
    const tree = await page.locator("body").ariaSnapshot();
    for (const role of ["banner", "main", "contentinfo"]) {
      expect(tree, role).toContain(`- ${role}`);
    }
    expect(tree).toContain('heading "Featured work"');
    expect(tree).not.toMatch(/- link\s*(:|$)/m);
    expect(tree).not.toMatch(/- button\s*(:|$)/m);
  });
});

test.describe("phone", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium device");
  const pixel = devices["Pixel 7"];
  test.use({
    viewport: pixel.viewport,
    userAgent: pixel.userAgent,
    deviceScaleFactor: pixel.deviceScaleFactor,
    isMobile: pixel.isMobile,
    hasTouch: pixel.hasTouch,
    reducedMotion: "reduce",
  });

  test("axe on an emulated phone", async ({ page }) => {
    await page.goto("/");
    await expectNoViolations(page);
  });
});
