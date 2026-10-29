/* GradeLab test grade calculator — pure math (testable) + DOM wiring. */

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

/* Letter-grade cutoffs in descending order, shared by the table. */
const LETTER_CUTOFFS = [
  ["A+", 97], ["A", 93], ["A-", 90], ["B+", 87], ["B", 83], ["B-", 80],
  ["C+", 77], ["C", 73], ["C-", 70], ["D+", 67], ["D", 63], ["D-", 60],
];

/* testScore(correct, total): percentage + letter + missed count.
   Works for questions answered correctly AND for points earned out of
   points possible — the math is identical. Returns null for invalid
   input (total <= 0, correct < 0, correct > total, non-finite). */
function testScore(correct, total) {
  if (!isFinite(correct) || !isFinite(total)) return null;
  if (total <= 0 || correct < 0 || correct > total) return null;
  const pct = (correct / total) * 100;
  return {
    pct,
    letter: letterFromPercent(pct),
    missed: total - correct,
    correct,
    total,
  };
}

/* Minimum correct answers needed to reach a cutoff percentage.
   Ceiling, because 46.5 correct answers is not a real score — you need
   the next whole answer. The 1e-9 guard keeps exact products (90% of 20
   = 18) from rounding up to 19 on floating-point dust. */
function pointsForLetter(total, cutoffPct) {
  return Math.ceil((cutoffPct * total) / 100 - 1e-9);
}

/* One row per letter grade: minimum correct needed, and how the
   student's actual correct count compares ("achieved", or N more needed). */
function gradeTable(total, correct) {
  return LETTER_CUTOFFS.map(([letter, cutoff]) => {
    const needed = pointsForLetter(total, cutoff);
    return {
      letter,
      cutoff,
      needed,
      achieved: correct >= needed,
      moreNeeded: Math.max(0, needed - correct),
    };
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { letterFromPercent, testScore, pointsForLetter, gradeTable, LETTER_CUTOFFS };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const correctEl = document.getElementById("t-correct");
    const totalEl = document.getElementById("t-total");
    const pctEl = document.getElementById("t-pct");
    const letterEl = document.getElementById("t-letter");
    const detailEl = document.getElementById("t-detail");
    const tableEl = document.getElementById("t-table");

    function render() {
      const correct = parseFloat(correctEl.value);
      const total = parseFloat(totalEl.value);
      const res = testScore(correct, total);
      if (!res) {
        pctEl.textContent = "—";
        letterEl.textContent = "";
        detailEl.textContent = "Enter correct answers and a total above 0. Correct cannot exceed the total.";
        tableEl.innerHTML = "";
        return;
      }
      pctEl.textContent = res.pct.toFixed(2).replace(/\.?0+$/, "") + "%";
      letterEl.textContent = "Letter grade: " + res.letter;
      detailEl.textContent = "You got " + res.correct + " of " + res.total + " right and missed " + res.missed + ".";
      const rows = gradeTable(res.total, res.correct)
        .map((r) => {
          const status = r.achieved
            ? "✓ achieved"
            : r.moreNeeded + " more correct needed";
          const cls = r.letter === res.letter ? ' class="you-are-here"' : "";
          return "<tr" + cls + "><td>" + r.letter + "</td><td>" + r.cutoff + "%</td><td>" + r.needed + "</td><td>" + status + "</td></tr>";
        })
        .join("");
      tableEl.innerHTML =
        "<table><thead><tr><th>Grade</th><th>Cutoff</th><th>Correct needed</th><th>Your standing</th></tr></thead><tbody>" + rows + "</tbody></table>";
    }

    correctEl.addEventListener("input", render);
    totalEl.addEventListener("input", render);
    render();
  });
}
