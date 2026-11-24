import faceUrl from "../../assets/face/face.bin?url";
import { decodeFace, type LedFace } from "./decode.ts";

let pending: Promise<LedFace> | null = null;

/** Fetches and decodes the face once. A failed load can be retried. */
export function loadFace(): Promise<LedFace> {
  pending ??= fetch(faceUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Face data: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(decodeFace)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}
