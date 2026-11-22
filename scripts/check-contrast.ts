import { readFileSync } from "node:fs";
import { evaluatePairs, parseTokens } from "../src/lib/contrast.ts";

const css = readFileSync(
  new URL("../src/styles/tokens.css", import.meta.url),
  "utf8",
);
const results = evaluatePairs(parseTokens(css));
const failures = results.filter((result) => !result.passes);

for (const result of results) {
  const status = result.passes ? "pass" : "FAIL";
  console.log(
    `${status}  ${result.ratio.toFixed(2).padStart(5)}:1  ${result.level.padEnd(5)}  ${result.foreground} on ${result.background}`,
  );
}

console.log(`\n${results.length - failures.length}/${results.length} pass`);
if (failures.length > 0) process.exit(1);
