# Session handoff

Last updated: 2026-11-23. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| Current phase  | **Phase 7: Performance & QA. Done here**, with WebKit and real-device checks pending |
| Next phase     | **Phase 8: Launch. Not started**, waiting for Renzzo                                 |
| Blocked        | WebKit needs system libraries that require `sudo`                                    |
| Branch         | `redesign`                                                                           |
| `main`         | Untouched at `93d9b4d`                                                               |
| Remote         | **Local commits are not pushed.** Renzzo pushes                                      |
| Checks         | `npm run check` and `npm run check:budgets` pass                                     |
| E2E            | Chromium 142/142. Firefox 49 passed, 1 skipped (Chromium-only phone emulation)       |
| Lighthouse     | Mobile 100/100/100/100 and desktop 100/100/100/100 (median of 5)                     |
| Accessibility  | Zero axe violations on all routes and key states                                     |
| Flash effects  | Worst gated result: 2 general and 3 red flashes per second (limit 3)                 |
| Critical JS    | 9.9 KB minified (budget 20 KB)                                                       |
| Mobile motion  | 33.5 KB gzip (budget 50 KB)                                                          |
| WebGL JS       | 137.9 KB gzip (budget 250 KB)                                                        |
| Textures, face | 121.0 KB (budget 800 KB), 6.4 KB gzip (budget 60 KB)                                 |

## Just finished

Phase 7 commits, oldest first:

- `7397301` fix(work): release pinned content before the section transition
- `3f9c0b7` fix(more-work): show full previews and draw realistic cassette reels
- `548e054` feat(type): justify body text and rebalance the About terminal
- `bf3c18c` fix(work): derive the active project from scroll position
- `2be1281` fix(motion): pin the Motion control as a tab in the page gutter
- `68e9ebb` fix(a11y): keep every visual effect under three flashes per second
- `6ff2e32` fix(cv): clear the right margin and keep project links together
- `3c4a0ac` test(qa): add budget gate, axe audits and cross-browser projects
- `adfde41` docs(qa): add Railway preview steps and a phone test checklist
- `c3d1e55` fix(world): keep section effects off content that is still being read
- `4466367` fix(design): apply the finish review to reels, About and previews
- `984a5b2` fix(motion): apply the motion review to the dissolve and the canvas
- `751595b` fix(services): keep narrow channel text left-aligned
- `d8059e5` fix(work): keep a lone readout label on one line
- `b3411b6` fix(world): close the last empty beat and keep rail fills solid
- `2c22692` fix(a11y): wash drum screens during fast scrolling

The commit that refreshes this handoff is unpushed too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

Evidence is in `docs/reports/phase-7/` (gitignored):

- `desktop-1440/`, `desktop-1920/`, `mobile/`: 11 screenshots each
- `transition/`: the end of Featured Work, mid-transition
- `video/journey-hero-to-contact.webm`: full scroll from the hero to Contact
- `photosensitivity.json`, `lighthouse.json`
- `review/`: captures given to the Impeccable reviewers

## Exact next step

1. **Renzzo:** enable WebKit, then run its suite:

   ```bash
   sudo npx playwright install-deps webkit
   npm run test:webkit
   ```

2. **Renzzo:** push `redesign` and create the temporary preview by following `docs/DEVICE-TESTING.md`. Those Railway steps have not been run.
3. **Renzzo:** complete the phone checklist in that file on iOS Safari and Android Chrome.
4. **Renzzo:** check the full journey on a real GPU: `npm run dev`, open the printed URL with `/?fps`, scroll from the hero to Contact, then run `npx astro dev stop`. Target: 60 fps.
5. **Then send this prompt:** `Start Phase 8 exactly as defined in docs/PLAN.md.`

## Waiting for Renzzo

- **Fast scrolling over the whole page:** every visual effect passes, but a synthetic fling through the full page still measures 8 general flashes per second on desktop and 5 on mobile. It comes from light and dark page blocks sliding past, not from an effect, so it's reported and not gated. An earlier measurement at 1200 px/s still gave 4. Decide on the real phone whether it feels comfortable. Softening it would mean reducing the contrast between sections.
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

- `docs/reports/` (gitignored): screenshots, videos, Lighthouse reports, face previews and reference captures. Phase 7 is in `docs/reports/phase-7/`.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browsers: `npx playwright install chromium firefox webkit`. WebKit also needs `sudo npx playwright install-deps webkit`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
