// @ts-check
import { defineConfig } from "astro/config";

// Static output: `astro build` writes plain files to dist/.
export default defineConfig({
  site: "https://renzzogg.com",
  output: "static",
});
