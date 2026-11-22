/**
 * Runs Lighthouse on the production build, mobile and desktop, and reports the
 * median of 5 runs. Each run uses a fresh browser. Run `npm run build` first.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { startServer } from "./serve-dist.ts";

const RUNS = 5;
const PORT = 4332;
const DEBUG_PORT = 9333;
const REPORT = "docs/reports/phase-4/lighthouse.json";
const CATEGORIES = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

function findSnippet(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const node = value as { type?: string; snippet?: string };
  if (node.type === "node" && node.snippet) return node.snippet;
  for (const child of Object.values(value)) {
    const found = findSnippet(child);
    if (found) return found;
  }
  return undefined;
}

async function runOnce(url: string, formFactor: "mobile" | "desktop") {
  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${DEBUG_PORT}`],
  });
  try {
    const result = await lighthouse(
      url,
      {
        port: DEBUG_PORT,
        output: "json",
        logLevel: "error",
        onlyCategories: [...CATEGORIES],
      },
      formFactor === "desktop" ? desktopConfig : undefined,
    );
    if (!result) throw new Error("Lighthouse returned no result");
    const { lhr } = result;
    if (lhr.runtimeError) throw new Error(lhr.runtimeError.message);
    return {
      scores: Object.fromEntries(
        CATEGORIES.map((id) => [
          id,
          Math.round((lhr.categories[id]?.score ?? 0) * 100),
        ]),
      ) as Record<(typeof CATEGORIES)[number], number>,
      lcp: lhr.audits["largest-contentful-paint"]?.numericValue ?? 0,
      cls: lhr.audits["cumulative-layout-shift"]?.numericValue ?? 0,
      tbt: lhr.audits["total-blocking-time"]?.numericValue ?? 0,
      lcpElement: findSnippet(lhr.audits["lcp-breakdown-insight"]?.details),
      webglRequested: (
        JSON.stringify(lhr.audits["network-requests"]?.details) ?? ""
      ).includes("world.worker"),
      longTasks: (
        (
          lhr.audits["long-tasks"]?.details as
            { items?: { url?: string; duration?: number }[] } | undefined
        )?.items ?? []
      ).map(
        (task) =>
          `${Math.round(task.duration ?? 0)}ms ${(task.url ?? "").split("/").pop() ?? ""}`,
      ),
      failed: Object.values(lhr.categories)
        .flatMap((category) => category.auditRefs)
        .filter((ref) => ref.weight > 0)
        .map((ref) => lhr.audits[ref.id])
        .filter((audit) => audit && audit.score !== null && audit.score < 0.9)
        .map((audit) => audit?.id),
    };
  } finally {
    await browser.close();
  }
}

function criticalJsBytes() {
  const html = readFileSync("dist/index.html", "utf8");
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  // Counts inline scripts and entry modules. Lazy chunks load after first paint.
  return scripts
    .filter(([, attrs]) => !attrs?.includes("application/ld+json"))
    .reduce((total, [, attrs, body]) => {
      const src = /\bsrc="\/([^"]+)"/.exec(attrs ?? "")?.[1];
      const size = src
        ? readFileSync(`dist/${src}`).length
        : Buffer.byteLength(body ?? "");
      return total + size;
    }, 0);
}

/** Gzip sizes of what a desktop visit downloads, with WebGL reported on its own. */
function desktopJs() {
  const files = readdirSync("dist/_astro").filter((name) =>
    name.endsWith(".js"),
  );
  const gz = (prefix: string) => {
    const name = files.find((file) => file.startsWith(prefix));
    return name
      ? gzipSync(readFileSync(`dist/_astro/${name}`), { level: 9 }).length
      : 0;
  };
  const html = readFileSync("dist/index.html", "utf8");
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(
      ([, attrs]) => !attrs?.includes("ld+json") && !attrs?.includes("src="),
    )
    .map(([, , body]) => body ?? "")
    .join("");
  const webgl = gz("world.worker");
  const other =
    gz("LedSlot") + gz("host.") + gzipSync(inline, { level: 9 }).length;
  return {
    webglGzipBytes: webgl,
    otherGzipBytes: other,
    totalGzipBytes: webgl + other,
  };
}

const server = await startServer(PORT);
const summary: Record<string, unknown> = {
  criticalJsBytes: criticalJsBytes(),
  desktopJs: desktopJs(),
};
try {
  for (const formFactor of ["mobile", "desktop"] as const) {
    const runs: Awaited<ReturnType<typeof runOnce>>[] = [];
    for (let run = 1; run <= RUNS; run += 1) {
      const result = await runOnce(`http://127.0.0.1:${PORT}/`, formFactor);
      console.log(formFactor, run, JSON.stringify(result.scores));
      runs.push(result);
    }
    summary[formFactor] = {
      median: Object.fromEntries(
        CATEGORIES.map((id) => [id, median(runs.map((run) => run.scores[id]))]),
      ),
      performanceRuns: runs.map((run) => run.scores.performance),
      lcpMs: Math.round(median(runs.map((run) => run.lcp))),
      cls: Number(median(runs.map((run) => run.cls)).toFixed(4)),
      maxCls: Number(Math.max(...runs.map((run) => run.cls)).toFixed(4)),
      tbtMs: Math.round(median(runs.map((run) => run.tbt))),
      lcpElement: runs[0]?.lcpElement,
      failedAudits: [...new Set(runs.flatMap((run) => run.failed))],
      longTasksLastRun: runs.at(-1)?.longTasks,
      webglRequested: runs.some((run) => run.webglRequested),
    };
  }
} finally {
  server.close();
}

mkdirSync("docs/reports/phase-4", { recursive: true });
writeFileSync(REPORT, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
