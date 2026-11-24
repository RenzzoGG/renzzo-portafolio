/** Decides whether this visit may load the WebGL world. Part of critical JS. */
const QUERIES = [
  "(pointer: fine)",
  "(hover: hover)",
  "(min-width: 1024px)",
].map((query) => matchMedia(query));

export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

export const motionAllowed = () =>
  !reducedMotion.matches && document.documentElement.dataset.motion !== "off";

export const desktopDevice = () => QUERIES.every((query) => query.matches);

let webgl2: boolean | undefined;

/** Checked once, and only on eligible devices, because a context isn't free. */
export function hasWebGL2() {
  if (webgl2 === undefined) {
    const context = document.createElement("canvas").getContext("webgl2");
    webgl2 = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return webgl2;
}

export const onDeviceChange = (listener: () => void) => {
  for (const query of [...QUERIES, reducedMotion]) {
    query.addEventListener("change", listener);
  }
};
