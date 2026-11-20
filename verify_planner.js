/* Verify planner.js against hand-computed values (see WORKLOG 2026-11-20).
   Run: node verify_planner.js — exits non-zero on any failure. */
const { requiredSemesterGPA, planState, creditsAtFour, outcomeGPA, letterHint } = require("./planner.js");

let n = 0;
function eq(actual, expected, label, tol) {
  n++;
  const t = tol === undefined ? 1e-9 : tol;
  if (actual === null && expected === null) return;
  if (actual === null || expected === null || Math.abs(actual - expected) > t) {
    console.error(`FAIL ${label}: got ${actual}, want ${expected}`);
    process.exitCode = 1;
  }
}
function is(actual, expected, label) {
  n++;
  if (actual !== expected) {
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
    process.exitCode = 1;
  }
}

// V1: 3.20 / 60cr, target 3.50, 15cr planned -> 4.70, impossible; 36cr at 4.0
eq(requiredSemesterGPA(3.20, 60, 3.50, 15), 4.70, "V1 required");
is(planState(3.20, 60, 3.50, 15).state, "impossible", "V1 state");
eq(creditsAtFour(3.20, 60, 3.50), 36, "V1 credits@4.0", 1e-9);
eq(outcomeGPA(3.20, 60, 4.0, 36), 3.50, "V1 36cr check", 1e-9);
// V2: 3.00 / 30cr, target 3.30, 15cr -> 3.90 on-track
eq(requiredSemesterGPA(3.00, 30, 3.30, 15), 3.90, "V2 required");
is(planState(3.00, 30, 3.30, 15).state, "on-track", "V2 state");
eq(outcomeGPA(3.00, 30, 2.0, 15), 2.6667, "V2 table 2.0", 1e-4);
eq(outcomeGPA(3.00, 30, 2.5, 15), 2.8333, "V2 table 2.5", 1e-4);
eq(outcomeGPA(3.00, 30, 3.0, 15), 3.00, "V2 table 3.0", 1e-9);
eq(outcomeGPA(3.00, 30, 3.5, 15), 3.1667, "V2 table 3.5", 1e-4);
eq(outcomeGPA(3.00, 30, 4.0, 15), 3.3333, "V2 table 4.0", 1e-4);
// V3: 3.60 / 45cr, target 3.50, 15cr -> 3.20 (target below current)
eq(requiredSemesterGPA(3.60, 45, 3.50, 15), 3.20, "V3 required");
is(planState(3.60, 45, 3.50, 15).state, "on-track", "V3 state");
// V4: best case — 3.20 / 60cr + 15cr at 4.0 -> 3.36
eq(outcomeGPA(3.20, 60, 4.0, 15), 3.36, "V4 best case", 1e-9);
// V5: 3.90 / 60cr, target 3.00, 15cr -> -0.60, locked
eq(requiredSemesterGPA(3.90, 60, 3.00, 15), -0.60, "V5 required");
is(planState(3.90, 60, 3.00, 15).state, "locked", "V5 state");
eq(outcomeGPA(3.90, 60, 0, 15), 3.12, "V5 zero-semester floor", 1e-9);
// V6: target == current -> required == target
eq(requiredSemesterGPA(3.00, 30, 3.00, 15), 3.00, "V6 required");
// V7: 3.85 / 90cr, target 3.90, 12cr -> 4.275 impossible; 45cr at 4.0
eq(requiredSemesterGPA(3.85, 90, 3.90, 12), 4.275, "V7 required", 1e-9);
is(planState(3.85, 90, 3.90, 12).state, "impossible", "V7 state");
eq(creditsAtFour(3.85, 90, 3.90), 45, "V7 credits@4.0", 1e-9);
eq(outcomeGPA(3.85, 90, 4.0, 45), 3.90, "V7 45cr check", 1e-9);
// target 4.0 below current: unreachable forever
is(creditsAtFour(3.50, 60, 4.0), null, "4.0 target unreachable");
is(planState(3.50, 60, 4.0, 15).state, "impossible", "4.0 target state");
// already at 4.0
eq(requiredSemesterGPA(4.0, 60, 4.0, 15), 4.0, "already 4.0 required");
is(planState(4.0, 60, 4.0, 15).state, "on-track", "already 4.0 state");
// invalid inputs -> null
is(requiredSemesterGPA(3.0, 0, 3.5, 15), null, "zero earned credits");
is(requiredSemesterGPA(3.0, 30, 3.5, 0), null, "zero planned credits");
is(requiredSemesterGPA(4.5, 30, 3.5, 15), null, "GPA above 4.0");
is(requiredSemesterGPA(3.0, 30, 4.5, 15), null, "target above 4.0");
is(requiredSemesterGPA(NaN, 30, 3.5, 15), null, "NaN current");
is(outcomeGPA(3.0, 30, 4.5, 15), null, "outcome invalid semester GPA");
// letter hints
is(letterHint(4.0), "a straight-A semester", "hint 4.0");
is(letterHint(3.90), "better than an A- average", "hint 3.90");
is(letterHint(3.67), "an A- average", "hint 3.67");
is(letterHint(3.33), "a B+ average", "hint 3.33");
is(letterHint(3.0), "a B average", "hint 3.0");
is(letterHint(2.5), "better than a C+ average", "hint 2.5");
is(letterHint(0), "an F average", "hint 0");
is(letterHint(4.5), null, "hint out of range");

console.log(`verify_planner: ${n} assertions, ${process.exitCode ? "FAILURES" : "all passed"}`);
