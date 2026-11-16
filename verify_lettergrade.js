/* Verify lettergrade.js against the real implementation + cross-check
   the scale against gpa.js (the two pages must never disagree). */
const assert = require("assert");
const lg = require("./lettergrade.js");
const gpa = require("./gpa.js");

function close(a, b, eps) {
  assert.ok(Math.abs(a - b) < (eps || 1e-9), `expected ${a} ≈ ${b}`);
}

/* 1. Plus/minus boundaries — every cutoff, both sides. */
const pmCases = [
  [100, "A+"], [97, "A+"], [96.9, "A"], [93, "A"], [92.9, "A-"], [90, "A-"],
  [89.9, "B+"], [87, "B+"], [86.9, "B"], [83, "B"], [82.9, "B-"], [80, "B-"],
  [79.9, "C+"], [77, "C+"], [76.9, "C"], [73, "C"], [72.9, "C-"], [70, "C-"],
  [69.9, "D+"], [67, "D+"], [66.9, "D"], [63, "D"], [62.9, "D-"], [60, "D-"],
  [59.9, "F"], [0, "F"],
];
for (const [pct, want] of pmCases) {
  assert.strictEqual(lg.letterFor(pct, true), want, `pm ${pct}%`);
}

/* 2. Straight scale boundaries. */
const plainCases = [
  [100, "A"], [90, "A"], [89.9, "B"], [80, "B"], [79.9, "C"], [70, "C"],
  [69.9, "D"], [60, "D"], [59.9, "F"], [0, "F"],
];
for (const [pct, want] of plainCases) {
  assert.strictEqual(lg.letterFor(pct, false), want, `plain ${pct}%`);
}

/* 3. Same scale as gpa.js percentToLetter, on a fine grid. */
for (let p = 0; p <= 100; p += 0.1) {
  const pct = Math.round(p * 10) / 10;
  assert.strictEqual(lg.letterFor(pct, true), gpa.percentToLetter(pct, true), `gpa cross-check pm ${pct}`);
  assert.strictEqual(lg.letterFor(pct, false), gpa.percentToLetter(pct, false), `gpa cross-check plain ${pct}`);
}

/* 4. GPA points — A and A+ are both 4.0, no 4.3 on this scale. */
assert.strictEqual(lg.pointsFor("A+", true), 4.0);
assert.strictEqual(lg.pointsFor("A", true), 4.0);
assert.strictEqual(lg.pointsFor("A-", true), 3.67);
assert.strictEqual(lg.pointsFor("B+", true), 3.33);
assert.strictEqual(lg.pointsFor("B-", true), 2.67);
assert.strictEqual(lg.pointsFor("C+", true), 2.33);
assert.strictEqual(lg.pointsFor("C-", true), 1.67);
assert.strictEqual(lg.pointsFor("D+", true), 1.33);
assert.strictEqual(lg.pointsFor("D-", true), 0.67);
assert.strictEqual(lg.pointsFor("F", true), 0.0);
assert.strictEqual(lg.pointsFor("A", false), 4.0);
assert.strictEqual(lg.pointsFor("B", false), 3.0);
assert.strictEqual(lg.pointsFor("E", true), null);
assert.strictEqual(lg.pointsFor("A+", false), null);

/* 5. Next step — the numbers used in the guide. */
let s = lg.nextStep(88.4, true);
assert.strictEqual(s.nextLetter, "A-"); close(s.need, 1.6);
s = lg.nextStep(92.9, true);
assert.strictEqual(s.nextLetter, "A"); close(s.need, 0.1);
s = lg.nextStep(59.9, true);
assert.strictEqual(s.nextLetter, "D-"); close(s.need, 0.1);
s = lg.nextStep(89.9, false);
assert.strictEqual(s.nextLetter, "A"); close(s.need, 0.1);
assert.strictEqual(lg.nextStep(97, true), null);
assert.strictEqual(lg.nextStep(100, true), null);
assert.strictEqual(lg.nextStep(90, false), null);

/* 6. Ranges. */
assert.deepStrictEqual(lg.rangeFor("A-", true), { low: 90, high: 92.9 });
assert.deepStrictEqual(lg.rangeFor("A+", true), { low: 97, high: 100 });
assert.deepStrictEqual(lg.rangeFor("F", true), { low: 0, high: 59.9 });
assert.deepStrictEqual(lg.rangeFor("A", false), { low: 90, high: 100 });
assert.deepStrictEqual(lg.rangeFor("F", false), { low: 0, high: 59.9 });
assert.strictEqual(lg.rangeFor("E", true), null);

/* 7. Invalid input returns null, never a grade. */
assert.strictEqual(lg.letterFor(NaN, true), null);
assert.strictEqual(lg.letterFor(-1, true), null);
assert.strictEqual(lg.letterFor(101, true), null);
assert.strictEqual(lg.letterFor("x", true), null);
assert.strictEqual(lg.nextStep(NaN, true), null);
assert.strictEqual(lg.nextStep(101, true), null);

/* 8. Scale table shape. */
assert.strictEqual(lg.scaleRows(true).length, 13);
assert.strictEqual(lg.scaleRows(false).length, 5);
assert.strictEqual(lg.scaleRows(true)[0].letter, "A+");
assert.strictEqual(lg.scaleRows(false)[0].letter, "A");

console.log("verify_lettergrade: ALL PASS");
