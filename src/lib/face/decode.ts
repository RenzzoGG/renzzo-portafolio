/**
 * Decodes the LED2 face file. Renderer-independent, so the 2D canvas and the
 * Phase 4 Three.js version share the same data.
 *
 * Layout: header (magic, columns, rows, mode, levels), 1-bit mask, styled
 * plane (2 bits per dot), focused plane (4 bits per dot), depth (1 byte per dot).
 */
const HEADER_SIZE = 10;

export interface LedFace {
  cols: number;
  rows: number;
  /** "size": the styled level sets dot radius. "levels": it sets brightness. */
  mode: "levels" | "size";
  levels: number;
  count: number;
  /** Grid position of each visible dot. */
  column: Uint16Array;
  row: Uint16Array;
  styled: Uint8Array;
  /** 0–15. Used by the Phase 4 hover and scroll reveal. */
  focused: Uint8Array;
  /** 0–255, larger is closer. */
  depth: Uint8Array;
}

function unpack(bytes: Uint8Array, count: number, width: number): Uint8Array {
  const values = new Uint8Array(count);
  const mask = (1 << width) - 1;
  for (let index = 0; index < count; index += 1) {
    const bit = index * width;
    values[index] = ((bytes[bit >> 3] ?? 0) >> (bit & 7)) & mask;
  }
  return values;
}

export function decodeFace(buffer: ArrayBuffer): LedFace {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    ...new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)),
  );
  if (magic !== "LED2" || buffer.byteLength < HEADER_SIZE) {
    throw new Error("Not an LED2 face file");
  }

  const cols = view.getUint16(4, true);
  const rows = view.getUint16(6, true);
  const modeId = view.getUint8(8);
  const levels = view.getUint8(9);
  const cells = cols * rows;
  const maskSize = (cells + 7) >> 3;
  const mask = new Uint8Array(buffer, HEADER_SIZE, maskSize);

  let count = 0;
  for (let cell = 0; cell < cells; cell += 1) {
    count += ((mask[cell >> 3] ?? 0) >> (cell & 7)) & 1;
  }
  const styledSize = (count * 2 + 7) >> 3;
  const focusedSize = (count * 4 + 7) >> 3;
  const styledStart = HEADER_SIZE + maskSize;
  const focusedStart = styledStart + styledSize;
  const depthStart = focusedStart + focusedSize;
  if (buffer.byteLength !== depthStart + count) {
    throw new Error("Unexpected LED2 file size");
  }

  const column = new Uint16Array(count);
  const row = new Uint16Array(count);
  let dot = 0;
  for (let cell = 0; cell < cells; cell += 1) {
    if (((mask[cell >> 3] ?? 0) >> (cell & 7)) & 1) {
      column[dot] = cell % cols;
      row[dot] = Math.floor(cell / cols);
      dot += 1;
    }
  }

  return {
    cols,
    rows,
    mode: modeId === 1 ? "size" : "levels",
    levels,
    count,
    column,
    row,
    styled: unpack(new Uint8Array(buffer, styledStart, styledSize), count, 2),
    focused: unpack(
      new Uint8Array(buffer, focusedStart, focusedSize),
      count,
      4,
    ),
    depth: new Uint8Array(buffer, depthStart, count),
  };
}
