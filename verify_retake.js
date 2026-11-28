/* Verify retake.js directly (node). Run: node verify_retake.js
   All expected values were pre-computed with an independent Python
   implementation before this file was written. */
const R = require("./retake.js");
const assert = require("assert");

function approx(a, b, eps) {
  assert.ok(Math.abs(a - b) < (eps || 1e-9), `expected ${b}, got ${a}`);
}

// --- point tables (same 4.0 scale as lettergrade.js / gpa.js) ---
assert.strictEqual(R.pointsFor("A", "plusminus"), 4.0);
assert.strictEqual(R.pointsFor("A-", "plusminus"), 3.67);
assert.strictEqual(R.pointsFor("B+", "plusminus"), 3.33);
assert.strictEqual(R.pointsFor("B-", "plusminus"), 2.67);
assert.strictEqual(R.pointsFor("C+", "plusminus"), 2.33);
assert.strictEqual(R.pointsFor("C-", "plusminus"), 1.67);
assert.strictEqual(R.pointsFor("D+", "plusminus"), 1.33);
assert.strictEqual(R.pointsFor("D-", "plusminus"), 0.67);
assert.strictEqual(R.pointsFor("F", "plusminus"), 0.0);
assert.strictEqual(R.pointsFor("A-", "straight"), null); // not on straight scale
assert.strictEqual(R.pointsFor("B", "straight"), 3.0);
assert.strictEqual(R.pointsFor("Z", "plusminus"), null);
assert.strictEqual(R.gradesFor("plusminus").length, 12);
assert.strictEqual(R.gradesFor("straight").length, 5);
assert.strictEqual(R.gradesFor("nope"), null);

// --- V1: 3.00 over 30cr, 3cr C (2.0) -> A (4.0), replace: 96/30 = 3.20 ---
let r = R.retakeResult(3.00, 30, 3, 2.0, 4.0, "replace");
approx(r.newGPA, 3.20);
approx(r.delta, 0.20);
approx(r.oldQP, 90.0);
approx(r.newQP, 96.0);
assert.strictEqual(r.totalCredits, 30);

// --- V2: 2.80 over 60cr, 4cr F (0) -> B (3.0), replace: 180/60 = 3.00 ---
r = R.retakeResult(2.80, 60, 4, 0.0, 3.0, "replace");
approx(r.newGPA, 3.00);
approx(r.delta, 0.20);
approx(r.newQP, 180.0);

// --- V3: 3.50 over 45cr, 3cr B- (2.67) -> A- (3.67): 160.5/45 = 3.5667 ---
r = R.retakeResult(3.50, 45, 3, 2.67, 3.67, "replace");
approx(r.newGPA, 3.5666666667, 1e-9);
approx(r.delta, 0.0666666667, 1e-9);
approx(r.newQP, 160.5);

// --- V4: same as V1 but "average" policy: (90 + 12) / 33 = 3.0909 ---
r = R.retakeResult(3.00, 30, 3, 2.0, 4.0, "average");
approx(r.newGPA, 3.0909090909, 1e-9);
approx(r.delta, 0.0909090909, 1e-9);
approx(r.newQP, 102.0);
assert.strictEqual(r.totalCredits, 33);

// --- V5: retaking worse — 3.00 over 30cr, 3cr B (3.0) -> C (2.0): 87/30 = 2.90 ---
r = R.retakeResult(3.00, 30, 3, 3.0, 2.0, "replace");
approx(r.newGPA, 2.90);
approx(r.delta, -0.10);

// --- V6: same grade, no change ---
r = R.retakeResult(3.00, 30, 3, 2.0, 2.0, "replace");
approx(r.newGPA, 3.00);
approx(r.delta, 0.0);

// --- V7: many earned credits dilute the lift — 3.00 over 90cr, 3cr C -> A: 276/90 = 3.0667 ---
r = R.retakeResult(3.00, 90, 3, 2.0, 4.0, "replace");
approx(r.newGPA, 3.0666666667, 1e-9);
approx(r.delta, 0.0666666667, 1e-9);

// --- V8: straight scale — 3.00 over 30cr, 3cr C (2.0) -> A (4.0): same 3.20 ---
approx(R.retakeGPA(3.00, 30, 3, 2.0, 4.0, "replace"), 3.20);

// --- scenario rows for V1 (plus/minus, replace) ---
const rows = R.scenarioRows(3.00, 30, 3, 2.0, "replace", "plusminus");
assert.strictEqual(rows.length, 12);
const byLetter = {};
for (const row of rows) byLetter[row.letter] = row.newGPA;
approx(byLetter["A"], 3.20);
approx(byLetter["A-"], 3.167);
approx(byLetter["B+"], 3.133);
approx(byLetter["B"], 3.10);
approx(byLetter["B-"], 3.067);
approx(byLetter["C+"], 3.033);
approx(byLetter["C"], 3.00);
approx(byLetter["C-"], 2.967);
approx(byLetter["D+"], 2.933);
approx(byLetter["D"], 2.90);
approx(byLetter["D-"], 2.867);
approx(byLetter["F"], 2.80);
// scenario rows are monotonically decreasing with the grade
for (let i = 1; i < rows.length; i++) {
  assert.ok(rows[i].newGPA < rows[i - 1].newGPA, `rows not decreasing at ${rows[i].letter}`);
}

// --- invalid inputs all return null ---
assert.strictEqual(R.retakeGPA(4.5, 30, 3, 2.0, 4.0, "replace"), null); // GPA > 4
assert.strictEqual(R.retakeGPA(-0.1, 30, 3, 2.0, 4.0, "replace"), null);
assert.strictEqual(R.retakeGPA(3.0, 0, 3, 2.0, 4.0, "replace"), null);  // no earned credits
assert.strictEqual(R.retakeGPA(3.0, 30, 0, 2.0, 4.0, "replace"), null); // no course credits
assert.strictEqual(R.retakeGPA(3.0, 30, 31, 2.0, 4.0, "replace"), null); // course > earned
assert.strictEqual(R.retakeGPA(3.0, 30, 3, 2.0, 4.0, "sideways"), null); // unknown policy
assert.strictEqual(R.retakeGPA(NaN, 30, 3, 2.0, 4.0, "replace"), null);
assert.strictEqual(R.retakeResult(3.0, 30, 31, 2.0, 4.0, "replace"), null);
assert.strictEqual(R.scenarioRows(3.0, 30, 31, 2.0, "replace", "plusminus"), null);
assert.strictEqual(R.scenarioRows(3.0, 30, 3, 2.0, "replace", "nope"), null);

console.log("verify_retake: all assertions passed");
