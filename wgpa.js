/* GradeLab Weighted GPA calculator — pure math (testable) + DOM wiring.
   Base points: common US 4.0 scale with plus/minus (same table as gpa.js).
   Level bonus: Regular +0, Honors +0.5, AP/IB +1.0.
   An F earns 0 grade points and no bonus — a bonus never rescues a failed course. */

const WGPA_POINTS = { "A+": 4.0, "A": 4.0, "A-": 3.67, "B+": 3.33, "B": 3.0, "B-": 2.67,
  "C+": 2.33, "C": 2.0, "C-": 1.67, "D+": 1.33, "D": 1.0, "D-": 0.67, "F": 0.0 };
const WGPA_LETTERS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
const WGPA_BONUS = { "regular": 0, "honors": 0.5, "ap": 1.0 };

function wgpaBasePoints(letter) {
  return Object.prototype.hasOwnProperty.call(WGPA_POINTS, letter) ? WGPA_POINTS[letter] : null;
}

/* courses: [{grade: letter, credits: number, level: "regular"|"honors"|"ap"}]
   -> {unweighted, weighted, boost, credits, uqp, wqp} | null */
function weightedGPA(courses) {
  let uqp = 0, wqp = 0, cr = 0;
  for (const c of courses) {
    const base = wgpaBasePoints(c.grade);
    if (base === null || !isFinite(c.credits) || c.credits <= 0) continue;
    const bonus = base === 0 ? 0 : (WGPA_BONUS[c.level] || 0);
    uqp += base * c.credits;
    wqp += (base + bonus) * c.credits;
    cr += c.credits;
  }
  if (cr <= 0) return null;
  return { unweighted: uqp / cr, weighted: wqp / cr, boost: (wqp - uqp) / cr,
           credits: cr, uqp: uqp, wqp: wqp };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { WGPA_POINTS, WGPA_BONUS, wgpaBasePoints, weightedGPA };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const rowsEl = document.getElementById("wgpa-rows");

    function addRow() {
      const div = document.createElement("div");
      div.className = "wgpa-row";
      const letterOpts = WGPA_LETTERS.map(l => `<option value="${l}">${l}</option>`).join("");
      div.innerHTML = `<input class="w-name" type="text" placeholder="Course name (optional)" aria-label="Course name">` +
        `<select class="w-grade" aria-label="Grade">${letterOpts}</select>` +
        `<select class="w-level" aria-label="Course level">` +
        `<option value="regular">Regular</option><option value="honors">Honors (+0.5)</option>` +
        `<option value="ap">AP / IB (+1.0)</option></select>` +
        `<input class="w-credits" type="number" min="0" step="0.5" placeholder="Credits" inputmode="decimal" aria-label="Credit hours">` +
        `<button class="remove-row" type="button" aria-label="Remove course">×</button>`;
      div.querySelector(".remove-row").addEventListener("click", () => { div.remove(); recalc(); });
      div.querySelectorAll("input, select").forEach(el => el.addEventListener("input", recalc));
      rowsEl.appendChild(div);
      recalc();
    }

    function readCourses() {
      const courses = [];
      rowsEl.querySelectorAll(".wgpa-row").forEach(row => {
        const cr = parseFloat(row.querySelector(".w-credits").value);
        if (isFinite(cr) && cr > 0) {
          courses.push({ grade: row.querySelector(".w-grade").value,
                         level: row.querySelector(".w-level").value, credits: cr });
        }
      });
      return courses;
    }

    function recalc() {
      const t = weightedGPA(readCourses());
      const big = document.getElementById("wgpa-weighted");
      const detail = document.getElementById("wgpa-detail");
      if (!t) {
        big.textContent = "—";
        detail.textContent = "Add at least one course with credits.";
      } else {
        big.textContent = t.weighted.toFixed(2);
        detail.textContent = `Unweighted ${t.unweighted.toFixed(2)} · boost +${t.boost.toFixed(2)} ` +
          `· ${t.wqp.toFixed(1)} weighted quality points ÷ ${t.credits} credits`;
      }
    }

    document.getElementById("add-wgpa-row").addEventListener("click", addRow);
    for (let i = 0; i < 4; i++) addRow();
  });
}
