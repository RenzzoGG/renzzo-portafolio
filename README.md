# renzzogg.com

Personal portfolio and CV of Renzzo Gracia Gomez, Full-Stack Developer.

**Live site:** [https://renzzogg.com](https://renzzogg.com)

The `redesign` branch holds the "Signal" rebuild. See [`docs/PLAN.md`](docs/PLAN.md) for its phases and budgets, and [`docs/CONTENT.md`](docs/CONTENT.md) for all copy and project data.

## Stack

- Astro (static output) and strict TypeScript
- Self-hosted Geist and Geist Mono
- Astro's image pipeline (AVIF and WebP)
- Playwright for E2E tests, the CV PDF and the OG image
- Works without JavaScript. The only script on the page powers the Motion toggle.

## Commands

Requires the Node version in `.nvmrc`.

| Command              | What it does                                                 |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Starts the dev server                                        |
| `npm run build`      | Builds the site to `dist/`                                   |
| `npm run preview`    | Previews the production build                                |
| `npm run check`      | Runs lint, format check, typecheck, contrast check and build |
| `npm run test:e2e`   | Builds and runs the Playwright tests                         |
| `npm run cv:pdf`     | Prints `/cv` to a one-page Letter PDF in `public/`           |
| `npm run og:image`   | Regenerates `public/og-image.png`                            |
| `npm run lighthouse` | Reports the median of 5 Lighthouse runs (build first)        |
| `npm run face:build` | Regenerates the LED face data from the local photo           |

## Project structure

```
src/
├── assets/projects/  # Screenshot masters, optimized at build time
├── components/       # Page sections
├── content/          # Typed content collections
├── layouts/
├── lib/
├── pages/            # Home, /cv, sitemap.xml and robots.txt
└── styles/           # Tokens, fonts and shared primitives
scripts/              # CV PDF, OG image, Lighthouse, contrast, local server
tests/e2e/            # Playwright tests
docs/                 # Plan, content and reviews
```

## Updating content

1. Change the wording in `docs/CONTENT.md`, then in `src/content/`.
2. If the CV changed, run `npm run cv:pdf` and bump `?v=` on the PDF link in `src/content/profile.yaml`.
3. If the OG image changed, run `npm run og:image` and bump `?v=` in `src/components/BaseHead.astro`.

## Face pipeline

`scripts/face/` turns a local portrait into compact LED dot data. It runs on your machine at build time and is never shipped.

1. Install [uv](https://docs.astral.sh/uv/) and put the photo at `assets-src/face.webp`. That folder is gitignored and must never be committed.
2. Preview every variant: `npm run face:build -- --all-variants --out docs/reports/phase-3`.
3. Preview the stylized variants, each with a styled and a focused state: `npm run face:build -- --stylized --out docs/reports/phase-3/stylized`.
4. Set `"selected"` in `scripts/face/variants.json`, then run `npm run face:build` to write `src/assets/face/face.bin`.

The approved variant is `e2-halftone`. `npm run face:build` writes its data and an LED poster rendered only from the dots. The hero shows the poster without JS or with motion off, and a lazy 2D canvas (`src/lib/face/`) otherwise.

The first run downloads Python, the locked packages and two checksum-verified models. Those, plus the masks and depth maps, stay in `~/.cache/renzzo-face/`. After that, the pipeline runs offline.

## Deployment

The live site deploys from `main` on Railway, with Cloudflare in front. **Every push to `main` goes live.** The redesign reaches `main` only in the launch phase.
