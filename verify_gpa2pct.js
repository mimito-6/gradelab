/* Verify gpa2pct.js against the real implementation + cross-check the
   scale table against lettergrade.js / gpa.js (all three pages must use
   the same scale, so a GPA shown here always means the same letter and
   percentage band everywhere on GradeLab). */
const assert = require("assert");
const gp = require("./gpa2pct.js");
const lg = require("./lettergrade.js");
const gpa = require("./gpa.js");

function close(a, b, eps) {
  assert.ok(Math.abs(a - b) < (eps || 1e-9), `expected ${a} ≈ ${b}`);
}

/* 0. Same scale table as lettergrade.js (and therefore gpa.js). */
assert.deepStrictEqual(gp.SCALE_PM, lg.SCALE_PM, "SCALE_PM must match lettergrade.js");
assert.deepStrictEqual(gp.SCALE_PLAIN, lg.SCALE_PLAIN, "SCALE_PLAIN must match lettergrade.js");
assert.strictEqual(gp.scaleRows(true).length, 13);
assert.strictEqual(gp.scaleRows(false).length, 5);

/* 1. All 13 plus/minus rungs, exact lookup (distinct point values: 12). */
const pmExact = [
  [4.0, ["A+", "A"], 93, 100],
  [3.67, ["A-"], 90, 92.9],
  [3.33, ["B+"], 87, 89.9],
  [3.0, ["B"], 83, 86.9],
  [2.67, ["B-"], 80, 82.9],
  [2.33, ["C+"], 77, 79.9],
  [2.0, ["C"], 73, 76.9],
  [1.67, ["C-"], 70, 72.9],
  [1.33, ["D+"], 67, 69.9],
  [1.0, ["D"], 63, 66.9],
  [0.67, ["D-"], 60, 62.9],
  [0.0, ["F"], 0, 59.9],
];
for (const [points, letters, low, high] of pmExact) {
  const r = gp.lookupGPA(points, true);
  assert.strictEqual(r.kind, "exact", `pm ${points} kind`);
  assert.deepStrictEqual(r.letters, letters, `pm ${points} letters`);
  assert.strictEqual(r.low, low, `pm ${points} low`);
  assert.strictEqual(r.high, high, `pm ${points} high`);
}

/* 2. All 5 straight-scale rungs, exact lookup. */
const plainExact = [
  [4.0, ["A"], 90, 100],
  [3.0, ["B"], 80, 89.9],
  [2.0, ["C"], 70, 79.9],
  [1.0, ["D"], 60, 69.9],
  [0.0, ["F"], 0, 59.9],
];
for (const [points, letters, low, high] of plainExact) {
  const r = gp.lookupGPA(points, false);
  assert.strictEqual(r.kind, "exact", `plain ${points} kind`);
  assert.deepStrictEqual(r.letters, letters, `plain ${points} letters`);
  assert.strictEqual(r.low, low, `plain ${points} low`);
  assert.strictEqual(r.high, high, `plain ${points} high`);
}

/* 3. Between-rung GPAs: honest two-band span, never a fake precise number. */
let b = gp.lookupGPA(3.85, true);
assert.strictEqual(b.kind, "between");
assert.strictEqual(b.lower.letter, "A-"); assert.strictEqual(b.upper.letter, "A");
assert.strictEqual(b.low, 90); assert.strictEqual(b.high, 96.9);
close(b.lower.points, 3.67); close(b.upper.points, 4.0);

b = gp.lookupGPA(3.5, true);
assert.strictEqual(b.kind, "between");
assert.strictEqual(b.lower.letter, "B+"); assert.strictEqual(b.upper.letter, "A-");
assert.strictEqual(b.low, 87); assert.strictEqual(b.high, 92.9);

b = gp.lookupGPA(2.85, true);
assert.strictEqual(b.kind, "between");
assert.strictEqual(b.lower.letter, "B-"); assert.strictEqual(b.upper.letter, "B");
assert.strictEqual(b.low, 80); assert.strictEqual(b.high, 86.9);

b = gp.lookupGPA(0.35, true);
assert.strictEqual(b.kind, "between");
assert.strictEqual(b.lower.letter, "F"); assert.strictEqual(b.upper.letter, "D-");
assert.strictEqual(b.low, 0); assert.strictEqual(b.high, 62.9);

b = gp.lookupGPA(3.5, false);
assert.strictEqual(b.kind, "between");
assert.strictEqual(b.lower.letter, "B"); assert.strictEqual(b.upper.letter, "A");
assert.strictEqual(b.low, 80); assert.strictEqual(b.high, 100);

b = gp.lookupGPA(1.5, false);
assert.strictEqual(b.kind, "between");
assert.strictEqual(b.lower.letter, "D"); assert.strictEqual(b.upper.letter, "C");
assert.strictEqual(b.low, 60); assert.strictEqual(b.high, 79.9);

/* 4. Boundaries: 4.0 and 0 on both scales. */
let r = gp.lookupGPA(4.0, true);
assert.strictEqual(r.kind, "exact");
assert.deepStrictEqual(r.letters, ["A+", "A"]);
assert.strictEqual(r.low, 93); assert.strictEqual(r.high, 100);
r = gp.lookupGPA(0, true);
assert.strictEqual(r.kind, "exact");
assert.deepStrictEqual(r.letters, ["F"]);
assert.strictEqual(r.low, 0); assert.strictEqual(r.high, 59.9);
r = gp.lookupGPA(4.0, false);
assert.deepStrictEqual(r.letters, ["A"]);
assert.strictEqual(r.low, 90); assert.strictEqual(r.high, 100);
r = gp.lookupGPA(0, false);
assert.deepStrictEqual(r.letters, ["F"]);
assert.strictEqual(r.low, 0); assert.strictEqual(r.high, 59.9);

/* 5. Invalid input returns null, never a grade. */
assert.strictEqual(gp.lookupGPA(4.01, true), null);
assert.strictEqual(gp.lookupGPA(4.1, false), null);
assert.strictEqual(gp.lookupGPA(-0.1, true), null);
assert.strictEqual(gp.lookupGPA(NaN, true), null);
assert.strictEqual(gp.lookupGPA("x", true), null);
assert.strictEqual(gp.lookupGPA(Infinity, true), null);
assert.strictEqual(gp.lookupGPA(undefined, true), null);

/* 6. rangeFor matches lettergrade.js on every letter, both scales. */
for (const row of lg.SCALE_PM) {
  assert.deepStrictEqual(gp.rangeFor(row.letter, true), lg.rangeFor(row.letter, true), `range pm ${row.letter}`);
}
for (const row of lg.SCALE_PLAIN) {
  assert.deepStrictEqual(gp.rangeFor(row.letter, false), lg.rangeFor(row.letter, false), `range plain ${row.letter}`);
}
assert.strictEqual(gp.rangeFor("E", true), null);

/* 7. Full-grid round trip, 0.1 steps, both scales:
   percentage -> letter (lettergrade.js) -> GPA points -> reverse lookup
   must return a band that contains the original percentage. Also
   cross-checks letterFor against gpa.js percentToLetter on the same grid. */
for (let p = 0; p <= 100; p += 0.1) {
  const pct = Math.round(p * 10) / 10;
  for (const pm of [true, false]) {
    const letter = lg.letterFor(pct, pm);
    assert.strictEqual(letter, gpa.percentToLetter(pct, pm), `gpa cross-check ${pct} pm=${pm}`);
    const points = lg.pointsFor(letter, pm);
    const res = gp.lookupGPA(points, pm);
    assert.ok(res !== null && res.kind === "exact", `round trip ${pct} pm=${pm} -> ${letter} ${points}`);
    assert.ok(res.low - 1e-9 <= pct && pct <= res.high + 1e-9,
      `round trip band ${pct} pm=${pm} -> ${letter} ${points} -> ${res.low}-${res.high}`);
  }
}

/* 8. Every between-rung GPA in 0.01 steps returns a valid two-band span
   (low < high, neighbours adjacent in the scale, span covers both bands). */
for (let g = 0.01; g < 4.0; g += 0.01) {
  const val = Math.round(g * 100) / 100;
  for (const pm of [true, false]) {
    const res = gp.lookupGPA(val, pm);
    assert.ok(res !== null, `between lookup ${val} pm=${pm} must not be null`);
    if (res.kind === "between") {
      assert.ok(res.low < res.high, `span ${val} pm=${pm}`);
      assert.ok(res.lower.points < val && val < res.upper.points, `bracket ${val} pm=${pm}`);
      const rows = gp.scaleRows(pm);
      const li = rows.findIndex(x => x.letter === res.lower.letter);
      const ui = rows.findIndex(x => x.letter === res.upper.letter);
      assert.ok(Math.abs(li - ui) === 1,
        `neighbours ${val} pm=${pm}: ${res.lower.letter}(${li}) vs ${res.upper.letter}(${ui})`);
    }
  }
}

console.log("verify_gpa2pct: ALL PASS");
