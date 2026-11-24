/**
 * Phone gyroscope tilt for the 2D face. Loaded after the visitor taps and the
 * permission is granted. The slot turns in 3D and the depth layers slide apart.
 */
const GAIN = 1.15;
const MAX_DEGREES = 16;
const PERSPECTIVE = 560;
const PARALLAX_PX_PER_DEGREE = 1.5;
const FOLLOW = 7;
/** The rest position eases to how the phone is being held. */
const RECENTER = 0.08;
const FIRST_EVENT_MS = 2000;
const GLITCH_SPEED = 75; // Degrees per second.
const GLITCH_MS = 180;
/** At most two glitches a second, well under the three-flash limit. */
const GLITCH_GAP_MS = 500;

/**
 * WCAG 2.3.1: dense crimson dots swinging quickly read as a red flash. Two
 * direction changes in this window mean a shake, so the face almost holds still.
 */
const SHAKE_WINDOW_MS = 700;
const SHAKE_TURNS = 2;
const SHAKE_DEADZONE = 0.5;
const SHAKE_HOLD = 0.08;
const SHAKE_IN = 22;
const SHAKE_OUT = 1.4;

export interface FaceTilt {
  stop(): void;
}

const clamp = (value: number) =>
  Math.max(-MAX_DEGREES, Math.min(MAX_DEGREES, value));

/** Beta and gamma trade places when the phone is held sideways. */
function readAxes(beta: number, gamma: number) {
  // Only trusted in landscape: some browsers report an angle while upright.
  const legacy = (window as unknown as { orientation?: number }).orientation;
  const angle = matchMedia("(orientation: landscape)").matches
    ? (screen.orientation?.angle ?? legacy ?? 0)
    : 0;
  if (angle === 90) return { pitch: -gamma, roll: beta };
  if (angle === 270 || angle === -90) return { pitch: gamma, roll: -beta };
  return { pitch: beta, roll: gamma };
}

/** Resolves once real sensor data arrives, or null if none ever does. */
export function startTilt(target: HTMLElement): Promise<FaceTilt | null> {
  let basePitch: number | null = null;
  let baseRoll = 0;
  let pitch = 0;
  let roll = 0;
  let aimX = 0;
  let aimY = 0;
  let x = 0;
  let y = 0;
  let lastAimX = 0;
  let lastAimY = 0;
  let frame = 0;
  let last = 0;
  let nextGlitch = 0;
  let glitchTimer = 0;
  let damp = 1;
  let turnX = 0;
  let turnY = 0;
  let turnAimX = 0;
  let turnAimY = 0;
  let turns: number[] = [];

  /** Counts reversals, ignoring sensor noise smaller than the deadzone. */
  const reversed = (aim: number, from: number, direction: number) => {
    const change = aim - from;
    if (Math.abs(change) < SHAKE_DEADZONE)
      return { direction, from, turned: false };
    const next = Math.sign(change);
    return {
      direction: next,
      from: aim,
      turned: direction !== 0 && next !== direction,
    };
  };

  const glitch = (now: number) => {
    nextGlitch = now + GLITCH_GAP_MS;
    target.dataset.faceGlitch = "";
    clearTimeout(glitchTimer);
    glitchTimer = window.setTimeout(() => {
      delete target.dataset.faceGlitch;
    }, GLITCH_MS);
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - (last || now)) / 1000, 0.1);
    last = now;
    if (basePitch !== null) {
      const ease = 1 - Math.exp(-dt * RECENTER);
      basePitch += (pitch - basePitch) * ease;
      baseRoll += (roll - baseRoll) * ease;
      aimX = clamp((basePitch - pitch) * GAIN);
      aimY = clamp((roll - baseRoll) * GAIN);
    }
    const onX = reversed(aimX, turnAimX, turnX);
    const onY = reversed(aimY, turnAimY, turnY);
    turnX = onX.direction;
    turnAimX = onX.from;
    turnY = onY.direction;
    turnAimY = onY.from;
    if (onX.turned || onY.turned) turns.push(now);
    turns = turns.filter((time) => now - time < SHAKE_WINDOW_MS);
    const shaking = turns.length >= SHAKE_TURNS;
    const rate = shaking ? SHAKE_IN : SHAKE_OUT;
    damp += ((shaking ? SHAKE_HOLD : 1) - damp) * (1 - Math.exp(-dt * rate));
    if (dt > 0 && !shaking && damp > 0.9) {
      const speed = Math.hypot(aimX - lastAimX, aimY - lastAimY) / dt;
      if (speed > GLITCH_SPEED && now >= nextGlitch) glitch(now);
    }
    lastAimX = aimX;
    lastAimY = aimY;
    const follow = 1 - Math.exp(-dt * FOLLOW);
    x += (aimX * damp - x) * follow;
    y += (aimY * damp - y) * follow;
    target.style.transform = `perspective(${PERSPECTIVE}px) rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(2)}deg)`;
    target.style.setProperty(
      "--face-x",
      `${(y * PARALLAX_PX_PER_DEGREE).toFixed(2)}px`,
    );
    target.style.setProperty(
      "--face-y",
      `${(-x * PARALLAX_PX_PER_DEGREE).toFixed(2)}px`,
    );
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    clearTimeout(glitchTimer);
    removeEventListener("deviceorientation", onOrientation);
    target.style.removeProperty("transform");
    target.style.removeProperty("--face-x");
    target.style.removeProperty("--face-y");
    delete target.dataset.faceGlitch;
  };

  let confirm: (tilt: FaceTilt | null) => void = () => undefined;
  const onOrientation = (event: DeviceOrientationEvent) => {
    if (event.beta === null || event.gamma === null) return;
    const axes = readAxes(event.beta, event.gamma);
    pitch = axes.pitch;
    roll = axes.roll;
    if (basePitch === null) {
      basePitch = pitch;
      baseRoll = roll;
      frame = requestAnimationFrame(tick);
      confirm({ stop });
    }
  };

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      stop();
      resolve(null); // "On" is only ever shown for a sensor that really reports.
    }, FIRST_EVENT_MS);
    confirm = (tilt) => {
      clearTimeout(timeout);
      resolve(tilt);
    };
    addEventListener("deviceorientation", onOrientation);
  });
}
