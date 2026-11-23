# Session handoff

Last updated: 2026-11-22. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| Current phase  | **Phase 5: The signal tunnel and Featured Work. Done**, with manual GPU checks pending |
| Next phase     | **Phase 6: World and polish. Not started**, waiting for Renzzo                         |
| Blocked        | Nothing is blocked                                                                     |
| Branch         | `redesign`                                                                             |
| `main`         | Untouched at `93d9b4d`                                                                 |
| Remote         | **Local commits are not pushed.** `origin/redesign` stops at `c08ef66`. Renzzo pushes. |
| Latest results | `npm run check` passes, 53/53 E2E tests pass                                           |
| Lighthouse     | Mobile 100/100/100/100 and desktop 100/100/100/100 (median of 5)                       |
| Bundle sizes   | WebGL 138.9 KB gzip, total desktop JS 144.5 KB gzip, critical JS 6.1 KB minified       |
| Textures       | 123.9 KB total for the 4 project AVIFs (budget 800 KB)                                 |

## Just finished

Phase 5 commits, oldest first:

- `d03c288` feat(tokens): add bone surface, work index label and Phase 5 decisions
- `588467f` feat(work): add bone stage, synced index and stacked VHS cards
- `854019e` feat(world): add signal tunnel, CRT project drum and bone shift
- `c91e113` fix(world): apply motion review on tunnel, drum, exit and Motion access

The commit that refreshes this handoff is unpushed too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

Decisions made in this phase are recorded in `docs/PLAN.md`. The main ones: Featured Work now comes before About, GSAP moved to Phase 6, and no dependency was added.

Impeccable's motion reviewer ran once and its nine fixes are applied. It was not re-run on the fixed version.

## Exact next step

1. **Renzzo:** check the journey on a real GPU. Run `npm run dev`, open the printed URL with `/?fps` in Chrome on Windows, scroll from the hero to the end of Featured Work, then run `npx astro dev stop`. Target: 60 fps.
2. **Renzzo:** while there, judge the feel: scroll damping, fast-scroll VHS strength, reverse scrolling and texture pop-in.
3. **Renzzo:** optionally run `/review-animations`.
4. **Renzzo:** push `redesign` when happy.
5. **Then send this prompt:** `Start Phase 6 exactly as defined in docs/PLAN.md.`

## Waiting for Renzzo

- **FPS result:** software rendering can't measure it. This includes the Phase 4 hero check, which is still pending.
- **VHS velocity:** the distortion reaches full strength at a lower pixel speed in the drum than in the tunnel. Tune `FAST_SCROLL` in `src/lib/world/scene.ts` only if it feels wrong on a real GPU.
- **Phone tilt result:** it has only been checked in emulation.
- **`/review-animations`:** only Renzzo can start this skill, so it did not run in Phase 5.
- **Old preview server:** an `astro preview` that Claude didn't start (PID 41613 on this machine) may still hold port 4321. Stop it with `npx astro preview stop` if it isn't needed.

## Not in git: copy by hand to another machine

**Required to regenerate the face:**

- `assets-src/face.webp` (80 KB). It's the source photo and must **never** be committed. The site builds without it because `src/assets/face/face.bin` and `poster.webp` are committed. It's only needed for `npm run face:build`.

**Optional:**

- `docs/reports/` (gitignored): screenshots, videos, Lighthouse reports, face previews and reference captures. Phase 5 is in `docs/reports/phase-5/`, with `desktop/`, `mobile/`, `phase-5-journey.webm` and `lighthouse.json`.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browser for tests and the CV PDF: `npx playwright install chromium`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
