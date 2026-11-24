"""Crops the portrait, samples the dot grid, and packs or previews LED data."""

import struct
from collections import deque
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

MAGIC = b"LED1"
HEADER = struct.Struct("<4sHH")  # magic, columns, rows
ASPECT = 5 / 4  # The hero slot is 4:5 (width:height).

PANEL = np.array([16, 15, 18], dtype=np.float32)  # --color-surface-subtle
UNLIT = np.array([42, 38, 45], dtype=np.float32)  # --color-border
SIGNAL = np.array([194, 29, 58], dtype=np.float32)  # --color-signal
GLOW = np.array([255, 59, 92], dtype=np.float32)  # --color-glow


@dataclass
class Face:
    cols: int
    rows: int
    mask: np.ndarray  # bool, rows × cols
    brightness: np.ndarray  # uint8, one per visible dot
    depth: np.ndarray  # uint8, one per visible dot


def find_crop(alpha: np.ndarray, crop: dict) -> tuple[int, int, int, int]:
    """Head-and-shoulders box at the slot's ratio, keeping the full cap."""
    subject = alpha > 127
    filled = np.flatnonzero(subject.any(axis=1))
    if filled.size == 0:
        raise RuntimeError("Background removal found no subject")
    top, bottom = int(filled[0]), int(filled[-1])

    band_end = top + max(1, int((bottom - top) * crop["headBand"]))
    widths, centers = [], []
    for row in range(top, band_end):
        columns = np.flatnonzero(subject[row])
        if columns.size:
            widths.append(columns[-1] - columns[0] + 1)
            centers.append((columns[-1] + columns[0]) / 2)
    head_width = float(np.percentile(widths, 90))
    center = float(np.median(centers))

    height_img, width_img = alpha.shape
    width = head_width * crop["headScale"]
    y0 = max(0.0, top - width * ASPECT * crop["topPad"])
    width = min(width, width_img, (height_img - y0) / ASPECT)
    height = width * ASPECT
    x0 = min(max(0.0, center - width / 2), width_img - width)
    return round(x0), round(y0), round(x0 + width), round(y0 + height)


def to_grid(channel: np.ndarray, box: tuple, size: tuple, mode: str) -> np.ndarray:
    image = Image.fromarray(channel, mode=mode).crop(box)
    return np.asarray(image.resize(size, Image.Resampling.BOX), dtype=np.float32)


def largest_component(mask: np.ndarray) -> np.ndarray:
    """Drops stray background specks, keeping the connected subject."""
    rows, cols = mask.shape
    seen = np.zeros_like(mask)
    best: list[tuple[int, int]] = []
    for start in zip(*np.nonzero(mask)):
        if seen[start]:
            continue
        seen[start] = True
        queue, cells = deque([start]), []
        while queue:
            y, x = queue.popleft()
            cells.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < rows and 0 <= nx < cols and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(cells) > len(best):
            best = cells
    result = np.zeros_like(mask)
    if best:
        ys, xs = zip(*best)
        result[list(ys), list(xs)] = True
    return result


def tone(luma: np.ndarray, mask: np.ndarray, params: dict) -> np.ndarray:
    """Maps luminance to 0..1 inside the subject, with tunable contrast and gamma."""
    amount = params["localContrast"]
    if amount > 0:
        image = Image.fromarray(np.clip(luma * 255, 0, 255).astype(np.uint8), mode="L")
        radius = params["cols"] / 14
        blurred = np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255
        luma = luma + (luma - blurred) * amount

    low, high = np.percentile(luma[mask], (params["blackPoint"], params["whitePoint"]))
    values = np.clip((luma - low) / max(float(high - low), 1e-6), 0, 1)
    values = np.clip((values - 0.5) * params["contrast"] + 0.5, 0, 1)
    return values ** params["gamma"]


def sample(photo: np.ndarray, alpha: np.ndarray, depth: np.ndarray, box: tuple, params: dict) -> Face:
    cols = params["cols"]
    rows = round(cols * ASPECT)
    size = (cols, rows)

    # Luminance is averaged in linear light, then returned to display space.
    linear = (photo.astype(np.float32) / 255) ** 2.2
    luma_full = linear @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    alpha_grid = to_grid(alpha, box, size, "L") / 255
    # Weighted by alpha, so bright background can't leak into the silhouette's edge.
    weight = alpha.astype(np.float32) / 255
    weighted = to_grid((luma_full * weight).astype(np.float32), box, size, "F")
    luma = np.clip(weighted / np.maximum(alpha_grid, 1e-3), 0, 1) ** (1 / 2.2)
    depth_grid = to_grid(depth.astype(np.float32), box, size, "F")

    mask = largest_component(alpha_grid >= params["maskThreshold"])
    values = tone(luma, mask, params)
    floor = params["floor"] / 255
    brightness = np.round((floor + values * (1 - floor)) * 255).astype(np.uint8)

    near_low, near_high = np.percentile(depth_grid[mask], (1, 99))
    near = np.clip((depth_grid - near_low) / max(float(near_high - near_low), 1e-6), 0, 1)
    near = np.round(near * 255).astype(np.uint8)
    return Face(cols, rows, mask, brightness[mask], near[mask])


def pack(face: Face) -> bytes:
    """Header, 1-bit mask (row-major, LSB first), brightness plane, depth plane."""
    bits = np.packbits(face.mask.ravel(), bitorder="little").tobytes()
    return HEADER.pack(MAGIC, face.cols, face.rows) + bits + face.brightness.tobytes() + face.depth.tobytes()


def unpack(data: bytes) -> Face:
    magic, cols, rows = HEADER.unpack_from(data)
    if magic != MAGIC:
        raise ValueError("Not an LED face file")
    start = HEADER.size
    mask_size = (cols * rows + 7) // 8
    raw = np.frombuffer(data, np.uint8, mask_size, start)
    mask = np.unpackbits(raw, count=cols * rows, bitorder="little").astype(bool).reshape(rows, cols)
    count = int(mask.sum())
    expected = start + mask_size + count * 2
    if len(data) != expected:
        raise ValueError(f"Expected {expected} bytes, got {len(data)}")
    brightness = np.frombuffer(data, np.uint8, count, start + mask_size)
    depth = np.frombuffer(data, np.uint8, count, start + mask_size + count)
    return Face(cols, rows, mask, brightness, depth)


def render(face: Face, width: int) -> Image.Image:
    """Draws the LED panel from dot data only, never from the photo."""
    supersample = 3
    height = round(width * face.rows / face.cols)
    pitch = width * supersample / face.cols
    size = (width * supersample, height * supersample)
    lit = Image.new("L", size, 0)
    unlit = Image.new("L", size, 0)
    draw_lit, draw_unlit = ImageDraw.Draw(lit), ImageDraw.Draw(unlit)

    level = np.zeros((face.rows, face.cols), dtype=np.float32)
    level[face.mask] = face.brightness.astype(np.float32) / 255
    for row in range(face.rows):
        cy = (row + 0.5) * pitch
        for col in range(face.cols):
            cx = (col + 0.5) * pitch
            if face.mask[row, col]:
                value = float(level[row, col])
                radius = pitch * (0.14 + 0.32 * value**0.5)
                fill = round(55 + 200 * value)
                draw_lit.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=fill)
            else:
                radius = pitch * 0.13
                draw_unlit.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)

    target = (width, height)
    dots = lit.resize(target, Image.Resampling.LANCZOS)
    halo = dots.filter(ImageFilter.GaussianBlur(width / face.cols * 0.9))
    dots_array = np.asarray(dots, dtype=np.float32)[..., np.newaxis] / 255
    halo_array = np.asarray(halo, dtype=np.float32)[..., np.newaxis] / 255
    unlit_array = np.asarray(unlit.resize(target, Image.Resampling.LANCZOS), dtype=np.float32)[..., np.newaxis] / 255

    color = SIGNAL + (GLOW - SIGNAL) * dots_array
    panel = PANEL + (UNLIT - PANEL) * unlit_array
    result = panel + halo_array * SIGNAL * 0.42
    result = result * (1 - dots_array) + color * dots_array
    return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8), mode="RGB")
