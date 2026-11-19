/* Verify linktext.js against independently precomputed WCAG numbers.
   Run: node verify_linktext.js  (exit 0 = all pass) */
"use strict";
const c = require("./link-text-contrast/linktext.js");

let n = 0;
function eq(actual, expected, label) {
  n++;
  if (actual !== expected) {
    console.error(`FAIL ${label}: got ${actual}, expected ${expected}`);
    process.exitCode = 1;
  }
}
function approx(actual, expected, label, tol) {
  n++;
  tol = tol || 0.005;
  if (actual === null || Math.abs(actual - expected) > tol) {
    console.error(`FAIL ${label}: got ${actual}, expected ${expected} (±${tol})`);
    process.exitCode = 1;
  }
}
function isNull(v, label) { n++; if (v !== null) { console.error(`FAIL ${label}: got ${v}, expected null`); process.exitCode = 1; } }

// --- core WCAG ratio (same ground truth as every other ContrastLab page) ---
approx(c.contrastRatio("#FFFFFF", "#000000"), 21.0, "white vs black");
approx(c.contrastRatio("#767676", "#FFFFFF"), 4.54, "gray-767676 vs white");
approx(c.contrastRatio("#0000EE", "#FFFFFF"), 9.40, "classic blue vs white");
approx(c.contrastRatio("#0000EE", "#000000"), 2.23, "classic blue vs black body");
approx(c.contrastRatio("#551A8B", "#000000"), 1.91, "visited purple vs black");
approx(c.contrastRatio("#2563EB", "#FFFFFF"), 5.17, "blue-600 vs white");
approx(c.contrastRatio("#2563EB", "#1F2937"), 2.84, "blue-600 vs gray-800 body");
approx(c.contrastRatio("#2563EB", "#111827"), 3.43, "blue-600 vs gray-900 body");
approx(c.contrastRatio("#2563EB", "#000000"), 4.06, "blue-600 vs black body");
approx(c.contrastRatio("#0066CC", "#111827"), 3.19, "0066CC vs gray-900 body");
approx(c.contrastRatio("#1D4ED8", "#000000"), 3.13, "blue-700 vs black");
approx(c.contrastRatio("#60A5FA", "#FFFFFF"), 2.54, "blue-400 vs white");
approx(c.contrastRatio("#60A5FA", "#374151"), 4.05, "blue-400 vs gray-700 body");
approx(c.contrastRatio("#60A5FA", "#000000"), 8.26, "blue-400 vs black");
approx(c.contrastRatio("#93C5FD", "#121212"), 10.39, "blue-300 vs near-black bg");
approx(c.contrastRatio("#93C5FD", "#E5E7EB"), 1.46, "blue-300 vs gray-200 body (dark mode)");
approx(c.contrastRatio("#3B82F6", "#E5E7EB"), 2.97, "blue-500 vs gray-200 body");
approx(c.contrastRatio("#2563EB", "#E5E7EB"), 4.17, "blue-600 vs gray-200 body");
approx(c.contrastRatio("#1D4ED8", "#E5E7EB"), 5.41, "blue-700 vs gray-200 body");
approx(c.contrastRatio("#60A5FA", "#9CA3AF"), 1.00, "blue-400 vs gray-400 (identical luminance)");
approx(c.contrastRatio("#111827", "#FFFFFF"), 17.74, "gray-900 vs white");
approx(c.contrastRatio("#1F2937", "#FFFFFF"), 14.68, "gray-800 vs white");
approx(c.contrastRatio("#374151", "#FFFFFF"), 10.31, "gray-700 vs white");
approx(c.contrastRatio("#E5E7EB", "#121212"), 15.13, "gray-200 vs near-black");
isNull(c.contrastRatio("#zzzzzz", "#FFFFFF"), "invalid hex -> null");
isNull(c.contrastRatio("#FFFFFF", "notacolor"), "invalid hex 2 -> null");
approx(c.contrastRatio("#fff", "#000"), 21.0, "3-digit hex expands");

// --- textVerdict (WCAG 1.4.3) ---
eq(c.textVerdict(21.0).level, "AAA", "21 -> AAA");
eq(c.textVerdict(7.0).level, "AAA", "7.0 boundary inclusive AAA");
eq(c.textVerdict(6.99).level, "AA", "6.99 -> AA");
eq(c.textVerdict(4.5).level, "AA", "4.5 boundary inclusive AA");
eq(c.textVerdict(4.49).level, "AA large text only", "4.49 -> large only");
eq(c.textVerdict(3.0).level, "AA large text only", "3.0 boundary inclusive large");
eq(c.textVerdict(2.99).level, "Fail", "2.99 -> Fail");
eq(c.textVerdict(5.17).pass, true, "5.17 passes AA");
eq(c.textVerdict(2.54).pass, false, "2.54 fails AA");
isNull(c.textVerdict(null), "textVerdict null -> null");

// --- linkBodyVerdict (WCAG 1.4.1 / G183, 3:1 inclusive) ---
eq(c.linkBodyVerdict(3.0).pass, true, "3.00 passes G183");
eq(c.linkBodyVerdict(2.99).pass, false, "2.99 fails G183");
eq(c.linkBodyVerdict(2.23).pass, false, "classic blue vs black fails G183");
eq(c.linkBodyVerdict(4.06).pass, true, "blue-600 vs black passes G183");
isNull(c.linkBodyVerdict(null), "linkBodyVerdict null -> null");

// --- linkOverall: both gates, underline as non-color cue ---
let o;
o = c.linkOverall(5.17, 3.43, false);
eq(o.pass, true, "blue-600/gray-900 no underline passes overall");
o = c.linkOverall(5.17, 2.84, false);
eq(o.pass, false, "blue-600/gray-800 no underline fails overall");
eq(o.fails.length, 1, "exactly one failing check");
o = c.linkOverall(5.17, 2.84, true);
eq(o.pass, true, "same pair passes with underline (non-color cue)");
o = c.linkOverall(9.40, 2.23, false);
eq(o.pass, false, "classic blue fails overall without underline");
o = c.linkOverall(9.40, 2.23, true);
eq(o.pass, true, "classic blue passes with underline");
o = c.linkOverall(2.54, 4.05, false);
eq(o.pass, false, "blue-400 fails overall (bg gate) despite passing G183");
eq(o.fails.length, 1, "blue-400: only bg gate fails");
o = c.linkOverall(2.54, 1.46, false);
eq(o.pass, false, "both gates fail");
eq(o.fails.length, 2, "both gates fail: two reasons listed");
isNull(c.linkOverall(null, 3.0, false), "linkOverall null ratio -> null");
isNull(c.linkOverall(5.0, null, false), "linkOverall null body ratio -> null");

console.log(`verify_linktext: ${n} assertions, ${process.exitCode ? "FAILURES" : "ALL PASS"}`);
