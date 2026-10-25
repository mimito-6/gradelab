/* GradeLab weighted grade calculator — pure math (testable) + DOM wiring. */

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

/* categories: [{score, weight}] — score in percent, weight in percent points.
   Only rows with a finite score >= 0 and a weight > 0 count.
   The grade is the WEIGHTED MEAN over completed categories only:
   grade = sum(score * weight) / sum(weight). Categories not yet graded
   (or not entered) are NOT counted as zero — they show up as
   "remaining weight" instead. Returns null when no usable row exists. */
function weightedGrade(categories) {
  let earned = 0, wsum = 0, counted = 0;
  for (const c of categories) {
    if (!isFinite(c.score) || !isFinite(c.weight)) continue;
    if (c.weight <= 0 || c.score < 0) continue;
    earned += c.score * c.weight;
    wsum += c.weight;
    counted += 1;
  }
  if (counted === 0 || wsum <= 0) return null;
  const grade = earned / wsum;
  return {
    grade,
    letter: letterFromPercent(grade),
    completedWeight: wsum,
    remainingWeight: Math.max(0, 100 - wsum),
    earned, // sum(score * weight), used by the "what do I need" math
    counted,
  };
}

/* Score needed on the remaining (ungraded) weight to reach a target
   overall grade: required = (target*100 - earned) / remaining.
   Returns {status} where status is "done" (no weight left),
   "locked" (required <= 0, target already secured),
   "out-of-reach" (required > 100), or "needed" (0 < required <= 100). */
function requiredOnRemaining(categories, target) {
  const res = weightedGrade(categories);
  if (!res || !isFinite(target)) return null;
  if (res.remainingWeight <= 0) return { status: "done", finalGrade: res.grade };
  const required = (target * 100 - res.earned) / res.remainingWeight;
  if (required <= 0) return { status: "locked", required, remainingWeight: res.remainingWeight };
  if (required > 100) return { status: "out-of-reach", required, remainingWeight: res.remainingWeight };
  return { status: "needed", required, remainingWeight: res.remainingWeight };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { letterFromPercent, weightedGrade, requiredOnRemaining };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const rowsEl = document.getElementById("w-rows");
    const targetEl = document.getElementById("w-target");
    const gradeEl = document.getElementById("w-grade");
    const letterEl = document.getElementById("w-letter");
    const detailEl = document.getElementById("w-detail");
    const needEl = document.getElementById("w-need");

    function readRows() {
      const out = [];
      rowsEl.querySelectorAll(".w-row").forEach((row) => {
        out.push({
          name: row.querySelector(".w-name").value.trim(),
          score: parseFloat(row.querySelector(".w-score").value),
          weight: parseFloat(row.querySelector(".w-weight").value),
        });
      });
      return out;
    }

    function render() {
      const cats = readRows();
      const res = weightedGrade(cats);
      if (!res) {
        gradeEl.textContent = "—";
        letterEl.textContent = "";
        detailEl.textContent = "Add at least one category with a score and a weight above 0.";
        needEl.textContent = "";
        return;
      }
      gradeEl.textContent = res.grade.toFixed(2) + "%";
      letterEl.textContent = "Letter grade: " + res.letter;
      let detail = res.counted + " categor" + (res.counted === 1 ? "y" : "ies") +
        " · " + res.completedWeight + "% of the grade counted";
      if (res.remainingWeight > 0) {
        detail += " · " + res.remainingWeight + "% still ungraded";
      } else {
        detail += " · grade complete (100% counted)";
      }
      detailEl.textContent = detail;

      const target = parseFloat(targetEl.value);
      const need = requiredOnRemaining(cats, target);
      if (!need) { needEl.textContent = ""; return; }
      if (need.status === "done") {
        needEl.textContent = "No weight remains — your final grade is " + need.finalGrade.toFixed(2) + "%.";
      } else if (need.status === "locked") {
        needEl.textContent = "Target already locked in: even a 0% on the remaining " +
          need.remainingWeight + "% keeps you at or above " + target + "%.";
      } else if (need.status === "out-of-reach") {
        needEl.textContent = "Target " + target + "% is out of reach: you would need " +
          need.required.toFixed(2) + "% on the remaining " + need.remainingWeight +
          "% — even a perfect score is not enough. Aim for the highest grade you can still reach.";
      } else {
        needEl.textContent = "To finish at " + target + "%, you need an average of " +
          need.required.toFixed(2) + "% on the remaining " + need.remainingWeight + "% of the grade.";
      }
    }

    function addRow(name, score, weight) {
      const row = document.createElement("div");
      row.className = "w-row";
      row.innerHTML =
        '<input class="w-name" type="text" placeholder="Category (e.g. Homework)" aria-label="Category name">' +
        '<input class="w-score" type="number" min="0" step="any" placeholder="Score %" inputmode="decimal" aria-label="Score percent">' +
        '<input class="w-weight" type="number" min="0" step="any" placeholder="Weight %" inputmode="decimal" aria-label="Weight percent">' +
        '<button type="button" class="remove-row" aria-label="Remove category">×</button>';
      if (name !== undefined) row.querySelector(".w-name").value = name;
      if (score !== undefined) row.querySelector(".w-score").value = score;
      if (weight !== undefined) row.querySelector(".w-weight").value = weight;
      row.querySelectorAll("input").forEach((i) => i.addEventListener("input", render));
      row.querySelector(".remove-row").addEventListener("click", () => { row.remove(); render(); });
      rowsEl.appendChild(row);
    }

    document.getElementById("add-w-row").addEventListener("click", () => { addRow(); render(); });
    targetEl.addEventListener("input", render);
    addRow("Homework", 90, 30); addRow("Quizzes", 80, 20); addRow("Midterm", 70, 20);
    render();
  });
}
