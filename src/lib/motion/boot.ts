/** Critical entry for text motion. GSAP only loads after paint, load and idle. */
import { motionAllowed, onDeviceChange } from "../world/gate.ts";

let stop: (() => void) | null = null;
let loading = false;

const sync = () => {
  if (!motionAllowed()) {
    stop?.();
    stop = null;
    return;
  }
  if (stop || loading) return;
  loading = true;
  void import("./core.ts")
    .then(({ startMotion }) => {
      if (motionAllowed() && !stop) stop = startMotion();
    })
    .catch(() => undefined) // Without motion, the page is already final.
    .finally(() => {
      loading = false;
    });
};

const begin = () => {
  new MutationObserver(sync).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  onDeviceChange(() => {
    stop?.();
    stop = null;
    sync();
  });
  sync();
};

const whenIdle = () => {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(begin, { timeout: 2500 });
  } else {
    setTimeout(begin, 300);
  }
};

if (document.readyState === "complete") whenIdle();
else addEventListener("load", whenIdle, { once: true });
