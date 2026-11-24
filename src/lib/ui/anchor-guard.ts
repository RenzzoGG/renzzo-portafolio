/**
 * Late layout changes (the tunnel collapsing, ScrollTrigger starting) can stop
 * a smooth anchor jump short. If a clicked jump ends off target, this finishes
 * it. History traversal and any scroll the visitor takes over are left alone.
 */
const WINDOW_MS = 2500;
const TOLERANCE_PX = 6;

let target: HTMLElement | null = null;
let until = 0;

const release = () => {
  target = null;
};

const offsetOf = (element: HTMLElement) => {
  const margin = Number.parseFloat(getComputedStyle(element).scrollMarginTop);
  return element.getBoundingClientRect().top - (margin || 0);
};

addEventListener("click", (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>(
    'a[href*="#"]',
  );
  if (event.defaultPrevented || !link?.hash) return;
  if (link.pathname !== location.pathname) return;
  const next = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  // Already there means no scrollend will come to clear it.
  if (!next || Math.abs(offsetOf(next)) <= TOLERANCE_PX) return;
  target = next;
  until = performance.now() + WINDOW_MS;
});

for (const type of ["wheel", "touchstart", "pointerdown", "keydown"]) {
  addEventListener(type, release, { passive: true });
}

addEventListener("scrollend", () => {
  const element = target;
  release();
  if (!element || performance.now() > until) return;
  const offset = offsetOf(element);
  const atEnd =
    scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - TOLERANCE_PX;
  if (Math.abs(offset) > TOLERANCE_PX && !(offset > 0 && atEnd)) {
    element.scrollIntoView({ behavior: "instant" });
  }
});

export {};
