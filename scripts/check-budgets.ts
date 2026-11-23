/** Fails if any shipped budget from docs/PLAN.md is exceeded. */
import { measureBudgets } from "./budgets.ts";

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
const budgets = measureBudgets();
for (const { label, value, limit } of budgets) {
  const state = value <= limit ? "ok  " : "FAIL";
  console.log(`${state} ${label}: ${kb(value)} of ${kb(limit)}`);
}
if (budgets.some(({ value, limit }) => value > limit)) process.exit(1);
