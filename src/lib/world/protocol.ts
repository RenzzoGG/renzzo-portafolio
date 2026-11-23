/** Messages between the page and the renderer, in a worker or on the main thread. */
export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface View {
  width: number;
  height: number;
  dpr: number;
  /** Height of the header, which the analog effect must keep readable. */
  top: number;
}

export interface WorldStats {
  fps: number;
  frameMs: number;
  dpr: number;
  quality: number;
}

/** Where the drum sits on the page, in CSS pixels, and each screen's accent. */
export interface DrumLayout {
  x: number;
  width: number;
  accents: [number, number, number][];
}

export type ToWorld =
  | { type: "view"; view: View; slot: SlotRect }
  | { type: "slot"; slot: SlotRect }
  | { type: "journey"; value: number }
  | { type: "drum"; drum: DrumLayout }
  | { type: "texture"; index: number; url: string }
  | { type: "pointer"; x: number; y: number; inside: boolean }
  | { type: "active"; active: boolean }
  | { type: "dispose" };

export interface WorldInit {
  type: "init";
  canvas: OffscreenCanvas;
  faceUrl: string;
  view: View;
  slot: SlotRect;
  journey: number;
  drum: DrumLayout;
  stats: boolean;
}

export type FromWorld =
  | { type: "first-frame" }
  | { type: "failed" }
  | { type: "disposed" }
  | { type: "stats"; stats: WorldStats };
