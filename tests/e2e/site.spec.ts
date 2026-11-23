import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

// These tests cover the page itself, so they skip the WebGL world.
test.use({ launchOptions: { args: ["--disable-webgl", "--disable-webgl2"] } });

const PROJECT_LINKS = [
  "https://clearline.renzzogg.com",
  "https://github.com/RenzzoGG/clearline-dental",
  "https://pulse.renzzogg.com",
  "https://github.com/RenzzoGG/fitness-coach-landing",
  "https://fernwick-admin.renzzogg.com",
  "https://github.com/RenzzoGG/fernwick-platform",
  "https://stocktill.renzzogg.com",
  "https://github.com/RenzzoGG/retail-pos-saas",
  "https://fernwick.renzzogg.com",
  "https://github.com/RenzzoGG/fernwick-home-cleaning",
  "https://uiflow.renzzogg.com",
  "https://uiflow.renzzogg.com/dashboard.html",
  "https://github.com/RenzzoGG/uiflow",
  "https://inventory.renzzogg.com",
  "https://github.com/RenzzoGG/inventory-sales-dashboard",
];

const loadAllImages = (page: Page) =>
  page.evaluate(async () => {
    const images = [...document.images];
    for (const image of images) image.loading = "eager";
    await Promise.all(images.map((image) => image.decode().catch(() => null)));
  });

for (const width of [1440, 768, 390, 320]) {
  for (const route of ["/", "/cv/"]) {
    test(`${route} has no horizontal overflow at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test("has landmarks and one h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
});

test("heading levels never skip", async ({ page }) => {
  await page.goto("/");
  const levels = await page
    .locator("h1, h2, h3, h4, h5, h6")
    .evaluateAll((items) => items.map((item) => Number(item.tagName[1])));
  levels.forEach((level, index) => {
    if (index > 0) {
      expect(level - (levels[index - 1] ?? 1)).toBeLessThanOrEqual(1);
    }
  });
});

test("every image loads with alt, width and height", async ({ page }) => {
  await page.goto("/");
  await loadAllImages(page);
  const problems = await page.locator("img").evaluateAll((images) =>
    (images as HTMLImageElement[])
      .filter((image) => getComputedStyle(image).display !== "none")
      .filter(
        (image) =>
          !image.naturalWidth ||
          !image.hasAttribute("alt") ||
          !image.getAttribute("width") ||
          !image.getAttribute("height"),
      )
      .map((image) => image.currentSrc),
  );
  expect(problems).toEqual([]);
});

test("project links are present and external links are safe", async ({
  page,
}) => {
  await page.goto("/");
  const hrefs = await page
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  for (const link of PROJECT_LINKS) expect(hrefs).toContain(link);

  const unsafe = await page
    .locator('a[href^="https://"]:not(#contact a)')
    .evaluateAll((links) =>
      links
        .filter(
          (link) =>
            link.getAttribute("target") !== "_blank" ||
            link.getAttribute("rel") !== "noopener noreferrer",
        )
        .map((link) => link.getAttribute("href")),
    );
  expect(unsafe).toEqual([]);
});

test("internal links and anchors resolve", async ({ page, request }) => {
  for (const route of ["/", "/cv/"]) {
    await page.goto(route);
    const hrefs = await page
      .locator("a")
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute("href") ?? ""),
      );
    for (const href of hrefs) {
      if (/^(https:|mailto:)/.test(href)) continue;
      const [path, hash] = href.split("#");
      const target = path || route;
      expect((await request.get(target)).ok(), href).toBe(true);
      if (hash) {
        await page.goto(target);
        await expect(page.locator(`#${hash}`), href).toHaveCount(1);
        await page.goto(route);
      }
    }
  }
});

test("skip link appears on first Tab and moves focus to main", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("keyboard reaches every control with a visible focus ring", async ({
  page,
}) => {
  await page.goto("/");
  const total = await page
    .locator(
      ':is(a[href], button:not([hidden]):not([disabled]), summary):not(dialog *):not([role="tab"][tabindex="-1"])',
    )
    .count();
  const seen = new Set<string>();
  for (let step = 0; step < total; step += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      const style = getComputedStyle(element);
      return {
        id: `${element.tagName}:${element.textContent?.trim()}:${element.getAttribute("href")}`,
        outline: style.outlineStyle,
        width: parseFloat(style.outlineWidth),
      };
    });
    seen.add(focus.id);
    expect(focus.outline, focus.id).toBe("solid");
    expect(focus.width, focus.id).toBeGreaterThanOrEqual(2);
  }
  expect(seen.size).toBeGreaterThan(total * 0.9);
});

test("Motion toggle works and persists", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator("[data-motion-toggle]");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("Motion toggle reports off and is disabled", async ({ page }) => {
    await page.goto("/");
    const toggle = page.locator("[data-motion-toggle]");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toBeDisabled();
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("all content renders and the toggle stays hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".case")).toHaveCount(4);
    await expect(page.locator(".row")).toHaveCount(4);
    await expect(page.locator("#contact a")).toHaveCount(5);
    await expect(page.locator("[data-motion-toggle]")).toBeHidden();
  });
});

test("Contact leads with Upwork, in the same tab, with rel=me", async ({
  page,
}) => {
  const upwork = "https://www.upwork.com/freelancers/renzzog";
  await page.goto("/");
  const links = page.locator("#contact a");
  await expect(links.first()).toHaveAttribute("href", upwork);
  await expect(links.first()).toContainText("Upwork (hire me here)");
  await expect(page.locator("#contact a[target]")).toHaveCount(0);
  await expect(page.locator('#contact a[href^="https://"]')).toHaveCount(3);
  await expect(
    page.locator('#contact a[href^="https://"][rel="me"]'),
  ).toHaveCount(3);
  await expect(page.locator('#contact a[href^="mailto:"]')).not.toHaveAttribute(
    "rel",
  );

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(jsonLd ?? "{}").sameAs).toContain(upwork);

  await page.goto("/cv/");
  await expect(
    page.locator(`.cv__contact a[href="${upwork}"]`),
  ).toHaveAttribute("rel", "me");
});

test("SEO files and tags are correct", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://renzzogg.com/",
  );
  for (const selector of [
    'meta[property="og:title"]',
    'meta[property="og:image"]',
    'meta[name="twitter:card"]',
  ]) {
    await expect(page.locator(selector)).toHaveCount(1);
  }
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(jsonLd ?? "{}")["@type"]).toBe("Person");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Sitemap: https://renzzogg.com/sitemap.xml",
  );
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    "https://renzzogg.com/cv/",
  );
  expect((await request.get("/og-image.png")).ok()).toBe(true);
});

test("CV is the official content and its PDF is one Letter page", async ({
  page,
  request,
}) => {
  await page.goto("/cv/");
  await expect(page.locator(".cv")).toContainText(
    "Information Systems and Digital Networks Engineering",
  );
  await expect(page.locator(".cv__certs a")).toHaveCount(10);

  const href = await page.locator("a[download]").first().getAttribute("href");
  expect(href).toMatch(/^\/renzzo-gracia-gomez-cv\.pdf\?v=\d+$/);
  const response = await request.get(href ?? "");
  expect(response.headers()["content-type"]).toBe("application/pdf");

  const pdf = readFileSync("public/renzzo-gracia-gomez-cv.pdf", "latin1");
  expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  expect(pdf).toMatch(/\/MediaBox\s*\[0 0 612 792\]/);
});
