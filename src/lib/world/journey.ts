/**
 * Turns native scroll into one number for the whole trip:
 * 0–1 face pull-back, 1–2 tunnel, 2–5 drum (one per project), 5–6 back to dark.
 * Each project holds its value while it's on screen, whatever its height.
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
}

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
  // The last project holds until its text has left, then the world turns dark.
  const last = cases.at(-1);
  if (last) {
    raw.push({
      scroll: last.top + last.height - viewport * 0.2,
      value: 1 + cases.length,
    });
  }
  raw.push({ scroll: stageBottom - viewport, value: 2 + cases.length });

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
