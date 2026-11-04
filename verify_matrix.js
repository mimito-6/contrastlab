// Verify matrix.js against an independent WCAG implementation + known anchors.
// Run: node verify_matrix.js (from site1-contrast/)
const assert = require("assert");
const mx = require("./palette-contrast-matrix/matrix.js");

// Independent implementation (written separately from matrix.js).
function lum(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const f = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const approx = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// Known anchors
approx(mx.ratio("#ffffff", "#000000"), 21.0, 1e-9);
approx(mx.ratio("#767676", "#ffffff"), 4.54, 0.01); // established in wcag guide
approx(mx.ratio("#ffffff", "#ffffff"), 1.0, 1e-12);
approx(mx.ratio("#000000", "#000000"), 1.0, 1e-12);

// Cross-check vs independent implementation on the default palette + extras
const palette = ["#0f172a", "#ffffff", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"];
for (const a of palette) for (const b of palette) approx(mx.ratio(a, b), ratio(a, b));
approx(mx.ratio("#3b82f6", "#ffffff"), ratio("#3b82f6", "#ffffff"));

// Symmetry: ratio(a,b) == ratio(b,a)
assert.strictEqual(mx.ratio("#3b82f6", "#f59e0b"), mx.ratio("#f59e0b", "#3b82f6"));

// Verdict thresholds (boundary-inclusive)
assert.strictEqual(mx.verdict(7.0), "AAA");
assert.strictEqual(mx.verdict(6.99), "AA");
assert.strictEqual(mx.verdict(4.5), "AA");
assert.strictEqual(mx.verdict(4.49), "AA large");
assert.strictEqual(mx.verdict(3.0), "AA large");
assert.strictEqual(mx.verdict(2.99), "Fail");
assert.strictEqual(mx.verdict(null), null);
assert.strictEqual(mx.ratio("#zzzzzz", "#ffffff"), null);

// Summarize: 6 colors -> 6*5 = 30 ordered pairs; counts sum to 30
const s = mx.summarize(palette);
assert.strictEqual(s.pairs.length, 30);
assert.strictEqual(s.counts.AAA + s.counts.AA + s.counts["AA large"] + s.counts.Fail, 30);
assert.ok(s.best.ratio >= s.worst.ratio);
assert.ok(s.pairs.every((p) => p.ratio === mx.ratio(p.text, p.bg)));
// Fewer colors / invalid input
assert.strictEqual(mx.summarize(["#ffffff", "#000000"]).pairs.length, 2);
assert.strictEqual(mx.summarize(["#ffffff", "notacolor"]).pairs.length, 0);
assert.strictEqual(mx.summarize([]).best, null);

// Guide-claim spot checks (printed so a drift is visible, asserted loosely)
const amberWhite = mx.ratio("#f59e0b", "#ffffff");
const redWhite = mx.ratio("#ef4444", "#ffffff");
const whiteSlate = mx.ratio("#ffffff", "#0f172a");
console.log(`amber #F59E0B on white: ${amberWhite.toFixed(2)} (guide says ~2.15, must be < 3)`);
console.log(`red #EF4444 on white: ${redWhite.toFixed(2)} (guide says near 4:1, must be 3–4.5)`);
console.log(`white on slate #0F172A: ${whiteSlate.toFixed(2)} (guide says AAA, must be >= 7)`);
assert.ok(amberWhite < 3, "amber on white must fail");
assert.ok(redWhite >= 3 && redWhite < 4.5, "red on white must be AA-large only");
assert.ok(whiteSlate >= 7, "white on slate must be AAA");
console.log("verify_matrix.js: all assertions passed");
