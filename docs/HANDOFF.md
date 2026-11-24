# Session handoff

Last updated: 2026-11-23. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                  |
| -------------- | ----------------------------------------------------------------------- |
| Current phase  | **Phase 8: Launch. Prepared**, waiting for Renzzo to deploy             |
| Next step      | Follow `docs/LAUNCH.md` from step 1                                     |
| Blocked        | Nothing is blocked                                                      |
| Branch         | `redesign`                                                              |
| `main`         | Untouched at `93d9b4d`, still the live old site                         |
| Remote         | `origin/redesign` is at `2004dc6`. **The commits below are not pushed** |
| Checks         | `npm run check` and `npm run check:budgets` pass                        |
| Phone E2E      | WebKit and Chromium: 37 passed, 1 skipped (WebKit-only compositor test) |
| Other E2E      | Chromium 146/146. WebKit and Firefox 49 passed, 1 skipped each          |
| Lighthouse     | Local build: mobile and desktop 100/100/100/100 (median of 5)           |
| Flash effects  | Worst gated result: 2 general and 3 red flashes per second (limit 3)    |
| Critical JS    | 10.9 KB minified (budget 20 KB)                                         |
| Mobile motion  | 34.2 KB gzip (budget 50 KB)                                             |
| WebGL JS       | 137.9 KB gzip (budget 250 KB)                                           |
| Textures, face | 121.0 KB (budget 800 KB), 6.4 KB gzip (budget 60 KB)                    |

## Just finished

Phase 8 preparation commits, oldest first:

- `b1c58a5` fix(services): replace X-like LED icons with code, browser and bug
- `0ca3efd` chore(launch): ignore Upwork assets and report to the Phase 8 folder
- `fdce1b0` docs(launch): add the step-by-step launch and rollback plan
- `532524b` feat(skills): add Astro, Three.js and GLSL shaders (CV PDF is now `?v=15`, still one Letter page)

The commit that refreshes this handoff is local too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

What is ready:

- **`docs/LAUNCH.md`:** merge, Railway settings, post-launch checklist, rollback and when to delete `portfolio-preview`.
- **Rehearsed in an isolated clone:** the `--no-ff` merge, a clean `npm ci` and build, the server on all key routes, the revert to `93d9b4d`, and the re-launch.
- **`upwork-assets/` (gitignored):** five 1600×1200 images and `DESCRIPTION.md`.
- **Production Lighthouse:** `LIGHTHOUSE_URL=https://renzzogg.com/ npm run lighthouse`.

## Exact next step

1. **Renzzo:** follow `docs/LAUNCH.md` in order. Don't change production settings before saving the screenshots in step 2.
2. **After the launch:** run the checklist in Phase C, then publish the Upwork entry.
3. **48 hours after a clean checklist:** delete the `portfolio-preview` Railway project.
4. **If anything fails:** use the rollback section of `docs/LAUNCH.md`.

## Waiting for Renzzo

- **Railway and Cloudflare steps have not been run.** They come from current docs. Claude has no access to the production settings, so the screenshots in step 2 are the record of the old configuration.
- **Serverless:** Railway warns that the first request after sleep may return a 502. Test it after launch, and turn it off if it happens even once.
- **No custom 404 page:** unknown URLs get a plain "Not found" text.
- **Old anchors:** `#projects`, `#certifications`, `#education` and `#top` no longer exist. Those links open the top of the page.
- **iPhone result:** all of this was measured in Playwright WebKit with iPhone emulation, which is not iOS. The compositor fix, gyroscope feel and Low Power Mode still need the real phone.
- **Fast scrolling over the whole page:** every visual effect passes, but a synthetic fling through the full page still measures 8 general flashes per second on desktop and 4 on mobile. It comes from light and dark page blocks sliding past, so it is reported and not gated. Decide on the real phone whether it feels comfortable.
- **Photosensitivity scope:** the analyzer is modeled on WCAG 2.3.1 and is not a certified PEAT or Harding result.
- **Reviewer outcome:** the last finish-review disposition was `fix` and the last motion-review disposition was `recapture`. The finish review's open items were then handled as listed below. The motion review asked for a fresh flash run, which passed. Neither reviewer scored the final commits again.
- **Review items not applied:**
  - Removing the `01 / 04` and HUD counters: approved in Phase 6.
  - Replacing `→` arrows: copy comes from `docs/CONTENT.md`.
  - Cropping the Fernwick screenshot: the request was to never crop.
  - Moving About's counters above the bio on mobile: the request was about the desktop column.
  - Turning off hyphenation in About ("dash-board"): automatic hyphenation was requested.
- **Featured panel text stays left-aligned:** its column is too narrow to justify without rivers. Services stays left-aligned for the same reason (about 43 characters per line).
- **Hero at 1440 px with a classic scrollbar:** the headline takes four lines and PostgreSQL drops to a second row. It still fits, and this phase didn't change it.
- **Impeccable `detect`:** skipped, because `CLAUDE.md` forbids the engine.
- **Screen reader:** only the accessibility tree was checked. A real VoiceOver or TalkBack pass is pending.
- **742 tests:** shown as "automated tests" for Stocktill. The count includes 385 pgTAP assertions and 28 E2E tests that were listed but not run for that report. Counting only Vitest and Playwright cases gives 357. Prose and the CV keep "700+".
- **Cassette year:** 2026 comes from the GitHub creation dates of the repos. Change `year` in the project YAML if a project really started earlier.
- **VHS velocity:** tune `FAST_SCROLL` in `src/lib/world/scene.ts` only if it feels wrong on a real GPU, and rerun the photosensitivity test afterwards.

## Not in git: copy by hand to another machine

**Required to regenerate the face:**

- `assets-src/face.webp` (80 KB). It's the source photo and must **never** be committed. The site builds without it because `src/assets/face/face.bin` and `poster.webp` are committed. It's only needed for `npm run face:build`.

**Optional:**

- `docs/reports/` (gitignored): screenshots, videos, Lighthouse reports, face previews and reference captures. Phase 7 is in `docs/reports/phase-7/`, the mobile pass in `docs/reports/phase-7-mobile/` and Phase 8 in `docs/reports/phase-8/`.
- `upwork-assets/` (gitignored): Upwork images and `DESCRIPTION.md`.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browsers: `npx playwright install chromium firefox webkit`. WebKit also needs `sudo npx playwright install-deps webkit`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
