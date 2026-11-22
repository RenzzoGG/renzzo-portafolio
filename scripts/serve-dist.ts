/**
 * Serves dist/ with gzip and long-lived caching for hashed assets, close to
 * what production does. Used by the CV PDF, E2E tests and Lighthouse.
 * Run directly: node scripts/serve-dist.ts [port]
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve("dist");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".bin": "application/octet-stream",
};
const COMPRESSIBLE = new Set([
  ".html",
  ".css",
  ".js",
  ".svg",
  ".xml",
  ".txt",
  ".bin",
]);

function resolveFile(pathname: string) {
  const relative = normalize(decodeURIComponent(pathname));
  const target = join(ROOT, relative);
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  if (!existsSync(target)) return null;
  if (statSync(target).isDirectory()) {
    const index = join(target, "index.html");
    return existsSync(index) ? index : null;
  }
  return target;
}

export function startServer(port: number): Promise<Server> {
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    let file: string | null;
    try {
      file = resolveFile(pathname);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }
    if (!file) {
      response
        .writeHead(404, { "Content-Type": "text/plain" })
        .end("Not found");
      return;
    }
    if (
      file.endsWith("index.html") &&
      !pathname.endsWith("/") &&
      !pathname.endsWith(".html")
    ) {
      response.writeHead(301, { Location: `${pathname}/` }).end();
      return;
    }

    const extension = extname(file);
    const headers: Record<string, string> = {
      "Content-Type": TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": pathname.startsWith("/_astro/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=0, must-revalidate",
    };
    let body: Buffer = readFileSync(file);
    const accepts = String(request.headers["accept-encoding"] ?? "");
    if (COMPRESSIBLE.has(extension) && accepts.includes("gzip")) {
      body = gzipSync(body);
      headers["Content-Encoding"] = "gzip";
      headers.Vary = "Accept-Encoding";
    }
    headers["Content-Length"] = String(body.length);
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : body);
  });

  return new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", () => done(server));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.argv[2] ?? 4330);
  await startServer(port);
  console.log(`Serving dist/ at http://127.0.0.1:${port}`);
}
