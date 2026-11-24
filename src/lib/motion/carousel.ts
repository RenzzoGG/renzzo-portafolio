/**
 * The 3D look of the phone carousel. Native scroll and snap move the cards, and
 * this only reads their position, so swiping never waits for JavaScript.
 */
const MAX_TURN = 34;
const DEPTH = 90;
const DIM = 0.42;
const PERSPECTIVE = 900;
const SWIPE_CALM_MS = 140;

export function startCarousel() {
  const track = document.querySelector<HTMLElement>("[data-screens]");
  if (!track || getComputedStyle(track).overflowX !== "auto") {
    return () => undefined;
  }
  const cards = [...track.children] as HTMLElement[];
  let frame = 0;
  let calm = 0;

  const paint = () => {
    frame = 0;
    const middle = track.scrollLeft + track.clientWidth / 2;
    for (const card of cards) {
      // Layout position, because the card's own transform would skew the reading.
      const center = card.offsetLeft + card.offsetWidth / 2;
      const away = Math.max(
        -1,
        Math.min(1, (center - middle) / card.offsetWidth),
      );
      const size = Math.abs(away);
      card.style.transform = `perspective(${PERSPECTIVE}px) translateZ(${(-size * DEPTH).toFixed(1)}px) rotateY(${(-away * MAX_TURN).toFixed(2)}deg)`;
      // Focus always shows a card at full strength.
      card.style.opacity = card.contains(document.activeElement)
        ? "1"
        : (1 - size * DIM).toFixed(3);
    }
  };
  const schedule = () => {
    frame ||= requestAnimationFrame(paint);
  };
  const onScroll = () => {
    schedule();
    track.dataset.swiping = "";
    clearTimeout(calm);
    calm = window.setTimeout(() => {
      delete track.dataset.swiping;
    }, SWIPE_CALM_MS);
  };

  track.dataset.carousel = "";
  track.addEventListener("scroll", onScroll, { passive: true });
  track.addEventListener("focusin", schedule);
  track.addEventListener("focusout", schedule);
  addEventListener("resize", schedule);
  paint();

  return () => {
    cancelAnimationFrame(frame);
    clearTimeout(calm);
    track.removeEventListener("scroll", onScroll);
    track.removeEventListener("focusin", schedule);
    track.removeEventListener("focusout", schedule);
    removeEventListener("resize", schedule);
    delete track.dataset.carousel;
    delete track.dataset.swiping;
    for (const card of cards) {
      card.style.removeProperty("transform");
      card.style.removeProperty("opacity");
    }
  };
}
