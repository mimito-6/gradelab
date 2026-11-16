/* GradeLab letter grade calculator — pure math (testable) + DOM wiring.
   Scale matches gpa.js exactly: the plus/minus cutoffs and the 4.0
   point values are the same table the GPA calculator uses, so a letter
   shown here always means the same points everywhere on GradeLab. */

const SCALE_PM = [
  { letter: "A+", min: 97, points: 4.0 },
  { letter: "A", min: 93, points: 4.0 },
  { letter: "A-", min: 90, points: 3.67 },
  { letter: "B+", min: 87, points: 3.33 },
  { letter: "B", min: 83, points: 3.0 },
  { letter: "B-", min: 80, points: 2.67 },
  { letter: "C+", min: 77, points: 2.33 },
  { letter: "C", min: 73, points: 2.0 },
  { letter: "C-", min: 70, points: 1.67 },
  { letter: "D+", min: 67, points: 1.33 },
  { letter: "D", min: 63, points: 1.0 },
  { letter: "D-", min: 60, points: 0.67 },
  { letter: "F", min: 0, points: 0.0 },
];
const SCALE_PLAIN = [
  { letter: "A", min: 90, points: 4.0 },
  { letter: "B", min: 80, points: 3.0 },
  { letter: "C", min: 70, points: 2.0 },
  { letter: "D", min: 60, points: 1.0 },
  { letter: "F", min: 0, points: 0.0 },
];

function scaleRows(plusMinus) {
  return plusMinus ? SCALE_PM : SCALE_PLAIN;
}

/* letterFor(pct, plusMinus): percentage -> letter grade, or null.
   Cutoffs are inclusive at the bottom: 90.0 is an A-, 89.9 is a B+.
   Returns null on invalid input (not a number, or outside 0-100). */
function letterFor(pct, plusMinus) {
  if (!isFinite(pct) || pct < 0 || pct > 100) return null;
  const rows = scaleRows(plusMinus);
  for (const row of rows) {
    if (pct >= row.min - 1e-9) return row.letter;
  }
  return "F";
}

/* pointsFor(letter, plusMinus): letter grade -> GPA points on the 4.0
   scale, or null for an unknown letter. A and A+ are both worth 4.0 —
   there is no 4.3 on this scale. */
function pointsFor(letter, plusMinus) {
  const rows = scaleRows(plusMinus);
  for (const row of rows) {
    if (row.letter === letter) return row.points;
  }
  return null;
}

/* nextStep(pct, plusMinus): what stands between this percentage and the
   next higher letter grade. Returns {nextLetter, need} where need is the
   percentage points still missing, or null when already at the top of
   the scale (A+ on plus/minus, A on straight). */
function nextStep(pct, plusMinus) {
  if (!isFinite(pct) || pct < 0 || pct > 100) return null;
  const rows = scaleRows(plusMinus);
  // Rows run high to low (A+ first); the next letter up is the *lowest*
  // cutoff still above pct, so scan from the bottom (F) upward.
  for (let i = rows.length - 1; i >= 0; i--) {
    if (pct < rows[i].min - 1e-9) {
      return { nextLetter: rows[i].letter, need: rows[i].min - pct };
    }
  }
  return null;
}

/* rangeFor(letter, plusMinus): the percentage range a letter covers, as
   {low, high} where high is the top of the band (100 for the top letter,
   otherwise just below the next cutoff, e.g. A- covers 90-92.9).
   Returns null for an unknown letter. */
function rangeFor(letter, plusMinus) {
  const rows = scaleRows(plusMinus);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].letter === letter) {
      const high = i === 0 ? 100 : rows[i - 1].min - 0.1;
      return { low: rows[i].min, high: Math.round(high * 10) / 10 };
    }
  }
  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCALE_PM, SCALE_PLAIN, scaleRows, letterFor, pointsFor, nextStep, rangeFor };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    let plusMinus = true;
    const pctEl = document.getElementById("l-pct");
    const bigEl = document.getElementById("l-letter");
    const verdictEl = document.getElementById("l-verdict");
    const detailEl = document.getElementById("l-detail");
    const nextEl = document.getElementById("l-next");
    const tableEl = document.getElementById("l-table");

    function fmt(n, digits) {
      const d = digits === undefined ? 2 : digits;
      return n.toFixed(d).replace(/\.?0+$/, "");
    }

    function renderTable() {
      const rows = scaleRows(plusMinus);
      const pct = parseFloat(pctEl.value);
      const current = letterFor(pct, plusMinus);
      let html = "<table><thead><tr><th>Letter grade</th><th>Percentage</th><th>GPA points</th><th>What it takes</th></tr></thead><tbody>";
      for (const row of rows) {
        const range = rangeFor(row.letter, plusMinus);
        const mark = row.letter === current ? " class=\"current\"" : "";
        const takes = row.letter === "F"
          ? "Below " + fmt(rows[rows.length - 2].min, 1) + "%"
          : "At least " + fmt(row.min, 1) + "%";
        html += "<tr" + mark + "><td><strong>" + row.letter + "</strong></td><td>" +
          fmt(range.low, 1) + "% – " + fmt(range.high, 1) + "%</td><td>" +
          fmt(row.points) + "</td><td>" + takes + "</td></tr>";
      }
      html += "</tbody></table>";
      tableEl.innerHTML = html;
    }

    function render() {
      const pct = parseFloat(pctEl.value);
      const letter = letterFor(pct, plusMinus);
      if (letter === null) {
        bigEl.textContent = "—";
        verdictEl.textContent = "Enter a percentage between 0 and 100.";
        detailEl.textContent = "";
        nextEl.textContent = "";
        renderTable();
        return;
      }
      const points = pointsFor(letter, plusMinus);
      const range = rangeFor(letter, plusMinus);
      bigEl.textContent = letter;
      verdictEl.textContent = fmt(pct, 1) + "% is a " + letter + " — worth " + fmt(points) + " GPA points.";
      detailEl.textContent = "The " + letter + " band covers " + fmt(range.low, 1) + "% to " +
        fmt(range.high, 1) + "%. " + (letter === "A+" || (letter === "A" && !plusMinus)
          ? "That is the top of the scale — there is no higher letter to reach."
          : "Same letter, same points, on every GradeLab page.");
      const step = nextStep(pct, plusMinus);
      if (step === null) {
        nextEl.textContent = "";
      } else {
        nextEl.textContent = "Need " + fmt(step.need, 1) + " more percentage point" +
          (Math.abs(step.need - 1) < 1e-9 ? "" : "s") + " to reach " + step.nextLetter +
          " (" + fmt(pointsFor(step.nextLetter, plusMinus)) + " points).";
      }
      renderTable();
    }

    document.querySelectorAll('[data-scale]').forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll('[data-scale]').forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      plusMinus = btn.dataset.scale === "pm";
      render();
    }));
    pctEl.addEventListener("input", render);
    render();
  });
}
