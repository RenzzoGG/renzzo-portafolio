# Session handoff

Last updated: 2026-11-23. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| Current phase  | **Phase 6.6: One continuous journey. Done**, with manual GPU and feel checks pending   |
| Next phase     | **Phase 7: Performance & QA. Not started**, waiting for Renzzo                         |
| Blocked        | Nothing is blocked                                                                     |
| Branch         | `redesign`                                                                             |
| `main`         | Untouched at `93d9b4d`                                                                 |
| Remote         | **Local commits are not pushed.** `origin/redesign` stops at `ae1b4c5`. Renzzo pushes. |
| Latest results | `npm run check` passes, 91/91 E2E tests pass                                           |
| Lighthouse     | Mobile 100/100/100/100 and desktop 100/100/100/100 (median of 5)                       |
| Critical JS    | 9.9 KB minified, including imported chunks (budget 20 KB)                              |
| Mobile motion  | 34.3 KB gzip: GSAP core, SplitText, our motion and the skills tabs (budget 50 KB)      |
| WebGL JS       | 140.9 KB gzip (budget 250 KB)                                                          |
| Desktop JS     | 200.1 KB gzip in total, including ScrollTrigger                                        |
| Face data      | 6.3 KB gzip (budget 60 KB)                                                             |

## Just finished

Phase 6.6 commits, oldest first:

- `d5b785c` docs(plan): add Phase 6.6 continuity design
- `4b136af` feat(work): draw LED readouts directly on bone in a row
- `ddc6292` fix(world): remove dead zones and run signal transitions through every section
- `e4dd438` feat(motion): choreograph section entrances with the HUD
- `e3d4fef` test(continuity): fail on blank viewports across the full scroll
- `d21f108` chore(lighthouse): report Phase 6.6 budgets

The commit that refreshes this handoff is unpushed too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

What changed:

- **Readouts on bone:** no black box, signal digits, a faint ink ghost, a hairline border, and a row that wraps.
- **Dead zones:** the cause was 160vh of reserved drum scroll plus a canvas that faded out after it. The space is now 40vh and the world never switches off.
- **Transitions:** LED static, camera dive, channel change, vertical re-tune, CRT power-off, and the collapse into the Contact curtain.
- **Without WebGL:** gradient seams on mobile, reduced motion, Motion off and no JS. Mobile adds a short static burst.
- **Flash safety:** the static follows scroll instead of strobing while the page is held still.
- **Intermittent detail test:** fixed. Playwright was clicking a panel that was still animating, then scrolling on retry.

Evidence is in `docs/reports/phase-6-6/` (gitignored):

- `desktop/` and `mobile/`: 12 screenshots each, mid-transition and settled for all 6 boundaries
- `journey-desktop.webm` and `journey-mobile.webm`: full scroll from the hero to the Contact curtain
- `lighthouse.json`

## Exact next step

1. **Renzzo:** check the full journey on a real GPU. Run `npm run dev`, open the printed URL with `/?fps` in Chrome on Windows, scroll from the hero to the Contact curtain, then run `npx astro dev stop`. Target: 60 fps.
2. **Renzzo:** judge what stills can't show: the strength of the static, the speed of each transition and the Contact climax.
3. **Renzzo:** optionally run `/review-animations`.
4. **Renzzo:** push `redesign` when happy.
5. **Then send this prompt:** `Start Phase 7 exactly as defined in docs/PLAN.md.`

## Waiting for Renzzo

- **Flash safety on real hardware:** the static was reduced and tied to scroll, but no formal photosensitivity analysis was run. Check that a fast scroll through it feels comfortable.
- **Work index after a jump:** an instant jump past the last project can leave the index on an older project until a project crosses the viewport center. This was not changed in this phase.
- **Phase 6.5 Lighthouse file:** `docs/reports/phase-6-5/lighthouse.json` was overwritten by the Phase 6.6 run before the script pointed to the new folder. The Phase 6.5 numbers are no longer in that file.
- **742 tests:** shown as "automated tests" for Stocktill. The count includes 385 pgTAP assertions and 28 E2E tests that were listed but not run for that report. Counting only Vitest and Playwright cases gives 357. Prose and the CV keep "700+".
- **Cassette year:** 2026 comes from the GitHub creation dates of the repos. Change `year` in the project YAML if a project really started earlier.
- **Design review:** Impeccable's and Emil's guidance was applied by hand. Its `detect` scan is forbidden here, and the reviewer agents did not run on this phase.
- **FPS result:** software rendering can't measure it. This includes the pending Phase 4, 5, 6 and 6.5 checks.
- **VHS velocity:** the distortion reaches full strength at a lower pixel speed in the drum than in the tunnel. Tune `FAST_SCROLL` in `src/lib/world/scene.ts` only if it feels wrong on a real GPU.
- **Phone tilt result:** it has only been checked in emulation.
- **`/review-animations`:** only Renzzo can start this skill.

## Not in git: copy by hand to another machine

**Required to regenerate the face:**

- `assets-src/face.webp` (80 KB). It's the source photo and must **never** be committed. The site builds without it because `src/assets/face/face.bin` and `poster.webp` are committed. It's only needed for `npm run face:build`.

**Optional:**

- `docs/reports/` (gitignored): screenshots, videos, Lighthouse reports, face previews and reference captures. Phase 6.6 is in `docs/reports/phase-6-6/`.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browser for tests and the CV PDF: `npx playwright install chromium`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
