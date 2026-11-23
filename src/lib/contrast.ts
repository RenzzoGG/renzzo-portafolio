import { ACCENTS } from "./accents.ts";

/** WCAG 2.x AA thresholds: body text, large text, and UI components. */
export const THRESHOLDS = { body: 4.5, large: 3, ui: 3 } as const;

export type ContrastLevel = keyof typeof THRESHOLDS;

export interface ContrastPair {
  foreground: string;
  background: string;
  level: ContrastLevel;
}

export interface ContrastResult extends ContrastPair {
  foregroundHex: string;
  backgroundHex: string;
  ratio: number;
  passes: boolean;
}

/** Reads custom properties from CSS. The first declaration (`:root`) wins. */
export function parseTokens(css: string): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const tokens = new Map<string, string>();
  for (const match of withoutComments.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value && !tokens.has(name)) {
      tokens.set(name, value.trim().replace(/\s+/g, " "));
    }
  }
  return tokens;
}

/** Follows `var(--x)` aliases until it reaches a 6-digit hex color. */
export function resolveHex(tokens: Map<string, string>, name: string): string {
  const seen = new Set<string>();
  let current = name;
  while (!seen.has(current)) {
    seen.add(current);
    const value = tokens.get(current);
    if (value === undefined) throw new Error(`Unknown token: ${current}`);
    if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
    const alias = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
    if (!alias) throw new Error(`${current} is not a hex color: ${value}`);
    current = alias;
  }
  throw new Error(`Circular token reference: ${name}`);
}

function relativeLuminance(hex: string): number {
  const channel = (start: number) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  ) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const SURFACES = [
  "--color-bg",
  "--color-surface-subtle",
  "--color-surface",
  "--color-surface-raised",
  "--color-surface-hover",
];
const BASE_SURFACES = ["--color-bg", "--color-surface"];

function across(
  foreground: string,
  backgrounds: string[],
  level: ContrastLevel,
): ContrastPair[] {
  return backgrounds.map((background) => ({ foreground, background, level }));
}

/** Every text and UI pairing the design system allows. */
export const CONTRAST_PAIRS: ContrastPair[] = [
  ...across("--color-text", SURFACES, "body"),
  ...across("--color-muted", SURFACES, "body"),
  ...across("--color-glow", SURFACES, "body"),
  ...across("--color-signal", BASE_SURFACES, "large"),
  ...across("--color-border-strong", SURFACES, "ui"),
  ...across("--color-focus-ring", SURFACES, "ui"),
  ...across("--color-on-signal", ["--color-signal"], "body"),
  ...across("--color-on-signal", ["--color-signal-hover"], "body"),
  ...across("--color-ink", ["--color-bone"], "body"),
  ...across("--color-muted-on-bone", ["--color-bone"], "body"),
  ...across("--color-signal", ["--color-bone"], "body"),
  ...across("--color-border-strong", ["--color-bone"], "ui"),
  ...across("--color-bone", ["--color-ink"], "body"),
  ...ACCENTS.flatMap((accent) => [
    ...across(`--accent-${accent}-text`, SURFACES, "body"),
    ...across(`--accent-${accent}-on`, [`--accent-${accent}`], "body"),
  ]),
];

export function evaluatePairs(
  tokens: Map<string, string>,
  pairs: ContrastPair[] = CONTRAST_PAIRS,
): ContrastResult[] {
  return pairs.map((pair) => {
    const foregroundHex = resolveHex(tokens, pair.foreground);
    const backgroundHex = resolveHex(tokens, pair.background);
    const ratio = contrastRatio(foregroundHex, backgroundHex);
    return {
      ...pair,
      foregroundHex,
      backgroundHex,
      ratio,
      passes: ratio >= THRESHOLDS[pair.level],
    };
  });
}
