import { gradeForScore } from "../server/src/utils/grade.js";

const cases = [
  [100, "A"], [80, "A"], [79, "B"], [70, "B"], [69, "C"],
  [60, "C"], [59, "D"], [55, "D"], [54, "E"], [50, "E"],
  [49, "F"], [0, "F"],
];

let bad = 0;
for (const [score, want] of cases) {
  const got = gradeForScore(score);
  const ok = got === want;
  if (!ok) bad++;
  console.log(`  ${String(score).padStart(3)} -> ${got}   expect ${want}   ${ok ? "OK" : "<<< MISMATCH"}`);
}

console.log("");
console.log(`  non-finite  -> ${gradeForScore(NaN)} / ${gradeForScore(undefined)} / ${gradeForScore("abc")}  (expect null)`);
console.log(`  numeric str -> ${gradeForScore("85")}  (expect A)`);
console.log(`  120         -> ${gradeForScore(120)}  (server rejects >100 before grading)`);
console.log("");
console.log(bad === 0 ? "  ALL 12 BOUNDARIES PASS" : `  ${bad} MISMATCH(ES)`);
