#!/usr/bin/env node
/* Verifies the REAL wgpa.js math (module export branch) with test vectors. */
const g = require("/home/hatch/workspace/goals/ai-nt-40-000/tool-sites/site2b-grade/wgpa.js");
const assert = require("assert");
const eps = (a, b) => assert(Math.abs(a - b) < 1e-9, `got ${a}, want ${b}`);

// 1. A in AP (4cr) + B regular (3cr): uw 25/7, w 29/7, boost 4/7
let t = g.weightedGPA([{grade:"A",credits:4,level:"ap"},{grade:"B",credits:3,level:"regular"}]);
eps(t.unweighted, 25/7);
eps(t.weighted, 29/7);
eps(t.boost, 4/7);

// 2. All AP A: weighted 5.0, unweighted 4.0
t = g.weightedGPA([{grade:"A",credits:3,level:"ap"},{grade:"A",credits:3,level:"ap"}]);
eps(t.weighted, 5.0);
eps(t.unweighted, 4.0);

// 3. B+ Honors (3cr) + C regular (3cr): uw 2.665, w 2.915
t = g.weightedGPA([{grade:"B+",credits:3,level:"honors"},{grade:"C",credits:3,level:"regular"}]);
eps(t.unweighted, 2.665);
eps(t.weighted, 2.915);

// 4. F in AP earns no bonus: F AP (3cr) + A regular (3cr) -> 2.0 both
t = g.weightedGPA([{grade:"F",credits:3,level:"ap"},{grade:"A",credits:3,level:"regular"}]);
eps(t.weighted, 2.0);
eps(t.unweighted, 2.0);
eps(t.boost, 0);

// 5. A- Honors: 3.67 -> 4.17
t = g.weightedGPA([{grade:"A-",credits:3,level:"honors"}]);
eps(t.weighted, 4.17);
eps(t.unweighted, 3.67);

// 6. edge cases: empty -> null; zero/negative credits skipped; unknown grade skipped
assert.strictEqual(g.weightedGPA([]), null);
assert.strictEqual(g.weightedGPA([{grade:"A",credits:0,level:"ap"}]), null);
assert.strictEqual(g.weightedGPA([{grade:"Z",credits:3,level:"ap"}]), null);
t = g.weightedGPA([{grade:"A",credits:4,level:"regular"},{grade:"B",credits:0,level:"ap"}]);
eps(t.weighted, 4.0);
assert.strictEqual(g.wgpaBasePoints("A"), 4.0);
assert.strictEqual(g.wgpaBasePoints("Z"), null);

console.log("ALL WEIGHTED GPA MATH TESTS PASS");
