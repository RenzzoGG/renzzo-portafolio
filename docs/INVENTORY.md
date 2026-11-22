# Inventory of the current site (Phase 0)

Snapshot of `main` at `93d9b4d` (the live site on renzzogg.com), taken when the `redesign` branch was created.

## Structure

| Path | What it is |
| --- | --- |
| `public/index.html` | Single-page portfolio (42 KB). Sections: hero, about, skills, projects, education, certifications, services, contact. Light/dark theme toggle. **Moved to `legacy/index.html`.** |
| `public/css/styles.css` (`?v=6`) | All styles. **Moved to `legacy/css/`.** |
| `public/js/main.js` (`?v=2`) | Menu, theme toggle, scroll reveal, footer year. **Moved to `legacy/js/`.** |
| `public/favicon.svg` | `<RG />` favicon. Kept until Phase 1 replaces it. |
| `public/og-image.png` | 1200×630 Open Graph image, captured from `og/og-image.html`. Kept until regenerated in Signal style. |
| `public/renzzo-gracia-gomez-cv.pdf` (`?v=11`) | Downloadable CV, exported from `cv/`. Kept. |
| `public/img/projects/*.{avif,webp}` | 40 project screenshots in 2 widths × 2 formats (Stocktill, Fernwick Platform, Pulse Theory, Inventory, UIFlow ×2). Kept; Astro serves `public/` as-is. |
| `cv/index.html`, `cv/cv.css` | CV source (Letter, 1 page). Not published. Kept. |
| `og/og-image.html` | OG image template. Not published. Kept. |
| `.claude/settings.json` | Deny rules for `git push` and `rm -rf`-style commands. Kept. |
| `README.md` | Describes the old static stack. To be rewritten in Phase 2. |

## Firebase

Not used. There's no SDK, config or `firebase.json`. The only mention was the old CLAUDE.md line "the site does not use Firebase".

## CV / PDF generation

It's manual. You serve `cv/` (`python3 -m http.server 8001 -d cv`), print it from Chrome to **Save as PDF** (Letter, default margins, no headers or footers, one page), replace `public/renzzo-gracia-gomez-cv.pdf`, then bump the `?v=` on the "Resume (PDF)" link.

There's no script. Phase 2 can automate it with Playwright's `page.pdf()`, reusing the cached Chromium.

## Playwright

- Browsers are installed in `~/.cache/ms-playwright/` (`chromium-1255`, `chromium_headless_shell-1255`, `ffmpeg-1013`).
- The OG image is captured by calling that Chromium binary directly in headless mode (README, Option A).
- There's **no project setup**: no `@playwright/test` dependency, no config and no tests. The Playwright MCP isn't configured either.
- The sibling project `fitness-coach-landing` already has a working Playwright screenshots/a11y pattern (`npm run shots`) that can serve as a reference.

## Railway

- Today: Railpack finds no `package.json` and serves `public/` as a static site. Every push to `main` deploys, with Cloudflare in front (DNS + SSL).
- On `redesign` there's a `package.json`, so once it's merged Railpack will detect a Node/Astro app. It will run `npm run build` and must serve `dist/` statically. That switch is planned and verified in Phase 8 on a separate Railway service before merging. **Nothing changes on `main` until launch.**

## Keep / move / remove

| Item | Decision |
| --- | --- |
| `public/img/`, `public/favicon.svg`, `public/og-image.png`, `public/renzzo-gracia-gomez-cv.pdf` | **Keep** in `public/` (Astro serves it). |
| `cv/`, `og/` | **Keep** as sources until Phase 2 replaces them with Astro-generated equivalents. |
| `public/index.html`, `public/css/`, `public/js/` | **Moved** to `legacy/` (reference only, not built). Delete in Phase 2 once the new site covers all content in `docs/CONTENT.md`. |
| Light/dark theme toggle | **Remove**. Signal is dark-only. |
| Google Fonts (Inter, JetBrains Mono) | **Remove**. Replaced by self-hosted Geist + Geist Mono. |
| Certifications section | Content kept in CONTENT.md. It isn't in the new section list; Phase 1 decides where it lives (CV block or skills/experience). |
| README.md | **Rewrite** in Phase 2. |
| `respaldo-laptop` branch | Untouched. |
