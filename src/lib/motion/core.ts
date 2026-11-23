/**
 * Text motion for every device. The real text is never rewritten: decode and
 * count-up play in an aria-hidden overlay, and line splits are reverted.
 * Only elements still below the viewport are armed, so nothing visible jumps.
 */
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

const GLYPHS = "#%&*+/<=>\\_01";
const KEEP = new Set([" ", "[", "]", "/"]);
const DECODE_STEPS = 8;
const DECODE_S = 0.32;
const TUNE_S = 0.62;
const COUNT_S = 0.9;
const TYPE_S = 2.4;
const WAVE_MS = 760;
const SCROLL_CALM_MS = 240;
const BAND_DELAY_MS = 180;
const DESKTOP = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";
const ACT_RISE = 14;
const ACT_S = 0.46;
const ACT_DELAY = { body: 0.12, detail: 0.24 };
const ACT_STAGGER = 0.07;

const glyph = () =>
  GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? GLYPHS.charAt(0);

function decodeFrames(text: string) {
  const chars = [...text];
  let step = -1;
  let frame = text;
  return (progress: number) => {
    const next = Math.floor(progress * DECODE_STEPS);
    if (next !== step) {
      step = next;
      const settled = Math.floor(progress * chars.length);
      frame = chars
        .map((char, index) =>
          index < settled || KEEP.has(char) ? char : glyph(),
        )
        .join("");
    }
    return frame;
  };
}

/** Groups LED digits into numbers, so "20/20" counts as two values. */
function segmentRuns(display: HTMLElement) {
  const runs: { cells: SVGElement[]; target: number }[] = [];
  let run: (typeof runs)[number] | null = null;
  for (const cell of display.querySelectorAll<SVGElement>("svg")) {
    const digit = cell.dataset.d;
    if (digit === undefined) {
      run = null;
      continue;
    }
    if (!run) {
      run = { cells: [], target: 0 };
      runs.push(run);
    }
    run.cells.push(cell);
    run.target = run.target * 10 + Number(digit);
  }
  return (progress: number) => {
    for (const { cells, target } of runs) {
      const text = String(Math.round(target * progress)).padStart(
        cells.length,
        "0",
      );
      cells.forEach((cell, index) => {
        cell.dataset.d = text[index] ?? "0";
      });
    }
  };
}

/** Survives a Motion toggle, so text already seen never replays. */
const played = new WeakSet<Element>();

export function startMotion() {
  const cleanups = new Set<() => void>();
  let stopped = false;

  /** Runs `play` once per element, when it enters the viewport. */
  const onEnter = (
    selector: string,
    marginPercent: number,
    play: (element: HTMLElement) => void,
    arm?: (element: HTMLElement) => void,
  ) => {
    const timers = new Set<number>();
    const items = [...document.querySelectorAll<HTMLElement>(selector)].filter(
      (item) => {
        const box = item.getBoundingClientRect();
        return (
          !played.has(item) && box.width > 1 && box.top > window.innerHeight
        );
      },
    );
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        played.add(element);
        // Past the trigger line it plays now. In the bottom band it plays
        // shortly after, so text can never rest invisible on screen.
        const line = window.innerHeight * (1 - marginPercent / 100);
        if (entry.boundingClientRect.top <= line) {
          play(element);
        } else {
          const timer = window.setTimeout(() => {
            timers.delete(timer);
            play(element);
          }, BAND_DELAY_MS);
          timers.add(timer);
        }
      }
    });
    for (const item of items) {
      arm?.(item);
      observer.observe(item);
    }
    cleanups.add(() => {
      observer.disconnect();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    });
  };

  const overlay = (
    element: HTMLElement,
    duration: number,
    frame: (progress: number) => string,
  ) => {
    delete element.dataset.signalArmed;
    const ghost = document.createElement("span");
    ghost.className = "motion-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.color = getComputedStyle(element).color;
    ghost.textContent = frame(0);
    element.dataset.signalBusy = "";
    element.append(ghost);
    const finish = () => {
      ghost.remove();
      delete element.dataset.signalBusy;
      cleanups.delete(stop);
    };
    const tween = gsap.to(
      { value: 0 },
      {
        value: 1,
        duration,
        ease: "none",
        onUpdate: () => {
          ghost.textContent = frame(tween.progress());
        },
        onComplete: finish,
      },
    );
    const stop = () => {
      tween.kill();
      finish();
    };
    cleanups.add(stop);
  };

  const reveal = (element: HTMLElement) => {
    element.style.removeProperty("opacity");
    const split = SplitText.create(element, {
      type: "lines",
      mask: "lines",
      linesClass: "reveal-line",
      aria: "auto",
    });
    const finish = () => {
      split.revert();
      cleanups.delete(stop);
    };
    const tween = gsap.from(split.lines, {
      yPercent: 108,
      // Contact is the closing beat, so it keeps the longest entrance.
      duration: element.closest(".contact") ? 0.8 : 0.6,
      stagger: 0.09,
      ease: "expo.out",
      onComplete: finish,
    });
    const stop = () => {
      tween.kill();
      finish();
    };
    cleanups.add(stop);
  };

  onEnter("[data-reveal]", 10, reveal, (element) => {
    // Opacity, not visibility, so screen readers can still reach it.
    element.style.opacity = "0";
    cleanups.add(() => {
      element.style.removeProperty("opacity");
    });
  });
  // Armed below the viewport, so text a reader has seen never flips back.
  const armText = (element: HTMLElement) => {
    element.dataset.signalArmed = "";
    cleanups.add(() => {
      delete element.dataset.signalArmed;
    });
  };
  onEnter(
    "[data-decode]",
    6,
    (element) => {
      overlay(element, DECODE_S, decodeFrames(element.textContent));
    },
    armText,
  );

  /** In the drum a panel stays hidden until its project is active or focused. */
  const whenShown = (element: HTMLElement, play: () => void) => {
    const host = element.closest<HTMLElement>(".case");
    if (
      !host ||
      document.documentElement.dataset.worldLive === undefined ||
      host.hasAttribute("data-active") ||
      host.contains(document.activeElement)
    ) {
      play();
      return;
    }
    const release = () => {
      watcher.disconnect();
      host.removeEventListener("focusin", go);
      cleanups.delete(release);
    };
    const go = () => {
      release();
      play();
    };
    const watcher = new MutationObserver(() => {
      if (host.hasAttribute("data-active")) go();
    });
    watcher.observe(host, {
      attributes: true,
      attributeFilter: ["data-active"],
    });
    host.addEventListener("focusin", go);
    cleanups.add(release);
  };

  onEnter(
    "[data-tune]",
    6,
    (element) => {
      whenShown(element, () => {
        overlay(element, TUNE_S, decodeFrames(element.textContent));
      });
    },
    armText,
  );

  const countUp = (display: HTMLElement) => {
    delete display.dataset.signalArmed;
    const paint = segmentRuns(display);
    const state = { value: 0 };
    paint(0);
    const finish = () => {
      paint(1);
      cleanups.delete(stop);
    };
    const tween = gsap.to(state, {
      value: 1,
      duration: COUNT_S,
      ease: "power3.out",
      onUpdate: () => {
        paint(state.value);
      },
      onComplete: finish,
    });
    const stop = () => {
      tween.kill();
      finish();
    };
    cleanups.add(stop);
  };
  onEnter(
    "[data-seg]",
    8,
    (element) => {
      whenShown(element, () => {
        countUp(element);
      });
    },
    armText,
  );

  onEnter("[data-wave]", 8, (element) => {
    whenShown(element, () => {
      element.dataset.waving = "";
      const finish = () => {
        clearTimeout(timer);
        delete element.dataset.waving;
        cleanups.delete(finish);
      };
      const timer = window.setTimeout(finish, WAVE_MS);
      cleanups.add(finish);
    });
  });

  /** Types whole words, so the bio is readable in about two seconds. */
  const typeIn = (block: HTMLElement) => {
    const lines = [...block.querySelectorAll<HTMLElement>("[data-type-line]")];
    const parts = lines.map((line) => {
      const words = line.textContent.split(" ");
      delete line.dataset.signalArmed;
      const ghost = document.createElement("span");
      ghost.className = "motion-ghost";
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.color = getComputedStyle(line).color;
      line.dataset.signalBusy = "";
      line.append(ghost);
      return { line, ghost, words };
    });
    const total = parts.reduce((sum, part) => sum + part.words.length, 0);
    const state = { value: 0 };
    const paint = () => {
      let left = Math.floor(state.value * total);
      let caret = false;
      for (const { ghost, words } of parts) {
        const shown = Math.min(left, words.length);
        left -= shown;
        ghost.textContent = words.slice(0, shown).join(" ");
        const typing: boolean = !caret && shown < words.length;
        ghost.classList.toggle("motion-ghost--caret", typing);
        if (typing) caret = true;
      }
    };
    const finish = () => {
      removeEventListener("pointerdown", skip);
      removeEventListener("keydown", skip);
      for (const { line, ghost } of parts) {
        ghost.remove();
        delete line.dataset.signalBusy;
      }
      cleanups.delete(stop);
    };
    const tween = gsap.to(state, {
      value: 1,
      duration: TYPE_S,
      ease: "none",
      onUpdate: paint,
      onComplete: finish,
    });
    const stop = () => {
      tween.kill();
      finish();
    };
    const skip = stop;
    addEventListener("pointerdown", skip);
    addEventListener("keydown", skip);
    paint();
    cleanups.add(stop);
  };
  onEnter("[data-type]", 12, typeIn, (block) => {
    for (const line of block.querySelectorAll<HTMLElement>(
      "[data-type-line]",
    )) {
      armText(line);
    }
  });

  /** One quick pass down the log. Delays shrink, so it reads as a wave. */
  const logLines = (block: HTMLElement) => [
    ...block.querySelectorAll<HTMLElement>("[data-log-line]"),
  ];
  onEnter(
    "[data-log]",
    8,
    (block) => {
      const lines = logLines(block);
      const finish = () => {
        gsap.set(lines, { clearProps: "opacity,transform" });
        cleanups.delete(stop);
      };
      const tween = gsap.fromTo(
        lines,
        { opacity: 0, x: -6 },
        {
          opacity: 1,
          x: 0,
          duration: 0.24,
          ease: "power2.out",
          stagger: { amount: 0.44, ease: "power2.out" },
          onComplete: finish,
        },
      );
      const stop = () => {
        tween.kill();
        finish();
      };
      cleanups.add(stop);
    },
    (block) => {
      const lines = logLines(block);
      for (const line of lines) line.style.opacity = "0";
      cleanups.add(() => {
        for (const line of lines) line.style.removeProperty("opacity");
      });
    },
  );

  // Section entrances: the HUD draws in, then the heading, body and details.
  const desktop = matchMedia(DESKTOP).matches;
  const hudParts = (hud: HTMLElement) => ({
    marks: [
      ...hud.querySelectorAll<HTMLElement>(
        ":scope > span:not(.hud__label, .hud__line)",
      ),
    ],
    // On desktop, ScrollTrigger already draws this line with the scroll.
    line: desktop ? null : hud.querySelector<HTMLElement>(".hud__line"),
  });
  onEnter(
    ".hud",
    6,
    (hud) => {
      const { marks, line } = hudParts(hud);
      const finish = () => {
        gsap.set([...marks, line].filter(Boolean), { clearProps: "transform" });
        cleanups.delete(stop);
      };
      const timeline = gsap.timeline({ onComplete: finish });
      timeline.to(marks, {
        scale: 1,
        rotate: 0,
        duration: 0.36,
        ease: "power3.out",
        stagger: 0.08,
      });
      if (line) {
        timeline.to(line, { scaleX: 1, duration: 0.5, ease: "power2.out" }, 0);
      }
      const stop = () => {
        timeline.kill();
        finish();
      };
      cleanups.add(stop);
    },
    (hud) => {
      const { marks, line } = hudParts(hud);
      gsap.set(marks, { scale: 0, rotate: -90 });
      if (line) gsap.set(line, { scaleX: 0 });
      cleanups.add(() => {
        gsap.set([...marks, line].filter(Boolean), { clearProps: "transform" });
      });
    },
  );
  onEnter(
    "[data-act-item]",
    8,
    (item) => {
      const siblings = [...(item.parentElement?.children ?? [])];
      const order = siblings.indexOf(item) % 3;
      const base =
        item.dataset.actItem === "detail" ? ACT_DELAY.detail : ACT_DELAY.body;
      const finish = () => {
        gsap.set(item, { clearProps: "opacity,transform" });
        cleanups.delete(stop);
      };
      const tween = gsap.to(item, {
        opacity: 1,
        y: 0,
        duration: ACT_S,
        delay: base + order * ACT_STAGGER,
        ease: "power3.out",
        onComplete: finish,
      });
      const stop = () => {
        tween.kill();
        finish();
      };
      cleanups.add(stop);
    },
    (item) => {
      gsap.set(item, { opacity: 0, y: ACT_RISE });
      cleanups.add(() => {
        gsap.set(item, { clearProps: "opacity,transform" });
      });
    },
  );
  // Without the world, each seam plays one short burst of static.
  onEnter("[data-seam]", 12, (seam) => {
    seam.dataset.on = "";
    cleanups.add(() => {
      delete seam.dataset.on;
    });
  });

  // Touch has no hover, so each channel powers on once as it enters view.
  if (matchMedia("(hover: none)").matches) {
    onEnter("[data-channel]", 14, (element) => {
      element.dataset.on = "";
      cleanups.add(() => {
        delete element.dataset.on;
      });
    });
  }

  if (desktop) {
    // ScrollTrigger's setup can interrupt a native smooth scroll, so wait for calm.
    let timer = 0;
    const load = () => {
      removeEventListener("scroll", wait);
      void import("./desktop.ts")
        .then(({ startDesktop }) => {
          if (!stopped) cleanups.add(startDesktop());
        })
        .catch(() => undefined);
    };
    const wait = () => {
      clearTimeout(timer);
      timer = window.setTimeout(load, SCROLL_CALM_MS);
    };
    addEventListener("scroll", wait, { passive: true });
    wait();
    cleanups.add(() => {
      clearTimeout(timer);
      removeEventListener("scroll", wait);
    });
  }

  return () => {
    stopped = true;
    for (const cleanup of [...cleanups]) cleanup();
    cleanups.clear();
  };
}
