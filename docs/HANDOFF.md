# Session handoff

Last updated: 2026-11-23. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                      |
| -------------- | --------------------------------------------------------------------------- |
| Current phase  | **Phase 7.5: Mobile motion. Done here**, with the real iPhone check pending |
| Next phase     | **Phase 8: Launch. Not started**, waiting for Renzzo                        |
| Blocked        | Nothing is blocked                                                          |
| Branch         | `redesign`                                                                  |
| `main`         | Untouched at `93d9b4d`                                                      |
| Remote         | `origin/redesign` is at `69de754`. **The commits below are not pushed**     |
| Checks         | `npm run check` and `npm run check:budgets` pass                            |
| Phone E2E      | WebKit and Chromium: 37 passed, 1 skipped (a WebKit-only compositor test)   |
| Other E2E      | Chromium 146/146. WebKit and Firefox 49 passed, 1 skipped each              |
| Lighthouse     | Mobile 100/100/100/100 and desktop 100/100/100/100 (median of 5)            |
| Flash effects  | Worst gated result: 2 general and 3 red flashes per second (limit 3)        |
| Critical JS    | 10.9 KB minified (budget 20 KB)                                             |
| Mobile motion  | 34.2 KB gzip (budget 50 KB)                                                 |
| WebGL JS       | 137.9 KB gzip (budget 250 KB)                                               |
| Textures, face | 121.0 KB (budget 800 KB), 6.4 KB gzip (budget 60 KB)                        |

## Just finished

Phase 7.5 commits, oldest first:

- `22add63` feat(face): give the phone face real depth, tilt and idle life
- `252b168` feat(mobile): add visible entrances, a 3D card carousel and CRT wipes
- `573087e` test(mobile): cover phone motion in WebKit and Chromium
- `999d966` fix(a11y): calm the phone face during a hard shake
- `6509bfb` feat(hero): lead the phone hero with the LED face
- `01a5fbc` fix(face): publish the dot layers in the WebKit compositor

The commit that refreshes this handoff is unpushed too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

Why the iPhone felt static:

- **The bright dots never reached the screen in WebKit.** Canvases drawn before joining the page kept a stale compositor buffer, so only the dim glow showed. Screenshots hid this, and a test on recorded frames now guards it.
- **The face was below the first screen** on phones.
- **Tilt was too weak:** a 10° tilt moved the edge of the face about 3 px.
- **Entrances were too small:** 14 px while a normal scroll moves about 320 px.
- Motion code did run, and nothing disabled it on iOS.

Evidence is in `docs/reports/phase-7-mobile/` (gitignored):

- `video/mobile-webkit-hero-to-contact.webm`: 390 px WebKit, hero to Contact. The tilt in it uses a simulated sensor.
- `frames/contact-sheet.png`, `lighthouse.json`, `photosensitivity.json`

## Exact next step

1. **Renzzo:** push `redesign`. The Railway preview redeploys from it.
2. **Renzzo:** on the iPhone, reload the preview and complete the checklist in `docs/DEVICE-TESTING.md`. Check first that the face is bright, follows the tilt and that the carousel swipes well.
3. **Renzzo:** repeat on Android Chrome, and check the desktop journey on a real GPU (target 60 fps).
4. **Then send this prompt:** `Start Phase 8 exactly as defined in docs/PLAN.md.`

## Waiting for Renzzo

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

- `docs/reports/` (gitignored): screenshots, videos, Lighthouse reports, face previews and reference captures. Phase 7 is in `docs/reports/phase-7/` and the mobile pass in `docs/reports/phase-7-mobile/`.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browsers: `npx playwright install chromium firefox webkit`. WebKit also needs `sudo npx playwright install-deps webkit`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
