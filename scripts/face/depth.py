"""Stage 2: monocular depth with Depth Anything V2 Small. Larger values are closer."""

import numpy as np
from PIL import Image

from models import PHOTO, WORK_DIR, ensure_model, session, work_path

MODEL = "depth-anything-v2-small"
SHORT_SIDE = 518
MULTIPLE = 14
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def fit(value: float) -> int:
    return max(MULTIPLE, round(value / MULTIPLE) * MULTIPLE)


def main() -> None:
    output = work_path("depth", MODEL)
    if output.exists():
        return

    photo = Image.open(PHOTO).convert("RGB")
    scale = SHORT_SIDE / min(photo.size)
    size = (fit(photo.width * scale), fit(photo.height * scale))
    resized = photo.resize(size, Image.Resampling.BICUBIC)
    pixels = (np.asarray(resized, dtype=np.float32) / 255 - MEAN) / STD
    batch = pixels.transpose(2, 0, 1)[np.newaxis]

    model = session(ensure_model(MODEL))
    result = model.run(None, {model.get_inputs()[0].name: batch})[0]
    depth = Image.fromarray(np.squeeze(result).astype(np.float32), mode="F")
    depth = depth.resize(photo.size, Image.Resampling.BICUBIC)

    WORK_DIR.mkdir(parents=True, exist_ok=True)
    np.save(output, np.asarray(depth, dtype=np.float32))


if __name__ == "__main__":
    main()
