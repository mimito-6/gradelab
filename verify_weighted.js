/* Verify weighted.js math — run: node verify_weighted.js */
const { weightedGrade, requiredOnRemaining } = require("./weighted.js");
let n = 0;
function eq(actual, expected, label) {
  n += 1;
  const ok = Math.abs(actual - expected) < 1e-9;
  if (!ok) { console.error(`FAIL ${label}: got ${actual}, want ${expected}`); process.exit(1); }
  console.log(`ok ${label}: ${actual}`);
}
function is(cond, label) {
  n += 1;
  if (!cond) { console.error(`FAIL ${label}`); process.exit(1); }
  console.log(`ok ${label}`);
}

// Worked example from the page: 90x30 + 80x20 + 70x20 = 5700 / 70 = 81.428571...
const ex = [{ score: 90, weight: 30 }, { score: 80, weight: 20 }, { score: 70, weight: 20 }];
const r1 = weightedGrade(ex);
eq(r1.grade, 5700 / 70, "example grade 81.428571");
is(r1.letter === "B-", "example letter B-");
eq(r1.completedWeight, 70, "example completed weight 70");
eq(r1.remainingWeight, 30, "example remaining weight 30");
eq(r1.grade.toFixed(2) * 1, 81.43, "example display 81.43%");

// What do I need: target 85 -> (8500-5700)/30 = 93.333...
const need85 = requiredOnRemaining(ex, 85);
is(need85.status === "needed", "target 85 status needed");
eq(need85.required, 2800 / 30, "target 85 needs 93.333...");
// target 80 -> (8000-5700)/30 = 76.666...
eq(requiredOnRemaining(ex, 80).required, 2300 / 30, "target 80 needs 76.666...");
// target 95 -> (9500-5700)/30 = 126.67 -> out of reach
const need95 = requiredOnRemaining(ex, 95);
is(need95.status === "out-of-reach", "target 95 out of reach");
eq(need95.required, 3800 / 30, "target 95 needs 126.666...");
// locked: 90x90, target 80 -> (8000-8100)/10 = -10
const locked = requiredOnRemaining([{ score: 90, weight: 90 }], 80);
is(locked.status === "locked", "locked status");
// full weights: 90x50 + 80x50 = 85, remaining 0 -> done
const full = weightedGrade([{ score: 90, weight: 50 }, { score: 80, weight: 50 }]);
eq(full.grade, 85, "full weights grade 85");
eq(full.remainingWeight, 0, "full weights remaining 0");
is(requiredOnRemaining([{ score: 90, weight: 50 }, { score: 80, weight: 50 }], 90).status === "done", "done status");
// single category
eq(weightedGrade([{ score: 88, weight: 100 }]).grade, 88, "single category 88");
// invalid rows skipped; empty -> null
is(weightedGrade([{ score: NaN, weight: 30 }, { score: 80, weight: 0 }]) === null, "invalid rows -> null");
is(weightedGrade([]) === null, "empty -> null");
// weights over 100: normalized by completed weight, remaining clamped to 0
const over = weightedGrade([{ score: 90, weight: 60 }, { score: 80, weight: 60 }]);
eq(over.grade, 85, "over-100 weights grade 85 (normalized)");
eq(over.remainingWeight, 0, "over-100 remaining clamped 0");
// extra credit above 100% counts as entered
eq(weightedGrade([{ score: 110, weight: 50 }, { score: 90, weight: 50 }]).grade, 100, "extra credit 110 counts");
// letter boundaries
is(weightedGrade([{ score: 97, weight: 100 }]).letter === "A+", "97 -> A+");
is(weightedGrade([{ score: 59.9, weight: 100 }]).letter === "F", "59.9 -> F");
console.log(`ALL ${n} ASSERTIONS PASSED`);
