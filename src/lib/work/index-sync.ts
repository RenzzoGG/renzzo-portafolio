/** Keeps the Selected work index on the last project above the viewport center. */
const links = [
  ...document.querySelectorAll<HTMLAnchorElement>("[data-index-link]"),
];
const cases = links.map((link) => document.getElementById(link.hash.slice(1)));

const stage = document.querySelector<HTMLElement>("[data-work-stage]");

let current = -1;
let frame = 0;
let tops: number[] = [];
let carousel = false;

const activate = (active: number) => {
  current = active;
  // The stage takes the project's accent, for its non-text marks.
  const accent = cases[active]?.dataset.accent;
  if (stage && accent) stage.dataset.accent = accent;
  links.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
    cases[index]?.toggleAttribute("data-active", index === active);
  });
};

/** The phone carousel scrolls sideways, so its active card is the most centered. */
const track = cases[0]?.parentElement ?? null;
const isCarousel = () =>
  Boolean(track) && getComputedStyle(track as Element).overflowX === "auto";

/** Layout offsets, because a card's 3D transform would skew its measured box. */
const centeredCard = () => {
  const view = track as HTMLElement;
  const middle = view.scrollLeft + view.clientWidth / 2;
  let best = 0;
  let distance = Infinity;
  cases.forEach((item, index) => {
    if (!item) return;
    const away = Math.abs(item.offsetLeft + item.offsetWidth / 2 - middle);
    if (away < distance) {
      distance = away;
      best = index;
    }
  });
  return best;
};

/** Depends only on the scroll position, so an instant jump can't leave it stale. */
const sync = () => {
  frame = 0;
  let active = 0;
  if (carousel) {
    active = centeredCard();
  } else {
    const line = scrollY + innerHeight / 2;
    tops.forEach((top, index) => {
      if (top <= line) active = index;
    });
  }
  if (active !== current) activate(active);
};

const measure = () => {
  carousel = isCarousel();
  tops = cases.map((item) =>
    item ? item.getBoundingClientRect().top + scrollY : Infinity,
  );
  sync();
};

const schedule = () => {
  frame ||= requestAnimationFrame(sync);
};

if (links.length > 0) {
  activate(0);
  measure();
  addEventListener("scroll", schedule, { passive: true });
  track?.addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", measure);
  // Motion on or off switches between the carousel and stacked cards.
  // Only that switch: a full re-measure here would race the drum's teardown.
  new MutationObserver(() => {
    if (isCarousel() !== carousel) measure();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  // Catches layout changes such as an opened <details> or late fonts.
  new ResizeObserver(measure).observe(document.body);

  // An index link centers its card, then brings the carousel into view.
  for (const [index, link] of links.entries()) {
    link.addEventListener("click", (event) => {
      const item = cases[index];
      if (!carousel || !item || !track) return;
      event.preventDefault();
      history.pushState(null, "", link.hash);
      const box = track.getBoundingClientRect();
      track.scrollTo({
        left: item.offsetLeft - (track.clientWidth - item.offsetWidth) / 2,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
      const rail = link.closest<HTMLElement>(".work__rail");
      const offset = rail?.offsetHeight ?? 0;
      if (box.top < offset || box.top > innerHeight * 0.5) {
        scrollTo({ top: scrollY + box.top - offset - 8, behavior: "smooth" });
      }
    });
  }
}
