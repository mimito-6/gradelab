/* GradeLab grade curve calculator — pure math (testable) + DOM wiring. */

/* Same standard US percentage cutoffs as GradeLab's other pages. */
function letterFromPercent(pct) {
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
}

/* Square-root curve: new = 10 * sqrt(raw). The classic curve — it lifts
   low scores the most (25 -> 50, +25) and leaves 0 and 100 fixed.
   On [0, 100] it never lowers a score: 10*sqrt(x) >= x. */
function sqrtCurve(raw) {
  if (!isFinite(raw) || raw < 0 || raw > 100) return null;
  return 10 * Math.sqrt(raw);
}

/* Flat-add curve: new = min(100, raw + points). Points must be >= 0,
   otherwise it would lower scores — that is a penalty, not a curve. */
function flatCurve(raw, points) {
  if (!isFinite(raw) || !isFinite(points)) return null;
  if (raw < 0 || raw > 100 || points < 0) return null;
  return Math.min(100, raw + points);
}

/* Scale-to-top curve: the highest score in the class becomes 100 and
   everyone is scaled proportionally. classMax must be > 0 and >= raw,
   otherwise the "top score" is not actually the top. */
function scaleCurve(raw, classMax) {
  if (!isFinite(raw) || !isFinite(classMax)) return null;
  if (raw < 0 || raw > 100 || classMax <= 0 || classMax > 100) return null;
  if (raw > classMax) return null;
  return (raw / classMax) * 100;
}

/* curveScore(raw, method, param): the selected curve plus its before/after
   letter grades. method: "sqrt" | "flat" | "scale"; param is points for
   flat, classMax for scale, ignored for sqrt. Returns null on invalid input. */
function curveScore(raw, method, param) {
  if (!isFinite(raw) || raw < 0 || raw > 100) return null;
  let curved = null;
  if (method === "sqrt") curved = sqrtCurve(raw);
  else if (method === "flat") curved = flatCurve(raw, param);
  else if (method === "scale") curved = scaleCurve(raw, param);
  else return null;
  if (curved === null) return null;
  return {
    raw,
    curved,
    gained: curved - raw,
    rawLetter: letterFromPercent(raw),
    curvedLetter: letterFromPercent(curved),
    method,
  };
}

/* All three methods side by side for the same raw score, so the student
   can compare what each curve would do. flatParam/scaleParam are the
   current settings for those two methods. */
function compareCurves(raw, flatParam, scaleParam) {
  return {
    sqrt: curveScore(raw, "sqrt"),
    flat: curveScore(raw, "flat", flatParam),
    scale: curveScore(raw, "scale", scaleParam),
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { letterFromPercent, sqrtCurve, flatCurve, scaleCurve, curveScore, compareCurves };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const rawEl = document.getElementById("c-raw");
    const methodEl = document.getElementById("c-method");
    const pointsEl = document.getElementById("c-points");
    const maxEl = document.getElementById("c-max");
    const pointsRow = document.getElementById("c-points-row");
    const maxRow = document.getElementById("c-max-row");
    const curvedEl = document.getElementById("c-curved");
    const detailEl = document.getElementById("c-detail");
    const tableEl = document.getElementById("c-table");

    function fmt(n) {
      return n.toFixed(2).replace(/\.?0+$/, "");
    }

    function render() {
      const raw = parseFloat(rawEl.value);
      const method = methodEl.value;
      const points = parseFloat(pointsEl.value);
      const classMax = parseFloat(maxEl.value);
      pointsRow.style.display = method === "flat" ? "" : "none";
      maxRow.style.display = method === "scale" ? "" : "none";

      const res = curveScore(raw, method, method === "flat" ? points : method === "scale" ? classMax : undefined);
      const cmp = compareCurves(raw, points, classMax);
      if (!res || !cmp.sqrt) {
        curvedEl.textContent = "—";
        detailEl.textContent = "Enter a raw score between 0 and 100. For the scale method, the top score must be at least your score.";
        tableEl.innerHTML = "";
        return;
      }
      curvedEl.textContent = fmt(res.curved) + "%";
      detailEl.textContent =
        "Raw " + fmt(raw) + "% (" + res.rawLetter + ") → curved " + fmt(res.curved) + "% (" + res.curvedLetter + "), a gain of " +
        fmt(res.gained) + " points.";
      const rows = [
        ["Square root", cmp.sqrt],
        ["Flat add (+" + fmt(points) + ")", cmp.flat],
        ["Scale to top (" + fmt(classMax) + ")", cmp.scale],
      ]
        .map(([name, r]) => {
          if (!r) return "<tr><td>" + name + "</td><td>—</td><td>—</td><td>—</td></tr>";
          const cls = r.method === method ? ' class="you-are-here"' : "";
          return "<tr" + cls + "><td>" + name + "</td><td>" + fmt(r.curved) + "%</td><td>" + r.curvedLetter + "</td><td>+" + fmt(r.gained) + "</td></tr>";
        })
        .join("");
      tableEl.innerHTML =
        "<table><thead><tr><th>Curve</th><th>Curved score</th><th>Letter</th><th>Gain</th></tr></thead><tbody>" + rows + "</tbody></table>";
    }

    rawEl.addEventListener("input", render);
    methodEl.addEventListener("change", render);
    pointsEl.addEventListener("input", render);
    maxEl.addEventListener("input", render);
    render();
  });
}
