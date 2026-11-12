/* GradeLab attendance calculator — pure math (testable) + DOM wiring. */

/* attendancePlan(attended, total, reqPct): current attendance and how much
   slack (or recovery) is left against a required attendance percentage.
   - pct: current attendance percentage.
   - status: "above" | "exact" | "below".
   - maxMisses: how many more classes you can miss (in a row, from now)
     before dropping below the requirement. Only meaningful when above.
     Formula: attended / (total + x) >= r  =>  x <= attended / r - total,
     floored (a partial class does not exist). E.g. 18/20 at 75%:
     18 / 0.75 - 20 = 4, and 18/24 = 75% exactly, 18/25 = 72% fails.
   - classesToRecover: how many classes in a row you must attend to climb
     back to the requirement. Only meaningful when below.
     Formula: (attended + y) / (total + y) >= r  =>  y >= (r*total - attended) / (1 - r),
     ceiled. E.g. 12/20 at 75%: (15 - 12) / 0.25 = 12, and 24/32 = 75%.
     Returns null when the requirement is 100% and you have already missed
     one — no finite streak of attended classes can restore 100%.
   Returns null on invalid input (total <= 0, attended outside [0, total],
   requirement outside (0, 100]). */
function attendancePlan(attended, total, reqPct) {
  if (!isFinite(attended) || !isFinite(total) || !isFinite(reqPct)) return null;
  if (total <= 0 || attended < 0 || attended > total) return null;
  if (reqPct <= 0 || reqPct > 100) return null;
  const r = reqPct / 100;
  const pct = (attended / total) * 100;
  const result = { attended, total, reqPct, pct };
  if (pct >= reqPct) {
    result.status = pct === reqPct ? "exact" : "above";
    result.maxMisses = Math.floor(attended / r - total + 1e-9);
    result.classesToRecover = 0;
  } else {
    result.status = "below";
    result.maxMisses = 0;
    if (reqPct >= 100) {
      result.classesToRecover = null;
    } else {
      result.classesToRecover = Math.ceil((r * total - attended) / (1 - r) - 1e-9);
    }
  }
  return result;
}

/* courseProjection(attended, total, courseTotal, reqPct): what the whole
   course looks like if you know how many classes it has in total.
   - remaining: classes not yet held (courseTotal - total).
   - attendAllPct: final attendance if you attend every remaining class.
   - missBudget: how many of the remaining classes you can miss in total
     and still finish at or above the requirement.
     Formula: (attended + remaining - x) / courseTotal >= r
     => x <= attended + remaining - r * courseTotal, floored.
     E.g. 18/20 in a 30-class course at 75%: attend all -> 28/30 = 93.33%;
     miss budget = 18 + 10 - 22.5 = 5 (miss 5 -> 23/30 = 76.67% passes,
     miss 6 -> 22/30 = 73.33% fails).
   - reachable: whether the requirement is reachable at all, even with
     perfect attendance from now on.
   Returns null when courseTotal is not a finite number >= total. */
function courseProjection(attended, total, courseTotal, reqPct) {
  if (!isFinite(attended) || !isFinite(total) || !isFinite(courseTotal) || !isFinite(reqPct)) return null;
  if (total <= 0 || attended < 0 || attended > total) return null;
  if (courseTotal < total || reqPct <= 0 || reqPct > 100) return null;
  const r = reqPct / 100;
  const remaining = courseTotal - total;
  const attendAllPct = ((attended + remaining) / courseTotal) * 100;
  // A missed class is one of the remaining classes, so the budget can
  // never exceed them: without the cap, a finished course (remaining 0)
  // would report a budget of floor(attended - r * courseTotal), i.e. it
  // would count classes that do not exist. E.g. 18/20 in a 20-class
  // course at 75% has no classes left to miss, not 3.
  const missBudget = Math.min(Math.floor(attended + remaining - r * courseTotal + 1e-9), remaining);
  return {
    courseTotal,
    remaining,
    attendAllPct,
    missBudget,
    reachable: attendAllPct >= reqPct - 1e-9,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { attendancePlan, courseProjection };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const attendedEl = document.getElementById("a-attended");
    const totalEl = document.getElementById("a-total");
    const reqEl = document.getElementById("a-req");
    const courseEl = document.getElementById("a-course");
    const pctEl = document.getElementById("a-pct");
    const verdictEl = document.getElementById("a-verdict");
    const detailEl = document.getElementById("a-detail");
    const projEl = document.getElementById("a-projection");

    function fmt(n, digits) {
      return n.toFixed(digits === undefined ? 2 : digits).replace(/\.?0+$/, "");
    }

    function render() {
      const attended = parseFloat(attendedEl.value);
      const total = parseFloat(totalEl.value);
      const req = parseFloat(reqEl.value);
      const courseTotal = courseEl.value === "" ? null : parseFloat(courseEl.value);

      const plan = attendancePlan(attended, total, req);
      if (!plan) {
        pctEl.textContent = "—";
        verdictEl.textContent = "Enter valid numbers.";
        detailEl.textContent = "Classes attended must be between 0 and the total held, and the required attendance must be between 1% and 100%.";
        projEl.innerHTML = "";
        return;
      }
      pctEl.textContent = fmt(plan.pct) + "%";
      if (plan.status === "above") {
        verdictEl.textContent = plan.maxMisses === 0
          ? "You are above the requirement — but you cannot miss another class."
          : "You are above the requirement — you can miss " + plan.maxMisses + " more " + (plan.maxMisses === 1 ? "class" : "classes") + ".";
        detailEl.textContent =
          "Attended " + plan.attended + " of " + plan.total + " classes (" + fmt(plan.pct) + "%), requirement " + fmt(plan.reqPct) + "%. " +
          "Miss " + plan.maxMisses + " more and you land at " + fmt((plan.attended / (plan.total + plan.maxMisses)) * 100) +
          "%; one more miss drops you to " + fmt((plan.attended / (plan.total + plan.maxMisses + 1)) * 100) + "%.";
      } else if (plan.status === "exact") {
        verdictEl.textContent = "You are exactly at the requirement — one miss puts you below it.";
        detailEl.textContent =
          "Attended " + plan.attended + " of " + plan.total + " classes (" + fmt(plan.pct) + "%), requirement " + fmt(plan.reqPct) +
          "%. Missing the next class drops you to " + fmt((plan.attended / (plan.total + 1)) * 100) + "%.";
      } else {
        if (plan.classesToRecover === null) {
          verdictEl.textContent = "You are below a 100% requirement — it cannot be recovered.";
          detailEl.textContent =
            "Attended " + plan.attended + " of " + plan.total + " classes (" + fmt(plan.pct) +
            "%). Once a class is missed, no streak of attended classes can bring attendance back to 100%.";
        } else {
          verdictEl.textContent = "You are below the requirement — attend the next " + plan.classesToRecover + " " +
            (plan.classesToRecover === 1 ? "class" : "classes") + " in a row to recover.";
          detailEl.textContent =
            "Attended " + plan.attended + " of " + plan.total + " classes (" + fmt(plan.pct) + "%), requirement " + fmt(plan.reqPct) +
            "%. After " + plan.classesToRecover + " attended classes in a row you reach " +
            fmt(((plan.attended + plan.classesToRecover) / (plan.total + plan.classesToRecover)) * 100) + "%.";
        }
      }

      if (courseTotal === null) {
        projEl.innerHTML = "";
        return;
      }
      const proj = courseProjection(attended, total, courseTotal, req);
      if (!proj) {
        projEl.innerHTML = "<p class=\"hint\">Total classes in the course must be at least the classes held so far (" + total + ").</p>";
        return;
      }
      let html = "<h3>Whole-course outlook (" + proj.courseTotal + " classes total)</h3><ul>";
      html += "<li>Attend every remaining class (" + proj.remaining + " left): final attendance " + fmt(proj.attendAllPct) + "%.</li>";
      if (proj.reachable) {
        html += "<li>You can miss " + proj.missBudget + " of the remaining " + proj.remaining + " " +
          (proj.remaining === 1 ? "class" : "classes") + " and still finish at or above " + fmt(req) + "%.</li>";
      } else {
        html += "<li>Even attending every remaining class only reaches " + fmt(proj.attendAllPct) +
          "% — the " + fmt(req) + "% requirement is no longer reachable this course.</li>";
      }
      html += "</ul>";
      projEl.innerHTML = html;
    }

    attendedEl.addEventListener("input", render);
    totalEl.addEventListener("input", render);
    reqEl.addEventListener("input", render);
    courseEl.addEventListener("input", render);
    render();
  });
}
