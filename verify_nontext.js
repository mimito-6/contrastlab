// Verify nontext.js against the independent Python WCAG 2.1 mirror.
// All expected ratios were computed by the Python implementation first;
// this file asserts the shipped JS produces the same numbers.
const assert = require("assert");
const N = require("./non-text-contrast/nontext.js");

function near(actual, expected, tol, label) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) <= tol,
    `${label}: expected ${expected} ± ${tol}, got ${actual}`
  );
}

// Reference anchors (Python mirror, 2dp)
near(N.contrastRatio("#000000", "#FFFFFF"), 21.0, 0.01, "black on white");
near(N.contrastRatio("#767676", "#FFFFFF"), 4.54, 0.01, "#767676 on white");
near(N.contrastRatio("#6B7280", "#FFFFFF"), 4.83, 0.01, "#6B7280 on white");
near(N.contrastRatio("#64748B", "#FFFFFF"), 4.76, 0.01, "#64748B on white");
near(N.contrastRatio("#78716C", "#FFFFFF"), 4.80, 0.01, "#78716C on white");
near(N.contrastRatio("#9CA3AF", "#FFFFFF"), 2.54, 0.01, "#9CA3AF on white");
near(N.contrastRatio("#94A3B8", "#FFFFFF"), 2.56, 0.01, "#94A3B8 on white");
near(N.contrastRatio("#A8A29E", "#FFFFFF"), 2.52, 0.01, "#A8A29E on white");
near(N.contrastRatio("#60A5FA", "#FFFFFF"), 2.54, 0.01, "#60A5FA on white");
near(N.contrastRatio("#D1D5DB", "#FFFFFF"), 1.47, 0.01, "#D1D5DB on white");
near(N.contrastRatio("#CBD5E1", "#FFFFFF"), 1.48, 0.01, "#CBD5E1 on white");
near(N.contrastRatio("#E5E7EB", "#FFFFFF"), 1.24, 0.01, "#E5E7EB on white");
near(N.contrastRatio("#F59E0B", "#FFFFFF"), 2.15, 0.01, "#F59E0B on white");
near(N.contrastRatio("#2563EB", "#FFFFFF"), 5.17, 0.01, "#2563EB on white");
near(N.contrastRatio("#1D4ED8", "#FFFFFF"), 6.70, 0.01, "#1D4ED8 on white");
near(N.contrastRatio("#9CA3AF", "#121212"), 7.38, 0.01, "#9CA3AF on #121212");
near(N.contrastRatio("#6B7280", "#121212"), 3.88, 0.01, "#6B7280 on #121212");
near(N.contrastRatio("#52525B", "#121212"), 2.42, 0.01, "#52525B on #121212");
near(N.contrastRatio("#60A5FA", "#121212"), 7.37, 0.01, "#60A5FA on #121212");
near(N.contrastRatio("#38BDF8", "#121212"), 8.74, 0.01, "#38BDF8 on #121212");
near(N.contrastRatio("#94A3B8", "#0F172A"), 6.96, 0.01, "#94A3B8 on #0F172A");
near(N.contrastRatio("#CBD5E1", "#0F172A"), 12.02, 0.01, "#CBD5E1 on #0F172A");
near(N.contrastRatio("#93C5FD", "#2563EB"), 2.87, 0.01, "#93C5FD ring on #2563EB button");
near(N.contrastRatio("#2563EB", "#1D4ED8"), 1.30, 0.01, "#2563EB ring on #1D4ED8 button");
near(N.contrastRatio("#FFFFFF", "#2563EB"), 5.17, 0.01, "white ring on #2563EB button");
near(N.contrastRatio("#2563EB", "#EFF6FF"), 4.75, 0.01, "#2563EB on #EFF6FF");

// Degenerate cases
near(N.contrastRatio("#123456", "#123456"), 1.0, 0.01, "same color is 1:1");
near(N.contrastRatio("#FFFFFF", "#FFFFFF"), 1.0, 0.01, "white on white is 1:1");
assert.strictEqual(N.contrastRatio("#ZZZZZZ", "#FFFFFF"), null, "invalid hex returns null");
assert.strictEqual(N.contrastRatio("", "#FFFFFF"), null, "empty hex returns null");
near(N.contrastRatio("#FFF", "#000"), 21.0, 0.01, "3-digit hex expands");

// Verdict boundary: 3:1 is inclusive
assert.strictEqual(N.nonTextVerdict(3.0).pass, true, "3.00 passes");
assert.strictEqual(N.nonTextVerdict(2.99).pass, false, "2.99 fails");
assert.strictEqual(N.nonTextVerdict(4.83).label, "Pass", "4.83 passes");
assert.strictEqual(N.nonTextVerdict(2.54).label, "Fail", "2.54 fails");
assert.strictEqual(N.nonTextVerdict(null), null, "null ratio returns null");
near(N.nonTextVerdict(4.5).margin, 1.5, 0.001, "margin is ratio / 3");
near(N.nonTextVerdict(2.54).shortfall, 0.46, 0.001, "shortfall is 3 - ratio");

// relLum anchors
near(N.relLum([255, 255, 255]), 1.0, 0.001, "white luminance 1.0");
near(N.relLum([0, 0, 0]), 0.0, 0.001, "black luminance 0.0");

console.log("verify_nontext.js: all assertions passed");
