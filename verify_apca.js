// Verify apca.js against the independent Python mirror (verify_apca.py).
// All expected Lc values were computed by the Python APCA 0.98G implementation
// first; this file asserts the shipped JS produces the same numbers.
const assert = require("assert");
const A = require("./apca-calculator/apca.js");

function near(actual, expected, tol, label) {
  assert.ok(
    actual !== null && Math.abs(actual - expected) <= tol,
    `${label}: expected ${expected} ± ${tol}, got ${actual}`
  );
}

// Reference anchors (Python mirror, 2dp)
near(A.apcaContrast("#000000", "#FFFFFF"), 106.04, 0.05, "black on white");
near(A.apcaContrast("#FFFFFF", "#000000"), -107.88, 0.05, "white on black");
near(A.apcaContrast("#767676", "#FFFFFF"), 68.25, 0.05, "#767676 on white");
near(A.apcaContrast("#595959", "#FFFFFF"), 80.63, 0.05, "#595959 on white");
near(A.apcaContrast("#FFFFFF", "#0055CC"), -84.38, 0.05, "white on #0055CC");
near(A.apcaContrast("#FFFFFF", "#1A7F37"), -77.12, 0.05, "white on #1A7F37");
near(A.apcaContrast("#9CA3AF", "#121212"), -52.87, 0.05, "#9CA3AF on #121212");
near(A.apcaContrast("#6B7280", "#121212"), -29.60, 0.05, "#6B7280 on #121212");
near(A.apcaContrast("#E53935", "#FFFFFF"), 65.95, 0.05, "#E53935 on white");
near(A.apcaContrast("#F59E0B", "#FFFFFF"), 40.00, 0.05, "#F59E0B on white");
near(A.apcaContrast("#60A5FA", "#121212"), -52.81, 0.05, "#60A5FA on #121212");
near(A.apcaContrast("#FFFFFF", "#2563EB"), -77.63, 0.05, "white on #2563EB");
near(A.apcaContrast("#333333", "#FFFFFF"), 94.96, 0.05, "#333333 on white");
near(A.apcaContrast("#AAAAAA", "#FFFFFF"), 43.49, 0.05, "#AAAAAA on white");

// Degenerate cases
assert.strictEqual(A.apcaContrast("#FFFFFF", "#FFFFFF"), 0, "same color = 0");
assert.strictEqual(A.apcaContrast("#808080", "#808080"), 0, "same gray = 0");
assert.strictEqual(A.apcaContrast("zzz", "#FFFFFF"), null, "invalid text hex");
assert.strictEqual(A.apcaContrast("#000000", "12"), null, "invalid bg hex");

// 3-digit hex expands
near(A.apcaContrast("#000", "#fff"), 106.04, 0.05, "3-digit hex");

// Polarity sign: dark-on-light positive, light-on-dark negative
assert.ok(A.apcaContrast("#111111", "#FFFFFF") > 0, "dark on light positive");
assert.ok(A.apcaContrast("#FFFFFF", "#111111") < 0, "light on dark negative");
assert.strictEqual(A.polarity(106), "dark text on light background", "polarity +");
assert.strictEqual(A.polarity(-84), "light text on dark background", "polarity -");
assert.strictEqual(A.polarity(0), "no contrast", "polarity 0");

// Verdict table boundaries (absolute Lc)
const v80 = A.verdicts(80.63);
assert.deepStrictEqual(v80.map((x) => x.pass), [true, true, true, true], "Lc 80.6 passes all");
const v68 = A.verdicts(68.25);
assert.deepStrictEqual(v68.map((x) => x.pass), [false, true, true, true], "Lc 68.3 fails body only");
const v53 = A.verdicts(-52.87);
assert.deepStrictEqual(v53.map((x) => x.pass), [false, false, true, true], "Lc -52.9 fails body+large");
const v40 = A.verdicts(40.0);
assert.deepStrictEqual(v40.map((x) => x.pass), [false, false, false, true], "Lc 40 passes non-text only");
const v29 = A.verdicts(-29.6);
assert.deepStrictEqual(v29.map((x) => x.pass), [false, false, false, false], "Lc -29.6 fails all");
assert.deepStrictEqual(A.verdicts(75).map((x) => x.pass), [true, true, true, true], "Lc 75 boundary inclusive");
assert.deepStrictEqual(A.verdicts(30).map((x) => x.pass), [false, false, false, true], "Lc 30 boundary inclusive");

// WCAG side-by-side matches the site's existing formula
near(A.wcagRatio("#000000", "#FFFFFF"), 21.0, 0.01, "WCAG black/white");
near(A.wcagRatio("#767676", "#FFFFFF"), 4.54, 0.01, "WCAG #767676");
near(A.wcagRatio("#9CA3AF", "#121212"), 7.38, 0.01, "WCAG dark-mode gray");
near(A.wcagRatio("#F59E0B", "#FFFFFF"), 2.15, 0.01, "WCAG amber");

// Guide-table numbers (1dp APCA / 2dp WCAG) as printed on the page
const guide = [
  ["#000000", "#FFFFFF", 106.0, 21.0],
  ["#595959", "#FFFFFF", 80.6, 7.0],
  ["#767676", "#FFFFFF", 68.3, 4.54],
  ["#E53935", "#FFFFFF", 66.0, 4.23],
  ["#F59E0B", "#FFFFFF", 40.0, 2.15],
  ["#FFFFFF", "#0055CC", -84.4, 6.62],
  ["#9CA3AF", "#121212", -52.9, 7.38],
  ["#6B7280", "#121212", -29.6, 3.88],
];
guide.forEach(([t, b, lc, r]) => {
  near(A.apcaContrast(t, b), lc, 0.06, `guide APCA ${t} on ${b}`);
  near(A.wcagRatio(t, b), r, 0.015, `guide WCAG ${t} on ${b}`);
});

console.log("verify_apca.js: all assertions passed");
