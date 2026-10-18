/* GradeLab GPA calculator — pure math (testable) + DOM wiring. */

const SCALE_PM = { "A+": 4.0, "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67,
  "C+": 2.33, "C": 2.0, "C-": 1.67, "D+": 1.33, "D": 1.0, "D-": 0.67, "F": 0.0 };
const SCALE_PLAIN = { "A": 4.0, "B": 3.0, "C": 2.0, "D": 1.0, "F": 0.0 };
const LETTERS_PM = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
const LETTERS_PLAIN = ["A", "B", "C", "D", "F"];

/* Standard US percentage cutoffs -> letter, matching GradeLab's final-exam page. */
function percentToLetter(pct, plusMinus) {
  if (pct >= 97) return plusMinus ? "A+" : "A";
  if (pct >= 93) return "A";
  if (pct >= 90) return plusMinus ? "A-" : "A";
  if (pct >= 87) return plusMinus ? "B+" : "B";
  if (pct >= 83) return "B";
  if (pct >= 80) return plusMinus ? "B-" : "B";
  if (pct >= 77) return plusMinus ? "C+" : "C";
  if (pct >= 73) return "C";
  if (pct >= 70) return plusMinus ? "C-" : "C";
  if (pct >= 67) return plusMinus ? "D+" : "D";
  if (pct >= 63) return "D";
  if (pct >= 60) return plusMinus ? "D-" : "D";
  return "F";
}

function letterToPoints(letter, scale) {
  const table = scale === "plain" ? SCALE_PLAIN : SCALE_PM;
  return Object.prototype.hasOwnProperty.call(table, letter) ? table[letter] : null;
}

/* courses: [{grade: letter, credits: number}] -> {gpa, credits, qualityPoints} | null */
function termGPA(courses, scale) {
  let qp = 0, cr = 0;
  for (const c of courses) {
    const pts = letterToPoints(c.grade, scale);
    if (pts === null || !isFinite(c.credits) || c.credits <= 0) continue;
    qp += pts * c.credits;
    cr += c.credits;
  }
  if (cr <= 0) return null;
  return { gpa: qp / cr, credits: cr, qualityPoints: qp };
}

/* -> new cumulative GPA | null */
function cumulativeGPA(currentGPA, currentCredits, termQP, termCredits) {
  if (!isFinite(currentGPA) || currentGPA < 0 || !isFinite(currentCredits) || currentCredits < 0) return null;
  const totalCr = currentCredits + termCredits;
  if (totalCr <= 0) return null;
  return (currentGPA * currentCredits + termQP) / totalCr;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCALE_PM, SCALE_PLAIN, percentToLetter, letterToPoints, termGPA, cumulativeGPA };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    let scale = "pm", format = "letter";
    const rowsEl = document.getElementById("gpa-rows");

    function gradeInputHtml() {
      if (format === "letter") {
        const letters = scale === "plain" ? LETTERS_PLAIN : LETTERS_PM;
        const opts = letters.map(l => `<option value="${l}">${l}</option>`).join("");
        return `<select class="g-grade" aria-label="Grade">${opts}</select>`;
      }
      return `<input class="g-grade" type="number" min="0" max="100" step="0.1" placeholder="%" inputmode="decimal" aria-label="Grade percent">`;
    }

    function addRow() {
      const div = document.createElement("div");
      div.className = "gpa-row";
      div.innerHTML = `<input class="g-name" type="text" placeholder="Course name (optional)" aria-label="Course name">` +
        gradeInputHtml() +
        `<input class="g-credits" type="number" min="0" step="0.5" placeholder="Credits" inputmode="decimal" aria-label="Credit hours">` +
        `<button class="remove-row" type="button" aria-label="Remove course">×</button>`;
      div.querySelector(".remove-row").addEventListener("click", () => { div.remove(); recalc(); });
      div.querySelectorAll("input, select").forEach(el => el.addEventListener("input", recalc));
      rowsEl.appendChild(div);
      recalc();
    }

    function readCourses() {
      const courses = [];
      rowsEl.querySelectorAll(".gpa-row").forEach(row => {
        const gEl = row.querySelector(".g-grade");
        const cr = parseFloat(row.querySelector(".g-credits").value);
        let letter;
        if (format === "letter") {
          letter = gEl.value;
        } else {
          const pct = parseFloat(gEl.value);
          if (!isFinite(pct) || pct < 0 || pct > 100) return;
          letter = percentToLetter(pct, scale === "pm");
        }
        if (isFinite(cr) && cr > 0) courses.push({ grade: letter, credits: cr });
      });
      return courses;
    }

    function recalc() {
      const t = termGPA(readCourses(), scale);
      const big = document.getElementById("term-gpa");
      const detail = document.getElementById("term-detail");
      if (!t) {
        big.textContent = "—";
        detail.textContent = "Add at least one course with credits.";
      } else {
        big.textContent = t.gpa.toFixed(2);
        detail.textContent = `${t.qualityPoints.toFixed(1)} quality points ÷ ${t.credits} credits`;
      }
      const cumG = parseFloat(document.getElementById("cum-gpa").value);
      const cumC = parseFloat(document.getElementById("cum-credits").value);
      const cBig = document.getElementById("cum-result");
      const cDetail = document.getElementById("cum-detail");
      if (t && isFinite(cumG) && cumG >= 0 && isFinite(cumC) && cumC > 0) {
        const nc = cumulativeGPA(cumG, cumC, t.qualityPoints, t.credits);
        cBig.textContent = nc.toFixed(2);
        cDetail.textContent = `${cumG.toFixed(2)} over ${cumC} credits + this term → ${(cumC + t.credits)} credits`;
      } else if (document.getElementById("cum-gpa").value || document.getElementById("cum-credits").value) {
        cBig.textContent = "—";
        cDetail.textContent = "Enter a valid current GPA, completed credits, and this term's courses.";
      } else {
        cBig.textContent = "—";
        cDetail.textContent = "Enter your current cumulative GPA and credits.";
      }
    }

    document.querySelectorAll('[data-scale]').forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll('[data-scale]').forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      scale = btn.dataset.scale;
      rowsEl.innerHTML = "";
      for (let i = 0; i < 4; i++) addRow();
    }));
    document.querySelectorAll('[data-format]').forEach(btn => btn.addEventListener("click", () => {
      document.querySelectorAll('[data-format]').forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      format = btn.dataset.format;
      rowsEl.innerHTML = "";
      for (let i = 0; i < 4; i++) addRow();
    }));
    document.getElementById("add-gpa-row").addEventListener("click", addRow);
    document.getElementById("cum-gpa").addEventListener("input", recalc);
    document.getElementById("cum-credits").addEventListener("input", recalc);

    for (let i = 0; i < 4; i++) addRow();
  });
}
