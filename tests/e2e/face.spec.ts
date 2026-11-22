import { expect, test, type Page } from "@playwright/test";

const LIVE = '[data-led-slot][data-face="live"]';

const canvasHasPixels = (page: Page) =>
  page.locator('.led-slot__live canvas[data-layer="0"]').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    if (!canvas.width || !canvas.height) return false;
    const context = canvas.getContext("2d");
    if (!context) return false;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 3; index < data.length; index += 4) {
      if (data[index]) return true;
    }
    return false;
  });

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the LED poster fills the slot", async ({ page, request }) => {
    const responses: string[] = [];
    page.on("response", (response) => {
      if (/poster.*\.webp/.test(response.url()) && response.ok()) {
        responses.push(response.url());
      }
    });
    await page.goto("/");
    const slot = page.locator("[data-led-slot]");
    await expect(page.locator(".led-slot__poster")).toBeVisible();
    await expect.poll(() => responses.length).toBeGreaterThan(0);
    expect((await request.get(responses[0] ?? "")).ok()).toBe(true);

    const box = await slot.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(0.8, 2);
    await expect(page.locator(".led-slot__live canvas")).toHaveCount(0);
  });
});

test("the face going live causes no layout shift", async ({ page }) => {
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
  await page.locator(LIVE).waitFor();
  await page.waitForTimeout(1100);
  const after = await slot.boundingBox();

  expect(after).toEqual(before);
  const shift = await page.evaluate(
    () => (window as unknown as { shift: number }).shift,
  );
  expect(shift).toBeLessThan(0.01);
});

test("Motion on draws the canvas, and the toggle stops it", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(LIVE).waitFor();
  await expect.poll(() => canvasHasPixels(page)).toBe(true);

  await page.locator("[data-motion-toggle]").click();
  await expect(page.locator(LIVE)).toHaveCount(0);
  await expect(page.locator(".led-slot__live canvas")).toHaveCount(0);
  await expect(page.locator(".led-slot__poster")).toBeVisible();
  await expect(page.locator(".led-slot__glow")).toHaveCSS("opacity", "1");

  await page.locator("[data-motion-toggle]").click();
  await page.locator(LIVE).waitFor();
  await expect.poll(() => canvasHasPixels(page)).toBe(true);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("keeps the static poster and loads no face data", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(2300);

    expect(requests.filter((url) => url.includes("face"))).toEqual([]);
    expect(requests.filter((url) => url.includes("canvas-renderer"))).toEqual(
      [],
    );
    await expect(page.locator(LIVE)).toHaveCount(0);
    await expect(page.locator(".led-slot__poster")).toBeVisible();
  });
});

test("a stored Motion off loads no face data", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("motion", "off"));
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(2300);

  expect(requests.filter((url) => url.includes("face"))).toEqual([]);
  await expect(page.locator(LIVE)).toHaveCount(0);
});
