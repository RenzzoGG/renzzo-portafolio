# Redesign plan: "Signal"

The portfolio for Renzzo Gracia Gomez, Full-Stack Developer, rebuilt in Astro + TypeScript, with Three.js on desktop only and GSAP for motion. English content.

All work happens on the `redesign` branch. `main` stays live and untouched until Phase 8.

## Identity

| Token            | Value                           |
| ---------------- | ------------------------------- |
| bg               | `#0B0A0C`                       |
| surface          | `#151317`                       |
| text             | `#F2EEEA`                       |
| muted            | `#8A8389`                       |
| signal (crimson) | `#C21D3A`                       |
| glow             | `#FF3B5C`                       |
| Fonts            | Geist + Geist Mono, self-hosted |

Project brand colors (for the section color shifts) are listed in `docs/CONTENT.md`.

## Global budgets and rules

- **Critical JS ≤ 20 KB min** (everything that loads before first paint).
- **Mobile deferred motion JS ≤ 50 KB gzip** (approved 2026-11-22, for GSAP). It loads after idle, and Lighthouse mobile 100 remains the deciding gate.
- **LED face data ≤ 60 KB** (transferred, per device class).
- **WebGL JS ≤ 250 KB gzip** (Three.js, worker, shaders and any texture transcoder): desktop only, requested after first paint (idle / `requestIdleCallback`), never on mobile, never with reduced motion or Motion off.
- **Project textures ≤ 800 KB total** (AVIF/KTX2), desktop only, streamed per section as they approach.
- **No blocking loader.** Text is visible immediately.
- **LCP element is text** (the hero heading), never the canvas or an image.
- **Lighthouse:** mobile stays at 100 in all four categories. Desktop Performance in the 90s is acceptable, with Accessibility, Best Practices and SEO at 100.
- **Progressive enhancement:** every section is complete and usable without JS and without 3D.
- `prefers-reduced-motion` is respected, and there's an on-page **Motion** toggle (persisted per visitor). Turning it off reverts or stops every animation and shuts down the WebGL world, falling back to the static site (WCAG 2.2.2).
- The source photo lives in `assets-src/` (gitignored) and is **never committed**. Only derived LED data ships (a dot portrait that is still recognizable by design).

---

## Phase 0: Setup & review ✅ (this phase)

**Goals:** a safe branch, an inventory of the old site, content extraction, a scaffold, and the rules.

**Deliverables**

- `redesign` branch. Old site moved to `legacy/`.
- `docs/INVENTORY.md`, `docs/CONTENT.md`, `docs/PLAN.md`, `docs/SKILLS-REVIEW.md`, new `CLAUDE.md`.
- Astro + TS (strict) scaffold with `lint`, `format`, `format:check`, `typecheck`, `build`, `check`.
- `.gitignore` covers `assets-src/`, `dist/`, `.astro/`.
- A proposed Playwright MCP command (not run).

**Acceptance checks**

- `npm run check` passes (lint, format, typecheck, build).
- `git check-ignore assets-src/x` matches.
- `main` is unchanged at `93d9b4d`. Nothing pushed.

**Follow-ups done (approved 2026-11-22):** pinned skills installed (Emil ×8, Impeccable Markdown-only + 2 agents), deny rules added, Playwright MCP added at project scope, Stocktill data filled into CONTENT.md.

## Phase 1: Design system & content ✅ (copy choice pending in `docs/COPY-REVIEW.md`)

**Goals:** turn Signal into tokens and type, and lock the content model.

**Deliverables**

- `src/styles/tokens.css`: colors, spacing, radii, z-layers, motion durations and easings as CSS custom properties, plus project brand tokens.
- Geist + Geist Mono self-hosted via `@fontsource-variable/*`. Latin subset, `font-display: swap`, preload only the hero weight.
- A typed content layer: `src/content/` (Astro content collections with a Zod schema, or typed TS modules) filled from `docs/CONTENT.md`. Projects, skills, services, education, certifications, contact.
- Decisions already made (2026-11-22), to implement here:
  - **Teal clash:** Clearline keeps its teal. Fernwick gets a distinct accent from its own palette (sky or sun), checked for contrast on `#0B0A0C`.
  - **Certifications:** the full list goes inside the CV section, plus a compact list in Skills/Experience.
  - **Skills:** Django, DRF, Vite, Tailwind CSS v4, Motion and GSAP are added (see CONTENT.md). The about text and CV summary get updated to mention Clearline.
- Optional, if the Impeccable install is approved: `PRODUCT.md` / `DESIGN.md`.

**Acceptance checks**

- Contrast of every text/background pair is ≥ 4.5:1 (body text) or ≥ 3:1 (large text and UI). Verified with a script or Playwright.
- The content schema typechecks. No copy is hardcoded in components.
- The font payload for the first view is ≤ ~40 KB woff2.

## Phase 2: Base site without 3D ✅

**Goals:** the full, accessible, fast site with zero 3D. This is the baseline every later phase must not regress.

**Deliverables**

- Sections: hero/about (static face placeholder: poster image or CSS dots), featured work (4 projects as flat cards), "More work" list, skills/experience, services, CV (on-page HTML plus a PDF download), contact (links only), footer.
- The Motion toggle UI and a reduced-motion baseline (no motion yet, just wiring).
- CV PDF generated by a script using Playwright `page.pdf()` (Letter, one page) from the on-page CV route, replacing the manual Chrome print. `cv/` and `og/` get ported or retired. This is when the updated Skills list and Clearline reach the PDF (bump `?v=`).
- OG image regenerated in Signal style.
- Playwright smoke and visual tests (desktop 1440, mobile 390, 320 no-overflow, keyboard walk, JS-disabled render).
- `legacy/` deleted. README rewritten.

**Acceptance checks**

- `npm run check` plus `npm run test:e2e` pass.
- Lighthouse mobile shows 100/100/100/100 locally. LCP is text.
- Critical JS ≤ 20 KB min.
- Every link from `docs/CONTENT.md` is present. External links use `target="_blank" rel="noopener noreferrer"`.

## Phase 3: Face pipeline ✅ (E2 halftone approved 2026-11-22)

**Goals:** an offline pipeline from photo to compact LED point data, plus the 2D canvas renderer (mobile and fallback).

**Deliverables**

- A local, offline script in `scripts/face/` that:
  1. removes the background from `assets-src/` (portrait matting),
  2. estimates a depth map,
  3. samples a dot grid (luminance → dot size/brightness, depth → z),
  4. quantizes and packs to binary (e.g. `Uint8` / `Uint16` arrays) in `src/assets/face/`.
- Tool choice (e.g. a Python script with rembg + Depth Anything vs a Node/ONNX approach) is decided and explained at the start of the phase. It's a dev-only tool, never shipped.
- A 2D canvas renderer (`<canvas>`, DPR-aware, `IntersectionObserver`-paused) with a static fallback poster when there's no JS.
- Mouse/pointer tilt via a CSS/2D approximation on desktop when 3D isn't loaded.

**Acceptance checks**

- Face data ≤ 60 KB transferred. Only derived data is committed (the source photo is never in git; verified with `git log --all -- assets-src` empty).
- The 2D renderer holds 60 fps on a mid-range phone profile (CPU 4× throttle) and pauses offscreen.
- Lighthouse mobile is still 100. Critical JS ≤ 20 KB.

## Creative direction for Phases 4–6: "The Signal"

fojcikdominik.com is inspiration for **techniques only**. We never copy its design, code, shaders, assets or copy. See `docs/REFERENCE-ANALYSIS.md`.

**World concept, entirely ours:** everything is made of the LED dots of Renzzo's face, the "signal". Scrolling is one continuous trip through one 3D space:

1. **Hero:** the signal holds the shape of the face.
2. **Tunnel:** the camera pulls back, and the dots detach and flow into a tunnel of crimson LEDs.
3. **Featured Work:** the tunnel leads to a vertical drum of 4 curved CRT screens.
4. **About:** the tunnel becomes a code/signal journey.
5. **Contact:** the dots gather into a full crimson pixel curtain.

**The site must never feel static.** On desktop something is always moving. Mobile is lighter but alive, and never uses the WebGL world.

### Architecture decisions (approved 2026-11-22)

| Area          | Decision                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering     | One persistent, fixed, `aria-hidden` WebGL canvas, rendered in a module Web Worker through OffscreenCanvas. If that's unsupported, the same renderer runs on the main thread. If WebGL fails or the context is lost, the static site stays. |
| Analog look   | **Medium** strength on the 3D scene: scanlines, grain, vignette, barrel distortion, chromatic aberration and occasional horizontal signal cuts. One combined pass with a single `intensity` setting. **Never applied to HTML text.**        |
| Scroll        | Native scroll. The camera follows scroll progress with damped interpolation and never hijacks scrolling. No smooth-scroll library unless testing proves we need it.                                                                         |
| Text          | Real HTML above the canvas, visible at first paint. It stays the LCP. No blocking loader.                                                                                                                                                   |
| Data          | Every dot derives from `src/assets/face/face.bin`, reusing `src/lib/face/decode.ts` and `load.ts`.                                                                                                                                          |
| Dev tooling   | A dev-only FPS overlay (`npm run dev`, then `/?fps`), excluded from production builds and checked by E2E.                                                                                                                                   |
| Adaptive load | The renderer lowers internal resolution, then effects, when frame time stays high. It pauses in a hidden tab.                                                                                                                               |

## Phase 4: Desktop hero ✅ (real-GPU FPS check pending with Renzzo)

**Goals:** the persistent WebGL foundation and a hero where the LED face is the centerpiece.

**Deliverables**

- **Renderer foundation:** a small gate (fine pointer, desktop width, no reduced motion, Motion on, WebGL 2), loaded after first paint. A renderer shared by the worker and main-thread paths, with a typed message protocol for pointer, scroll, resize, visibility and motion state.
- **Layout (desktop):** a large, centered LED face, with name and role on one side and the headline and CTAs on the other. Mobile keeps the stacked layout. The heading stays the `h1` and the LCP.
- **LED face:** instanced dots from E2 with depth, in the Signal palette.
- **Hover "disruption":**
  - Dots near the cursor are pushed outward in depth and radially, and stretched into streaks with a chromatic split (crimson, glow pink, white).
  - They spring back with damped easing. A small, decaying displacement field on the GPU drives this, so there's no per-dot CPU loop.
  - Just outside the radius, dots sharpen to the focused state already in the data.
- **Head motion:** a subtle turn toward the cursor, idle drift, and a short glitch assemble on first load.
- **Backdrop:** a curved CRT-style grid wall behind the face, with analog post-processing at medium strength.
- **Mobile:** the 2D face tilts with the gyroscope. Permission is requested only from a visible control tapped by the visitor (required on iOS). If it's denied or unavailable, the face simply stays alive with its CSS motion.
- **Fallbacks:** reduced motion or Motion off destroys the WebGL world and returns to the static site, live.

**Acceptance checks**

- The mobile network log contains **no** Three.js or WebGL worker request.
- The desktop WebGL request starts after FCP. LCP is the `h1`, and CLS stays below 0.05.
- The main thread stays responsive while the worker renders, and the main-thread fallback is tested.
- Toggling Motion off stops rendering and frees the worker. Toggling it on restores the scene.
- The HTML text never receives the analog effect and keeps AA contrast over the moving scene.
- **Frame rate is checked by Renzzo on a real GPU** with a dev-only overlay, because this development environment has no hardware GPU. Target: 60 fps.

## Phase 5: The signal tunnel and Featured Work ✅ (real-GPU feel check pending with Renzzo)

**Goals:** the face-to-tunnel transition and the project drum.

**Deliverables**

- **Face to tunnel:** scrolling from the hero pulls the camera back while the face's dots detach, flow as a traveling signal and form a tunnel of crimson LEDs leading to the drum.
- **Project drum:** a vertical drum of 4 curved CRT screens with a VHS look. The active screen is centered, and the previous and next ones peek in above and below, tilted. Scroll velocity drives the distortion.
- **Synced left index:** "SELECTED WORK" with [01]–[04] in uppercase mono and a crimson active dot. Items are real links that scroll to their project. The label goes into `docs/CONTENT.md` first.
- **Accessible content:** each project keeps its real DOM heading, text, links and image alternative. The drum is decorative.
- **Textures:** project textures stream per section as they approach. AVIF comes first, decoded off the main thread. KTX2 is used only if GPU memory requires it and its transcoder fits the WebGL JS budget.
- **Bone-white shift:** the section background shifts to `#F2EEEA` and back. On bone, text uses `#0B0A0C` (17.12:1) and signal `#C21D3A` (5.15:1). Muted text uses a new approved token, `#5F585E` (5.98:1), because the current muted fails (3.20:1). Glow (`#FF3B5C`, 3.02:1) is not used for text on bone.
- **Mobile:** the index plus stacked cards with a light CSS VHS overlay, and CSS motion. No WebGL.

**Decisions (approved 2026-11-22)**

- **Section order:** Hero → Featured Work → About, so the tunnel leads straight to the drum.
- **No GSAP in this phase.** Scroll maps to one number on desktop and mobile only needs CSS. GSAP moves to Phase 6, where timelines are needed. No new dependencies here.
- **Text contrast never depends on the canvas.** The text column and index have their own solid bone background, and the color shift happens in the text-free part of the tunnel.
- **Headings on bone use ink.** All four project accent text colors fail AA on bone, so accents stay on non-text marks and the CRT frames.
- **Scroll space is reserved by CSS** with a media query, before first paint, and collapses if WebGL fails.

**Acceptance checks**

- Every project is reachable and readable with JS off, with 3D off and by keyboard.
- Project textures total ≤ 800 KB and load only as their section approaches.
- WebGL JS stays ≤ 250 KB gzip.
- The index stays in sync in both scroll directions. Native scrolling, keyboard scrolling and anchors keep working.
- `npm run check:contrast` covers the bone-white pairs.
- Lighthouse mobile is still 100.

## Phase 6: World and polish ✅ (real-GPU feel check pending with Renzzo)

**Goals:** complete the journey and the interface details.

**Deliverables**

- **About:** the tunnel becomes a code/signal journey.
- **Contact:** the dots gather into a full crimson pixel curtain.
- **Project detail view:** a horizontal-slice glitch and a "01 / 04" counter. Each project has a real static route for no-JS and SEO. With WebGL active, it opens in place so the canvas persists. Back and Escape return to the same project. It uses only approved content.
- **HUD details:** "+" crosshairs, mono labels and counters, all decorative or backed by real text.
- **Menu:** a fullscreen numbered menu on a native `<dialog>`, which closes with Escape, traps focus and returns focus to its button. The plain nav remains without JS.
- **Section color shifts** through CSS custom properties, so the non-WebGL path shifts too.
- Motion reviewed with Impeccable and Emil's review-animations and animation-performance skills.
- A complete Motion-off and reduced-motion path that reverts every tween.
- **Text and UI motion (added 2026-11-22):** decode on mono labels, line reveals on section headings, a desktop hover glitch on headings, magnetic buttons, animated link underlines, count-up numbers, and a transition on the project text panel.

**Decisions (approved 2026-11-22)**

- **ScrollTrigger is desktop only.** GSAP core, ScrollTrigger and SplitText measure 49.0 KB gzip together, before our code. Mobile loads core, SplitText and our code, and triggers reveals with IntersectionObserver, which keeps it inside the 50 KB budget.
- **Animated text never rewrites the real text.** Decode and count-up play in an `aria-hidden` overlay. SplitText uses `aria: "auto"` and is reverted after each reveal.
- **Nothing is hidden before JS arrives.** The `h1` never animates, and GSAP only arms elements still below the viewport.
- **Cheapest tool per effect.** GSAP for reveals and timelines, CSS for the glitch, underlines and panel transition, and the CSS `translate` property for the magnetic pull.
- **The Contact curtain is AA by construction.** Its dots never exceed signal crimson, so bone text keeps at least 5.15:1.
- **Project detail** is a static `/work/<id>/` route, opened in a native `<dialog>` with `pushState` when JS is available.
- **Menu** is a native `<dialog>`. Mobile swaps its nav for the Menu button before first paint with `@media (scripting: enabled)`. Desktop keeps the inline nav.

**Acceptance checks**

- GSAP isn't in the critical bundle and never loads with reduced motion or Motion off.
- A Playwright check confirms Motion off leaves no running animations and no WebGL rendering.
- Menu and project detail pass a keyboard walkthrough.
- Budgets hold: Lighthouse mobile 100/100/100/100. Desktop Performance in the 90s, with Accessibility, Best Practices and SEO at 100.

## Phase 6.5: Signal set pieces ✅ (real-GPU feel check pending with Renzzo)

**Goals:** give every lower section its own set piece in the signal/VHS/LED identity, with all content still real, accessible HTML.

**Deliverables**

- **Project panel:** display title that tunes in, 7-segment LED readouts that count up, a stack tag wave, and a button glitch.
- **More work:** a VHS tape shelf with printed labels and a CRT preview on hover or focus. Links are always visible.
- **About:** a terminal that types the bio by word, LED counters and stronger signal streams.
- **Services:** three CRT channels with the old-TV turn-on and animated LED dot-matrix icons.
- **Skills:** an LED matrix board driven by accessible tabs, over plain lists.
- **Education and certifications:** a terminal log revealed line by line.

**Decisions**

- **CSS first, small JS only where state is needed.** Mobile motion was already 31.2 KB of its 50 KB budget. No new dependencies.
- **Real text never moves into decoration.** LED digits, CRT layers, the matrix canvas and terminal chrome are `aria-hidden`.
- **Tabs live outside the motion gate,** so they work with reduced motion and Motion off.
- **742 is attributed to Stocktill** and not labelled "in CI". Prose and the CV keep "700+", so the PDF doesn't change.

**Acceptance checks**

- `npm run check` and all E2E tests pass, with new tests for tabs, shelf keyboard access and reduced-motion states.
- Lighthouse median of 5 on mobile and desktop. Mobile stays at 100, and all budgets are reported.
- Before/after screenshots of every section on desktop and mobile, plus a full-scroll video, in `docs/reports/phase-6-5/`.

## Phase 6.6: One continuous journey

**Goals:** LED readouts that sit lightly on bone, no blank screen at any scroll position, and one continuous trip from the hero to the Contact curtain.

**Deliverables**

- **Readouts on bone:** no black box. Lit segments in signal, unlit segments as a faint ink ghost, a hairline border, and 2–3 displays in a wrapping row. The black style stays on dark backgrounds.
- **Dead zones:** the drum's exit space shrinks from 160vh to about 40vh and the canvas no longer fades out or rests between sections.
- **Continuous world (desktop):** the scene runs behind every section, with moods of bone (Work), dark signal (More work to CV) and crimson (Contact).
- **Boundary transitions:**

| Journey | Boundary          | Transition                                  | Camera     |
| ------- | ----------------- | ------------------------------------------- | ---------- |
| 5–6     | Work → More work  | Bone dissolves into LED static that darkens | Pull back  |
| 6–7     | More work → About | Dive through the wall into the streams      | Dive       |
| 7–8     | About → Services  | Channel change: static and slices           | Side pan   |
| 8–9     | Services → Skills | Signal cut and re-tune: vertical roll       | Tilt       |
| 9–10    | Skills → CV       | CRT power-off to a glowing line, and back   | Pull back  |
| 10–11   | CV → Contact      | Climax: collapse, pulse, curtain rises      | Long dive  |

- **Choreography:** HUD, then heading, body and details, staggered.
- **Seams:** static gradients between section colors for mobile, no JS, reduced motion, Motion off and WebGL failure. Mobile adds a short CSS static burst.

**Decisions**

- **Text contrast never depends on the canvas.** Over the live scene, text blocks sit on ink panels, with AA checked against the worst case of bone behind them.
- **No new dependencies and no extra render pass.** Transitions are uniforms in the existing analog pass.

**Acceptance checks**

- `npm run check` and all E2E tests pass, including a full-page scroll test that fails on any near-uniform viewport on desktop, mobile and reduced motion.
- Lighthouse median of 5 on mobile and desktop. Mobile stays at 100, critical JS ≤ 20 KB, WebGL JS ≤ 250 KB gzip.
- Screenshots at every boundary (mid-transition and settled) and a full-scroll video in `docs/reports/phase-6-6/`.

## Phase 7: Performance & QA

**Goals:** prove the budgets and quality across devices.

**Deliverables**

- Lighthouse CI-style runs (median of 5, mobile and desktop) saved to `docs/reports/` (gitignored).
- A bundle-size check script that fails if critical JS > 20 KB, mobile deferred motion JS > 50 KB gzip, WebGL JS > 250 KB gzip, project textures > 800 KB or face data > 60 KB.
- An accessibility pass: axe via Playwright, keyboard, screen reader spot check, 200% zoom, 320 px width.
- Cross-browser checks: Chromium, Firefox, WebKit (Playwright), plus a real phone check.
- Optional: an Impeccable `detect` / `audit` pass.

**Acceptance checks**

- Lighthouse mobile is 100/100/100/100 (median). Desktop Performance is ≥ 90, with Accessibility, Best Practices and SEO at 100.
- Zero axe violations. All budgets are green.

## Phase 8: Launch

**Goals:** ship to renzzogg.com safely.

**Deliverables**

- Railway configuration for the Astro static build. Railpack detects Node and runs `npm run build`, and we serve `dist/` statically (Railpack static output or Caddy). **Railway Serverless** (sleep when idle) enabled on the service.
- Verification on a **separate** Railway service or preview domain first. Then the cutover.
- Merge `redesign` → `main`. Renzzo pushes.
- Post-launch: refresh the LinkedIn Post Inspector cache, check the Cloudflare cache, confirm the PDF and OG are fresh.
- Upwork portfolio images: 1000×750 (and other required sizes) captured with Playwright from the live site, plus copy taken from `docs/CONTENT.md`.

**Acceptance checks**

- The preview service serves all routes, the PDF, OG and favicon, with correct cache headers and HTTPS.
- Lighthouse on the production URL matches Phase 7.
- Rollback is documented: redeploy the previous `main` commit in Railway.

---

## Dependencies

Every dependency must be justified here before it's added. Versions are pinned exactly.

| Package                                                     | Version        | Phase | Kind                    | Why                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | -------------- | ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| astro                                                       | 7.4.13         | 0     | dev                     | Static site generator. Ships zero JS by default, which suits the 20 KB critical JS budget. Gives components, content collections and per-component lazy scripts.                                                                |
| typescript                                                  | 6.0.3          | 0     | dev                     | Strict typing. Pinned to 6.0.x because 7.0 isn't yet supported by `typescript-eslint` (<6.1) or `@astrojs/check` (^5 \|\| ^6).                                                                                                  |
| @astrojs/check                                              | 0.9.12         | 0     | dev                     | `astro check`: typechecks `.astro` files (the `typecheck` script).                                                                                                                                                              |
| eslint                                                      | 10.15.0        | 0     | dev                     | Linting.                                                                                                                                                                                                                        |
| @eslint/js                                                  | 10.0.1         | 0     | dev                     | ESLint recommended rules.                                                                                                                                                                                                       |
| typescript-eslint                                           | 8.73.0         | 0     | dev                     | TS-aware lint rules (strict preset).                                                                                                                                                                                            |
| eslint-plugin-astro                                         | 3.2.1          | 0     | dev                     | Lints `.astro` files.                                                                                                                                                                                                           |
| eslint-config-prettier                                      | 10.1.8         | 0     | dev                     | Turns off lint rules that conflict with Prettier.                                                                                                                                                                               |
| globals                                                     | 17.14.0        | 0     | dev                     | Browser/Node global definitions for ESLint.                                                                                                                                                                                     |
| prettier                                                    | 3.10.1         | 0     | dev                     | Formatting (`format`, `format:check`).                                                                                                                                                                                          |
| prettier-plugin-astro                                       | 1.1.2          | 0     | dev                     | Prettier support for `.astro`.                                                                                                                                                                                                  |
| @fontsource-variable/geist, @fontsource-variable/geist-mono | 5.3.0          | 1     | dev (build-time asset)  | Self-hosted Geist fonts (OFL-1.1). No third-party font request. Only the Latin variable woff2 files are referenced, and Astro bundles them with hashed names.                                                                   |
| @types/node                                                 | 24.19.2        | 1     | dev                     | Types for Node APIs used by the content schema and the contrast script. Matches the Node 24 in `.nvmrc`.                                                                                                                        |
| @playwright/test                                            | 1.65.1         | 2     | dev                     | E2E, visual checks, CV PDF generation, OG/Upwork captures. 1.65.1 matches the Chromium 1255 already installed on the machine.                                                                                                   |
| sharp                                                       | 0.35.5         | 2     | dev                     | Compresses the generated OG image. Same version Astro already installs for its image pipeline, declared because a script now imports it directly.                                                                               |
| three                                                       | 0.187.0        | 4     | runtime (lazy, desktop) | WebGL for the persistent LED world, in a worker or on the main thread. MIT. Imported only through dynamic `import()`, inside the 250 KB gzip WebGL budget. No third-party network use.                                          |
| @types/three                                                | 0.187.0        | 4     | dev                     | Strict TypeScript types matching the Three.js version. MIT. Not shipped.                                                                                                                                                        |
| gsap                                                        | 3.15.1         | 6     | runtime (lazy)          | Timelines and SplitText for DOM motion on all devices, plus ScrollTrigger on desktop only. Standard no-charge license (free, not open source). No network use. Deferred chunks, never loaded with reduced motion or Motion off. |
| uv                                                          | 0.13.7         | 3     | user tool, dev-only     | Manages the pipeline's Python and locked env. MIT / Apache-2.0. Network: installs Python and packages. Installed in `~/.local/bin` with Renzzo's approval, no shell profile changes.                                            |
| Python (via uv)                                             | 3.13           | 3     | dev-only, offline       | Runtime for `scripts/face/`. PSF-2.0. Network: one download by uv. Not shipped.                                                                                                                                                 |
| onnxruntime                                                 | 1.32.0         | 3     | dev-only, offline       | Runs both models on CPU without PyTorch, which keeps the install small on a 3 GB machine. MIT. No network use.                                                                                                                  |
| numpy                                                       | 2.5.5          | 3     | dev-only, offline       | Array math for masks, depth and dot sampling. BSD-3-Clause and bundled permissive licenses. No network use.                                                                                                                     |
| pillow                                                      | 13.0.0         | 3     | dev-only, offline       | Reads the photo and writes LED previews. MIT-CMU. No network use.                                                                                                                                                               |
| Depth Anything V2 Small (ONNX)                              | rev `4472b73`  | 3     | model, dev-only         | Monocular depth. Apache-2.0 (the larger V2 models are non-commercial). Network: model download only, SHA-256 verified, stored in `~/.cache/renzzo-face/`.                                                                       |
| IS-Net general-use (ONNX)                                   | SHA-256 pinned | 3     | model, dev-only         | Background removal that keeps hard silhouettes such as the cap. Apache-2.0. Network: model download only, SHA-256 verified, stored in `~/.cache/renzzo-face/`.                                                                  |
| lighthouse                                                  | 13.6.0         | 2     | dev                     | Scripted, repeatable Lighthouse runs (median of 5). Moved up from Phase 7 because Phase 2 must already prove the budgets.                                                                                                       |
