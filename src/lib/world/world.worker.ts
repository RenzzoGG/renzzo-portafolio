/// <reference lib="webworker" />
import { decodeFace } from "../face/decode.ts";
import type { FromWorld, ToWorld, WorldInit } from "./protocol.ts";
import { createScene, type WorldScene } from "./scene.ts";

const context = self as unknown as DedicatedWorkerGlobalScope;
const send = (message: FromWorld) => {
  context.postMessage(message);
};

let scene: WorldScene | null = null;
let closing = false;
let active = true;

async function init(message: WorldInit) {
  try {
    if (typeof context.requestAnimationFrame !== "function") {
      throw new Error("No animation frames in this worker");
    }
    const response = await fetch(message.faceUrl);
    if (!response.ok) throw new Error("Face data unavailable");
    const face = decodeFace(await response.arrayBuffer());
    if (closing) return;
    scene = createScene({
      canvas: message.canvas,
      face,
      view: message.view,
      slot: message.slot,
      onFirstFrame: () => {
        send({ type: "first-frame" });
      },
      onFailed: () => {
        send({ type: "failed" });
      },
      onStats: message.stats
        ? (stats) => {
            send({ type: "stats", stats });
          }
        : undefined,
    });
    // The hero may have left the screen while the scene was loading.
    scene.setActive(active);
  } catch {
    send({ type: "failed" });
  }
}

context.onmessage = (event: MessageEvent<ToWorld | WorldInit>) => {
  const message = event.data;
  switch (message.type) {
    case "init":
      void init(message);
      break;
    case "view":
      scene?.setView(message.view, message.slot);
      break;
    case "slot":
      scene?.setSlot(message.slot);
      break;
    case "pointer":
      scene?.setPointer(message.x, message.y, message.inside);
      break;
    case "active":
      active = message.active;
      scene?.setActive(active);
      break;
    case "dispose":
      closing = true;
      scene?.dispose();
      scene = null;
      send({ type: "disposed" });
      break;
  }
};
