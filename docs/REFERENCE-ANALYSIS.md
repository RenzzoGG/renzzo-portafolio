# Reference analysis: fojcikdominik.com

Technical study, carried out on 2026-11-22 with the Playwright MCP. The goal is to understand **how** the experience is built and recreate the useful techniques in the Signal identity. **We are not cloning the design.**

No JS, shader, image, font, 3D model or copy from the site is stored in this repo. This document holds only our own descriptions and metadata (versions, sizes, counts). Reference screenshots live in `docs/reports/reference/`, which is gitignored.

## How far to trust these numbers

- **Real frame rate could not be measured.** This machine exposes no hardware GPU to the browser (SwiftShader and llvmpipe only). The render worker ran at 0.1–1.3 fps here, which says nothing about a real device. Frame costs below are structural (draw calls, passes, triangles).
- Load times are inflated by software rendering. The loader took 30–70 s here and would be far shorter on a real GPU.
- Screens were sampled as still frames at 12 scroll positions at 800×500, and position 10 timed out. **Easing, timing and hover response are inferred from those stills**, not watched in motion.
- Mobile was emulated in Chromium for 12 s and was still on the loader. Mobile findings are partial.
- Items marked _(inferred)_ are conclusions from behavior, not confirmed from source.

## Stack

| Area            | Finding                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| Framework       | Astro 6.4.8 with the `ClientRouter` (view transitions)                                |
| 3D              | Three.js r187, WebGL 2, antialiasing off                                              |
| Smooth scroll   | Lenis 1.3.26 on an inner `.page-scroll` container. The document itself doesn't scroll |
| Animation       | Anime.js is present as a global (version not captured). No GSAP global was found      |
| State           | Nanostores, shared across modules                                                     |
| Post-processing | Multi-pass. The library, if any, couldn't be identified                               |
| Fonts           | A dot-matrix display face (Doto) carries the look, 6 woff2 files in total             |
| Third parties   | Cloudflare Insights and PostHog                                                       |

## Rendering architecture

The most valuable finding: **the whole 3D experience runs in a Web Worker.**

- There is **one persistent canvas** for the whole site. It survives page navigation.
- A module worker owns the WebGL 2 context on an offscreen surface and sends finished frames to the page canvas, which uses a `bitmaprenderer` context. The page thread never touches WebGL.
- While the worker crawled at about 1 fps, the **main thread held about 59 fps**, so the UI stayed responsive.
- The worker spawned 8 more short-lived blob workers, probably asset decoder pools _(inferred)_.
- Internal render size was 1.6× the CSS size on a 1× display (2304×1440 for a 1440×900 viewport).
- Per frame: **14–17 draw calls, 18–24 framebuffer binds, 88k–219k triangles**, with 15 shader programs seen. Few draws and many framebuffer binds indicate a heavy multi-pass post chain.

**Text sits inside the canvas.** The real headings are in the DOM, in black and beneath the canvas, and the canvas receives the pointer. The visible text shows the same distortion as the scene, so it's drawn in WebGL _(inferred)_. The DOM remains as the semantic layer.

## Payload and load sequence

| Desktop first load | Files | Transferred | Decoded |
| ------------------ | ----: | ----------: | ------: |
| JavaScript         |    26 |      681 KB | 2.33 MB |
| AVIF images        |    19 |      844 KB |  838 KB |
| Fonts              |     6 |       41 KB |   40 KB |

The three largest scripts are the render worker (273 KB), Three.js (250 KB) and another shared module (101 KB), all as transferred sizes.

1. HTML arrives and first paint shows only a glitched loading label with a progress bar.
2. Small Astro scripts, the router and Three.js load.
3. The render worker starts and images begin decoding.
4. **The loader blocks the page until the 3D is ready.** Content then appears.

Reduced motion still downloads the 3D and worker (665 KB of JS) and shows the same loader. Mobile also downloads Three.js (561 KB of JS by the 12 s mark), through a different path with no dedicated render worker request, and uses a low-resolution canvas (312×675 on a 2× phone).

## Section by section

The inner page is about 19 viewports tall. One continuous camera journey runs through it, driven by scroll, with no visible cuts.

| Scroll | What's on screen                                                                          | What moves                                            |
| ------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 0%     | Voxel/LED head in profile, against a curved grid wall, with large dot-matrix text over it | Head reacts to the pointer, signal noise              |
| 8%     | Bright white void with tilted, curved project screens                                     | Screens fly past the camera at different angles       |
| 17%    | A framed CRT-style monitor showing one project, with a glitching title                    | Project title tears horizontally                      |
| 25%    | Screens continue, with the next environment appearing                                     | Screens exit, and the scene changes behind them       |
| 33%    | Long symmetrical industrial corridor, with a text block on the left                       | Camera travels forward along the axis                 |
| 42%    | Same corridor, camera tilted down toward the floor                                        | Camera pitch changes with scroll                      |
| 50–58% | Dense blue city seen from above, with fog, and a second text block                        | Camera descends and rolls                             |
| 67%    | City at a stronger angle                                                                  | A horizontal signal tear crosses the frame            |
| 75–92% | A small bright image appears in the city, then grows                                      | The image acts as a portal, scaling toward the camera |
| 100%   | The portal fills the frame and becomes the contact close, with the footer                 | Final hold                                            |

**How scroll drives it** _(inferred)_: one normalized progress value feeds a single camera path and per-section timelines. Text blocks are pinned while the camera keeps moving.

**Hero hover** _(inferred from stills)_: the head turns slightly toward the pointer, some voxels displace near it, and a horizontal tear can appear. The head's appearance also differed between samples (eyewear visible in one, absent in another), which suggests a cross-fade between two head states.

## Post-processing, in words

The whole frame looks like a worn analog broadcast seen on an old CRT:

- **Scanlines:** fine horizontal lines over everything, including text.
- **Grain:** constant low-level noise that keeps blacks alive.
- **Barrel distortion:** the image bulges, and straight lines bend toward the edges.
- **Vignette:** rounded, darkened tube corners.
- **Chromatic aberration:** a slight color fringe on high-contrast edges, most visible on the loader text.
- **VHS tracking:** horizontal bands shift sideways and tear, especially during scroll.
- **Dropouts:** short white horizontal dashes scattered at random.
- **Tone:** lifted blacks and blown highlights, like a reduced-bandwidth signal.

## Page transitions and menu

- **Page transitions:** Astro's `ClientRouter` swaps the document without a reload, and the canvas persists. The mid-transition sample was a black frame. The swap measured about 400 ms here.
- **Menu:** a full-screen overlay over the dimmed, still-rendering 3D scene. It has numbered route rows with an inverted highlight bar, social links and a legal row. The button correctly exposes `aria-expanded`.
- **Accessibility gaps seen:** Escape did not close the menu in our test, and the first Tab after opening went to the header logo instead of the first menu item.

## How we'd build our own version

Our budgets: critical JS ≤ 20 KB, LCP is text, Lighthouse mobile 100, Three.js on desktop only and after first paint, nothing 3D with reduced motion or Motion off, everything usable without JS.

| Technique              | Our version                                                                                                                                              | Budget and risk                                                   | Decision      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------- |
| Worker renderer        | Three.js in a module worker through `transferControlToOffscreen`. Feature-detect it, and keep the 2D face if it's unavailable                            | Protects TBT. Pointer and scroll must be sent by message          | **Adopt**     |
| One persistent canvas  | One fixed, `aria-hidden` canvas behind the content for the desktop experience, replacing separate hero and project canvases                              | Needs resize and context-loss handling                            | **Adopt**     |
| Reactive LED head      | Instanced dots from our `face.bin`. Depth gives parallax, and the pointer drives a radial blend from styled to focused, which our data already contains  | Data already ships at 9.3 KB raw                                  | **Adopt**     |
| Scroll-driven camera   | A single `progress` value from **native scroll** and sticky sections, sent to the worker. Add smooth scrolling only if testing shows a clear need        | Avoids a Lenis dependency and keeps keyboard and browser behavior | **Adapt**     |
| Curved project screens | Phase 5 meshes with our own screenshots, loaded near the viewport, each shifting the color accent                                                        | Limit texture size and count                                      | **Adopt**     |
| Post-processing        | **One combined full-screen pass** in Signal crimson: scanlines, grain, barrel, chroma, vignette and scroll-velocity tears. Render at a capped resolution | Far cheaper than a multi-pass chain. Reduced intensity near text  | **Adapt**     |
| Text in WebGL          | **Rejected.** Keep real DOM text above the canvas. A light CSS scanline overlay can tie it to the scene                                                  | Protects LCP, selection, zoom, contrast and screen readers        | **Reject**    |
| Blocking loader        | **Rejected.** Content is visible at first paint, and the 3D fades in over the poster when it's ready                                                     | Required for text LCP                                             | **Reject**    |
| Large 3D environments  | **Rejected as-is.** No heavy models. Build a lighter world of our own from instanced LED panels and procedural geometry                                  | Keeps payload small, and avoids resembling their scenes           | **Replace**   |
| Page transitions       | Our site is mostly one page. Use native cross-document view transitions to `/cv`, with a short signal-glitch wipe. No client router                      | Zero critical JS                                                  | **Adapt**     |
| Menu overlay           | Keep the current wrapped nav. If we add an overlay, use a native `<dialog>`, so Escape and focus work by default                                         | Must work without JS through the plain nav                        | **Optional**  |
| Mobile                 | No Three.js. Keep the 2D face, add scroll-driven focus reveal, and fake the look with light CSS                                                          | Required by the plan                                              | **Keep ours** |
| Reduced motion         | Download no 3D at all and show the static poster                                                                                                         | Already implemented, and stricter than the reference              | **Keep ours** |

## Keeping it ours

Their signature is a nostalgic VHS/CRT broadcast with a white void, an industrial corridor and a blue city. To avoid a derivative result, Signal should keep its own:

- **Palette:** near-black with crimson signal, plus each project's accent. No blue-tinted film look.
- **Subject:** an LED wall and transmission concept built around the halftone face.
- **Typography:** Geist and Geist Mono. We won't adopt a dot-matrix display font.
- **Structure and copy:** our own sections, scenes, camera path and words.

## Open decisions for the plan revision

1. Move Phase 4 to a worker-based renderer with one persistent canvas?
2. How strong should the analog post-processing be? It's the element closest to the reference.
3. Native scroll only, or test a smooth-scroll library in Phase 6?
4. What is the LED world between the hero and the projects?
5. What lazy Three.js budget do we set for desktop? The plan has none yet.
