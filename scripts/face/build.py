"""Builds LED face data. See the "Face pipeline" section of the README."""

import argparse
import gzip
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from models import PHOTO, ROOT, work_path
from sample import find_crop, pack, render, sample, unpack

HERE = Path(__file__).resolve().parent
MAX_BYTES = 60 * 1024
OUTPUT = ROOT / "src" / "assets" / "face" / "face.bin"


def run_stage(name: str) -> None:
    subprocess.run([sys.executable, str(HERE / name)], check=True, cwd=HERE)


def build_variant(assets: tuple, box: tuple, params: dict) -> tuple[bytes, object]:
    photo, alpha, depth = assets
    face = sample(photo, alpha, depth, box, params)
    data = pack(face)
    if len(data) > MAX_BYTES:
        raise RuntimeError(f"Face data is {len(data)} bytes, over the {MAX_BYTES} budget")

    decoded = unpack(data)
    same = (
        np.array_equal(decoded.mask, face.mask)
        and np.array_equal(decoded.brightness, face.brightness)
        and np.array_equal(decoded.depth, face.depth)
    )
    if not same:
        raise RuntimeError("Round-trip decode doesn't match the sampled data")
    return data, decoded


def comparison(previews: list[tuple[str, Image.Image]], path: Path, width: int) -> None:
    """Side-by-side sheet at the width the hero slot has on a given screen."""
    height, gap, label = round(width * 5 / 4), 24, 36
    sheet = Image.new(
        "RGB",
        (len(previews) * width + (len(previews) + 1) * gap, height + label + gap * 2),
        (11, 10, 12),
    )
    draw = ImageDraw.Draw(sheet)
    for index, (name, image) in enumerate(previews):
        x = gap + index * (width + gap)
        draw.text((x, gap), name, fill=(242, 238, 234), font_size=20)
        sheet.paste(image.resize((width, height), Image.Resampling.LANCZOS), (x, gap + label))
    sheet.save(path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all-variants", action="store_true", help="build every variant with previews")
    parser.add_argument("--out", type=Path, help="output folder for --all-variants")
    args = parser.parse_args()
    if args.all_variants and not args.out:
        parser.error("--all-variants needs --out")

    config = json.loads((HERE / "variants.json").read_text())
    selected = config["selected"]
    if not args.all_variants and selected is None:
        raise SystemExit('No variant chosen yet: set "selected" in scripts/face/variants.json.')

    # Each model runs in its own process, so its memory is freed before the next.
    run_stage("segment.py")
    run_stage("depth.py")

    photo = np.asarray(Image.open(PHOTO).convert("RGB"), dtype=np.uint8)
    alpha = np.load(work_path("mask", "isnet-general-use"))
    depth = np.load(work_path("depth", "depth-anything-v2-small"))
    assets = (photo, alpha, depth)
    box = find_crop(alpha, config["crop"])

    if not args.all_variants:
        data, _ = build_variant(assets, box, config["variants"][selected])
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(data)
        print(f"{OUTPUT.relative_to(ROOT)}: {len(data)} B raw, {len(gzip.compress(data, 9))} B gzip")
        return

    out = args.out if args.out.is_absolute() else ROOT / args.out
    out.mkdir(parents=True, exist_ok=True)
    report, previews = {"crop": config["crop"], "cropBox": box, "variants": {}}, []
    for name, params in config["variants"].items():
        data, decoded = build_variant(assets, box, params)
        (out / f"face-{name}.bin").write_bytes(data)
        preview = render(decoded, 880)
        preview.save(out / f"preview-{name}.png", optimize=True)
        previews.append((params["label"], preview))
        report["variants"][name] = {
            **params,
            "rows": decoded.rows,
            "dots": int(decoded.mask.sum()),
            "rawBytes": len(data),
            "gzipBytes": len(gzip.compress(data, 9)),
        }
        print(name, json.dumps({k: report["variants"][name][k] for k in ("cols", "rows", "dots", "rawBytes", "gzipBytes")}))

    comparison(previews, out / "comparison.png", 440)
    comparison(previews, out / "comparison-phone.png", 356)
    (out / "params.json").write_text(json.dumps(report, indent=2) + "\n")
    print("crop box", box)


if __name__ == "__main__":
    main()
