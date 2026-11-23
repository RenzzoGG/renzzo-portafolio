# Session handoff

Last updated: 2026-11-22. Rewritten at the end of every phase or work session, and whenever Renzzo says "handoff". Rules are in `CLAUDE.md` under "Session handoff".

## Current state

| Item           | Status                                                                                 |
| -------------- | -------------------------------------------------------------------------------------- |
| Current phase  | **Phase 4: Desktop hero. Done**, with two manual checks pending                        |
| Next phase     | **Phase 5: The signal tunnel and Featured Work. Not started**, waiting for Renzzo      |
| Blocked        | Nothing is blocked                                                                     |
| Branch         | `redesign`                                                                             |
| `main`         | Untouched at `93d9b4d`                                                                 |
| Remote         | **Local commits are not pushed.** `origin/redesign` stops at `33a1eec`. Renzzo pushes. |
| Latest results | `npm run check` passes, 36/36 E2E tests pass                                           |
| Lighthouse     | Mobile 100/100/100/100 and desktop 100/100/100/100 (median of 5)                       |
| Bundle sizes   | WebGL 135.2 KB gzip, total desktop JS 139.4 KB gzip, critical JS 5.5 KB minified       |

## Just finished

Phase 4 commits, oldest first:

- `2915a3a` docs(plan): record Phase 4 approvals and pin Three.js
- `b8af0d8` feat(hero): center the LED face in a three-column desktop layout
- `55d8791` feat(world): add worker-rendered WebGL hero with disruption and analog pass
- `838ad76` test(e2e): prove WebGL gating, fallbacks and FPS overlay exclusion
- `2cd976d` fix(world): apply motion review on burst, crossfade, focus and head turn
- `947d362` perf(face): shorten 2D baking tasks to keep mobile at 100
- `89e5da1` docs(world): mark Phase 4 done and document the FPS overlay

Also unpushed, from just before Phase 4:

- `d51af06` docs(reference): add technical analysis of the reference site
- `91b17cf` docs(plan): revise phases 4-6 for the signal world

The commit that adds this handoff is unpushed too. `git log origin/redesign..HEAD --oneline` always shows the exact list.

## Exact next step

1. **Renzzo:** check real performance. Run `npm run dev`, open the printed URL with `/?fps` in Chrome on Windows, then run `npx astro dev stop`. Target: 60 fps.
2. **Renzzo:** test the Tilt button on a real phone, especially iOS.
3. **Renzzo:** push `redesign` when happy.
4. **Then send this prompt:** `Start Phase 5 exactly as defined in docs/PLAN.md.` No more detailed Phase 5 prompt is pending yet.

## Waiting for Renzzo

- **FPS result:** if it's below 60 fps on a real GPU, tune Phase 4 before starting Phase 5.
- **Phone tilt result:** it has only been checked in emulation.
- **`/review-animations`:** optional. Only Renzzo can start this skill. Impeccable's motion reviewer already ran, and its six fixes are applied.
- **Old preview server:** an `astro preview` that Claude didn't start (PID 41613 on this machine) holds port 4321 and isn't responding, so dev uses 4322. Stop it with `npx astro preview stop` if it isn't needed.

## Not in git: copy by hand to another machine

**Required to regenerate the face:**

- `assets-src/face.webp` (80 KB). It's the source photo and must **never** be committed. The site builds without it because `src/assets/face/face.bin` and `poster.webp` are committed. It's only needed for `npm run face:build`.

**Optional:**

- `docs/reports/` (74 MB, gitignored): screenshots, the Phase 4 video, Lighthouse reports, face previews and reference captures.
- `.claude/settings.local.json`: machine-specific Claude Code settings. Never commit it.

**Reinstall instead of copying:**

- Dependencies: Node 24 (`.nvmrc`), then `npm ci`.
- Browser for tests and the CV PDF: `npx playwright install chromium`.
- Face pipeline only: uv 0.13.7. Its first `npm run face:build` downloads Python, packages and models (about 420 MB) into `~/.cache/renzzo-face/`.
