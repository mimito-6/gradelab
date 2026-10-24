#!/usr/bin/env node
/* Verifies the REAL average.js math (module export branch) with test vectors. */
const a = require("/home/hatch/workspace/goals/ai-nt-40-000/tool-sites/site2b-grade/average.js");
const assert = require("assert");
const eps = (x, y) => assert(Math.abs(x - y) < 1e-9, `got ${x}, want ${y}`);

// 1. 90, 80, 70 -> mean 80.0, letter B-
let t = a.gradeAverage([{earned:90,possible:100},{earned:80,possible:100},{earned:70,possible:100}], 0);
eps(t.average, 80); assert.strictEqual(t.letter, "B-"); assert.strictEqual(t.counted, 3); assert.strictEqual(t.droppedCount, 0);

// 2. drop lowest: 90, 80, 70 drop 1 -> 85.0, letter B
t = a.gradeAverage([{earned:90,possible:100},{earned:80,possible:100},{earned:70,possible:100}], 1);
eps(t.average, 85); assert.strictEqual(t.letter, "B"); assert.strictEqual(t.droppedCount, 1); eps(t.droppedPct, 70);

// 3. mixed possibles, mean of percentages: 45/50=90, 18/20=90 -> 90, A-
t = a.gradeAverage([{earned:45,possible:50},{earned:18,possible:20}], 0);
eps(t.average, 90); assert.strictEqual(t.letter, "A-");

// 4. mean-of-percentages differs from points ratio (proof the choice matters):
//    100/100=100 and 0/20=0 -> mean 50, but points ratio 100/120=83.33
t = a.gradeAverage([{earned:100,possible:100},{earned:0,possible:20}], 0);
eps(t.average, 50); assert.strictEqual(t.totalEarned, 100); assert.strictEqual(t.totalPossible, 120);

// 5. single perfect score -> 100, A+
t = a.gradeAverage([{earned:100,possible:100}], 0);
eps(t.average, 100); assert.strictEqual(t.letter, "A+");

// 6. drop cannot empty the set: 1 score, drop 1 -> clamped, still counted
t = a.gradeAverage([{earned:80,possible:100}], 1);
assert.ok(t !== null && t.counted === 1);

// 7. invalid rows skipped: possible 0, negative earned
t = a.gradeAverage([{earned:90,possible:0},{earned:-5,possible:100},{earned:80,possible:100}], 0);
eps(t.average, 80); assert.strictEqual(t.counted, 1);
assert.strictEqual(a.gradeAverage([], 0), null);
assert.strictEqual(a.gradeAverage([{earned:90,possible:0}], 0), null);

// 8. letter boundaries
assert.strictEqual(a.letterFromPercent(97), "A+");
assert.strictEqual(a.letterFromPercent(93), "A");
assert.strictEqual(a.letterFromPercent(89.9), "B+");
assert.strictEqual(a.letterFromPercent(80), "B-");
assert.strictEqual(a.letterFromPercent(59.9), "F");
assert.strictEqual(a.letterFromPercent(100), "A+");

console.log("ALL GRADE-AVERAGE MATH TESTS PASS");
