/* Verify curve.js math directly against the real implementation. Run: node verify_curve.js */
const { letterFromPercent, sqrtCurve, flatCurve, scaleCurve, curveScore, compareCurves } = require("./curve.js");

let passed = 0, failed = 0;
function eq(actual, expected, label) {
  const ok = actual === expected || (typeof actual === "number" && typeof expected === "number" && Math.abs(actual - expected) < 1e-9);
  if (ok) { passed++; }
  else { failed++; console.log("FAIL:", label, "got", actual, "expected", expected); }
}

/* Square-root curve: 10 * sqrt(raw). */
eq(sqrtCurve(64), 80, "sqrt 64 -> 80");
eq(sqrtCurve(81), 90, "sqrt 81 -> 90");
eq(sqrtCurve(49), 70, "sqrt 49 -> 70");
eq(sqrtCurve(25), 50, "sqrt 25 -> 50");
eq(sqrtCurve(100), 100, "sqrt 100 -> 100");
eq(sqrtCurve(0), 0, "sqrt 0 -> 0");
eq(sqrtCurve(72), 10 * Math.sqrt(72), "sqrt 72 = 84.8528...");
eq(sqrtCurve(72).toFixed(2), "84.85", "sqrt 72 displays 84.85");
eq(sqrtCurve(-1), null, "sqrt negative -> null");
eq(sqrtCurve(101), null, "sqrt over 100 -> null");
/* sqrt never lowers on [0,100]: 10*sqrt(x) >= x. Spot-check the worst case. */
eq(sqrtCurve(59) > 59, true, "sqrt 59 lifts, not lowers");

/* Flat-add curve, capped at 100. */
eq(flatCurve(72, 5), 77, "flat 72+5 -> 77");
eq(flatCurve(96, 8), 100, "flat 96+8 capped at 100");
eq(flatCurve(0, 5), 5, "flat 0+5 -> 5");
eq(flatCurve(72, 0), 72, "flat +0 is identity");
eq(flatCurve(72, -3), null, "flat negative points -> null (not a curve)");
eq(flatCurve(-1, 5), null, "flat negative raw -> null");

/* Scale-to-top curve. */
eq(scaleCurve(72, 88), (72 / 88) * 100, "scale 72/88 = 81.8181...");
eq(scaleCurve(72, 88).toFixed(2), "81.82", "scale 72/88 displays 81.82");
eq(scaleCurve(88, 88), 100, "scale top score -> 100");
eq(scaleCurve(44, 88), 50, "scale 44/88 -> 50");
eq(scaleCurve(90, 88), null, "scale raw above top -> null");
eq(scaleCurve(72, 0), null, "scale top 0 -> null");
eq(scaleCurve(72, 101), null, "scale top over 100 -> null");

/* curveScore: full result incl. letters. 72 raw is C-, sqrt-curved 84.85 is B. */
const r1 = curveScore(72, "sqrt");
eq(r1.curved.toFixed(2), "84.85", "curveScore 72 sqrt curved");
eq(r1.rawLetter, "C-", "curveScore 72 raw letter C-");
eq(r1.curvedLetter, "B", "curveScore 72 curved letter B");
eq(r1.gained.toFixed(2), "12.85", "curveScore 72 gain 12.85");
const r2 = curveScore(59, "sqrt");
eq(r2.rawLetter, "F", "curveScore 59 raw letter F");
eq(r2.curvedLetter, "C", "curveScore 59 curved letter C (76.81)");
eq(r2.curved.toFixed(2), "76.81", "curveScore 59 curved 76.81");
eq(curveScore(72, "flat", 8).curved, 80, "curveScore 72 flat+8 -> 80");
eq(curveScore(72, "scale", 88).curved.toFixed(2), "81.82", "curveScore 72 scale 88 -> 81.82");
eq(curveScore(72, "bogus"), null, "curveScore unknown method -> null");
eq(curveScore(150, "sqrt"), null, "curveScore raw over 100 -> null");

/* compareCurves: all three for the same raw score. */
const cmp = compareCurves(72, 5, 88);
eq(cmp.sqrt.curved.toFixed(2), "84.85", "compare sqrt 72");
eq(cmp.flat.curved, 77, "compare flat 72+5");
eq(cmp.scale.curved.toFixed(2), "81.82", "compare scale 72/88");

/* Letter scale matches the rest of GradeLab. */
eq(letterFromPercent(97), "A+", "letter 97 A+");
eq(letterFromPercent(84.85), "B", "letter 84.85 B");
eq(letterFromPercent(59.9), "F", "letter 59.9 F");
eq(letterFromPercent(60), "D-", "letter 60 D-");

console.log(`curve.js: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
