/** Keeps the Selected work index on the project crossing the viewport center. */
const links = [
  ...document.querySelectorAll<HTMLAnchorElement>("[data-index-link]"),
];
const cases = links.map((link) => document.getElementById(link.hash.slice(1)));

const stage = document.querySelector<HTMLElement>("[data-work-stage]");

const activate = (active: number) => {
  // The stage takes the project's accent, for its non-text marks.
  const accent = cases[active]?.dataset.accent;
  if (stage && accent) stage.dataset.accent = accent;
  links.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
    cases[index]?.toggleAttribute("data-active", index === active);
  });
};

if (links.length > 0) {
  activate(0);
  // A zero-height line at the center: at most one project crosses it.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activate(cases.indexOf(entry.target as HTMLElement));
        }
      }
    },
    { rootMargin: "-50% 0px -50% 0px" },
  );
  for (const item of cases) if (item) observer.observe(item);
}
