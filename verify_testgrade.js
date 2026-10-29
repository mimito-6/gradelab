/* Verification for testgrade.js — runs with node, asserts against the real module. */
const assert = require("assert");
const { letterFromPercent, testScore, pointsForLetter, gradeTable } = require("./testgrade.js");

// Core scores
assert.deepStrictEqual(
  testScore(42, 50),
  { pct: 84, letter: "B", missed: 8, correct: 42, total: 50 }
);
assert.strictEqual(testScore(47, 50).letter, "A");
assert.strictEqual(testScore(47, 50).pct, 94);
assert.deepStrictEqual(testScore(0, 20), { pct: 0, letter: "F", missed: 20, correct: 0, total: 20 });
assert.deepStrictEqual(testScore(20, 20), { pct: 100, letter: "A+", missed: 0, correct: 20, total: 20 });
// Fractional points (partial credit) work the same way
assert.strictEqual(testScore(17.5, 20).pct, 87.5);
assert.strictEqual(testScore(17.5, 20).letter, "B+");

// Invalid input never yields a score
assert.strictEqual(testScore(51, 50), null); // correct > total
assert.strictEqual(testScore(-1, 50), null);
assert.strictEqual(testScore(10, 0), null);
assert.strictEqual(testScore(NaN, 50), null);
assert.strictEqual(testScore(10, NaN), null);

// Letter boundaries (same scale as the rest of GradeLab)
assert.strictEqual(letterFromPercent(97), "A+");
assert.strictEqual(letterFromPercent(96.9), "A");
assert.strictEqual(letterFromPercent(93), "A");
assert.strictEqual(letterFromPercent(92.9), "A-");
assert.strictEqual(letterFromPercent(89.9), "B+");
assert.strictEqual(letterFromPercent(83), "B");
assert.strictEqual(letterFromPercent(60), "D-");
assert.strictEqual(letterFromPercent(59.9), "F");

// Points needed per letter: ceiling, with exact products unrounded
assert.strictEqual(pointsForLetter(50, 93), 47); // 46.5 -> 47
assert.strictEqual(pointsForLetter(50, 90), 45);
assert.strictEqual(pointsForLetter(20, 90), 18); // exact, must NOT become 19
assert.strictEqual(pointsForLetter(30, 97), 30); // 29.1 -> 30
assert.strictEqual(pointsForLetter(100, 83), 83);
assert.strictEqual(pointsForLetter(50, 97), 49); // 48.5 -> 49

// Grade table for 42/50: B achieved (needs 42), B+ needs 2 more, A needs 5 more
const table = gradeTable(50, 42);
const byLetter = Object.fromEntries(table.map((r) => [r.letter, r]));
assert.strictEqual(byLetter["B"].needed, 42);
assert.strictEqual(byLetter["B"].achieved, true);
assert.strictEqual(byLetter["B+"].needed, 44);
assert.strictEqual(byLetter["B+"].moreNeeded, 2);
assert.strictEqual(byLetter["A"].needed, 47);
assert.strictEqual(byLetter["A"].moreNeeded, 5);
assert.strictEqual(byLetter["A+"].needed, 49);
assert.strictEqual(table.length, 12);

console.log("verify_testgrade: all assertions passed");
