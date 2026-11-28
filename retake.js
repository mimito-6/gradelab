/* GradeLab grade retake calculator — pure math (testable) + DOM wiring.
   "I got a C in a 3-credit course — if I retake it and earn an A, what
   happens to my cumulative GPA?" Two school policies are supported:
   - "replace" (most common in the US): the old grade's quality points
     are swapped out for the new grade's; total credits do not change.
   - "average": both attempts count; the new grade's points are added
     on top and total credits grow by the course credits.
   All point values are on the standard 4.0 scale, the same one the GPA
   calculator, letter grade calculator and GPA planner use. */

const MAX_GPA = 4.0;

const PLUS_MINUS_POINTS = [
  { letter: "A", points: 4.0 },
  { letter: "A-", points: 3.67 },
  { letter: "B+", points: 3.33 },
  { letter: "B", points: 3.0 },
  { letter: "B-", points: 2.67 },
  { letter: "C+", points: 2.33 },
  { letter: "C", points: 2.0 },
  { letter: "C-", points: 1.67 },
  { letter: "D+", points: 1.33 },
  { letter: "D", points: 1.0 },
  { letter: "D-", points: 0.67 },
  { letter: "F", points: 0.0 },
];

const STRAIGHT_POINTS = [
  { letter: "A", points: 4.0 },
  { letter: "B", points: 3.0 },
  { letter: "C", points: 2.0 },
  { letter: "D", points: 1.0 },
  { letter: "F", points: 0.0 },
];

/* gradesFor(scale): the grade rows for "plusminus" or "straight".
   Returns a copy of the table; null for an unknown scale. */
function gradesFor(scale) {
  if (scale === "plusminus") return PLUS_MINUS_POINTS.slice();
  if (scale === "straight") return STRAIGHT_POINTS.slice();
  return null;
}

/* pointsFor(letter, scale): grade points for a letter on a scale, or
   null when the letter is not on that scale (e.g. "A-" on straight). */
function pointsFor(letter, scale) {
  const rows = gradesFor(scale);
  if (!rows) return null;
  for (const row of rows) {
    if (row.letter === letter) return row.points;
  }
  return null;
}

/* validInputs(current, earned, credits, oldPoints, newPoints): true only
   when every input is in range. Course credits must be <= earned
   credits — the retaken course is already part of the earned credits,
   so a course bigger than the whole record is impossible. */
function validInputs(current, earned, credits, oldPoints, newPoints) {
  if (!isFinite(current) || current < 0 || current > MAX_GPA) return false;
  if (!isFinite(earned) || earned <= 0) return false;
  if (!isFinite(credits) || credits <= 0 || credits > earned) return false;
  if (!isFinite(oldPoints) || oldPoints < 0 || oldPoints > MAX_GPA) return false;
  if (!isFinite(newPoints) || newPoints < 0 || newPoints > MAX_GPA) return false;
  return true;
}

/* retakeGPA(current, earned, credits, oldPoints, newPoints, policy):
   the new cumulative GPA after retaking one course. Returns null on
   invalid input or an unknown policy.
   - "replace": (current*earned - old*credits + new*credits) / earned
   - "average": (current*earned + new*credits) / (earned + credits) */
function retakeGPA(current, earned, credits, oldPoints, newPoints, policy) {
  if (!validInputs(current, earned, credits, oldPoints, newPoints)) return null;
  if (policy === "replace") {
    return (current * earned - oldPoints * credits + newPoints * credits) / earned;
  }
  if (policy === "average") {
    return (current * earned + newPoints * credits) / (earned + credits);
  }
  return null;
}

/* retakeResult(...): full breakdown — {newGPA, delta, oldQP, newQP,
   totalCredits} — or null on invalid input. newQP is the quality-point
   total after the retake; totalCredits is earned for "replace" and
   earned + credits for "average". */
function retakeResult(current, earned, credits, oldPoints, newPoints, policy) {
  const newGPA = retakeGPA(current, earned, credits, oldPoints, newPoints, policy);
  if (newGPA === null) return null;
  const oldQP = current * earned;
  let newQP, totalCredits;
  if (policy === "replace") {
    newQP = oldQP - oldPoints * credits + newPoints * credits;
    totalCredits = earned;
  } else {
    newQP = oldQP + newPoints * credits;
    totalCredits = earned + credits;
  }
  return { newGPA, delta: newGPA - current, oldQP, newQP, totalCredits };
}

/* scenarioRows(current, earned, credits, oldPoints, policy, scale):
   one row per possible new grade on the scale — {letter, points,
   newGPA} — so the page can show "what if I earn a B+ instead of an A".
   Returns null on invalid input. */
function scenarioRows(current, earned, credits, oldPoints, policy, scale) {
  const rows = gradesFor(scale);
  if (!rows) return null;
  const out = [];
  for (const row of rows) {
    const gpa = retakeGPA(current, earned, credits, oldPoints, row.points, policy);
    if (gpa === null) return null;
    out.push({ letter: row.letter, points: row.points, newGPA: gpa });
  }
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { MAX_GPA, PLUS_MINUS_POINTS, STRAIGHT_POINTS, gradesFor, pointsFor, validInputs, retakeGPA, retakeResult, scenarioRows };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const curEl = document.getElementById("rt-current");
    const earnedEl = document.getElementById("rt-earned");
    const creditsEl = document.getElementById("rt-credits");
    const oldEl = document.getElementById("rt-old");
    const newEl = document.getElementById("rt-new");
    const scaleEl = document.getElementById("rt-scale");
    const policyEl = document.getElementById("rt-policy");
    const bigEl = document.getElementById("rt-newgpa");
    const verdictEl = document.getElementById("rt-verdict");
    const detailEl = document.getElementById("rt-detail");
    const extraEl = document.getElementById("rt-extra");
    const tableEl = document.getElementById("rt-table");

    function fmt(n, digits) {
      const d = digits === undefined ? 2 : digits;
      return n.toFixed(d).replace(/\.?0+$/, "");
    }

    function fmtSigned(n) {
      const sign = n > 0 ? "+" : n < 0 ? "−" : "";
      return sign + Math.abs(n).toFixed(2);
    }

    function fillGradeSelects() {
      const scale = scaleEl.value;
      const rows = gradesFor(scale);
      const keepOld = oldEl.value;
      const keepNew = newEl.value;
      oldEl.innerHTML = "";
      newEl.innerHTML = "";
      for (const row of rows) {
        const label = row.letter + " (" + fmt(row.points) + ")";
        const o1 = document.createElement("option");
        o1.value = row.letter;
        o1.textContent = label;
        oldEl.appendChild(o1);
        const o2 = document.createElement("option");
        o2.value = row.letter;
        o2.textContent = label;
        newEl.appendChild(o2);
      }
      oldEl.value = pointsFor(keepOld, scale) !== null ? keepOld : "C";
      newEl.value = pointsFor(keepNew, scale) !== null ? keepNew : "A";
    }

    function renderTable(current, earned, credits, oldPoints, policy, scale, newLetter) {
      const rows = scenarioRows(current, earned, credits, oldPoints, policy, scale);
      if (!rows) { tableEl.innerHTML = ""; return; }
      let html = "<table><thead><tr><th>If you earn…</th><th>Your cumulative becomes</th><th>Change</th></tr></thead><tbody>";
      for (const row of rows) {
        const mark = row.letter === newLetter ? " class=\"current\"" : "";
        html += "<tr" + mark + "><td><strong>" + row.letter + "</strong> (" + fmt(row.points) + ")</td><td>" +
          fmt(row.newGPA) + "</td><td>" + fmtSigned(row.newGPA - current) + "</td></tr>";
      }
      html += "</tbody></table>";
      tableEl.innerHTML = html;
    }

    function render() {
      const current = parseFloat(curEl.value);
      const earned = parseFloat(earnedEl.value);
      const credits = parseFloat(creditsEl.value);
      const scale = scaleEl.value;
      const policy = policyEl.value;
      const oldPoints = pointsFor(oldEl.value, scale);
      const newPoints = pointsFor(newEl.value, scale);
      const res = (oldPoints === null || newPoints === null)
        ? null
        : retakeResult(current, earned, credits, oldPoints, newPoints, policy);
      if (res === null) {
        bigEl.textContent = "—";
        if (isFinite(current) && isFinite(earned) && isFinite(credits) && credits > earned) {
          verdictEl.textContent = "Course credits cannot exceed credits earned — the retaken course is already part of your earned credits.";
        } else {
          verdictEl.textContent = "Enter your current GPA (0–4), earned credits, course credits, and the old and new grades.";
        }
        detailEl.textContent = "";
        extraEl.textContent = "";
        tableEl.innerHTML = "";
        return;
      }
      bigEl.textContent = fmt(res.newGPA);
      const oldLabel = oldEl.value + " (" + fmt(oldPoints) + ")";
      const newLabel = newEl.value + " (" + fmt(newPoints) + ")";
      if (Math.abs(res.delta) < 0.005) {
        verdictEl.textContent = "No change — a " + newEl.value + " is worth the same points as your old " + oldEl.value + ", so the retake would not move your GPA.";
      } else if (res.delta > 0) {
        verdictEl.textContent = "Retaking lifts your GPA by " + fmtSigned(res.delta) + " — from " + fmt(current) + " to " + fmt(res.newGPA) + ".";
      } else {
        verdictEl.textContent = "Careful — retaking and earning a " + newEl.value + " would lower your GPA by " + fmtSigned(res.delta) + ". Only retake a course you are confident you can beat.";
      }
      detailEl.textContent = "Quality points: " + fmt(res.oldQP, 1) + " → " + fmt(res.newQP, 1) +
        " (swapping " + oldLabel + " for " + newLabel + " over " + fmt(credits, 0) + " credits)" +
        (policy === "replace"
          ? " — total credits stay at " + fmt(res.totalCredits, 0) + "."
          : " — total credits grow to " + fmt(res.totalCredits, 0) + " because both attempts count.");
      extraEl.textContent = policy === "replace"
        ? "This assumes your school replaces the old grade. If it averages both attempts instead, switch the policy above — the same retake is worth much less."
        : "This assumes your school averages both attempts. If it replaces the old grade instead, switch the policy above — the same retake is worth more.";
      renderTable(current, earned, credits, oldPoints, policy, scale, newEl.value);
    }

    scaleEl.addEventListener("change", () => { fillGradeSelects(); render(); });
    [curEl, earnedEl, creditsEl, oldEl, newEl, policyEl].forEach(el => el.addEventListener("input", render));
    [oldEl, newEl, policyEl].forEach(el => el.addEventListener("change", render));
    fillGradeSelects();
    render();
  });
}
