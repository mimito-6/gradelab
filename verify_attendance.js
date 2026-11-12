/* Verify attendance.js math directly against the shipped file. Run: node verify_attendance.js */
const { attendancePlan, courseProjection } = require("./attendance.js");

let n = 0;
function eq(actual, expected, label) {
  n++;
  if (actual !== expected) throw new Error(`FAIL ${label}: got ${actual}, want ${expected}`);
}
function approx(actual, expected, label) {
  n++;
  if (Math.abs(actual - expected) > 1e-9) throw new Error(`FAIL ${label}: got ${actual}, want ${expected}`);
}
function isNull(actual, label) {
  n++;
  if (actual !== null) throw new Error(`FAIL ${label}: got ${JSON.stringify(actual)}, want null`);
}

// --- current percentage ---
approx(attendancePlan(18, 20, 75).pct, 90, "18/20 pct");
approx(attendancePlan(12, 20, 75).pct, 60, "12/20 pct");
approx(attendancePlan(0, 10, 75).pct, 0, "0/10 pct");

// --- max misses (above requirement) ---
eq(attendancePlan(18, 20, 75).maxMisses, 4, "18/20 @75% miss 4");
eq(attendancePlan(18, 20, 80).maxMisses, 2, "18/20 @80% miss 2");
eq(attendancePlan(18, 20, 85).maxMisses, 1, "18/20 @85% miss 1");
eq(attendancePlan(18, 20, 90).maxMisses, 0, "18/20 @90% miss 0");
eq(attendancePlan(20, 20, 75).maxMisses, 6, "20/20 @75% miss 6");
eq(attendancePlan(15, 20, 75).maxMisses, 0, "15/20 @75% exact, miss 0");
eq(attendancePlan(15, 20, 75).status, "exact", "15/20 @75% status exact");
eq(attendancePlan(18, 20, 75).status, "above", "18/20 @75% status above");
eq(attendancePlan(17, 20, 80).maxMisses, 1, "17/20 @80% miss 1");

// --- recovery (below requirement) ---
eq(attendancePlan(12, 20, 75).classesToRecover, 12, "12/20 @75% recover 12");
eq(attendancePlan(14, 20, 75).classesToRecover, 4, "14/20 @75% recover 4");
eq(attendancePlan(13, 20, 75).classesToRecover, 8, "13/20 @75% recover 8");
eq(attendancePlan(12, 20, 75).status, "below", "12/20 @75% status below");
eq(attendancePlan(12, 20, 75).maxMisses, 0, "below: maxMisses 0");
isNull(attendancePlan(19, 20, 100).classesToRecover, "19/20 @100% unrecoverable");
eq(attendancePlan(20, 20, 100).status, "exact", "20/20 @100% exact");
eq(attendancePlan(20, 20, 100).maxMisses, 0, "20/20 @100% miss 0");

// --- whole-course projection ---
let p = courseProjection(18, 20, 30, 75);
approx(p.attendAllPct, 28 / 30 * 100, "18/20 in 30: attend-all 93.33%");
eq(p.remaining, 10, "18/20 in 30: 10 remaining");
eq(p.missBudget, 5, "18/20 in 30 @75%: miss budget 5");
eq(p.reachable, true, "18/20 in 30 @75%: reachable");
p = courseProjection(12, 20, 30, 75);
approx(p.attendAllPct, 22 / 30 * 100, "12/20 in 30: attend-all 73.33%");
eq(p.reachable, false, "12/20 in 30 @75%: unreachable");
eq(p.missBudget, -1, "12/20 in 30 @75%: miss budget -1 (negative = already short)");
p = courseProjection(18, 20, 20, 75);
eq(p.remaining, 0, "course already over: 0 remaining");
approx(p.attendAllPct, 90, "course already over: attend-all 90%");
eq(p.missBudget, 0, "course already over: miss budget 0 (no classes left to miss)");
// budget can never exceed remaining classes: 18/20 in 30 at 50% would
// naively give 13, but only 10 classes remain
p = courseProjection(18, 20, 30, 50);
eq(p.missBudget, 10, "miss budget capped at remaining classes");

// --- invalid input -> null ---
isNull(attendancePlan(21, 20, 75), "attended > total");
isNull(attendancePlan(5, 0, 75), "total 0");
isNull(attendancePlan(-1, 20, 75), "negative attended");
isNull(attendancePlan(10, 20, 0), "req 0%");
isNull(attendancePlan(10, 20, 101), "req 101%");
isNull(attendancePlan(NaN, 20, 75), "NaN attended");
isNull(courseProjection(18, 20, 15, 75), "course total < held");
isNull(courseProjection(18, 20, NaN, 75), "course total NaN");

console.log(`PASS ${n} assertions`);
