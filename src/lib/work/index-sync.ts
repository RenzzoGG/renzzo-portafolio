/** Keeps the Selected work index on the last project above the viewport center. */
const links = [
  ...document.querySelectorAll<HTMLAnchorElement>("[data-index-link]"),
];
const cases = links.map((link) => document.getElementById(link.hash.slice(1)));

const stage = document.querySelector<HTMLElement>("[data-work-stage]");

let current = -1;
let frame = 0;
let tops: number[] = [];

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

/** Depends only on the scroll position, so an instant jump can't leave it stale. */
const sync = () => {
  frame = 0;
  const line = scrollY + innerHeight / 2;
  let active = 0;
  tops.forEach((top, index) => {
    if (top <= line) active = index;
  });
  if (active !== current) activate(active);
};

const measure = () => {
  tops = cases.map((item) =>
    item ? item.getBoundingClientRect().top + scrollY : Infinity,
  );
  sync();
};

if (links.length > 0) {
  activate(0);
  measure();
  addEventListener(
    "scroll",
    () => {
      frame ||= requestAnimationFrame(sync);
    },
    { passive: true },
  );
  addEventListener("resize", measure);
  // Catches layout changes such as an opened <details> or late fonts.
  new ResizeObserver(measure).observe(document.body);
}
