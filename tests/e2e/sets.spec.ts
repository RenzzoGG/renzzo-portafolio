import { devices, expect, test, type Page } from "@playwright/test";

const pixel = devices["Pixel 7"];

test.setTimeout(90_000);
test.use({
  viewport: { width: 1440, height: 900 },
  launchOptions: { args: ["--disable-webgl", "--disable-webgl2"] },
});

const boardReady = async (page: Page) => {
  await page.goto("/");
  await page.locator("[data-board][data-ready]").waitFor({ state: "attached" });
};

const toView = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      element.scrollIntoView({ behavior: "instant", block: "center" });
    });

const readout = (page: Page, scope: string) =>
  page
    .locator(`${scope} [data-seg]`)
    .first()
    .evaluate((display) =>
      [...display.querySelectorAll<SVGElement>("[data-d]")]
        .map((digit) => digit.dataset.d)
        .join(""),
    );

test.describe("skills tabs", () => {
  test("follow the ARIA pattern with arrows, Home and End", async ({
    page,
  }) => {
    await boardReady(page);
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveText([
      "Front-end",
      "Back-end",
      "Testing",
      "DevOps",
      "Libraries",
      "Tools",
    ]);
    await expect(page.getByRole("tablist")).toHaveAccessibleName(
      "Skill categories",
    );
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);

    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "false");
    await expect(tabs.first()).toHaveAttribute("tabindex", "-1");
    const panel = page.getByRole("tabpanel");
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText("PostgreSQL");
    await expect(panel).toHaveAccessibleName("Back-end");

    await page.keyboard.press("End");
    await expect(tabs.last()).toBeFocused();
    await expect(page.getByRole("tabpanel")).toContainText("Vite");
    await page.keyboard.press("ArrowRight");
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(tabs.first()).toBeFocused();
    await expect(page.getByRole("tabpanel")).toContainText("TypeScript");
  });

  test("switching never shifts the layout", async ({ page }) => {
    await boardReady(page);
    const board = page.locator("[data-board]");
    const before = await board.boundingBox();
    for (const tab of await page.getByRole("tab").all()) {
      await tab.evaluate((element) => {
        (element as HTMLElement).click();
      });
      expect((await board.boundingBox())?.height).toBe(before?.height);
    }
  });

  test("the matrix is decorative and draws lit dots", async ({ page }) => {
    await boardReady(page);
    await expect(page.locator("[data-board-display]")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await toView(page, "[data-board-display]");
    await expect
      .poll(() =>
        page.locator("[data-board] canvas").evaluate((element) => {
          const canvas = element as HTMLCanvasElement;
          const pixels = canvas
            .getContext("2d")
            ?.getImageData(0, 0, canvas.width, canvas.height).data;
          let lit = 0;
          for (let i = 0; i < (pixels?.length ?? 0); i += 4) {
            if ((pixels?.[i] ?? 0) > 180) lit += 1;
          }
          return lit;
        }),
      )
      .toBeGreaterThan(200);
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("every category is a plain visible list", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("[data-board] [role='tablist']")).toBeHidden();
      const panels = page.locator(".board__panel");
      await expect(panels).toHaveCount(6);
      for (const panel of await panels.all()) {
        await expect(panel.locator("h3")).toBeVisible();
        await expect(panel.locator("li").first()).toBeVisible();
      }
    });
  });
});

test.describe("tape shelf", () => {
  test("keyboard reaches every link in order with a preview", async ({
    page,
  }) => {
    await page.goto("/");
    const tapes = page.locator(".tape");
    await expect(tapes).toHaveCount(4);
    const links = page.locator(".tape a");
    await expect(links).toHaveCount(8);
    await links.first().focus();
    for (let index = 0; index < 8; index += 1) {
      await expect(links.nth(index)).toBeFocused();
      await expect(links.nth(index)).toBeVisible();
      const tape = Math.floor(index / 2);
      const frames = page.locator(".shelf__frame");
      await expect(frames.nth(tape)).toHaveCSS("opacity", "1");
      for (let other = 0; other < 4; other += 1) {
        if (other !== tape) {
          await expect(frames.nth(other)).toHaveCSS("opacity", "0");
        }
      }
      if (index < 7) await page.keyboard.press("Tab");
    }
  });

  test("hover slides the tape and plays the preview", async ({ page }) => {
    await page.goto("/");
    await toView(page, ".tape:nth-child(2)");
    await page.locator(".tape").nth(1).hover();
    await expect(page.locator(".shelf__frame").nth(1)).toHaveCSS(
      "opacity",
      "1",
    );
    await expect(page.locator(".tape").nth(1).locator(".tape__body")).toHaveCSS(
      "translate",
      "16px",
    );
    await expect(page.locator(".shelf__track")).toHaveCSS(
      "animation-name",
      /crt-track/,
    );
  });

  test.describe("phone", () => {
    test.use({
      viewport: pixel.viewport,
      userAgent: pixel.userAgent,
      deviceScaleFactor: pixel.deviceScaleFactor,
      isMobile: pixel.isMobile,
      hasTouch: pixel.hasTouch,
    });

    test("each tape has its own screen and visible links", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator(".shelf__monitor")).toBeHidden();
      for (const tape of await page.locator(".tape").all()) {
        await expect(tape.locator(".tape__crt")).toBeVisible();
        await expect(tape.locator("a").first()).toBeVisible();
        await expect(tape.locator("a").last()).toBeVisible();
      }
    });
  });
});

test.describe("set piece motion", () => {
  test("LED readouts land on the real values", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(() => page.locator("[data-seg][data-signal-armed]").count())
      .toBeGreaterThan(0);
    await toView(page, ".about__counters");
    await expect(
      page.locator(".about__counters [data-signal-armed]"),
    ).toHaveCount(0, { timeout: 6000 });
    await expect
      .poll(() => readout(page, ".about__counters li:nth-child(2)"))
      .toBe("742");
    await expect(page.locator(".about__counters")).toContainText("742");
  });

  test("a key press finishes the terminal immediately", async ({ page }) => {
    await page.goto("/");
    const lines = page.locator("[data-type-line]");
    await expect
      .poll(() => page.locator("[data-type-line][data-signal-armed]").count())
      .toBe(4);
    await toView(page, ".term");
    await expect(page.locator("[data-type-line] .motion-ghost")).toHaveCount(4);
    await page.keyboard.press("Shift");
    await expect(page.locator("[data-type-line] .motion-ghost")).toHaveCount(0);
    await expect(
      page.locator("[data-type-line][data-signal-busy]"),
    ).toHaveCount(0);
    await expect(lines.first()).toContainText("Full-Stack Developer");
  });

  test("focus powers on a service channel", async ({ page }) => {
    await page.goto("/");
    const channel = page.locator(".channel").nth(1);
    await channel.locator("a").focus();
    await expect(channel.locator(".channel__picture")).toHaveCSS(
      "animation-name",
      /crt-on/,
    );
    await expect(channel.locator("h3")).toBeVisible();
  });

  test("Motion off mid-page restores every set piece", async ({ page }) => {
    await page.goto("/");
    await expect
      .poll(() => page.locator("[data-type-line][data-signal-armed]").count())
      .toBe(4);
    await toView(page, ".term");
    await page.locator("[data-motion-toggle]").evaluate((toggle) => {
      (toggle as HTMLButtonElement).click();
    });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await expect(page.locator(".motion-ghost")).toHaveCount(0);
    await expect(page.locator("[data-signal-armed]")).toHaveCount(0);
    await expect(page.locator("[data-signal-busy]")).toHaveCount(0);
    const hidden = await page
      .locator("[data-log-line]")
      .evaluateAll(
        (lines) =>
          lines.filter((line) => getComputedStyle(line).opacity !== "1").length,
      );
    expect(hidden).toBe(0);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("every set piece is final, readable and still", async ({ page }) => {
    await boardReady(page);
    await page.waitForTimeout(1200);
    for (const selector of [".tape", ".term", ".channel", "[data-log]"]) {
      await toView(page, selector);
      await page.locator(selector).first().hover();
      await page.waitForTimeout(80);
    }
    await expect(page.locator(".motion-ghost")).toHaveCount(0);
    await expect(page.locator("[data-signal-armed]")).toHaveCount(0);
    await expect(page.locator("[data-type-line]").first()).toContainText(
      "Full-Stack Developer",
    );
    expect(await readout(page, ".about__counters li:nth-child(2)")).toBe("742");
    await expect(page.locator("[data-log-line]")).toHaveCount(11);
    await expect(page.locator("[data-log-line]").last()).toBeVisible();
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              (animation.effect?.getTiming().duration as number) > 1,
          ).length,
    );
    expect(running).toBe(0);
  });

  test("tabs still work", async ({ page }) => {
    await boardReady(page);
    await page.getByRole("tab", { name: "Testing" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("pgTAP");
  });
});
