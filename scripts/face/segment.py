"""Stage 1: background removal with IS-Net. Writes an alpha mask to the cache."""

import numpy as np
from PIL import Image

from models import PHOTO, WORK_DIR, ensure_model, session, work_path

MODEL = "isnet-general-use"
SIZE = 1024


def main() -> None:
    output = work_path("mask", MODEL)
    if output.exists():
        return

    photo = Image.open(PHOTO).convert("RGB")
    resized = photo.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    pixels = np.asarray(resized, dtype=np.float32)
    pixels = pixels / max(float(pixels.max()), 1e-6) - 0.5
    batch = pixels.transpose(2, 0, 1)[np.newaxis]

    model = session(ensure_model(MODEL))
    result = model.run(None, {model.get_inputs()[0].name: batch})[0][0, 0]
    low, high = float(result.min()), float(result.max())
    alpha = ((result - low) / max(high - low, 1e-6) * 255).astype(np.uint8)
    mask = Image.fromarray(alpha).resize(photo.size, Image.Resampling.LANCZOS)

    WORK_DIR.mkdir(parents=True, exist_ok=True)
    np.save(output, np.asarray(mask, dtype=np.uint8))


if __name__ == "__main__":
    main()
