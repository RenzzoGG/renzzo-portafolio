/**
 * Prints the /cv route to a one-page Letter PDF in public/.
 * Builds first, so the PDF always matches the current content.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { startServer } from "./serve-dist.ts";

const PORT = 4329;
const OUTPUT = "public/renzzo-gracia-gomez-cv.pdf";

execFileSync("npx", ["astro", "build"], { stdio: "inherit" });

const server = await startServer(PORT);
try {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/cv/`, {
      waitUntil: "networkidle",
    });
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "Letter",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
    });

    const pages = pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length;
    if (pages !== 1) {
      throw new Error(`CV must be exactly 1 page, got ${String(pages)}`);
    }
    writeFileSync(OUTPUT, pdf);
    copyFileSync(OUTPUT, "dist/renzzo-gracia-gomez-cv.pdf");
    console.log(
      `Wrote ${OUTPUT} (1 page, ${Math.round(pdf.length / 1024)} KB)`,
    );
  } finally {
    await browser.close();
  }
} finally {
  server.close();
}
