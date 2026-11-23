/**
 * Late layout changes (the tunnel collapsing, ScrollTrigger starting) can stop
 * a smooth anchor jump short. If one ends off target, this finishes it, unless
 * the visitor took over the scroll in the meantime.
 */
const WINDOW_MS = 2500;
const TOLERANCE_PX = 6;

let target: HTMLElement | null = null;
let until = 0;

const release = () => {
  target = null;
};

addEventListener("hashchange", () => {
  target = document.getElementById(location.hash.slice(1));
  until = performance.now() + WINDOW_MS;
});

for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) {
  addEventListener(type, release, { passive: true });
}

addEventListener("scrollend", () => {
  const element = target;
  release();
  if (!element || performance.now() > until) return;
  const margin = Number.parseFloat(getComputedStyle(element).scrollMarginTop);
  const offset = element.getBoundingClientRect().top - (margin || 0);
  const atEnd =
    scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - TOLERANCE_PX;
  if (Math.abs(offset) > TOLERANCE_PX && !(offset > 0 && atEnd)) {
    element.scrollIntoView({ behavior: "instant" });
  }
});

export {};
