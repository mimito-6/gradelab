/* GradeLab — all math runs locally. Formula: F = (R - (1-w)*C) / w */
(function () {
  "use strict";

  /* ---------- tabs ---------- */
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  /* ---------- letter grade tables ---------- */
  var PLAIN = [["A", 90], ["B", 80], ["C", 70], ["D", 60], ["F", 0]];
  var PLUSMINUS = [["A+", 97], ["A", 93], ["A-", 90], ["B+", 87], ["B", 83], ["B-", 80],
                   ["C+", 77], ["C", 73], ["C-", 70], ["D+", 67], ["D", 63], ["D-", 60], ["F", 0]];

  function requiredFinal(current, weight, target) {
    // weight is a decimal in (0, 1]
    return (target - (1 - weight) * current) / weight;
  }

  function fmt(n) { return (Math.round(n * 10) / 10).toFixed(1); }

  function errBox(msg) {
    return '<div class="result-card close"><p><strong>Can\'t calculate yet.</strong> ' + msg + "</p></div>";
  }

  /* Render one result. `label` is what the user aimed at, e.g. "90%" or "an A (≥90%)". */
  function renderSingleResult(el, current, wPct, target, label) {
    if (!(current >= 0 && current <= 100)) { el.innerHTML = errBox("Current grade must be between 0 and 100."); el.classList.add("show"); return; }
    if (!(wPct > 0 && wPct <= 100)) { el.innerHTML = errBox("Final exam weight must be between 0 and 100."); el.classList.add("show"); return; }
    if (!(target >= 0 && target <= 100)) { el.innerHTML = errBox("Target grade must be between 0 and 100."); el.classList.add("show"); return; }

    var w = wPct / 100;
    var f = requiredFinal(current, w, target);
    var math = "(" + target + " − " + fmt((1 - w) * 100) + "% × " + current + "%) ÷ " + fmt(w * 100) + "%";
    var html;

    if (f <= 0) {
      html = '<div class="result-card good">' +
        '<p><strong>You\'re already safe.</strong></p>' +
        '<div class="big">0% needed</div>' +
        '<p>Your current grade alone already reaches ' + label + ' — you\'ve locked it in before the final. (Double-check your syllabus in case a minimum final score is required.)</p>' +
        '<p class="math">' + math + " = " + fmt(f) + "%</p></div>";
    } else if (f > 100) {
      html = '<div class="result-card impossible">' +
        '<p><strong>Out of reach on the final alone.</strong></p>' +
        '<div class="big">' + fmt(f) + "% needed</div>" +
        "<p>You'd need " + fmt(f) + "% — that's superhero territory. Even a perfect 100% wouldn't get you to " + label + ". Aim for the best grade you <em>can</em> reach, or ask your instructor about extra credit.</p>" +
        '<p class="math">' + math + "</p></div>";
    } else if (f === 100) {
      html = '<div class="result-card close">' +
        '<p><strong>Cutting it exactly to the line.</strong></p>' +
        '<div class="big">100% needed</div>' +
        "<p>You need a perfect score on the final to reach " + label + ". It's possible — but there is zero margin for error, so plan like every point counts.</p>" +
        '<p class="math">' + math + "</p></div>";
    } else {
      var cls = f >= 97 ? "close" : "ok";
      var head = f >= 97
        ? "Almost perfect required — every point matters."
        : "Here's your target.";
      html = '<div class="result-card ' + cls + '"><p><strong>' + head + "</strong></p>" +
        '<div class="big">' + fmt(f) + "%</div>" +
        "<p>You need <strong>" + fmt(f) + "%</strong> on the final to finish at " + label + ".</p>" +
        '<p class="math">' + math + "</p></div>";
    }
    el.innerHTML = html;
    el.classList.add("show");
  }

  /* ---------- percentage mode ---------- */
  function calcPercent() {
    var c = parseFloat(document.getElementById("p-current").value);
    var w = parseFloat(document.getElementById("p-weight").value);
    var r = parseFloat(document.getElementById("p-target").value);
    var el = document.getElementById("result-percent");
    if (isNaN(c) || isNaN(w) || isNaN(r)) { el.innerHTML = errBox("Please fill in all three fields."); el.classList.add("show"); return; }
    renderSingleResult(el, c, w, r, r + "%");
  }

  /* ---------- letter mode ---------- */
  function calcLetter() {
    var c = parseFloat(document.getElementById("l-current").value);
    var w = parseFloat(document.getElementById("l-weight").value);
    var pm = document.getElementById("l-plusminus").checked;
    var sel = document.getElementById("l-target");
    var el = document.getElementById("result-letter");
    if (isNaN(c) || isNaN(w)) { el.innerHTML = errBox("Please fill in your current grade and the final's weight."); el.classList.add("show"); return; }
    var table = pm ? PLUSMINUS : PLAIN;
    // rebuild options when the scale toggle changes, preserving selection
    var targetLetter = sel.value;
    var threshold = null;
    for (var i = 0; i < table.length; i++) {
      if (table[i][0] === targetLetter) { threshold = table[i][1]; break; }
    }
    if (threshold === null) threshold = table[0][1];
    renderSingleResult(el, c, w, threshold, "an " + targetLetter + " (≥" + threshold + "%)");
  }

  document.getElementById("l-plusminus").addEventListener("change", function () {
    var pm = this.checked;
    var sel = document.getElementById("l-target");
    var prev = sel.value;
    sel.innerHTML = "";
    (pm ? PLUSMINUS : PLAIN).forEach(function (row) {
      if (row[0] === "F") return;
      var opt = document.createElement("option");
      opt.value = row[0];
      opt.textContent = row[0] + " (≥" + row[1] + "%)";
      sel.appendChild(opt);
    });
    var stillThere = Array.prototype.some.call(sel.options, function (o) { return o.value === prev; });
    sel.value = stillThere ? prev : "A";
    document.getElementById("result-letter").classList.remove("show");
  });

  /* ---------- multi-course mode ---------- */
  var courseRows = document.getElementById("course-rows");

  function addCourseRow(name, grade, weight) {
    var div = document.createElement("div");
    div.className = "course-row";
    div.innerHTML =
      '<div class="field"><label>Course</label><input type="text" class="cr-name" placeholder="e.g. Biology" value="' + (name || "") + '"></div>' +
      '<div class="field"><label>Grade %</label><input type="number" class="cr-grade" min="0" max="100" step="0.1" inputmode="decimal" value="' + (grade || "") + '"></div>' +
      '<div class="field"><label>Weight %</label><input type="number" class="cr-weight" min="0" max="100" step="0.1" inputmode="decimal" value="' + (weight || "") + '"></div>' +
      '<button class="remove-course" aria-label="Remove course">×</button>';
    div.querySelector(".remove-course").addEventListener("click", function () {
      if (courseRows.children.length > 1) div.remove();
    });
    courseRows.appendChild(div);
  }

  document.getElementById("add-course").addEventListener("click", function () { addCourseRow(); });
  addCourseRow("", "", ""); addCourseRow("", "", ""); addCourseRow("", "", "");

  function calcMulti() {
    var el = document.getElementById("result-multi");
    var target = parseFloat(document.getElementById("m-target").value);
    var fw = parseFloat(document.getElementById("m-weight").value);
    if (isNaN(target) || isNaN(fw)) { el.innerHTML = errBox("Please set a target grade and a final exam weight."); el.classList.add("show"); return; }
    if (!(target >= 0 && target <= 100)) { el.innerHTML = errBox("Target grade must be between 0 and 100."); el.classList.add("show"); return; }
    if (!(fw > 0 && fw <= 100)) { el.innerHTML = errBox("Final exam weight must be between 0 and 100."); el.classList.add("show"); return; }

    var rows = [];
    var wSum = 0;
    var valid = true;
    Array.prototype.forEach.call(courseRows.children, function (div, idx) {
      var name = div.querySelector(".cr-name").value.trim() || ("Course " + (idx + 1));
      var g = parseFloat(div.querySelector(".cr-grade").value);
      var wt = parseFloat(div.querySelector(".cr-weight").value);
      if (isNaN(g) || isNaN(wt) || g < 0 || g > 100 || wt <= 0) { valid = false; return; }
      rows.push({ name: name, grade: g, weight: wt });
      wSum += wt;
    });
    if (!valid || rows.length === 0) { el.innerHTML = errBox("Each course needs a grade (0–100) and a positive weight."); el.classList.add("show"); return; }
    if (Math.abs(wSum - 100) > 0.01) {
      el.innerHTML = errBox("Weights must add up to 100%. Yours add up to " + fmt(wSum) + "%.");
      el.classList.add("show");
      return;
    }

    var w = fw / 100;
    var wAvg = 0;
    rows.forEach(function (r) { wAvg += r.grade * (r.weight / 100); });

    var body = '<div class="result-card ok">' +
      '<p class="multi-summary">Weighted average so far: <strong>' + fmt(wAvg) + "%</strong></p>" +
      '<table class="multi-table"><thead><tr><th>Course</th><th class="num">Final needed</th><th>Verdict</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var f = requiredFinal(r.grade, w, target);
      var need, verdict;
      if (f <= 0) { need = "0%"; verdict = "Already safe"; }
      else if (f > 100) { need = fmt(f) + "%"; verdict = "Out of reach"; }
      else { need = fmt(f) + "%"; verdict = "Needed"; }
      body += "<tr><td>" + escapeHtml(r.name) + '</td><td class="num">' + need + "</td><td>" + verdict + "</td></tr>";
    });
    body += "</tbody></table>" +
      '<p class="math">Per course: (' + target + " − (1 − " + fmt(fw) + "%) × grade) ÷ " + fmt(fw) + "%</p></div>";
    el.innerHTML = body;
    el.classList.add("show");
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- wire up ---------- */
  document.querySelectorAll(".calc-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.dataset.mode;
      if (mode === "percent") calcPercent();
      else if (mode === "letter") calcLetter();
      else calcMulti();
    });
  });
  document.querySelectorAll("input, select").forEach(function (inp) {
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var panel = inp.closest(".panel");
        var btn = panel && panel.querySelector(".calc-btn");
        if (btn) btn.click();
      }
    });
  });
})();
