import type { APIRoute } from "astro";

const ROUTES = ["/", "/cv/"];

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("`site` must be set in astro.config.mjs");
  const urls = ROUTES.map(
    (route) => `  <url><loc>${new URL(route, site).href}</loc></url>`,
  ).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
