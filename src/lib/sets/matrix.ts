/**
 * The Skills LED board: a decorative 2D canvas. The real lists stay in the DOM.
 * It only draws while on screen, and holds one still frame when motion is off.
 */
import { motionAllowed, reducedMotion } from "../world/gate.ts";

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ().,/&-+·";
const FONT =
  "3E5149453E" +
  "00427F4000" +
  "4261514946" +
  "2141454B31" +
  "1814127F10" +
  "2745454539" +
  "3C4A494930" +
  "0171090503" +
  "3649494936" +
  "064949291E" +
  "7E1111117E" +
  "7F49494936" +
  "3E41414122" +
  "7F4141221C" +
  "7F49494941" +
  "7F09090901" +
  "3E4149497A" +
  "7F0808087F" +
  "00417F4100" +
  "2040413F01" +
  "7F08142241" +
  "7F40404040" +
  "7F020C027F" +
  "7F0408107F" +
  "3E4141413E" +
  "7F09090906" +
  "3E4151215E" +
  "7F09192946" +
  "4649494931" +
  "01017F0101" +
  "3F4040403F" +
  "1F2040201F" +
  "3F4038403F" +
  "6314081463" +
  "0708700807" +
  "6151494543" +
  "001C224100" +
  "0041221C00" +
  "0060600000" +
  "0050300000" +
  "2010080402" +
  "3649552250" +
  "0808080808" +
  "08083E0808" +
  "0000080000";
const CELL = 6;
const LINE = 9;
const FRAME_MS = 66;
const SWEEP_MS = 3200;

const column = (char: string, x: number) => {
  const index = CHARS.indexOf(char);
  if (index < 0) return 0;
  return Number.parseInt(
    FONT.slice(index * 10 + x * 2, index * 10 + x * 2 + 2),
    16,
  );
};

/** Wraps on word boundaries. A separator never starts or ends a line. */
function wrap(items: string[], columns: number) {
  const limit = Math.max(8, Math.floor(columns / CELL));
  const words = items.flatMap((item, index) => {
    const parts = item.toUpperCase().split(" ");
    if (index < items.length - 1) parts[parts.length - 1] += " ·";
    return parts;
  });
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > limit && line) {
      lines.push(line.replace(/ ·$/, ""));
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line.replace(/ ·$/, ""));
  return lines;
}

export function createMatrix(canvas: HTMLCanvasElement, groups: string[][]) {
  const context = canvas.getContext("2d");
  if (!context) return { show: () => undefined };
  const styles = getComputedStyle(document.documentElement);
  const lit = styles.getPropertyValue("--color-glow").trim();
  const off = styles.getPropertyValue("--color-led-off").trim();
  const layer = document.createElement("canvas");
  const layerContext = layer.getContext("2d");

  let active = 0;
  let pitch = 4;
  let dpr = 1;
  let visible = false;
  let raf = 0;
  let last = 0;

  const paintLayer = () => {
    if (!layerContext) return;
    layerContext.clearRect(0, 0, layer.width, layer.height);
    layerContext.fillStyle = lit;
    const size = pitch * dpr;
    const columns = Math.floor(canvas.width / size);
    wrap(groups[active] ?? [], columns).forEach((text, row) => {
      [...text].forEach((char, place) => {
        for (let x = 0; x < 5; x += 1) {
          const bits = column(char, x);
          for (let y = 0; y < 7; y += 1) {
            if (!(bits & (1 << y))) continue;
            layerContext.beginPath();
            layerContext.arc(
              (1 + place * CELL + x + 0.5) * size,
              (1 + row * LINE + y + 0.5) * size,
              size * 0.42,
              0,
              Math.PI * 2,
            );
            layerContext.fill();
          }
        }
      });
    });
  };

  const backdrop = () => {
    const tile = document.createElement("canvas");
    const size = Math.max(1, Math.round(pitch * dpr));
    tile.width = size;
    tile.height = size;
    const tileContext = tile.getContext("2d");
    if (!tileContext) return null;
    tileContext.fillStyle = off;
    tileContext.beginPath();
    tileContext.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
    tileContext.fill();
    return context.createPattern(tile, "repeat");
  };
  let pattern: CanvasPattern | null = null;

  const draw = (time: number) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (pattern) {
      context.fillStyle = pattern;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    const moving = motionAllowed();
    context.globalAlpha = moving ? 0.86 : 1;
    context.drawImage(layer, 0, 0);
    context.globalAlpha = 1;
    if (moving) {
      // A soft band of extra brightness travels across the lit dots.
      const band = canvas.width * 0.16;
      const x =
        ((time % SWEEP_MS) / SWEEP_MS) * (canvas.width + band * 2) - band;
      context.save();
      context.globalCompositeOperation = "lighter";
      context.beginPath();
      context.rect(x, 0, band, canvas.height);
      context.clip();
      context.globalAlpha = 0.42;
      context.drawImage(layer, 0, 0);
      context.restore();
    }
  };

  const tick = (time: number) => {
    raf = 0;
    if (!visible || !motionAllowed()) return;
    if (time - last >= FRAME_MS) {
      last = time;
      draw(time);
    }
    raf = requestAnimationFrame(tick);
  };

  const sync = () => {
    if (visible && motionAllowed()) {
      if (!raf) raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      draw(0);
    }
  };

  const layout = () => {
    const width = canvas.clientWidth;
    if (!width) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    pitch = width >= 640 ? 4 : 3;
    const columns = Math.floor(width / pitch);
    const rows = Math.max(
      ...groups.map((group) => wrap(group, columns).length),
    );
    const height = (rows * LINE + 1) * pitch;
    canvas.style.height = `${height}px`;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    layer.width = canvas.width;
    layer.height = canvas.height;
    pattern = backdrop();
    paintLayer();
    draw(0);
  };

  new ResizeObserver(layout).observe(canvas.parentElement ?? canvas);
  new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    sync();
  }).observe(canvas);
  new MutationObserver(sync).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  reducedMotion.addEventListener("change", sync);
  layout();

  return {
    show(index: number) {
      active = index;
      paintLayer();
      draw(performance.now());
    },
  };
}
