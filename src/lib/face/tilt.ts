/** Phone gyroscope tilt for the 2D face. Loaded only after the visitor taps. */
const MAX_DEGREES = 9;

interface OrientationPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export interface FaceTilt {
  stop(): void;
}

export async function startTilt(target: HTMLElement): Promise<FaceTilt | null> {
  // iOS only allows this request from inside the tap that called it.
  const api = DeviceOrientationEvent as unknown as OrientationPermission;
  if (api.requestPermission && (await api.requestPermission()) !== "granted") {
    return null;
  }

  let baseBeta: number | null = null;
  let aimX = 0;
  let aimY = 0;
  let x = 0;
  let y = 0;
  let frame = 0;
  let last = 0;

  const clamp = (value: number) =>
    Math.max(-MAX_DEGREES, Math.min(MAX_DEGREES, value));

  const onOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return;
    baseBeta ??= event.beta;
    aimX = clamp((baseBeta - event.beta) * 0.45);
    aimY = clamp(event.gamma * 0.45);
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now;
    const follow = 1 - Math.exp(-dt * 9);
    x += (aimX - x) * follow;
    y += (aimY - y) * follow;
    target.style.transform = `perspective(900px) rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`;
  };

  addEventListener("deviceorientation", onOrientation);
  frame = requestAnimationFrame(tick);

  return {
    stop() {
      cancelAnimationFrame(frame);
      removeEventListener("deviceorientation", onOrientation);
      target.style.transform = "";
    },
  };
}
