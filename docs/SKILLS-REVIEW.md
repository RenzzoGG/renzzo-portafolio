# Design skills review (Phase 0)

Nothing is installed. This is a read-only review of two skill sources, waiting on Renzzo's approval.

Both repos were shallow-cloned into a throwaway scratch folder, read, and never executed.

---

## 1. Impeccable (`pbakaus/impeccable`)

- **Commit reviewed:** `b49177d` (2026-11-18). Skill/plugin **v4.10.0**, engine **v0.1.27**. Apache-2.0.
- **Size:** 4,943 files, 113 MB.
  - Most of it is the same skill generated once per AI tool (`.claude/`, `.cursor/`, `.gemini/` … 22 copies, ~63 files each).
  - The rest is the Rust engine source (`crates/`, 618 files), tests (2,590 files), a VS Code extension, a browser bundle and the website.
- **What I read:**
  - All of the Claude Code payload: `plugin/` (the marketplace plugin) and `.claude/skills/impeccable/`, meaning `SKILL.md`, the 5 subagents, `hooks.json`, the launcher script, `VERSION`, the checksums and the scripts listing. I also grepped all 47 reference docs for commands and network use.
  - The engine source in `crates/`, scanned for network endpoints, API keys, spawned processes and files it writes. 618 Rust files can't be read line by line in a review like this, so the engine verdict is based on targeted greps, not a full audit.

### What it does

It's one skill, `/impeccable`, with 24 sub-commands: `shape`, `init`, `document`, `extract`, `critique`, `audit`, `polish`, `bolder`, `quieter`, `distill`, `harden`, `onboard`, `animate`, `colorize`, `typeset`, `layout`, `delight`, `overdrive`, `clarify`, `adapt`, `optimize`, `live`, `generate`, plus `hooks`, `doctor`, `foundations` and `pin`.

Each sub-command loads a long Markdown playbook. Together they're about 20k lines of design guidance: modes (Persuade/Operate/Read/**Experience**, where Experience covers portfolios), a "craft floor" of bans, anti-"AI slop" rules, and critique rubrics. It also ships 5 subagents: asset-producer, documenter, finish-reviewer (read-only), manual-edit-applier, and motion-reviewer (read-only).

A compiled **engine binary** does the work the prompts can't:

- `detect`: an anti-pattern linter for HTML/CSS/JSX and rendered URLs.
- `shot`: headless screenshots through your installed Chrome/Edge.
- `context`: loads PRODUCT.md / DESIGN.md.
- `live` / `generate`: a local server plus a browser overlay to pick elements and generate variants.
- `font-fetch`: downloads Google Fonts.
- `generate-image`: OpenAI images.
- `comp-*` / `build-phase`: a comp-driven build pipeline.

### Commands / scripts it would run

| When                                             | What runs                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install (one of these)                           | `npx impeccable install` (unpinned npm package; detects tools, writes skill and hooks), **or** `/plugin marketplace add pbakaus/impeccable` then `/plugin install`, **or** a manual copy of `.claude/skills/impeccable/` (no hooks or subagents).                                                                    |
| **Every session start** (if hooks are installed) | `sh <skill>/scripts/impeccable hook`, timeout 5 s                                                                                                                                                                                                                                                                    |
| **After every Edit/Write** (hook)                | same command, timeout 5 s. Scans the edited UI file and feeds findings back to the agent.                                                                                                                                                                                                                            |
| **On every Stop** (hook)                         | same command, timeout 30 s ("deep pass").                                                                                                                                                                                                                                                                            |
| When the skill is used                           | `<skill>/scripts/impeccable context`, then whichever verbs the playbook calls: most often `detect`, `comp-spec`, `live-poll`, `hooks`, `component-review`, `shot`, `live-server`, `font-fetch`, `generate-image`, `concept-seed`.                                                                                    |
| Launcher (`scripts/impeccable`, POSIX sh)        | Looks for an engine binary next to it, in `~/.impeccable/bin/`, or on PATH. **If none is found, it downloads one** from `github.com/pbakaus/impeccable/releases/download/engine-v0.1.27/impeccable-linux-x64` with `curl`/`wget`, verifies its SHA-256 against `engine-checksums.txt`, then `chmod +x` and execs it. |
| Engine subprocesses (from source)                | `git` (many), `sh`, `xdg-open`/`open` (opens a browser), `pgrep`, `ps`, `mkfifo`, `fc-list`, `ssh` (1 site), and **`claude` / `codex`** (live-mode Apply, below).                                                                                                                                                    |

### Network access

- **GitHub Releases:** a one-time engine binary download (checksum-verified, so it fails closed).
- **`api.impeccable.style`:** `concept-seed` fetches "visual directions" from their catalog when a new design starts. **That happens even with telemetry off.** Telemetry, which is **on by default**, records which directions were shown and which one was picked. They say project name, files, code and PRODUCT.md are never sent. Turn it off with `npx impeccable telemetry off`, `DO_NOT_TRACK=1`, or `"telemetry": false` in `.impeccable/config.json`.
- **`impeccable.style/worlds/cards`:** card images for those directions.
- **`fonts.googleapis.com`:** `font-fetch`.
- **`api.openai.com`:** `generate-image`, only if `OPENAI_API_KEY` is set in the environment. Otherwise it tells the agent to use another tool.
- **Pages you scan:** `detect <url>` drives your local Chrome. The docs say remote images are never fetched for file scans.

### Risks

1. **Hooks run outside the model's permission checks.** The README says so itself: _"installed command hooks run even when you deny the model's own commands, so the first edit can download the engine."_ With the hook installed, a binary download and execution can happen without a prompt.
2. **Live-mode "Apply" can spawn an unrestricted agent.** If no chat session has polled in the last minute, it runs `codex --dangerously-bypass-approvals-and-sandbox` or `claude --permission-mode bypassPermissions`, inheriting your environment. That's the riskiest feature. Avoid it, or set `IMPECCABLE_LIVE_COPY_AGENT=chat` or `off`.
3. **It runs a prebuilt binary.** It's checksum-pinned to the release, but we're trusting the author's release pipeline. The source is public, but we don't build it ourselves.
4. **Telemetry is on by default**, and the catalog call can't be disabled.
5. **It writes into the repo:** `PRODUCT.md`, `DESIGN.md`, and a `.impeccable/` folder (config, hook cache, build state, comps, screenshots). It can also pin extra `/<command>` shortcuts. All of that needs `.gitignore` entries and review.
6. **Install path:** `npx impeccable install` is unpinned npm code that also edits harness config, and it offers a **global** install.
7. **Opinion clashes:** the detector has rules like `overused-font`. Geist, a dark bg and crimson glow could get flagged. The skill states "the brief wins", but expect some noise, and expect to waive rules for the Signal identity.

### What would help this project

- **Yes:** `critique`, `audit` (a11y/perf/responsive), `polish`, `typeset`, `layout`, `harden`, `optimize`, `adapt` (mobile), `animate`/`quieter` as a second opinion on motion, the "Experience" mode guidance for portfolios, the finish-reviewer and motion-reviewer subagents, and `detect` as a design lint in Phase 7.
- **Probably not:** `live`/`generate` (browser overlay and auto-Apply risk), `generate-image`, `onboard`, the native iOS/Android parts, and `foundations` (overlaps our own PLAN).
- **`init`/`document`** would create PRODUCT.md/DESIGN.md. That's useful in Phase 1 if we want them, and they'd complement docs/CONTENT.md.

**Recommended install (if approved):**

1. Copy only `.claude/skills/impeccable/` from a pinned commit into the project's `.claude/skills/`.
2. Pre-place the engine binary yourself. Download it once, verify the SHA-256 from `engine-checksums.txt`, and keep it in `~/.impeccable/bin/0.1.27/`.
3. Set `"telemetry": false` in `.impeccable/config.json`.
4. **Don't install the hooks** at first. Add them later, deliberately, if the detector proves useful.
5. Never use live Apply.

---

## 2. Emil Kowalski's skills (`emilkowalski/skills`)

- **Official source:** https://github.com/emilkowalski/skills. It's owned by `emilkowalski`, has about 58.8k stars, is MIT-licensed, and its homepage is aiforui.dev/skills. It's linked from his site emilkowal.ski ("Agents with Taste"). Aggregators (skillsmp, tessl, mcpservers) mirror it, but they aren't the source.
- **Commit reviewed:** `64eb3de` (2026-11-15).
- **Size:** 34 files, 436 KB, **all Markdown** apart from `.gitattributes`, `.gitignore`, `LICENSE` and an empty `.pl` file.
- **What I read:** the README, every frontmatter block and the section structure of each skill. I fully scanned every file for shell commands, URLs, tool permissions, hooks, scripts and prompt-injection phrasing.

### What it does

There are 19 instruction-only skills. Nothing executes by itself, and there are no scripts, hooks or `allowed-tools` grants.

| Skill                                 | Purpose                                                                                                                                                                                          | Auto-invocable?       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| emil-design-eng                       | Core design-engineering philosophy: animation decision framework (should it animate → purpose → easing → duration), springs, button/popover/tooltip details, clip-path, blur masking (684 lines) | yes                   |
| animate                               | Builds one animation in a fixed decision order; covers reduced motion and pointer gating                                                                                                         | yes                   |
| choreograph                           | Coordinates groups: stagger, sequence, hero entrance, exits                                                                                                                                      | yes                   |
| animation-performance                 | Frame budget, composite-only properties, `will-change`, CSS vs JS under load                                                                                                                     | yes                   |
| review-animations                     | Strict review against "ten non-negotiable standards"                                                                                                                                             | manual only           |
| improve-animations                    | Codebase-wide motion audit plus plans (read-only)                                                                                                                                                | yes                   |
| find-animation-opportunities          | Where motion should go and where it shouldn't (read-only)                                                                                                                                        | yes                   |
| remove-animations                     | Subtracts unnecessary motion (edits only by removing)                                                                                                                                            | yes                   |
| apple-design                          | Apple fluid-motion/material/typography principles for the web                                                                                                                                    | yes                   |
| mobile-native                         | Mobile web polish: 100vh, tap highlight, safe areas, hover on touch                                                                                                                              | yes                   |
| break-ui                              | Stress-tests UI with worst-case data                                                                                                                                                             | yes                   |
| prototype                             | Builds several variants behind a picker                                                                                                                                                          | manual only           |
| learn-taste                           | Turns session corrections into rules in DESIGN.md                                                                                                                                                | manual only           |
| pick-ui-library                       | Curated library list (React-centric)                                                                                                                                                             | manual only           |
| animation-vocabulary                  | Glossary of motion terms                                                                                                                                                                         | yes                   |
| ask-emil                              | Router over the skills                                                                                                                                                                           | manual only           |
| gestures                              | Drag/swipe/sheets                                                                                                                                                                                | yes                   |
| animate-expo, write-swift, ask-sonner | React Native/Expo, Swift, Sonner toasts                                                                                                                                                          | yes (irrelevant here) |

### Commands / scripts it would run

- **Install:** `npx skills@latest add emilkowalski/skills` runs the third-party `skills` CLI from npm, unpinned (`@latest`).
- **Inside the skills:** the only shell commands are `npx expo install …` in `animate-expo/RECIPES.md`, which is irrelevant to us. Otherwise the skills tell the agent to read and edit code with its normal tools.
- **`learn-taste`** reads the current conversation and can read past Claude Code transcripts (`~/.claude/projects/<project>/*.jsonl`) _if you name earlier sessions_. It writes `DESIGN.md` and proposes a pointer line in CLAUDE.md, only after approval ("propose-then-stop").

### Network access

None performed by the skills. There are only links: aiforui.dev, emilkowal.ski, easing.dev, motion.dev, library docs. The only network step is the `npx skills` installer.

### Risks

- **Low.** It's plain text, with no hooks, binaries or permission grants. Several skills explicitly tell the agent to treat repo content as data, not instructions.
- **Install path:** `npx skills@latest` is unpinned npm code. Copying the chosen folders from the pinned commit avoids it.
- **Auto-invocation noise:** 14 skills auto-trigger from their descriptions. Installing all 19 adds context on every UI task and may pull in Expo, Swift or Sonner advice. Install a subset.
- **Stack mismatch:** many examples assume React + Motion (`AnimatePresence`, `useAnimate`). We use Astro + GSAP + CSS, so the principles transfer but the code samples need translating.

### What would help this project

- **Yes:** `emil-design-eng`, `animate`, `choreograph` (hero entrance, section transitions, glitch timing), `animation-performance` (Three.js/GSAP frame budget, which matters for the Lighthouse 100 target), `review-animations`, `remove-animations` (keeps the motion budget honest), `mobile-native` (the mobile build), and `apple-design` for spring/tilt feel.
- **Maybe:** `find-animation-opportunities`, `break-ui` (long project names, small screens), `learn-taste`.
- **No:** `animate-expo`, `write-swift`, `ask-sonner`, `gestures`, `pick-ui-library`, `prototype`, `ask-emil`.

**Recommended install (if approved):** copy the 8 "yes" folders from commit `64eb3de` into `.claude/skills/`, project scope, committed so they're versioned with the repo.

---

## How they fit together

Impeccable would be the primary design skill, covering direction, critique, audit, polish and the design lint. Emil's skills go deeper on motion specifically. They overlap on `animate`.

Suggested rule for CLAUDE.md: use Impeccable for visual design and critique, and Emil's `animate`/`choreograph`/`animation-performance` for motion implementation. Both respect `prefers-reduced-motion`, which matches our requirements.

## Playwright MCP (proposal, not run)

```bash
claude mcp add --scope project playwright -- npx -y @playwright/mcp@0.0.86
```

- `0.0.86` is the current `@playwright/mcp` version on npm (checked 2026-11-22), pinned exactly.
- `--scope project` writes `.mcp.json` at the repo root, which gets committed so the setup is reproducible.
- On first use, npx downloads the package. It may also need a Chromium build matching its bundled Playwright, which can differ from the cached `chromium-1255`.
