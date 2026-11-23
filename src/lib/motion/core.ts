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
const COUNT_S = 0.9;
const MIN_COUNT = 10;
const SCROLL_CALM_MS = 240;
const DESKTOP = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

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

function countFrames(text: string) {
  const match = /^(\d+(?:\.\d+)?)(.*)$/s.exec(text);
  const digits = match?.[1];
  if (!match || !digits || Number(digits) < MIN_COUNT) return null;
  const target = Number(digits);
  const decimals = digits.split(".")[1]?.length ?? 0;
  const rest = match[2] ?? "";
  const ease = gsap.parseEase("power3.out");
  return (progress: number) =>
    (target * ease(progress)).toFixed(decimals).padStart(digits.length, "0") +
    rest;
}

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
    const items = [...document.querySelectorAll<HTMLElement>(selector)].filter(
      (item) => {
        const box = item.getBoundingClientRect();
        return box.width > 1 && box.top > window.innerHeight;
      },
    );
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            play(entry.target as HTMLElement);
          }
        }
      },
      { rootMargin: `0px 0px -${String(marginPercent)}% 0px` },
    );
    for (const item of items) {
      arm?.(item);
      observer.observe(item);
    }
    cleanups.add(() => {
      observer.disconnect();
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
  onEnter(
    "[data-count]",
    8,
    (element) => {
      const frames = countFrames(element.textContent);
      if (frames) overlay(element, COUNT_S, frames);
    },
    (element) => {
      if (countFrames(element.textContent)) armText(element);
    },
  );

  if (matchMedia(DESKTOP).matches) {
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
