/* GradeLab GPA planner — pure math (testable) + DOM wiring.
   The reverse of the GPA calculator: instead of "what will my cumulative
   GPA become if I earn X next semester", this page asks "what semester
   GPA do I *need* next semester to reach my target cumulative GPA".
   Formula: required = (target*(earned+planned) - current*earned) / planned.
   All GPA values are on the standard 4.0 scale, the same one the GPA
   calculator and letter grade pages use. */

const MAX_GPA = 4.0;

/* validInputs(current, earned, target, planned): true only when every
   input is a finite number in range: GPAs 0-4, credits > 0.
   Earned credits must be > 0 — with no earned credits there is no
   cumulative GPA yet, and the GPA calculator is the right page. */
function validInputs(current, earned, target, planned) {
  if (!isFinite(current) || current < 0 || current > MAX_GPA) return false;
  if (!isFinite(earned) || earned <= 0) return false;
  if (!isFinite(target) || target < 0 || target > MAX_GPA) return false;
  if (!isFinite(planned) || planned <= 0) return false;
  return true;
}

/* requiredSemesterGPA(current, earned, target, planned): the semester GPA
   needed next term to land exactly on target. Returns null on invalid
   input. The result can be negative (target already locked in) or above
   4.0 (impossible in one semester) — callers must read the state, not
   just the number. */
function requiredSemesterGPA(current, earned, target, planned) {
  if (!validInputs(current, earned, target, planned)) return null;
  return (target * (earned + planned) - current * earned) / planned;
}

/* planState(current, earned, target, planned): classifies the plan.
   Returns {state, required} where state is one of:
   - "invalid": bad input (required is null)
   - "locked": required <= 0 — the target is already guaranteed, even a
     0.0 next semester cannot pull the cumulative below target
   - "on-track": 0 < required <= 4.0 — achievable next semester
   - "impossible": required > 4.0 — no semester GPA can reach the target
     in one term; creditsAtFour says how many straight-A credits it
     would take instead (null when target is 4.0 and current < 4.0,
     which no finite number of 4.0 credits can ever reach) */
function planState(current, earned, target, planned) {
  const required = requiredSemesterGPA(current, earned, target, planned);
  if (required === null) return { state: "invalid", required: null, creditsAtFour: null };
  if (required <= 0) return { state: "locked", required, creditsAtFour: null };
  if (required <= MAX_GPA + 1e-9) return { state: "on-track", required, creditsAtFour: null };
  return { state: "impossible", required, creditsAtFour: creditsAtFour(current, earned, target) };
}

/* creditsAtFour(current, earned, target): how many credits at a straight
   4.0 it takes to reach target, or null when unreachable (target is 4.0
   while current < 4.0 — a cumulative below 4.0 can approach 4.0 but never
   reach it — or target <= current, where no extra credits are needed).
   Derived from (current*earned + 4*n) / (earned + n) >= target. */
function creditsAtFour(current, earned, target) {
  if (!isFinite(current) || !isFinite(earned) || !isFinite(target)) return null;
  if (earned <= 0 || current < 0 || current > MAX_GPA) return null;
  if (target <= current) return 0;
  if (target >= MAX_GPA) return null;
  return earned * (target - current) / (MAX_GPA - target);
}

/* outcomeGPA(current, earned, semesterGPA, planned): the cumulative GPA
   after one semester at semesterGPA. Returns null on invalid input. */
function outcomeGPA(current, earned, semesterGPA, planned) {
  if (!validInputs(current, earned, semesterGPA, planned)) return null;
  return (current * earned + semesterGPA * planned) / (earned + planned);
}

/* letterHint(gpa): plain-English reading of a required semester GPA on
   the plus/minus 4.0 scale (same point values as lettergrade.js).
   Returns e.g. "an A- average" when gpa is exactly 3.67, or
   "better than an A- average" when it sits between A- (3.67) and A (4.0).
   Returns null outside 0-4. */
const LETTER_POINTS = [
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
function letterHint(gpa) {
  if (!isFinite(gpa) || gpa < 0 || gpa > MAX_GPA) return null;
  if (Math.abs(gpa - MAX_GPA) < 1e-9) return "a straight-A semester";
  for (const row of LETTER_POINTS) {
    if (gpa >= row.points - 1e-9) {
      const article = row.letter[0] === "A" || row.letter[0] === "F" ? "an" : "a";
      if (Math.abs(gpa - row.points) < 1e-9) return article + " " + row.letter + " average";
      return "better than " + article + " " + row.letter + " average";
    }
  }
  return "an F average";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { MAX_GPA, validInputs, requiredSemesterGPA, planState, creditsAtFour, outcomeGPA, letterHint };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const curEl = document.getElementById("gp-current");
    const earnedEl = document.getElementById("gp-earned");
    const targetEl = document.getElementById("gp-target");
    const plannedEl = document.getElementById("gp-planned");
    const bigEl = document.getElementById("gp-required");
    const verdictEl = document.getElementById("gp-verdict");
    const detailEl = document.getElementById("gp-detail");
    const extraEl = document.getElementById("gp-extra");
    const tableEl = document.getElementById("gp-table");

    function fmt(n, digits) {
      const d = digits === undefined ? 2 : digits;
      return n.toFixed(d).replace(/\.?0+$/, "");
    }

    function renderTable(current, earned, planned) {
      let html = "<table><thead><tr><th>If next semester is…</th><th>Your cumulative becomes</th><th>vs. your target</th></tr></thead><tbody>";
      const target = parseFloat(targetEl.value);
      for (const sem of [2.0, 2.5, 3.0, 3.5, 4.0]) {
        const out = outcomeGPA(current, earned, sem, planned);
        const mark = out !== null && isFinite(target) && out >= target - 1e-9 ? " class=\"current\"" : "";
        html += "<tr" + mark + "><td><strong>" + fmt(sem) + "</strong></td><td>" +
          (out === null ? "—" : fmt(out, 2)) + "</td><td>" +
          (out === null || !isFinite(target) ? "—" : (out >= target - 1e-9 ? "Reaches target ✓" : "Below target")) +
          "</td></tr>";
      }
      html += "</tbody></table>";
      tableEl.innerHTML = html;
    }

    function render() {
      const current = parseFloat(curEl.value);
      const earned = parseFloat(earnedEl.value);
      const target = parseFloat(targetEl.value);
      const planned = parseFloat(plannedEl.value);
      const plan = planState(current, earned, target, planned);
      if (plan.state === "invalid") {
        bigEl.textContent = "—";
        verdictEl.textContent = "Enter your current GPA (0–4), earned credits, target GPA (0–4), and planned credits.";
        detailEl.textContent = "";
        extraEl.textContent = "";
        tableEl.innerHTML = "";
        return;
      }
      const best = outcomeGPA(current, earned, MAX_GPA, planned);
      if (plan.state === "locked") {
        bigEl.textContent = "Already there";
        verdictEl.textContent = "Your target of " + fmt(target) + " is already locked in — even a 0.0 next semester keeps you at or above it.";
        detailEl.textContent = "With " + fmt(earned, 0) + " credits at " + fmt(current) + ", a " + fmt(planned, 0) +
          "-credit semester at 0.0 would leave you at " + fmt(outcomeGPA(current, earned, 0, planned)) + ".";
        extraEl.textContent = "A straight-A semester would lift you to " + fmt(best) + " instead.";
      } else if (plan.state === "on-track") {
        bigEl.textContent = fmt(plan.required);
        verdictEl.textContent = "You need a " + fmt(plan.required) + " semester GPA — " + letterHint(plan.required) + ".";
        detailEl.textContent = "That is (" + fmt(target) + " × " + fmt(earned + planned, 0) + " − " + fmt(current) +
          " × " + fmt(earned, 0) + ") ÷ " + fmt(planned, 0) + " credits.";
        extraEl.textContent = "A straight-A semester would take you to " + fmt(best) + ", " +
          fmt(best - target) + " above your target.";
      } else {
        bigEl.textContent = "Not in one semester";
        verdictEl.textContent = "You would need a " + fmt(plan.required) + " semester GPA — above the 4.0 maximum, so this target cannot be reached next term.";
        if (plan.creditsAtFour === null) {
          detailEl.textContent = "A 4.0 cumulative can never be reached once any grade below A is on the record — it can only be approached, never hit.";
        } else {
          detailEl.textContent = "At a straight 4.0 every term, it takes about " + fmt(Math.ceil(plan.creditsAtFour), 0) +
            " more credits (" + fmt(plan.creditsAtFour) + " exactly) to reach " + fmt(target) + ".";
        }
        extraEl.textContent = "A straight-A semester would still lift you to " + fmt(best) +
          " — the highest this target can get next term. Consider a lower target or a longer runway.";
      }
      renderTable(current, earned, planned);
    }

    [curEl, earnedEl, targetEl, plannedEl].forEach(el => el.addEventListener("input", render));
    render();
  });
}
