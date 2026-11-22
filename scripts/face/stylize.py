"""Stylized LED variants: graphic first, recognizable on a second look.

Each file holds two states on one grid: "styled" (2 bits per dot) and "focused"
(16 levels, used by the hover and scroll reveal), plus depth for the 3D version.
"""

import gzip
import json
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from sample import ASPECT, GLOW, PANEL, SIGNAL, UNLIT, find_crop, largest_component, render, to_grid

MAGIC = b"LED2"
HEADER = struct.Struct("<4sHHBB")  # magic, columns, rows, mode, styled levels
MODES = {"levels": 0, "size": 1}
MAX_BYTES = 60 * 1024
FOCUS_LEVELS = 16

# Light output of each styled level. Part B and Phase 4 reuse these ramps.
RAMPS = {3: (0.13, 0.5, 1.0), 4: (0.0, 0.3, 0.62, 1.0)}
HALFTONE_RADII = (0.13, 0.25, 0.36, 0.48)
LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32) + 0.5) / 16


@dataclass
class StyledFace:
    cols: int
    rows: int
    mode: str
    levels: int
    mask: np.ndarray  # bool, rows × cols
    styled: np.ndarray  # one level per visible dot
    focused: np.ndarray  # 0..15, one per visible dot
    depth: np.ndarray  # 0..255, one per visible dot


def pack_bits(values: np.ndarray, width: int) -> bytes:
    bits = (values[:, np.newaxis].astype(np.uint8) >> np.arange(width, dtype=np.uint8)) & 1
    return np.packbits(bits.ravel(), bitorder="little").tobytes()


def unpack_bits(data: bytes, count: int, width: int) -> np.ndarray:
    raw = np.frombuffer(data, np.uint8)
    bits = np.unpackbits(raw, count=count * width, bitorder="little").reshape(count, width)
    return (bits << np.arange(width, dtype=np.uint8)).sum(axis=1).astype(np.uint8)


def pack(face: StyledFace) -> bytes:
    header = HEADER.pack(MAGIC, face.cols, face.rows, MODES[face.mode], face.levels)
    mask = np.packbits(face.mask.ravel(), bitorder="little").tobytes()
    return header + mask + pack_bits(face.styled, 2) + pack_bits(face.focused, 4) + face.depth.tobytes()


def unpack(data: bytes) -> StyledFace:
    magic, cols, rows, mode, levels = HEADER.unpack_from(data)
    if magic != MAGIC:
        raise ValueError("Not an LED2 face file")
    offset = HEADER.size
    mask_size = (cols * rows + 7) // 8
    raw = np.frombuffer(data, np.uint8, mask_size, offset)
    mask = np.unpackbits(raw, count=cols * rows, bitorder="little").astype(bool).reshape(rows, cols)
    offset += mask_size
    count = int(mask.sum())
    styled_size, focused_size = (count * 2 + 7) // 8, (count * 4 + 7) // 8
    if len(data) != offset + styled_size + focused_size + count:
        raise ValueError("Unexpected LED2 file size")
    styled = unpack_bits(data[offset : offset + styled_size], count, 2)
    offset += styled_size
    focused = unpack_bits(data[offset : offset + focused_size], count, 4)
    offset += focused_size
    depth = np.frombuffer(data, np.uint8, count, offset)
    name = next(key for key, value in MODES.items() if value == mode)
    return StyledFace(cols, rows, name, levels, mask, styled, focused, depth)


def smoothstep(values: np.ndarray) -> np.ndarray:
    values = np.clip(values, 0, 1)
    return values * values * (3 - 2 * values)


def blur(values: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray(np.clip(values * 255, 0, 255).astype(np.uint8), mode="L")
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255


def analyze(assets: tuple, box: tuple, cols: int, treatment: dict) -> dict:
    """Grid-level regions: subject, cap, skin, hoodie, tone and the bottom fade."""
    photo, alpha, depth = assets
    rows = round(cols * ASPECT)
    size = (cols, rows)

    alpha_grid = to_grid(alpha, box, size, "L") / 255
    weight = alpha.astype(np.float32) / 255
    linear = (photo.astype(np.float32) / 255) ** 2.2
    channels = [
        to_grid((linear[..., index] * weight).astype(np.float32), box, size, "F")
        for index in range(3)
    ]
    rgb = np.clip(np.stack(channels, -1) / np.maximum(alpha_grid[..., np.newaxis], 1e-3), 0, 1)
    luma = (rgb @ LUMA) ** (1 / 2.2)
    red, green, blue = np.moveaxis(rgb ** (1 / 2.2), -1, 0)
    mask = largest_component(alpha_grid >= 0.5)

    row_index = np.arange(rows)[:, np.newaxis] * np.ones((1, cols))
    ratio = red / (green + 0.02)
    cap = mask & (ratio > treatment["capRatio"]) & (red > 0.2) & (row_index < rows * 0.55)
    skin = mask & ~cap & (red > 0.34) & (red > green) & (green > blue * 0.9) & (ratio > 1.08) & (ratio < treatment["capRatio"])
    skin = largest_component(skin)
    skin_rows = skin.sum(axis=1)
    filled = np.flatnonzero(skin_rows >= max(3, skin_rows.max() * 0.2))
    if filled.size == 0:
        raise RuntimeError("Couldn't locate the face region")
    face_top, chin = int(filled[0]), int(filled[-1])

    hull = np.zeros_like(mask)
    for row in range(face_top, chin + 1):
        columns = np.flatnonzero(skin[row])
        if columns.size:
            hull[row, columns[0] : columns[-1] + 1] = True
    hoodie = mask & ~hull & (row_index >= face_top + (chin - face_top) * 0.6)

    # Tones the eyelet down by capping highlights on the hoodie only.
    if hoodie.any():
        ceiling = np.percentile(luma[hoodie], treatment["eyeletPercentile"])
        luma = np.where(hoodie, np.minimum(luma, ceiling), luma)

    start = chin + rows * treatment["fadeOffset"]
    progress = (row_index - start) / max(rows - 1 - start, 1)
    fade = (1 - smoothstep(progress)) ** treatment["fadeGamma"]
    # The fade starts above the chin for the shoulders, but never touches the face.
    fade = np.where(hull | cap, 1.0, fade)
    # An ordered dither dissolves the bottom into the panel, with no hard edge.
    tile = np.tile(BAYER, (rows // 4 + 1, cols // 4 + 1))[:rows, :cols]
    visible = mask & (fade > treatment["dropBelow"] + tile * treatment["dissolve"])

    depth_grid = to_grid(depth.astype(np.float32), box, size, "F")
    low, high = np.percentile(depth_grid[visible], (1, 99))
    near = np.clip((depth_grid - low) / max(float(high - low), 1e-6), 0, 1)
    return {
        "rows": rows,
        "luma": luma,
        "mask": mask,
        "visible": visible,
        "cap": cap,
        "skin": skin,
        "hull": hull,
        "hoodie": hoodie,
        "fade": fade,
        "near": np.round(near * 255).astype(np.uint8),
    }


def tone(luma: np.ndarray, mask: np.ndarray, contrast: float, gamma: float) -> np.ndarray:
    low, high = np.percentile(luma[mask], (2, 98))
    values = np.clip((luma - low) / max(float(high - low), 1e-6), 0, 1)
    return np.clip((values - 0.5) * contrast + 0.5, 0, 1) ** gamma


def features(regions: dict, params: dict) -> np.ndarray:
    """F's three levels: only the cap, outline and dark facial features stay lit."""
    luma, mask, skin, hull, cap, hoodie = (
        regions[key] for key in ("luma", "mask", "skin", "hull", "cap", "hoodie")
    )
    skin_level = float(np.median(luma[skin]))
    radius = mask.shape[1] / 16
    darker = np.clip((skin_level - luma) / max(skin_level, 1e-3), 0, 1)
    local = np.clip(blur(luma, radius) - luma, 0, 1) / max(skin_level, 1e-3)

    # Overall darkness only counts on the lower face, where the beard is, so
    # side shading on the cheeks and forehead stays flat.
    hull_rows = np.flatnonzero(hull.any(axis=1))
    beard_start = hull_rows[0] + (hull_rows[-1] - hull_rows[0]) * params["beardStart"]
    lower = (np.arange(mask.shape[0])[:, np.newaxis] >= beard_start) * np.ones((1, mask.shape[1]), bool)
    score = np.maximum(local * params["localWeight"], darker * params["globalWeight"] * lower)

    levels = np.zeros_like(mask, dtype=np.uint8)
    face = hull & ~hoodie & ~cap
    levels[face & (score >= params["featureMid"])] = 1
    levels[face & (score >= params["featureOn"])] = 2
    levels[cap] = 1

    interior = mask.copy()
    interior[1:] &= mask[:-1]
    interior[:-1] &= mask[1:]
    interior[:, 1:] &= mask[:, :-1]
    interior[:, :-1] &= mask[:, 1:]
    levels[mask & ~interior] = 2
    return levels


def stylize(assets: tuple, box: tuple, params: dict, treatment: dict) -> StyledFace:
    regions = analyze(assets, box, params["cols"], treatment)
    mask, fade = regions["visible"], regions["fade"]
    luma = regions["luma"]
    sharpened = luma + (luma - blur(luma, params["cols"] / 10)) * params["localContrast"]
    values = tone(sharpened, regions["mask"], params["contrast"], params["gamma"])
    values = np.where(regions["hoodie"], np.maximum(values, treatment["hoodieFloor"]), values)
    # The dither does most of the fading, so tone falls off more gently.
    faded = values * fade**0.35
    focused_values = values * fade**0.6

    if params["style"] == "features":
        levels = features(regions, params)
        # The fade lowers levels toward the bottom instead of dimming each dot.
        styled_grid = np.floor(levels * fade + 0.5).astype(np.uint8)
    else:
        styled_grid = np.digitize(faded, params["thresholds"]).astype(np.uint8)
        if params["style"] == "posterized":
            # Keeps the hoodie at "dim" so only the dither fades it, with no hard line.
            styled_grid = np.where(regions["hoodie"], np.maximum(styled_grid, 1), styled_grid)

    focused_grid = np.round(focused_values * (FOCUS_LEVELS - 1)).astype(np.uint8)
    return StyledFace(
        params["cols"],
        regions["rows"],
        params["mode"],
        params["levels"],
        mask,
        styled_grid[mask],
        focused_grid[mask],
        regions["near"][mask],
    )


def dot_style(face: StyledFace, state: str) -> tuple[np.ndarray, np.ndarray]:
    """Radius (in grid pitches) and light output for every visible dot."""
    if state == "focused":
        value = face.focused.astype(np.float32) / (FOCUS_LEVELS - 1)
        if face.mode == "size":
            return 0.1 + 0.39 * value**0.6, 0.55 + 0.45 * value
        return 0.2 + 0.26 * value**0.5, value
    if face.mode == "size":
        return np.array(HALFTONE_RADII, dtype=np.float32)[face.styled], np.ones(face.styled.shape, np.float32)
    ramp = np.array(RAMPS[face.levels], dtype=np.float32)
    radius = np.full(face.styled.shape, 0.44 if face.cols <= 80 else 0.4, np.float32)
    return radius, ramp[face.styled]


def render_styled(face: StyledFace, width: int, state: str) -> Image.Image:
    """Draws one state from the dot data only, never from the photo."""
    supersample = 3
    height = round(width * face.rows / face.cols)
    pitch = width * supersample / face.cols
    size = (width * supersample, height * supersample)
    lit, unlit = Image.new("L", size, 0), Image.new("L", size, 0)
    draw_lit, draw_unlit = ImageDraw.Draw(lit), ImageDraw.Draw(unlit)

    radii, light = dot_style(face, state)
    index = 0
    for row in range(face.rows):
        cy = (row + 0.5) * pitch
        for col in range(face.cols):
            cx = (col + 0.5) * pitch
            value, radius = 0.0, 0.15
            if face.mask[row, col]:
                value, radius = float(light[index]), float(radii[index])
                index += 1
            if value <= 0.01:
                r = pitch * 0.15
                draw_unlit.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
            else:
                r = pitch * radius
                draw_lit.ellipse((cx - r, cy - r, cx + r, cy + r), fill=round(255 * value))

    target = (width, height)
    dots = np.asarray(lit.resize(target, Image.Resampling.LANCZOS), dtype=np.float32)[..., np.newaxis] / 255
    halo_image = lit.resize(target, Image.Resampling.BILINEAR).filter(ImageFilter.GaussianBlur(width / face.cols * 0.8))
    halo = np.asarray(halo_image, dtype=np.float32)[..., np.newaxis] / 255
    off = np.asarray(unlit.resize(target, Image.Resampling.LANCZOS), dtype=np.float32)[..., np.newaxis] / 255

    color = SIGNAL + (GLOW - SIGNAL) * dots
    panel = PANEL + (UNLIT - PANEL) * off
    result = panel + halo * SIGNAL * 0.36
    result = result * (1 - np.minimum(dots * 1.4, 1)) + color * np.minimum(dots * 1.4, 1)
    return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8), mode="RGB")


def sheet(columns: list[dict], path: Path, width: int) -> None:
    """Styled row on top, focused row below, at the slot's real width."""
    height, gap, label = round(width * ASPECT), 20, 32
    canvas = Image.new(
        "RGB",
        (len(columns) * width + (len(columns) + 1) * gap, 2 * (height + label) + 3 * gap),
        (11, 10, 12),
    )
    draw = ImageDraw.Draw(canvas)
    for index, column in enumerate(columns):
        x = gap + index * (width + gap)
        for row, key in enumerate(("styled", "focused")):
            y = gap + row * (height + label + gap)
            image = column.get(key)
            caption = f"{column['label']}, {key}" if image else f"{column['label']}: no focused state"
            draw.text((x, y), caption, fill=(242, 238, 234), font_size=18)
            if image:
                canvas.paste(image.resize((width, height), Image.Resampling.LANCZOS), (x, y + label))
    canvas.save(path, optimize=True)


def build_all(assets: tuple, config: dict, reference, out: Path) -> None:
    stylized = config["stylized"]
    alpha = assets[1]
    box = find_crop(alpha, stylized["crop"])
    if (alpha[box[1], box[0] : box[2]] > 127).any():
        raise RuntimeError("The crop cuts the top of the cap")

    out.mkdir(parents=True, exist_ok=True)
    columns = [{"label": "B, reference", "styled": render(reference, 880)}]
    report = {"crop": stylized["crop"], "cropBox": box, "treatment": stylized["treatment"], "variants": {}}
    for name, params in stylized["variants"].items():
        face = stylize(assets, box, params, stylized["treatment"])
        data = pack(face)
        if len(data) > MAX_BYTES:
            raise RuntimeError(f"{name} is {len(data)} bytes, over budget")
        decoded = unpack(data)
        for field in ("mask", "styled", "focused", "depth"):
            if not np.array_equal(getattr(decoded, field), getattr(face, field)):
                raise RuntimeError(f"{name}: round-trip mismatch in {field}")

        (out / f"face-{name}.bin").write_bytes(data)
        styled = render_styled(decoded, 880, "styled")
        focused = render_styled(decoded, 880, "focused")
        styled.save(out / f"preview-{name}-styled.png", optimize=True)
        focused.save(out / f"preview-{name}-focused.png", optimize=True)
        columns.append({"label": params["label"], "styled": styled, "focused": focused})
        report["variants"][name] = {
            **params,
            "rows": decoded.rows,
            "dots": int(decoded.mask.sum()),
            "rawBytes": len(data),
            "gzipBytes": len(gzip.compress(data, 9)),
            "styledCounts": np.bincount(decoded.styled, minlength=decoded.levels).tolist(),
        }
        summary = report["variants"][name]
        print(name, json.dumps({key: summary[key] for key in ("cols", "rows", "dots", "rawBytes", "gzipBytes", "styledCounts")}))

    sheet(columns, out / "comparison.png", 440)
    sheet(columns, out / "comparison-phone.png", 356)
    (out / "params.json").write_text(json.dumps(report, indent=2) + "\n")
    print("crop box", box)
