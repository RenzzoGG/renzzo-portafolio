# Session handoff

Last updated: 2026-11-23. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| Current phase  | **Phase 6: World and polish. Done**, with manual GPU and feel checks pending           |
| Next phase     | **Phase 7: Performance & QA. Not started**, waiting for Renzzo                         |
| Blocked        | Nothing is blocked                                                                     |
| Branch         | `redesign`                                                                             |
| `main`         | Untouched at `93d9b4d`                                                                 |
| Remote         | **Local commits are not pushed.** `origin/redesign` stops at `ae1b4c5`. Renzzo pushes. |
| Latest results | `npm run check` passes, 72/72 E2E tests pass                                           |
| Lighthouse     | Mobile 100/100/100/100 and desktop 100/100/100/100 (median of 5)                       |
| Critical JS    | 9.5 KB minified (budget 20 KB)                                                         |
| Mobile motion  | 31.2 KB gzip: GSAP core, SplitText and our code (budget 50 KB)                         |
| WebGL JS       | 139.8 KB gzip (budget 250 KB)                                                          |
| Desktop JS     | 194.6 KB gzip in total, including ScrollTrigger                                        |
| Textures       | 123.9 KB total for the 4 project AVIFs (budget 800 KB)                                 |

## Just finished

Phase 6 commits, oldest first:

- `ad2fb3d` chore(motion): pin GSAP and record Phase 6 decisions
- `c3c44ec` feat(ui): add menu, project detail, HUD and signal text motion
- `6da64b3` feat(world): add About signal streams, Contact curtain and Phase 6 tests
- `8bbe95e` fix(motion): apply motion review and guard anchor jumps against late layout
- `1a6c568` fix(motion): apply second review on armed text, glitch, anchors and detail

The commit that refreshes this handoff is unpushed too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

Decisions made in this phase are in `docs/PLAN.md`. The main one: ScrollTrigger loads on desktop only, because GSAP core, ScrollTrigger and SplitText alone measure 49.0 KB gzip.

Impeccable's motion reviewer ran twice. All findings from both passes are applied and covered by tests or captures, but it did not run a third time on the final version.

## Exact next step

1. **Renzzo:** check the full journey on a real GPU. Run `npm run dev`, open the printed URL with `/?fps` in Chrome on Windows, scroll from the hero to the Contact curtain, then run `npx astro dev stop`. Target: 60 fps.
2. **Renzzo:** judge what stills can't show: scroll damping, decode flicker, magnetic buttons, heading glitch, underlines and the project panel handover.
3. **Renzzo:** optionally run `/review-animations`.
4. **Renzzo:** push `redesign` when happy.
5. **Then send this prompt:** `Start Phase 7 exactly as defined in docs/PLAN.md.`

## Waiting for Renzzo

- **FPS result:** software rendering can't measure it. This includes the pending Phase 4 and Phase 5 checks.
- **VHS velocity:** the distortion reaches full strength at a lower pixel speed in the drum than in the tunnel. Tune `FAST_SCROLL` in `src/lib/world/scene.ts` only if it feels wrong on a real GPU.
- **Phone tilt result:** it has only been checked in emulation.
- **`/review-animations`:** only Renzzo can start this skill, so it did not run in Phases 5 or 6.
- **Old preview server:** an `astro preview` that Claude didn't start (PID 41613 on this machine) may still hold port 4321. Stop it with `npx astro preview stop` if it isn't needed.

## Not in git: copy by hand to another machine

**Required to regenerate the face:**

- `assets-src/face.webp` (80 KB). It's the source photo and must **never** be committed. The site builds without it because `src/assets/face/face.bin` and `poster.webp` are committed. It's only needed for `npm run face:build`.

**Optional:**

- `docs/reports/` (gitignored): screenshots, videos, Lighthouse reports, face previews and reference captures. Phase 6 is in `docs/reports/phase-6/`, with `desktop/`, `mobile/`, `phase-6-journey.webm` and `lighthouse.json`.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browser for tests and the CV PDF: `npx playwright install chromium`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
