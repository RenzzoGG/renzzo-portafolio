/** Renders the 1200×630 Open Graph image in the Signal style. */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const OUTPUT = "public/og-image.png";
const font = readFileSync(
  "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
).toString("base64");

const COLUMNS = 34;
const ROWS = 42;
const wave = [
  [0, 0.52],
  [0.27, 0.52],
  [0.38, 0.34],
  [0.48, 0.74],
  [0.57, 0.2],
  [0.66, 0.64],
  [0.72, 0.52],
  [1, 0.52],
] as const;

function waveY(x: number) {
  for (let index = 1; index < wave.length; index += 1) {
    const [x0, y0] = wave[index - 1] ?? [0, 0];
    const [x1, y1] = wave[index] ?? [1, 0];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 0.52;
}

let dots = "";
for (let row = 0; row < ROWS; row += 1) {
  for (let column = 0; column < COLUMNS; column += 1) {
    const x = column / (COLUMNS - 1);
    const y = row / (ROWS - 1);
    const distance = Math.abs(y - waveY(x));
    const lit = Math.max(0, 1 - distance / 0.07);
    const fill = lit > 0 ? "#FF3B5C" : "#2A262D";
    const radius = 2 + lit * 3;
    const opacity = lit > 0 ? 0.35 + lit * 0.65 : 1;
    dots += `<circle cx="${column * 15 + 8}" cy="${row * 15 + 8}" r="${radius.toFixed(2)}" fill="${fill}" opacity="${opacity.toFixed(2)}"/>`;
  }
}

const html = `<!doctype html><style>
@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;display:flex;align-items:center;justify-content:space-between;padding:0 64px;background:#0B0A0C;color:#F2EEEA;font-family:Geist,sans-serif}
h1{font-size:84px;line-height:1;letter-spacing:-.04em;font-weight:600}
p{margin-top:28px;font-size:34px;color:#FF3B5C;font-weight:500;letter-spacing:-.01em}
svg{flex:none}
</style><div><h1>Renzzo<br>Gracia Gomez</h1><p>Full-Stack Developer</p></div>
<svg width="512" height="632" viewBox="0 0 512 632" aria-hidden="true">${dots}</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
});
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const shot = await page.screenshot({ type: "png" });
await browser.close();

await sharp(shot).png({ compressionLevel: 9, palette: true }).toFile(OUTPUT);
console.log(`Wrote ${OUTPUT}`);
