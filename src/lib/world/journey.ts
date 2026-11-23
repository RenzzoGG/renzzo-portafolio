/**
 * Turns native scroll into one number for the whole trip:
 * 0–1 face pull-back, 1–2 tunnel, 2–5 drum (one per project), then one unit per
 * section boundary: 5–6 More work, 6–7 About, 7–8 Services, 8–9 Skills, 9–10 CV,
 * 10–11 Contact. Each value holds while its section is on screen.
 */
export interface JourneyStop {
  scroll: number;
  value: number;
}

export interface JourneyLayout {
  heroBottom: number;
  cases: { top: number; height: number }[];
  stageBottom: number;
  viewport: number;
  /** Top of each section after the drum, in page order. */
  sections?: number[];
  maxScroll?: number;
}

/** How far up the viewport a section's top is when its transition ends. */
const FIRST_SETTLE = 0.55;
const SETTLE = 0.35;
const LAST_SETTLE = 0.15;
const TRANSITION = 0.6;
/** The drum starts leaving when its last project's bottom reaches this line. */
const DRUM_EXIT = 0.7;

export function buildStops(layout: JourneyLayout): JourneyStop[] {
  const { heroBottom, cases, stageBottom, viewport } = layout;
  const raw: JourneyStop[] = [
    { scroll: 0, value: 0 },
    { scroll: heroBottom, value: 1 },
  ];
  cases.forEach((item, index) => {
    raw.push({ scroll: item.top, value: 2 + index });
    raw.push({
      scroll: item.top + Math.max(0, item.height - viewport),
      value: 2 + index,
    });
  });
  const { sections = [], maxScroll = Infinity } = layout;
  // The last project holds until its text is leaving, then the mood changes.
  const last = cases.at(-1);
  if (last) {
    raw.push({
      scroll:
        last.top +
        last.height -
        viewport * (sections.length > 0 ? DRUM_EXIT : 0.2),
      value: 1 + cases.length,
    });
  }
  if (sections.length === 0) {
    raw.push({ scroll: stageBottom - viewport, value: 2 + cases.length });
  }
  sections.forEach((top, index) => {
    const before = 1 + cases.length + index;
    const settle =
      index === 0
        ? FIRST_SETTLE
        : index === sections.length - 1
          ? LAST_SETTLE
          : SETTLE;
    const end = Math.min(top - viewport * settle, maxScroll);
    if (index > 0) {
      raw.push({ scroll: end - viewport * TRANSITION, value: before });
    }
    raw.push({ scroll: end, value: before + 1 });
  });

  // Scroll positions must only grow, even on very short viewports.
  let floor = -1;
  return raw.map((stop) => {
    floor = Math.max(stop.scroll, floor + 1);
    return { scroll: floor, value: stop.value };
  });
}

export function journeyAt(scroll: number, stops: JourneyStop[]): number {
  const first = stops[0];
  const last = stops.at(-1);
  if (!first || !last) return 0;
  if (scroll <= first.scroll) return first.value;
  if (scroll >= last.scroll) return last.value;
  for (let index = 1; index < stops.length; index += 1) {
    const end = stops[index];
    const start = stops[index - 1];
    if (start && end && scroll <= end.scroll) {
      const span = (scroll - start.scroll) / (end.scroll - start.scroll);
      return start.value + (end.value - start.value) * span;
    }
  }
  return last.value;
}

export const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** Rises and falls once between two values, and is 0 outside them. */
const bump = (from: number, to: number, value: number) => {
  if (value <= from || value >= to) return 0;
  return Math.sin((Math.PI * (value - from)) / (to - from));
};

const between = (
  inFrom: number,
  inTo: number,
  outFrom: number,
  outTo: number,
  value: number,
) => smoothstep(inFrom, inTo, value) * (1 - smoothstep(outFrom, outTo, value));

export interface Act {
  bone: number;
  wall: number;
  bands: number;
  stream: number;
  dots: number;
  curtain: number;
  noise: number;
  slice: number;
  roll: number;
  squeeze: number;
  /** Bone text must stay AA from here on, so nothing passes crimson. */
  cap: number;
  /** Camera offsets: distance as a factor, pan in view widths, tilt in radians. */
  distance: number;
  pan: number;
  tilt: number;
}

/**
 * How far pinned content has left its section, 0 to 1. It finishes before the
 * static of that boundary builds, so nothing floats over the transition.
 */
export const releaseAt = (value: number) => ({
  work: smoothstep(5, 5.22, value),
  shelf: smoothstep(6, 6.25, value),
});

/** Every layer and effect of the trip, as a pure function of the journey. */
export function actAt(value: number): Act {
  return {
    bone: between(1.36, 1.6, 5.3, 5.74, value),
    wall: Math.max(
      1 - smoothstep(0.25, 0.85, value),
      between(5.4, 5.9, 6.55, 6.95, value),
      between(7.25, 7.6, 8.2, 8.6, value),
      between(9.6, 9.9, 10.2, 10.4, value),
    ),
    bands: between(7.25, 7.6, 8.2, 8.6, value),
    // The streams rise after the dive: a camera move across their rows flickers.
    stream: between(6.7, 6.98, 7.1, 7.42, value),
    dots: between(8.4, 8.8, 9.2, 9.5, value),
    curtain: smoothstep(10.45, 10.98, value),
    noise: Math.max(
      bump(5.22, 5.95, value),
      bump(7.1, 7.9, value),
      0.35 * bump(8.1, 8.9, value),
      0.6 * bump(10.1, 10.55, value),
    ),
    slice: Math.max(
      bump(7.05, 7.95, value),
      0.5 * bump(8.1, 8.6, value),
      bump(10.15, 10.45, value),
    ),
    roll: bump(8.1, 8.9, value),
    squeeze: Math.max(
      Math.min(1, 1.6 * bump(9.08, 9.92, value)),
      // Done before the curtain lights: squeezing its dots sweeps them over pixels.
      between(10.08, 10.28, 10.3, 10.44, value),
    ),
    cap: smoothstep(10, 10.05, value),
    distance:
      1 +
      0.22 * bump(5.1, 6, value) -
      0.42 * bump(6.05, 6.72, value) +
      0.18 * bump(9.05, 9.95, value) -
      0.5 * bump(10.05, 10.48, value),
    // The pan waits for the streams to clear: their gaps would flicker past.
    pan: 0.1 * bump(7.42, 7.98, value),
    tilt: 0.1 * bump(8.05, 8.95, value),
  };
}
