# CLAUDE.md

Working rules for this repository.

## Project

- Personal portfolio and CV of Renzzo Gracia Gomez, presented as a **Full Stack Developer**. English content.
- Live at **renzzogg.com** on Railway (Cloudflare in front), deployed from `main`. **Every push to `main` goes live.**
- We're rebuilding the site ("Signal" redesign). See `docs/PLAN.md` for phases, budgets and dependencies, `docs/CONTENT.md` for all copy and project data, and `docs/INVENTORY.md` for what the old site had.

## Branches and git

- All redesign work happens on **`redesign`**. **`main` must stay untouched** until the launch phase (Phase 8). Don't create other branches unless asked.
- Make **local commits only**, with clear messages in **English** (e.g. `feat(hero): …`, `chore: …`, `docs: …`).
- **Never `git push`** or run anything that uploads to a remote. Renzzo pushes.

## Safety

- **Never read `.env`, `.env.*` or any secrets/credentials file.**
- **Never use `rm` with globs.** Delete files by explicit path (prefer `git rm <path>` / `git mv`).
- `assets-src/` holds the source photo and depth maps. It's gitignored and **never committed**. Only derived point data ships.
- Don't install skills, MCP servers, hooks or global tools without explicit approval (see `docs/SKILLS-REVIEW.md`).
- Sibling project repos in `~/proyectos/` are **read-only** references. Never modify them.

## Stack

- Astro (static output) + TypeScript (strict). Three.js (desktop only, lazy-loaded after first paint) and GSAP (deferred chunk), each added in its own phase.
- Fonts: Geist + Geist Mono, self-hosted. No CDN scripts and no third-party font requests.
- **New dependencies must be justified in `docs/PLAN.md` (Dependencies table) before they're added**, with exact pinned versions.
- Scripts: `npm run dev`, `build`, `preview`, `lint`, `format`, `format:check`, `typecheck`, and `check` (all of them).
- `legacy/` holds the old site for reference only (not built, not linted). It gets deleted in Phase 2.

## Identity ("Signal")

| Token   | Value     |
| ------- | --------- |
| bg      | `#0B0A0C` |
| surface | `#151317` |
| text    | `#F2EEEA` |
| muted   | `#8A8389` |
| signal  | `#C21D3A` |
| glow    | `#FF3B5C` |

## Budgets and accessibility (non-negotiable)

- Critical JS ≤ 20 KB min. LED face data ≤ 60 KB. The Three.js chunk loads only on desktop after first paint.
- The LCP element is text. Lighthouse mobile target is 100.
- `prefers-reduced-motion` is respected, and the on-page **Motion** toggle turns all motion off.
- Everything is usable without 3D and without JS.

## Content rules

- `docs/CONTENT.md` is the source of truth for copy. Reuse it, don't rewrite it. Change wording there first.
- Keep the official degree name: **Information Systems and Digital Networks Engineering** (Ingeniería en Sistemas de la Información y Redes Digitales).
- **Skills only lists technologies used in a published project.** When one is added, update it on the page and in the CV.
- Project links must match in the page and the CV. External links use `target="_blank" rel="noopener noreferrer"`.

| Project                                 | Live                                       | Source                                                |
| --------------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Clearline Dental (featured)             | https://clearline.renzzogg.com             | https://github.com/RenzzoGG/clearline-dental          |
| Pulse Theory (featured)                 | https://pulse.renzzogg.com                 | https://github.com/RenzzoGG/fitness-coach-landing     |
| Fernwick Platform (featured)            | https://fernwick-admin.renzzogg.com        | https://github.com/RenzzoGG/fernwick-platform         |
| Stocktill (featured)                    | https://stocktill.renzzogg.com             | https://github.com/RenzzoGG/retail-pos-saas           |
| Fernwick Home Cleaning (more work)      | https://fernwick.renzzogg.com              | https://github.com/RenzzoGG/fernwick-home-cleaning    |
| UIFlow Landing Page (more work)         | https://uiflow.renzzogg.com                | https://github.com/RenzzoGG/uiflow                    |
| UIFlow Admin Dashboard (more work)      | https://uiflow.renzzogg.com/dashboard.html | https://github.com/RenzzoGG/uiflow                    |
| Inventory & Sales Dashboard (more work) | https://inventory.renzzogg.com             | https://github.com/RenzzoGG/inventory-sales-dashboard |

- When the CV PDF changes, bump the `?v=` on its download link so browsers and Cloudflare fetch the new file. The same applies to any non-hashed static asset referenced by a fixed URL.

## How to work

- Renzzo is an Information Systems and Digital Networks Engineering student and wants to learn: **explain important decisions before implementing them** (the options, your recommendation, and why).
- **Verify every phase yourself before reporting:** `npm run check` (lint, format, typecheck, build), plus visual checks (Playwright screenshots at desktop and mobile widths) once there's UI, plus the phase's acceptance checks in `docs/PLAN.md`. Renzzo only reviews the summary and pushes.
- Local preview: `npm run dev` (or `npm run build && npm run preview`).

## Report at the end of every task

1. What you did.
2. Files created / modified / deleted.
3. Commits made (hash and message).
4. Problems or open questions.
5. Suggested next steps.
