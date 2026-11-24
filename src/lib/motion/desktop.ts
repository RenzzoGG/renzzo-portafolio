/** Desktop-only motion. ScrollTrigger stays out of the mobile budget. */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
// Our ResizeObserver handles layout changes, without interrupting native scroll.
ScrollTrigger.config({
  autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
});

const MAX_PULL = 6;

function magnetic(button: HTMLElement) {
  const move = (event: PointerEvent) => {
    const box = button.getBoundingClientRect();
    const clamp = (value: number) =>
      Math.max(-MAX_PULL, Math.min(MAX_PULL, value));
    const x = clamp((event.clientX - box.x - box.width / 2) * 0.16);
    const y = clamp((event.clientY - box.y - box.height / 2) * 0.24);
    button.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
  };
  const leave = () => {
    button.style.removeProperty("translate");
  };
  button.addEventListener("pointermove", move);
  button.addEventListener("pointerleave", leave);
  return () => {
    button.removeEventListener("pointermove", move);
    button.removeEventListener("pointerleave", leave);
    leave();
  };
}

/** Plays once per pointer entry, only for a pointer that's really moving. */
function glitch(heading: HTMLElement) {
  let played = false;
  const move = (event: PointerEvent) => {
    if (
      played ||
      (!event.movementX && !event.movementY) ||
      document.documentElement.dataset.scrolling !== undefined ||
      heading.querySelector(".reveal-line-mask")
    ) {
      return;
    }
    played = true;
    heading.dataset.glitching = "";
  };
  const leave = () => {
    played = false;
  };
  const end = () => {
    delete heading.dataset.glitching;
  };
  heading.addEventListener("pointermove", move);
  heading.addEventListener("pointerleave", leave);
  heading.addEventListener("animationend", end);
  return () => {
    heading.removeEventListener("pointermove", move);
    heading.removeEventListener("pointerleave", leave);
    heading.removeEventListener("animationend", end);
    end();
  };
}

export function startDesktop() {
  const stops = [
    ...[...document.querySelectorAll<HTMLElement>(".btn")].map(magnetic),
    ...[...document.querySelectorAll<HTMLElement>("[data-glitch]")].map(glitch),
  ];

  const context = gsap.context(() => {
    for (const line of gsap.utils.toArray<HTMLElement>("[data-hud-line]")) {
      // A rule already on screen stays final instead of jumping backward.
      if (line.getBoundingClientRect().top < window.innerHeight) continue;
      gsap.fromTo(
        line,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: line.closest("section") ?? line,
            start: "top bottom",
            end: "top 35%",
            scrub: 0.4,
          },
        },
      );
    }
  });

  // Opening a <details> or collapsing the tunnel moves every later section.
  // A safe refresh waits for scrolling to end, so it can't cancel an anchor jump.
  let timer = 0;
  let height = document.body.offsetHeight;
  const resizes = new ResizeObserver(() => {
    const next = document.body.offsetHeight;
    if (next === height) return;
    height = next;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      ScrollTrigger.refresh(true);
    }, 160);
  });
  resizes.observe(document.body);

  // Content moving under a still cursor isn't hover intent, so no glitch.
  const root = document.documentElement;
  let settle = 0;
  const onScroll = () => {
    root.dataset.scrolling = "";
    clearTimeout(settle);
    settle = window.setTimeout(() => {
      delete root.dataset.scrolling;
    }, 160);
  };
  addEventListener("scroll", onScroll, { passive: true });

  return () => {
    removeEventListener("scroll", onScroll);
    clearTimeout(settle);
    delete root.dataset.scrolling;
    clearTimeout(timer);
    resizes.disconnect();
    context.revert();
    for (const stop of stops) stop();
  };
}
