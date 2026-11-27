// Verify focus.js against the independent Python WCAG 2.1 mirror.
// All expected ratios were computed by the Python implementation first;
// this file asserts the shipped JS produces the same numbers, plus the
// WCAG 2.4.13 area math (2 px perimeter) and verdict boundaries.
const assert = require("assert");
const F = require("./focus.js");

function near(actual, expected, tol, label) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) <= tol,
    `${label}: expected ${expected} ± ${tol}, got ${actual}`
  );
}

// Reference anchors (Python mirror, 2dp) — reused from earlier pages
near(F.contrastRatio("#000000", "#FFFFFF"), 21.0, 0.01, "black on white");
near(F.contrastRatio("#2563EB", "#FFFFFF"), 5.17, 0.01, "#2563EB on white");
near(F.contrastRatio("#1D4ED8", "#FFFFFF"), 6.70, 0.01, "#1D4ED8 on white");
near(F.contrastRatio("#60A5FA", "#FFFFFF"), 2.54, 0.01, "#60A5FA on white");
near(F.contrastRatio("#F59E0B", "#FFFFFF"), 2.15, 0.01, "#F59E0B on white");
near(F.contrastRatio("#2563EB", "#1D4ED8"), 1.30, 0.01, "#2563EB ring on #1D4ED8 button");
near(F.contrastRatio("#93C5FD", "#2563EB"), 2.87, 0.01, "#93C5FD ring on #2563EB button");
near(F.contrastRatio("#FFFFFF", "#2563EB"), 5.17, 0.01, "white ring on #2563EB button");
near(F.contrastRatio("#2563EB", "#EFF6FF"), 4.75, 0.01, "#2563EB on #EFF6FF card");
near(F.contrastRatio("#60A5FA", "#111827"), 6.98, 0.01, "#60A5FA on #111827 (cross-checks link-text)");

// New anchors (Python mirror, 2dp)
near(F.contrastRatio("#93C5FD", "#FFFFFF"), 1.80, 0.01, "#93C5FD on white");
near(F.contrastRatio("#FFFFFF", "#FFFFFF"), 1.0, 0.001, "white on white");
near(F.contrastRatio("#2563EB", "#1F2937"), 2.84, 0.01, "#2563EB on #1F2937");
near(F.contrastRatio("#2563EB", "#111827"), 3.43, 0.01, "#2563EB on #111827");
near(F.contrastRatio("#FFFFFF", "#111827"), 17.74, 0.01, "white on #111827");
near(F.contrastRatio("#FFFFFF", "#1F2937"), 14.68, 0.01, "white on #1F2937");
near(F.contrastRatio("#60A5FA", "#1F2937"), 5.77, 0.01, "#60A5FA on #1F2937");
near(F.contrastRatio("#93C5FD", "#111827"), 9.84, 0.01, "#93C5FD on #111827");
near(F.contrastRatio("#93C5FD", "#1F2937"), 8.14, 0.01, "#93C5FD on #1F2937");
near(F.contrastRatio("#FBBF24", "#111827"), 10.63, 0.01, "#FBBF24 on #111827");
near(F.contrastRatio("#FBBF24", "#1F2937"), 8.79, 0.01, "#FBBF24 on #1F2937");
near(F.contrastRatio("#38BDF8", "#111827"), 8.28, 0.01, "#38BDF8 on #111827");
near(F.contrastRatio("#38BDF8", "#1F2937"), 6.85, 0.01, "#38BDF8 on #1F2937");
near(F.contrastRatio("#34D399", "#111827"), 9.23, 0.01, "#34D399 on #111827");
near(F.contrastRatio("#34D399", "#1F2937"), 7.64, 0.01, "#34D399 on #1F2937");
near(F.contrastRatio("#F59E0B", "#111827"), 8.26, 0.01, "#F59E0B on #111827");

// Hex handling
assert.strictEqual(F.contrastRatio("#fff", "#000"), 21, "3-digit hex expands");
assert.strictEqual(F.contrastRatio("not-a-color", "#FFFFFF"), null, "invalid hex -> null");
assert.strictEqual(F.contrastRatio("#2563EB", ""), null, "empty hex -> null");

// Focus verdict boundaries (3:1 inclusive)
assert.strictEqual(F.focusVerdict(3).pass, true, "exactly 3.00 passes");
assert.strictEqual(F.focusVerdict(2.99).pass, false, "2.99 fails");
assert.strictEqual(F.focusVerdict(2.99).shortfall.toFixed(2), "0.01", "shortfall 0.01");
assert.strictEqual(F.focusVerdict(null), null, "null ratio -> null verdict");
assert.strictEqual(F.focusVerdict(5.17).margin.toFixed(2), "1.72", "margin 5.17/3");

// Area math: indicatorArea = 2t(W+H) + 4t^2; required = 4(W+H) + 16
assert.strictEqual(F.indicatorArea(120, 40, 2), 656, "120x40 t=2");
assert.strictEqual(F.indicatorArea(120, 40, 1), 324, "120x40 t=1");
assert.strictEqual(F.indicatorArea(120, 40, 3), 996, "120x40 t=3");
assert.strictEqual(F.indicatorArea(32, 32, 2), 272, "32x32 t=2");
assert.strictEqual(F.indicatorArea(32, 32, 1), 132, "32x32 t=1");
assert.strictEqual(F.indicatorArea(32, 32, 3), 420, "32x32 t=3");
assert.strictEqual(F.indicatorArea(200, 48, 2), 1008, "200x48 t=2");
assert.strictEqual(F.indicatorArea(200, 48, 1), 500, "200x48 t=1");
assert.strictEqual(F.indicatorArea(100, 36, 2), 560, "100x36 t=2");
assert.strictEqual(F.indicatorArea(120, 40, 0), 0, "t=0 -> 0 area");
assert.strictEqual(F.requiredArea(120, 40), 656, "required 120x40");
assert.strictEqual(F.requiredArea(32, 32), 272, "required 32x32");
assert.strictEqual(F.requiredArea(200, 48), 1008, "required 200x48");
assert.strictEqual(F.requiredArea(100, 36), 560, "required 100x36");
// 2 px always lands exactly on the requirement
[120, 40, 32, 200, 100].forEach(function (w) {
  [40, 32, 48, 36].forEach(function (h) {
    assert.strictEqual(F.indicatorArea(w, h, 2), F.requiredArea(w, h), `t=2 meets required for ${w}x${h}`);
    assert.ok(F.indicatorArea(w, h, 1) < F.requiredArea(w, h), `t=1 falls short for ${w}x${h}`);
  });
});
// Invalid dimensions
assert.strictEqual(F.indicatorArea(0, 40, 2), null, "zero width -> null");
assert.strictEqual(F.indicatorArea(120, 0, 2), null, "zero height -> null");
assert.strictEqual(F.indicatorArea(-5, 40, 2), null, "negative width -> null");
assert.strictEqual(F.indicatorArea(120, 40, -1), null, "negative thickness -> null");
assert.strictEqual(F.indicatorArea(NaN, 40, 2), null, "NaN width -> null");
assert.strictEqual(F.requiredArea(0, 40), null, "required zero width -> null");

// Area verdict boundaries (inclusive)
assert.strictEqual(F.areaVerdict(656, 656).pass, true, "exactly required passes");
assert.strictEqual(F.areaVerdict(324, 656).pass, false, "324 < 656 fails");
assert.strictEqual(F.areaVerdict(324, 656).deficit, 332, "deficit 332");
assert.strictEqual(F.areaVerdict(null, 656), null, "null area -> null verdict");

// Overall verdict
let o = F.overallVerdict(5.17, 5.17, 656, 656);
assert.strictEqual(o.pass, true, "all three pass");
assert.deepStrictEqual(o.failing, [], "no failing sides");
o = F.overallVerdict(1.30, 5.17, 656, 656);
assert.strictEqual(o.pass, false, "component side fails");
assert.deepStrictEqual(o.failing, ["ring vs component"], "failing list");
o = F.overallVerdict(5.17, 1.80, 656, 656);
assert.deepStrictEqual(o.failing, ["ring vs page"], "page side fails");
o = F.overallVerdict(5.17, 5.17, 324, 656);
assert.deepStrictEqual(o.failing, ["indicator area"], "area fails");
o = F.overallVerdict(1.30, 1.80, 324, 656);
assert.deepStrictEqual(o.failing, ["ring vs component", "ring vs page", "indicator area"], "all three fail");
assert.strictEqual(F.overallVerdict(null, 5.17, 656, 656), null, "null ratio -> null overall");

// Preview text color picker
assert.strictEqual(F.pickTextColor("#FFFFFF"), "#111827", "dark text on white fill");
assert.strictEqual(F.pickTextColor("#111827"), "#FFFFFF", "white text on dark fill");
assert.strictEqual(F.pickTextColor("#2563EB"), "#FFFFFF", "white text on blue fill");
assert.strictEqual(F.pickTextColor("#FBBF24"), "#111827", "dark text on amber fill");
assert.strictEqual(F.pickTextColor("bogus"), null, "invalid fill -> null");

console.log("verify_focus.js: all assertions passed");
