/** Project accents. Each name must have matching tokens in tokens.css. */
export const ACCENTS = ["clearline", "pulse", "fernwick", "stocktill"] as const;

export type Accent = (typeof ACCENTS)[number];
