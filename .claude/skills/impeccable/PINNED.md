# Impeccable: pinned, Markdown-only copy

- Source: https://github.com/pbakaus/impeccable at commit `b49177d32788f2dc585c42831d845dacf1ebed2c` (skill v4.10.0).
- Copied: `.claude/skills/impeccable/SKILL.md` and `reference/` unchanged, plus `.claude/agents/impeccable-finish-reviewer.md` and `impeccable-motion-reviewer.md`.
- **Excluded on purpose:** `scripts/` (launcher, engine binary download, live-browser JS), hooks, the other subagents, and the `npx impeccable` installer.
- So every `scripts/impeccable <verb>` command in SKILL.md and `reference/` is **unavailable**: context, detect, shot, live, generate, generate-image, font-fetch, concept-seed, comp-*, and the rest. Follow SKILL.md's "Launcher unavailable" path and read project docs directly. If a sub-command truly needs the engine or network, skip it and tell Renzzo.
- Telemetry: impossible without the engine; `DO_NOT_TRACK=1` is also set in `.claude/settings.json`.
- Don't create `PRODUCT.md`, `DESIGN.md` or `.impeccable/` without Renzzo's approval.
