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
  integrations: [devStyleguide()],
});
