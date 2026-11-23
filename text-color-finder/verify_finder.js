/* Verify finder.js against independently computed WCAG 2.1 values
   (Python mirror; see WORKLOG 2026-11-23). Run: node verify_finder.js */
"use strict";
var F = require("./finder.js");

var passed = 0, failed = 0;
function check(label, actual, expected, tol) {
  tol = tol === undefined ? 0.005 : tol;
  var ok = (actual === expected) ||
    (typeof actual === "number" && typeof expected === "number" && Math.abs(actual - expected) <= tol);
  if (ok) { passed++; }
  else { failed++; console.log("FAIL " + label + ": got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected)); }
}
function eq(label, actual, expected) { check(label, actual, expected, 0); }

// --- ratio core (spot checks from the Python mirror) ---
check("white vs black", F.contrastRatio("#FFFFFF", "#000000"), 21.0);
check("gray-500 #6B7280 vs white", F.contrastRatio("#6B7280", "#FFFFFF"), 4.83);
check("gray-400 #9CA3AF vs white", F.contrastRatio("#9CA3AF", "#FFFFFF"), 2.54);
check("blue-600 #2563EB vs white", F.contrastRatio("#2563EB", "#FFFFFF"), 5.17);
check("blue-700 #1D4ED8 vs white", F.contrastRatio("#1D4ED8", "#FFFFFF"), 6.70);
check("green-800 #166534 vs white", F.contrastRatio("#166534", "#FFFFFF"), 7.13);
check("purple-700 #6D28D9 vs white", F.contrastRatio("#6D28D9", "#FFFFFF"), 7.10);
check("amber-500 #F59E0B vs white", F.contrastRatio("#F59E0B", "#FFFFFF"), 2.15);
check("gray-400 #9CA3AF vs #121212", F.contrastRatio("#9CA3AF", "#121212"), 7.38);
check("blue-700 #1D4ED8 vs #121212", F.contrastRatio("#1D4ED8", "#121212"), 2.80);
check("blue-500 #3B82F6 vs #121212", F.contrastRatio("#3B82F6", "#121212"), 5.09);
check("invalid hex", F.contrastRatio("#zzzzzz", "#FFFFFF"), null);
check("3-digit hex", F.contrastRatio("#fff", "#000"), 21.0);

// --- bucket counts: white background (37 palette colors) ---
var w = F.findPassing("#FFFFFF");
eq("white AAA count", w.aaa.length, 9);
eq("white AA count", w.aa.length, 12);
eq("white large-only count", w.largeOnly.length, 7);
eq("white fail count", w.fail.length, 9);
eq("white best is Black", w.aaa[0].hex, "#000000");
check("white best ratio", w.aaa[0].ratio, 21.0);
eq("white AAA last is Purple 700 (7.10)", w.aaa[w.aaa.length - 1].hex, "#6D28D9");
eq("white AA top is Blue 700", w.aa[0].hex, "#1D4ED8");
eq("white AA last is Pink 600 (4.60)", w.aa[w.aa.length - 1].hex, "#DB2777");

// --- bucket counts: dark background #121212 ---
var d = F.findPassing("#121212");
eq("dark AAA count", d.aaa.length, 9);
eq("dark AA count", d.aa.length, 6);
eq("dark large-only count", d.largeOnly.length, 11);
eq("dark fail count", d.fail.length, 11);
eq("dark best is White", d.aaa[0].hex, "#FFFFFF");
check("dark best ratio", d.aaa[0].ratio, 18.73);
eq("dark AAA last is Blue 400 (7.37)", d.aaa[d.aaa.length - 1].hex, "#60A5FA");
eq("dark AA top is Amber 600 (5.88)", d.aa[0].hex, "#D97706");
check("dark AA top ratio", d.aa[0].ratio, 5.88);
eq("dark fail includes Blue 700", d.fail.some(function (e) { return e.hex === "#1D4ED8"; }), true);
eq("dark fail includes Purple 700", d.fail.some(function (e) { return e.hex === "#6D28D9"; }), true);

// --- sorting inside every bucket is descending ---
["aaa", "aa", "largeOnly", "fail"].forEach(function (k) {
  var sorted = true;
  for (var i = 1; i < w[k].length; i++) if (w[k][i].ratio > w[k][i - 1].ratio + 1e-9) sorted = false;
  eq("white " + k + " sorted desc", sorted, true);
  var sortedD = true;
  for (var j = 1; j < d[k].length; j++) if (d[k][j].ratio > d[k][j - 1].ratio + 1e-9) sortedD = false;
  eq("dark " + k + " sorted desc", sortedD, true);
});

// --- bestPick ---
eq("bestPick white", F.bestPick("#FFFFFF").hex, "#000000");
eq("bestPick dark", F.bestPick("#121212").hex, "#FFFFFF");
eq("bestPick invalid", F.bestPick("nope"), null);
eq("findPassing invalid", F.findPassing("nope"), null);

// --- nearestPassing: closest passing alternative by RGB distance ---
var n1 = F.nearestPassing("#60A5FA", "#FFFFFF", 4.5);
eq("nearest for Blue 400 on white is Blue 600", n1 && n1.hex, "#2563EB");
check("nearest Blue 600 ratio", n1 && n1.ratio, 5.17);
var n2 = F.nearestPassing("#F59E0B", "#FFFFFF", 4.5);
eq("nearest for Amber 500 on white is Amber 700", n2 && n2.hex, "#B45309");
check("nearest Amber 700 ratio", n2 && n2.ratio, 5.02);
eq("already passing returns null", F.nearestPassing("#000000", "#FFFFFF", 4.5), null);
eq("nearest invalid brand", F.nearestPassing("nope", "#FFFFFF", 4.5), null);
// RGB distance sanity: Blue 600 is nearer to Blue 400 than Blue 700 is.
check("rgbDist Blue400-Blue600 < Blue400-Blue700",
  F.rgbDistSq("#60A5FA", "#2563EB") < F.rgbDistSq("#60A5FA", "#1D4ED8"), true);

// --- palette integrity ---
eq("palette size", F.PALETTE.length, 37);
var seen = {};
var dup = false;
F.PALETTE.forEach(function (c) { if (seen[c.hex]) dup = true; seen[c.hex] = 1; });
eq("palette hexes unique", dup, false);

console.log("verify_finder: " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
