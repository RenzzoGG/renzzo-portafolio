# Session handoff

Last updated: 2026-11-23. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| Current phase  | **Phase 6.5: Signal set pieces. Done**, with manual GPU and feel checks pending        |
| Next phase     | **Phase 7: Performance & QA. Not started**, waiting for Renzzo                         |
| Blocked        | Nothing is blocked                                                                     |
| Branch         | `redesign`                                                                             |
| `main`         | Untouched at `93d9b4d`                                                                 |
| Remote         | **Local commits are not pushed.** `origin/redesign` stops at `ae1b4c5`. Renzzo pushes. |
| Latest results | `npm run check` passes, 85/85 E2E tests pass                                           |
| Lighthouse     | Mobile 100/100/100/100 and desktop 100/100/100/100 (median of 5)                       |
| Critical JS    | 9.9 KB minified, including imported chunks (budget 20 KB)                              |
| Mobile motion  | 34.0 KB gzip: GSAP core, SplitText, our motion and the skills tabs (budget 50 KB)      |
| WebGL JS       | 139.8 KB gzip (budget 250 KB)                                                          |
| Desktop JS     | 198.4 KB gzip in total, including ScrollTrigger                                        |
| Textures       | 123.9 KB total for the 4 project AVIFs (budget 800 KB)                                 |
| Face data      | 6.3 KB gzip (budget 60 KB)                                                             |

## Just finished

Phase 6.5 commits, oldest first:

- `19af62c` docs(content): add Phase 6.5 plan, labels, readouts and tape years
- `23d31a8` feat(work): add LED readouts, tuned titles and tag wave to project panel
- `f477b37` fix(motion): keep heading glitch timing through CSS minification
- `43ef2e2` feat(work): turn More work into a VHS tape shelf with CRT preview
- `6587b23` feat(about): add typed terminal, LED counters and stronger streams
- `f898e86` feat(services): add CRT channels with turn-on and LED icons
- `422ad78` feat(skills): add LED matrix tabs and terminal education log
- `e4c99ed` test(sets): cover tabs, tape shelf keyboard access and reduced motion
- `16c6b41` chore(lighthouse): report Phase 6.5 budgets and mark the phase done

The commit that refreshes this handoff is unpushed too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

Evidence is in `docs/reports/phase-6-5/` (gitignored):

- `before/desktop/`, `before/mobile/`, `after/desktop/`, `after/mobile/`: 6 screenshots each
- `phase-6-5-journey.webm` (desktop, 39 s) and `phase-6-5-journey-mobile.webm` (30 s)
- `lighthouse.json`

## Exact next step

1. **Renzzo:** check the full journey on a real GPU. Run `npm run dev`, open the printed URL with `/?fps` in Chrome on Windows, scroll from the hero to the Contact curtain, then run `npx astro dev stop`. Target: 60 fps.
2. **Renzzo:** judge what stills can't show: terminal typing speed, tape slide, CRT turn-on, LED count-up, the LED board sweep and the stronger About streams.
3. **Renzzo:** optionally run `/review-animations`.
4. **Renzzo:** push `redesign` when happy.
5. **Then send this prompt:** `Start Phase 7 exactly as defined in docs/PLAN.md.`

## Waiting for Renzzo

- **742 tests:** shown as "automated tests" for Stocktill. The count includes 385 pgTAP assertions and 28 E2E tests that were listed but not run for that report. Counting only Vitest and Playwright cases gives 357. Prose and the CV keep "700+".
- **Cassette year:** 2026 comes from the GitHub creation dates of the repos. Change `year` in the project YAML if a project really started earlier.
- **Intermittent test:** `project detail › opens in place and Escape returns to the project` failed once in a parallel run. It then passed 3/3 alone and in 5 further full runs. Its error wasn't captured, so the cause is unknown. Watch it in Phase 7.
- **Design review:** Impeccable's layout and critique guidance and Emil's checklists were applied by hand. Its `detect` scan is forbidden here, and the reviewer agents did not run on this phase.
- **FPS result:** software rendering can't measure it. This includes the pending Phase 4, 5 and 6 checks.
- **VHS velocity:** the distortion reaches full strength at a lower pixel speed in the drum than in the tunnel. Tune `FAST_SCROLL` in `src/lib/world/scene.ts` only if it feels wrong on a real GPU.
- **Phone tilt result:** it has only been checked in emulation.
- **`/review-animations`:** only Renzzo can start this skill.

## Not in git: copy by hand to another machine

**Required to regenerate the face:**

- `assets-src/face.webp` (80 KB). It's the source photo and must **never** be committed. The site builds without it because `src/assets/face/face.bin` and `poster.webp` are committed. It's only needed for `npm run face:build`.

**Optional:**

- `docs/reports/` (gitignored): screenshots, videos, Lighthouse reports, face previews and reference captures. Phase 6.5 is in `docs/reports/phase-6-5/`.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browser for tests and the CV PDF: `npx playwright install chromium`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
