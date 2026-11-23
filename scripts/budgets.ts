/** Measures every shipped budget from `dist/`. Run `npm run build` first. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

export interface Budget {
  id: string;
  label: string;
  value: number;
  limit: number;
}

const KB = 1024;
const ASSETS = "dist/_astro";

const gzipped = (path: string) =>
  gzipSync(readFileSync(path), { level: 9 }).length;

function findAsset(files: string[], prefix: string, suffix = ".js") {
  const name = files.find(
    (file) => file.startsWith(prefix) && file.endsWith(suffix),
  );
  // A renamed chunk must fail loudly, never measure as zero bytes.
  if (!name) throw new Error(`No built asset starts with "${prefix}"`);
  return `${ASSETS}/${name}`;
}

/** Entry scripts, inline scripts and everything they import statically. */
function criticalBytes() {
  const html = readFileSync("dist/index.html", "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  const seen = new Set<string>();
  let total = 0;
  const visit = (path: string) => {
    if (seen.has(path) || !existsSync(path)) return;
    seen.add(path);
    const code = readFileSync(path, "utf8");
    total += Buffer.byteLength(code);
    for (const [, file] of code.matchAll(
      /(?:\bfrom|\bimport)\s*["'`]\.\/([^"'`]+\.js)["'`]/g,
    )) {
      visit(`${ASSETS}/${file}`);
    }
  };
  for (const [, attrs = "", body = ""] of scripts) {
    if (attrs.includes("application/ld+json")) continue;
    const src = /\bsrc="\/([^"]+)"/.exec(attrs)?.[1];
    if (src) visit(`dist/${src}`);
    else total += Buffer.byteLength(body);
  }
  return total;
}

function textureBytes() {
  const html = readFileSync("dist/index.html", "utf8");
  const urls = new Set(
    [...html.matchAll(/data-texture="\/([^"]+)"/g)].map(([, url]) => url),
  );
  if (urls.size === 0) throw new Error("No project textures found");
  return [...urls].reduce(
    (total, url) => total + statSync(`dist/${url ?? ""}`).size,
    0,
  );
}

export function measureBudgets(): Budget[] {
  const files = readdirSync(ASSETS);
  return [
    {
      id: "critical",
      label: "Critical JS (min)",
      value: criticalBytes(),
      limit: 20 * KB,
    },
    {
      id: "mobile-motion",
      label: "Mobile deferred motion JS (gzip)",
      value:
        gzipped(findAsset(files, "core.")) + gzipped(findAsset(files, "tabs.")),
      limit: 50 * KB,
    },
    {
      id: "webgl",
      label: "WebGL JS (gzip)",
      value: gzipped(findAsset(files, "world.worker")),
      limit: 250 * KB,
    },
    {
      id: "textures",
      label: "Project textures",
      value: textureBytes(),
      limit: 800 * KB,
    },
    {
      id: "face",
      label: "LED face data (gzip)",
      value: gzipped(findAsset(files, "face.", ".bin")),
      limit: 60 * KB,
    },
  ];
}
