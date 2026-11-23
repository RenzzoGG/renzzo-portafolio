const COMPOUND = /([\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+)/u;

/**
 * Splits text around hyphenated compounds such as "Row-Level". Odd indexes are
 * compounds. They keep the normal hyphen, because Geist has no U+2011 glyph and
 * a real hyphen keeps search and CV parsers working.
 */
export const splitCompounds = (text: string) => text.split(COMPOUND);
