/**
 * A WCAG 2.3.1 analyzer with two measures. A flash is a pair of opposing
 * transitions of relative luminance (general) or of saturated red (red).
 *
 * - "concurrent" follows the WCAG definition: 25% of a 341x256 area (at 1024x768)
 *   must change in the same direction at the same moment. Page content moving
 *   under a scroll is not a flash, so this is the measure for the full page.
 * - "pixel" ignores phase: 25% of the area merely has to reach the count at some
 *   point in the second. It can only overstate the risk, so it is the stricter
 *   guard, used on the WebGL canvas alone, where the static lives.
 *
 * Either fails above three flashes in any one-second window. This is modeled on
 * WCAG and is not a certified tool such as PEAT.
 */
export const MAX_FLASHES = 3;
export const AREA_SHARE = 0.25;

export interface FlashFrames {
  width: number;
  height: number;
  /** Packed RGB, one buffer per frame. */
  frames: Uint8Array[];
  fps: number;
}

export interface FlashResult {
  general: number;
  red: number;
  passes: boolean;
}

const toLinear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};
const LINEAR = Float32Array.from({ length: 256 }, (_, index) =>
  toLinear(index),
);

type Counts = (from: number, to: number, saturated: boolean) => boolean;

/** Tracks one signal per pixel and records when it reverses by enough. */
class Transitions {
  private readonly anchor: Float32Array;
  private readonly anchorSaturated: Uint8Array;
  private readonly direction: Int8Array;
  readonly times: number[][];
  /** Every transition by frame: pixel index, signed by direction. */
  readonly events: { pixel: number; up: boolean }[][];

  constructor(size: number, frames: number) {
    this.anchor = new Float32Array(size);
    this.anchorSaturated = new Uint8Array(size);
    this.direction = new Int8Array(size);
    this.times = Array.from({ length: size }, () => []);
    this.events = Array.from({ length: frames }, () => []);
  }

  start(pixel: number, value: number, saturated: boolean) {
    this.anchor[pixel] = value;
    this.anchorSaturated[pixel] = saturated ? 1 : 0;
  }

  update(
    pixel: number,
    value: number,
    saturated: boolean,
    frame: number,
    counts: Counts,
  ) {
    const anchor = this.anchor[pixel] ?? 0;
    const direction = this.direction[pixel] ?? 0;
    if (
      (direction > 0 && value >= anchor) ||
      (direction < 0 && value <= anchor)
    ) {
      this.anchor[pixel] = value;
      this.anchorSaturated[pixel] = saturated ? 1 : 0;
    } else if (
      counts(anchor, value, saturated || this.anchorSaturated[pixel] === 1)
    ) {
      const up = value > anchor;
      this.times[pixel]?.push(frame);
      this.events[frame]?.push({ pixel, up });
      this.direction[pixel] = up ? 1 : -1;
      this.anchor[pixel] = value;
      this.anchorSaturated[pixel] = saturated ? 1 : 0;
    }
  }
}

/** Frames over which changes still count as happening at the same moment. */
const CONCURRENT_FRAMES = 3;

/** The most flashes any area makes in one second, with its pixels in phase. */
function worstConcurrent(
  events: { pixel: number; up: boolean }[][],
  { width, height, frames, fps }: FlashFrames,
) {
  const tileW = Math.max(1, Math.round((width * 341) / 1024));
  const tileH = Math.max(1, Math.round((height * 256) / 768));
  const needed = tileW * tileH * AREA_SHARE;
  const stepX = Math.max(1, Math.floor(tileW / 2));
  const stepY = Math.max(1, Math.floor(tileH / 2));
  const columns = Math.max(1, Math.ceil((width - tileW) / stepX) + 1);
  const rows = Math.max(1, Math.ceil((height - tileH) / stepY) + 1);
  const tiles = columns * rows;
  const span = Math.round(fps);
  const up = Array.from({ length: frames.length }, () => new Int32Array(tiles));
  const down = Array.from(
    { length: frames.length },
    () => new Int32Array(tiles),
  );

  events.forEach((list, frame) => {
    for (const { pixel, up: rising } of list) {
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const target = (rising ? up : down)[frame];
      if (!target) continue;
      for (let row = 0; row < rows; row += 1) {
        const top = Math.min(row * stepY, height - tileH);
        if (y < top || y >= top + tileH) continue;
        for (let column = 0; column < columns; column += 1) {
          const left = Math.min(column * stepX, width - tileW);
          if (x < left || x >= left + tileW) continue;
          const tile = row * columns + column;
          target[tile] = (target[tile] ?? 0) + 1;
        }
      }
    }
  });

  let worst = 0;
  for (let tile = 0; tile < tiles; tile += 1) {
    const moments: number[] = [];
    let last = 0;
    for (let frame = 0; frame < frames.length; frame += 1) {
      let rising = 0;
      let falling = 0;
      for (let back = 0; back < CONCURRENT_FRAMES; back += 1) {
        rising += up[frame - back]?.[tile] ?? 0;
        falling += down[frame - back]?.[tile] ?? 0;
      }
      const now = rising >= needed ? 1 : falling >= needed ? -1 : 0;
      if (now !== 0 && now !== last) {
        moments.push(frame);
        last = now;
      }
    }
    for (let start = 0; start < moments.length; start += 1) {
      const from = moments[start] ?? 0;
      let count = 0;
      for (let at = start; at < moments.length; at += 1) {
        if ((moments[at] ?? 0) >= from + span) break;
        count += 1;
      }
      worst = Math.max(worst, Math.floor(count / 2));
    }
  }
  return worst;
}

/** The highest flash count reached by 25% of any area in any one-second window. */
function worstFlashes(
  times: number[][],
  { width, height, frames, fps }: FlashFrames,
) {
  const tileW = Math.max(1, Math.round((width * 341) / 1024));
  const tileH = Math.max(1, Math.round((height * 256) / 768));
  const needed = tileW * tileH * AREA_SHARE;
  const span = Math.round(fps);
  const stepX = Math.max(1, Math.floor(tileW / 2));
  const stepY = Math.max(1, Math.floor(tileH / 2));
  const lastStart = Math.max(0, frames.length - span);
  const integral = new Int32Array((width + 1) * (height + 1));
  const cursors = new Int32Array(times.length);
  const flashes = new Uint16Array(times.length);
  let worst = 0;

  for (let start = 0; start <= lastStart; start += 2) {
    const end = start + span;
    let highest = 0;
    times.forEach((list, pixel) => {
      let cursor = cursors[pixel] ?? 0;
      while (cursor < list.length && (list[cursor] ?? 0) < start) cursor += 1;
      cursors[pixel] = cursor;
      let count = 0;
      for (let at = cursor; at < list.length; at += 1) {
        if ((list[at] ?? 0) >= end) break;
        count += 1;
      }
      const value = Math.floor(count / 2);
      flashes[pixel] = value;
      if (value > highest) highest = value;
    });

    for (let level = highest; level > worst; level -= 1) {
      for (let y = 0; y < height; y += 1) {
        let row = 0;
        for (let x = 0; x < width; x += 1) {
          if ((flashes[y * width + x] ?? 0) >= level) row += 1;
          integral[(y + 1) * (width + 1) + x + 1] =
            (integral[y * (width + 1) + x + 1] ?? 0) + row;
        }
      }
      let reached = false;
      for (let y = 0; y + tileH <= height && !reached; y += stepY) {
        for (let x = 0; x + tileW <= width; x += stepX) {
          const a = integral[y * (width + 1) + x] ?? 0;
          const b = integral[y * (width + 1) + x + tileW] ?? 0;
          const c = integral[(y + tileH) * (width + 1) + x] ?? 0;
          const d = integral[(y + tileH) * (width + 1) + x + tileW] ?? 0;
          if (d - b - c + a >= needed) {
            reached = true;
            break;
          }
        }
      }
      if (reached) {
        worst = level;
        break;
      }
    }
  }
  return worst;
}

export type FlashMode = "concurrent" | "pixel";

export function analyzeFlashes(
  input: FlashFrames,
  mode: FlashMode = "concurrent",
): FlashResult {
  const { width, height, frames } = input;
  const size = width * height;
  const general = new Transitions(size, frames.length);
  const red = new Transitions(size, frames.length);
  // A general transition is 10% of maximum luminance with the darker side < 0.8.
  const generalCounts: Counts = (from, to) =>
    Math.abs(from - to) >= 0.1 && Math.min(from, to) < 0.8;
  // WCAG 2.2: either side has R / (R + G + B) >= 0.8, and (R-G-B) x 320 moves > 20.
  const redCounts: Counts = (from, to, saturated) =>
    saturated && Math.abs(from - to) > 20;

  frames.forEach((frame, index) => {
    for (let pixel = 0; pixel < size; pixel += 1) {
      const r = LINEAR[frame[pixel * 3] ?? 0] ?? 0;
      const g = LINEAR[frame[pixel * 3 + 1] ?? 0] ?? 0;
      const b = LINEAR[frame[pixel * 3 + 2] ?? 0] ?? 0;
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const sum = r + g + b;
      const saturated = sum > 0 && r / sum >= 0.8;
      const redValue = Math.max(0, r - g - b) * 320;
      if (index === 0) {
        general.start(pixel, luminance, false);
        red.start(pixel, redValue, saturated);
      } else {
        general.update(pixel, luminance, false, index, generalCounts);
        red.update(pixel, redValue, saturated, index, redCounts);
      }
    }
  });

  const generalWorst =
    mode === "pixel"
      ? worstFlashes(general.times, input)
      : worstConcurrent(general.events, input);
  const redWorst =
    mode === "pixel"
      ? worstFlashes(red.times, input)
      : worstConcurrent(red.events, input);
  return {
    general: generalWorst,
    red: redWorst,
    passes: generalWorst <= MAX_FLASHES && redWorst <= MAX_FLASHES,
  };
}
