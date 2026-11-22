"""Paths, pinned model weights and verified downloads for the face pipeline."""

import hashlib
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PHOTO = ROOT / "assets-src" / "face.webp"
CACHE = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "renzzo-face"
MODEL_DIR = CACHE / "models"
# Masks and depth maps derived from the photo stay here, outside the repo.
WORK_DIR = CACHE / "work"

MODELS = {
    "isnet-general-use": {
        "url": "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx",
        "sha256": "60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a",
    },
    "depth-anything-v2-small": {
        "url": "https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/4472b7362082ad9968fee890ca0f1e5aca36b93d/onnx/model.onnx",
        "sha256": "afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c",
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        while chunk := file.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def ensure_model(name: str) -> Path:
    """Returns the verified weights, downloading them only if they're missing."""
    model = MODELS[name]
    path = MODEL_DIR / f"{name}.onnx"
    if path.exists():
        if sha256(path) != model["sha256"]:
            raise RuntimeError(f"Checksum mismatch for cached model: {path}")
        return path

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    partial = path.with_suffix(".part")
    print(f"Downloading {name}…", flush=True)
    urllib.request.urlretrieve(model["url"], partial)
    if sha256(partial) != model["sha256"]:
        partial.unlink()
        raise RuntimeError(f"Checksum mismatch for downloaded model: {name}")
    partial.replace(path)
    return path


def work_path(stage: str, model: str) -> Path:
    """Cache path keyed by the photo and model, so a new photo reruns the stage."""
    key = hashlib.sha256(
        f"{sha256(PHOTO)}:{MODELS[model]['sha256']}".encode()
    ).hexdigest()[:16]
    return WORK_DIR / f"{stage}-{key}.npy"


def session(path: Path):
    """A CPU session tuned for a machine with little memory."""
    import onnxruntime as ort

    options = ort.SessionOptions()
    options.enable_cpu_mem_arena = False
    options.intra_op_num_threads = 3
    return ort.InferenceSession(
        str(path), sess_options=options, providers=["CPUExecutionProvider"]
    )
