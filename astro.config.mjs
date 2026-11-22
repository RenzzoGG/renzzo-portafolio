// @ts-check
import { defineConfig } from "astro/config";

/**
 * Registers /styleguide only under `astro dev`, so the page is never part of
 * a production build or any future sitemap.
 * @returns {import("astro").AstroIntegration}
 */
function devStyleguide() {
  return {
    name: "dev-styleguide",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        if (command !== "dev") return;
        injectRoute({
          pattern: "/styleguide",
          entrypoint: "./src/dev/styleguide.astro",
        });
      },
    },
  };
}

// Static output: `astro build` writes plain files to dist/.
export default defineConfig({
  site: "https://renzzogg.com",
  output: "static",
  // Inlined CSS removes the render-blocking request, which protects text LCP.
  build: { inlineStylesheets: "always" },
  integrations: [devStyleguide()],
  // The WebGL world runs in a module worker.
  // Three.js is a lazy, desktop-only chunk, with its budget set in docs/PLAN.md.
  vite: { worker: { format: "es" }, build: { chunkSizeWarningLimit: 700 } },
});
