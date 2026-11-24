/* GradeLab GPA to percentage converter — pure math (testable) + DOM wiring.
   Reverse lookup on the SAME scale table as lettergrade.js / gpa.js:
   the plus/minus cutoffs and point values are identical, so a GPA shown
   here always means the same letter and percentage band everywhere on
   GradeLab. A and A+ are both worth 4.0 — a 4.0 cannot tell them apart.

   Honest limits (stated on the page too): there is no universal formula
   that turns a GPA into a percentage, because schools use different
   scales. This tool only reads the site's own scale table backwards:
   the percentage it shows is a BAND ESTIMATE, never an exact conversion.
   A GPA between two rungs (e.g. 3.85, between A- 3.67 and A 4.0) has no
   single letter at all, so the tool says so and gives the span of the
   two neighbouring bands instead of inventing a precise number. */

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

/* rangeFor(letter, plusMinus): the percentage range a letter covers, as
   {low, high} where high is the top of the band (100 for the top letter,
   otherwise just below the next cutoff, e.g. A- covers 90-92.9).
   Returns null for an unknown letter. Identical rule to lettergrade.js. */
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

/* lookupGPA(gpa, plusMinus): GPA (0-4.0) -> reverse lookup result, or null.
   - Exact rung: { kind: "exact", letters: [...], points, low, high }.
     A 4.0 on the plus/minus scale matches TWO letters (A+ and A), so
     letters is ["A+", "A"] and the band is their union, 93-100%.
   - Between rungs: { kind: "between", lower: {letter, points, low, high},
     upper: {letter, points, low, high}, low, high }. low/high span the
     two neighbouring bands (e.g. 3.85 -> A- 90-92.9% and A 93-96.9%,
     span 90-96.9%) — an honest outer bound, not a precise percentage.
   - Invalid input (not a number, below 0, above 4.0) returns null. */
function lookupGPA(gpa, plusMinus) {
  if (!isFinite(gpa) || gpa < 0 || gpa > 4.0) return null;
  const rows = scaleRows(plusMinus);
  const eps = 1e-9;
  const exact = rows.filter(r => Math.abs(r.points - gpa) < eps);
  if (exact.length > 0) {
    const letters = exact.map(r => r.letter);
    const lows = exact.map(r => rangeFor(r.letter, plusMinus).low);
    const highs = exact.map(r => rangeFor(r.letter, plusMinus).high);
    return {
      kind: "exact",
      letters,
      points: gpa,
      low: Math.min.apply(null, lows),
      high: Math.max.apply(null, highs),
    };
  }
  // Distinct point values, high to low; find the adjacent pair bracketing gpa.
  const points = [];
  for (const r of rows) {
    if (points.indexOf(r.points) === -1) points.push(r.points);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const upper = points[i], lower = points[i + 1];
    if (gpa < upper - eps && gpa > lower + eps) {
      // When several letters share a point value (A+ and A are both 4.0),
      // the neighbour band is the one adjacent to the gap: the lowest
      // band carrying the upper points (A, 93-96.9%) and the highest band
      // carrying the lower points.
      const upperRows = rows.filter(r => r.points === upper);
      const lowerRows = rows.filter(r => r.points === lower);
      const upperRow = upperRows.reduce((a, b) => (b.min < a.min ? b : a));
      const lowerRow = lowerRows.reduce((a, b) => (b.min > a.min ? b : a));
      const upperRange = rangeFor(upperRow.letter, plusMinus);
      const lowerRange = rangeFor(lowerRow.letter, plusMinus);
      return {
        kind: "between",
        lower: { letter: lowerRow.letter, points: lower, low: lowerRange.low, high: lowerRange.high },
        upper: { letter: upperRow.letter, points: upper, low: upperRange.low, high: upperRange.high },
        low: lowerRange.low,
        high: upperRange.high,
      };
    }
  }
  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCALE_PM, SCALE_PLAIN, scaleRows, rangeFor, lookupGPA };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    let plusMinus = true;
    const gpaEl = document.getElementById("g-gpa");
    const bigEl = document.getElementById("g-letter");
    const verdictEl = document.getElementById("g-verdict");
    const detailEl = document.getElementById("g-detail");
    const rangeEl = document.getElementById("g-range");
    const tableEl = document.getElementById("g-table");

    function fmt(n, digits) {
      const d = digits === undefined ? 2 : digits;
      return n.toFixed(d).replace(/\.?0+$/, "");
    }

    function renderTable() {
      const rows = scaleRows(plusMinus);
      const gpa = parseFloat(gpaEl.value);
      const res = lookupGPA(gpa, plusMinus);
      const current = res === null ? [] : (res.kind === "exact" ? res.letters : [res.lower.letter, res.upper.letter]);
      let html = "<table><thead><tr><th>GPA points</th><th>Letter grade</th><th>Percentage range</th></tr></thead><tbody>";
      for (const row of rows) {
        const range = rangeFor(row.letter, plusMinus);
        const mark = current.indexOf(row.letter) !== -1 ? " class=\"current\"" : "";
        html += "<tr" + mark + "><td><strong>" + fmt(row.points) + "</strong></td><td>" +
          row.letter + "</td><td>" + fmt(range.low, 1) + "% – " + fmt(range.high, 1) + "%</td></tr>";
      }
      html += "</tbody></table>";
      tableEl.innerHTML = html;
    }

    function render() {
      const gpa = parseFloat(gpaEl.value);
      const res = lookupGPA(gpa, plusMinus);
      if (res === null) {
        bigEl.textContent = "—";
        verdictEl.textContent = "Enter a GPA between 0 and 4.0.";
        detailEl.textContent = "";
        rangeEl.textContent = "";
        renderTable();
        return;
      }
      if (res.kind === "exact") {
        const label = res.letters.join(" / ");
        bigEl.textContent = label;
        verdictEl.textContent = fmt(gpa) + " GPA is " + (res.letters.length > 1 ? "an " + label + " — both worth 4.0 points, so a 4.0 cannot tell A+ from A." : "a " + label + ".");
        detailEl.textContent = "Estimated percentage: " + fmt(res.low, 1) + "% to " + fmt(res.high, 1) + "%.";
        rangeEl.textContent = "That is the percentage band for " + label + " on this scale — an estimate, not an exact conversion. Your school's official conversion is the one that counts.";
      } else {
        bigEl.textContent = res.lower.letter + " – " + res.upper.letter;
        verdictEl.textContent = fmt(gpa) + " GPA falls between " + res.lower.letter + " (" + fmt(res.lower.points) +
          " points, " + fmt(res.lower.low, 1) + "% – " + fmt(res.lower.high, 1) + "%) and " + res.upper.letter +
          " (" + fmt(res.upper.points) + " points, " + fmt(res.upper.low, 1) + "% – " + fmt(res.upper.high, 1) +
          "%). No single letter is worth " + fmt(gpa) + " points.";
        detailEl.textContent = "Estimated percentage: roughly " + fmt(res.low, 1) + "% to " + fmt(res.high, 1) +
          "% — the span of the two neighbouring bands.";
        rangeEl.textContent = "A GPA between two rungs usually comes from averaging several courses, so the percentage is a range, not one number. Your school's official conversion is the one that counts.";
      }
      renderTable();
    }

    document.querySelectorAll('[data-scale]').forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll('[data-scale]').forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      plusMinus = btn.dataset.scale === "pm";
      render();
    }));
    gpaEl.addEventListener("input", render);
    render();
  });
}
