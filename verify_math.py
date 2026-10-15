#!/usr/bin/env python3
"""Verify the final-exam grade math before building GradeLab pages.
Formula: F = (R - (1-w)*C) / w
  C = current grade, w = final exam weight (decimal), R = target grade
Run: python3 verify_math.py
"""
import sys

def required_final(current, weight, target):
    if weight <= 0 or weight > 1:
        return None
    return (target - (1 - weight) * current) / weight

def letter_to_threshold(letter, plus_minus=False):
    if plus_minus:
        table = {"A+": 97, "A": 93, "A-": 90, "B+": 87, "B": 83, "B-": 80,
                 "C+": 77, "C": 73, "C-": 70, "D+": 67, "D": 63, "D-": 60, "F": 0}
    else:
        table = {"A": 90, "B": 80, "C": 70, "D": 60, "F": 0}
    return table[letter]

def grade_from_score(s, plus_minus=False):
    if plus_minus:
        for g, t in [("A+",97),("A",93),("A-",90),("B+",87),("B",83),("B-",80),
                     ("C+",77),("C",73),("C-",70),("D+",67),("D",63),("D-",60)]:
            if s >= t: return g
        return "F"
    for g, t in [("A",90),("B",80),("C",70),("D",60)]:
        if s >= t: return g
    return "F"

failures = []
def check(name, got, want, tol=1e-9):
    ok = got is not None and abs(got - want) < tol
    print(f"[{'PASS' if ok else 'FAIL'}] {name}: got {got}, want {want}")
    if not ok: failures.append(name)

print("== core formula tests ==")
check("C=85,w=0.4,R=90 -> 97.5", required_final(85, 0.4, 90), 97.5)
check("C=92,w=0.25,R=90 -> 84.0", required_final(92, 0.25, 90), 84.0)
check("C=70,w=0.5,R=90 -> 110 (>100)", required_final(70, 0.5, 90), 110.0)
check("w=1 (final worth 100%) -> F=R", required_final(20, 1.0, 90), 90.0)
f = required_final(95, 0.3, 90)  # (1-0.3)*95=66.5 < 90? no: 0.7*95=66.5 >= 90 is False -> not already-safe
f2 = required_final(98, 0.2, 90)  # 0.8*98=78.4 <90, F=(90-78.4)/0.2=58
check("C=98,w=0.2,R=90 -> 58.0", f2, 58.0)
# already-safe: (1-w)*C >= R  -> F <= 0
f3 = required_final(95, 0.1, 90)  # 0.9*95=85.5 <90 -> F=45.0
f4 = required_final(100, 0.2, 90) # 0.8*100=80 <90 -> F=50.0
f5 = required_final(95, 0.05, 90) # 0.95*95=90.25 >= 90 -> F=(90-90.25)/0.05=-5.0
check("already-safe C=95,w=0.05,R=90 -> -5.0 (<=0)", f5, -5.0)
print("  status:", "F<=0 => show 'already safe'" if f5 <= 0 else "PROBLEM")

print("\n== weighted multi-course mode ==")
# three courses: (grade, weight), weights must sum to 1
courses = [(92, 0.5), (85, 0.3), (78, 0.2)]
total_w = sum(w for _, w in courses)
wavg = sum(g*w for g, w in courses) / total_w
print(f"weights sum = {total_w}")
print(f"weighted avg = 0.5*92 + 0.3*85 + 0.2*78 = {wavg}")
check("weight sum == 1", total_w, 1.0)
check("weighted avg 46+25.5+15.6 = 87.1", wavg, 87.1)
# per-course required final check still uses core formula
print("per-course required for R=90:", [round(required_final(g, 0.4, 90), 2) for g, _ in courses])

print("\n== letter grade tables ==")
for letter, want in [("A",90),("B",80),("C",70),("D",60)]:
    check(f"letter {letter}", letter_to_threshold(letter), want)
for letter, want in [("A+",97),("A",93),("A-",90)]:
    check(f"plus/minus {letter}", letter_to_threshold(letter, plus_minus=True), want)
for s, want in [(95,"A"),(89.9,"B"),(80,"B"),(59.9,"F")]:
    got = grade_from_score(s); ok = got == want
    print(f"[{'PASS' if ok else 'FAIL'}] score {s} -> {got} (want {want})")
    if not ok: failures.append(f"grade {s}")
for s, want in [(97.5,"A+"),(95,"A"),(90,"A-"),(89.9,"B+")]:
    got = grade_from_score(s, plus_minus=True); ok = got == want
    print(f"[{'PASS' if ok else 'FAIL'}] score {s} -> {got} (want {want})")
    if not ok: failures.append(f"pm grade {s}")

print("\n== monotonic sanity ==")
# higher current grade -> lower required final
a = required_final(80, 0.3, 90); b = required_final(90, 0.3, 90)
ok = a > b; print(f"[{'PASS' if ok else 'FAIL'}] C=80 needs {a}, C=90 needs {b} (higher C -> lower F)")
if not ok: failures.append("monotonic")
# higher target -> higher required
a2 = required_final(85, 0.3, 90); b2 = required_final(85, 0.3, 95)
ok = b2 > a2; print(f"[{'PASS' if ok else 'FAIL'}] R=90 needs {a2}, R=95 needs {b2}")
if not ok: failures.append("monotonic-target")

print("\n" + ("ALL TESTS PASSED" if not failures else f"FAILURES: {failures}"))
sys.exit(1 if failures else 0)
