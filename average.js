/* GradeLab grade-average calculator — pure math (testable) + DOM wiring. */

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

/* scores: [{earned, possible}] — a score's percent is earned/possible*100.
   The average is the MEAN OF PERCENTAGES (each test counts equally),
   not total-points/total-possible, so a 20-point quiz and a 100-point
   exam weigh the same. dropLowest: how many lowest scores to exclude.
   Returns null when no usable score remains. */
function gradeAverage(scores, dropLowest) {
  const pcts = [];
  let totalEarned = 0, totalPossible = 0;
  for (const s of scores) {
    if (!isFinite(s.earned) || !isFinite(s.possible)) continue;
    if (s.possible <= 0 || s.earned < 0) continue;
    pcts.push((s.earned / s.possible) * 100);
  }
  if (pcts.length === 0) return null;
  const drop = Math.max(0, Math.min(dropLowest || 0, pcts.length - 1));
  pcts.sort((a, b) => a - b);
  const dropped = pcts.slice(0, drop);
  const kept = pcts.slice(drop);
  if (kept.length === 0) return null;
  const sum = kept.reduce((a, b) => a + b, 0);
  // Points totals of kept scores only (for the detail line).
  const sortedScores = scores
    .filter((s) => isFinite(s.earned) && isFinite(s.possible) && s.possible > 0 && s.earned >= 0)
    .map((s) => ({ pct: (s.earned / s.possible) * 100, earned: s.earned, possible: s.possible }))
    .sort((a, b) => a.pct - b.pct)
    .slice(drop);
  for (const s of sortedScores) { totalEarned += s.earned; totalPossible += s.possible; }
  return {
    average: sum / kept.length,
    letter: letterFromPercent(sum / kept.length),
    counted: kept.length,
    droppedCount: dropped.length,
    droppedPct: dropped.length ? dropped[0] : null,
    totalEarned,
    totalPossible,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { letterFromPercent, gradeAverage };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const rowsEl = document.getElementById("avg-rows");
    const dropEl = document.getElementById("drop-lowest");
    const avgEl = document.getElementById("avg-value");
    const letterEl = document.getElementById("avg-letter");
    const detailEl = document.getElementById("avg-detail");

    function readRows() {
      const out = [];
      rowsEl.querySelectorAll(".avg-row").forEach((row) => {
        const earned = parseFloat(row.querySelector(".earned").value);
        const possible = parseFloat(row.querySelector(".possible").value);
        out.push({ earned, possible });
      });
      return out;
    }

    function render() {
      const res = gradeAverage(readRows(), dropEl.checked ? 1 : 0);
      if (!res) {
        avgEl.textContent = "—";
        letterEl.textContent = "";
        detailEl.textContent = "Add at least one score with points possible greater than 0.";
        return;
      }
      avgEl.textContent = res.average.toFixed(2) + "%";
      letterEl.textContent = "Letter grade: " + res.letter;
      let detail = res.counted + " score" + (res.counted === 1 ? "" : "s") + " counted";
      if (res.droppedCount) detail += " · lowest dropped (" + res.droppedPct.toFixed(1) + "%)";
      detail += " · " + res.totalEarned + " / " + res.totalPossible + " points kept";
      detailEl.textContent = detail;
    }

    function addRow(earned, possible) {
      const row = document.createElement("div");
      row.className = "avg-row";
      row.innerHTML =
        '<input class="earned" type="number" min="0" step="any" placeholder="Earned" inputmode="decimal">' +
        '<span class="slash">/</span>' +
        '<input class="possible" type="number" min="0" step="any" placeholder="Possible" inputmode="decimal">' +
        '<button type="button" class="remove-row" aria-label="Remove score">×</button>';
      if (earned !== undefined) row.querySelector(".earned").value = earned;
      if (possible !== undefined) row.querySelector(".possible").value = possible;
      row.querySelectorAll("input").forEach((i) => i.addEventListener("input", render));
      row.querySelector(".remove-row").addEventListener("click", () => { row.remove(); render(); });
      rowsEl.appendChild(row);
    }

    document.getElementById("add-avg-row").addEventListener("click", () => { addRow(); render(); });
    dropEl.addEventListener("change", render);
    addRow(90, 100); addRow(80, 100); addRow(70, 100);
    render();
  });
}
