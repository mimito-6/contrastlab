/* Text Color Finder — given a background color, find text colors that pass
   WCAG 2.1 AA (4.5:1) and AAA (7:1) from a curated palette, plus the closest
   passing alternative to your own brand color (nearest in RGB distance).
   All ratios use the standard WCAG 2.1 relative-luminance formula.
   Pure functions are exported for node verification (verify_finder.js);
   the DOM code only runs in browser. */
(function (root) {
  "use strict";

  // Curated palette: neutrals plus one family per hue at several steps.
  // Names follow the Tailwind scale so designers can map them back.
  var PALETTE = [
    { name: "Black", hex: "#000000" },
    { name: "Gray 900", hex: "#111827" },
    { name: "Gray 800", hex: "#1F2937" },
    { name: "Gray 700", hex: "#374151" },
    { name: "Gray 600", hex: "#4B5563" },
    { name: "Gray 500", hex: "#6B7280" },
    { name: "Gray 400", hex: "#9CA3AF" },
    { name: "Gray 300", hex: "#D1D5DB" },
    { name: "Gray 200", hex: "#E5E7EB" },
    { name: "Gray 100", hex: "#F3F4F6" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Slate 900", hex: "#0F172A" },
    { name: "Slate 800", hex: "#1E293B" },
    { name: "Blue 700", hex: "#1D4ED8" },
    { name: "Blue 600", hex: "#2563EB" },
    { name: "Blue 500", hex: "#3B82F6" },
    { name: "Blue 400", hex: "#60A5FA" },
    { name: "Blue 300", hex: "#93C5FD" },
    { name: "Green 800", hex: "#166534" },
    { name: "Green 700", hex: "#15803D" },
    { name: "Green 600", hex: "#16A34A" },
    { name: "Green 500", hex: "#22C55E" },
    { name: "Red 700", hex: "#B91C1C" },
    { name: "Red 600", hex: "#DC2626" },
    { name: "Red 500", hex: "#EF4444" },
    { name: "Amber 700", hex: "#B45309" },
    { name: "Amber 600", hex: "#D97706" },
    { name: "Amber 500", hex: "#F59E0B" },
    { name: "Purple 700", hex: "#6D28D9" },
    { name: "Purple 600", hex: "#7C3AED" },
    { name: "Violet 500", hex: "#8B5CF6" },
    { name: "Teal 700", hex: "#0F766E" },
    { name: "Teal 600", hex: "#0D9488" },
    { name: "Pink 700", hex: "#BE185D" },
    { name: "Pink 600", hex: "#DB2777" },
    { name: "Orange 700", hex: "#C2410C" },
    { name: "Orange 600", hex: "#EA580C" }
  ];

  function hexToRgb(h) {
    h = String(h || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map(function (c) { return c + c; }).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16)
    ];
  }

  function toHex(rgb) {
    return "#" + rgb.map(function (c) {
      var v = Math.max(0, Math.min(255, Math.round(c)));
      return v.toString(16).padStart(2, "0");
    }).join("");
  }

  // sRGB channel (0-255) -> linear light (WCAG 2.1 linearization).
  function lin(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  // Relative luminance with the WCAG 2.1 coefficients.
  function relLum(rgb) {
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }

  // WCAG 2.1 contrast ratio. Returns null for invalid input.
  function contrastRatio(fgHex, bgHex) {
    var f = hexToRgb(fgHex), b = hexToRgb(bgHex);
    if (!f || !b) return null;
    var l1 = relLum(f), l2 = relLum(b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  // Score the whole palette against one background. Returns null for an
  // invalid background. Buckets are sorted by ratio, highest first.
  // Boundaries are inclusive: exactly 7.00 is AAA, exactly 4.50 is AA.
  function findPassing(bgHex) {
    if (!hexToRgb(bgHex)) return null;
    var out = { aaa: [], aa: [], largeOnly: [], fail: [] };
    PALETTE.forEach(function (c) {
      var r = contrastRatio(c.hex, bgHex);
      var entry = { name: c.name, hex: c.hex, ratio: r };
      if (r >= 7) out.aaa.push(entry);
      else if (r >= 4.5) out.aa.push(entry);
      else if (r >= 3) out.largeOnly.push(entry);
      else out.fail.push(entry);
    });
    ["aaa", "aa", "largeOnly", "fail"].forEach(function (k) {
      out[k].sort(function (a, b) { return b.ratio - a.ratio; });
    });
    return out;
  }

  // Highest-ratio passing color (AAA if any exists), or null.
  function bestPick(bgHex) {
    var found = findPassing(bgHex);
    if (!found) return null;
    if (found.aaa.length) return found.aaa[0];
    if (found.aa.length) return found.aa[0];
    return null;
  }

  // Squared RGB distance between two colors (null if either is invalid).
  function rgbDistSq(aHex, bHex) {
    var a = hexToRgb(aHex), b = hexToRgb(bHex);
    if (!a || !b) return null;
    var d = 0;
    for (var i = 0; i < 3; i++) d += (a[i] - b[i]) * (a[i] - b[i]);
    return d;
  }

  // Closest palette color (by RGB distance) that reaches minRatio against
  // the background. Returns { name, hex, ratio, dist } or null when the
  // brand color already passes, the inputs are invalid, or nothing in the
  // palette reaches the bar. "Closest" is a visual-similarity heuristic,
  // not a WCAG concept — the ratio is the test, the distance is the tie-break.
  function nearestPassing(brandHex, bgHex, minRatio) {
    var brandRatio = contrastRatio(brandHex, bgHex);
    if (brandRatio === null) return null;
    if (brandRatio >= minRatio) return null; // already passes: no fix needed
    var best = null;
    PALETTE.forEach(function (c) {
      var r = contrastRatio(c.hex, bgHex);
      if (r === null || r < minRatio) return;
      var d = rgbDistSq(brandHex, c.hex);
      if (best === null || d < best.dist) best = { name: c.name, hex: c.hex, ratio: r, dist: d };
    });
    return best;
  }

  var api = {
    PALETTE: PALETTE,
    hexToRgb: hexToRgb,
    toHex: toHex,
    relLum: relLum,
    contrastRatio: contrastRatio,
    findPassing: findPassing,
    bestPick: bestPick,
    rgbDistSq: rgbDistSq,
    nearestPassing: nearestPassing
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TextColorFinder = api;

  if (typeof document === "undefined") return;

  function $(id) { return document.getElementById(id); }

  function fmt(r) { return r === null ? "–" : r.toFixed(2) + ":1"; }

  function swatch(hex) {
    return '<span class="cf-swatch" style="background:' + hex + '"></span>';
  }

  function rowHTML(e) {
    var level = e.ratio >= 7 ? "AAA" : (e.ratio >= 4.5 ? "AA" : "AA large");
    return "<tr><td>" + swatch(e.hex) + e.name + " " + e.hex + "</td><td>" +
      fmt(e.ratio) + "</td><td>" + level + "</td></tr>";
  }

  function render() {
    var bg = $("cfBgHex").value;
    var brand = $("cfBrandHex").value;
    var found = findPassing(bg);
    var note = $("cfNote");

    if (!found) {
      if (note) note.textContent = "Enter a valid background hex color.";
      ["cfBest", "cfCounts", "cfAaa", "cfAa", "cfLarge", "cfBrand"].forEach(function (id) {
        var el = $(id); if (el) el.innerHTML = "";
      });
      return;
    }

    var best = found.aaa.length ? found.aaa[0] : (found.aa.length ? found.aa[0] : null);
    var bestEl = $("cfBest");
    if (bestEl) {
      bestEl.innerHTML = best
        ? "Best pick: " + swatch(best.hex) + "<strong>" + best.name + " " + best.hex + "</strong> — " + fmt(best.ratio) +
          " (" + (best.ratio >= 7 ? "AAA" : "AA") + ")"
        : "No palette color reaches AA (4.5:1) on this background — try a lighter or darker background.";
    }

    var countsEl = $("cfCounts");
    if (countsEl) {
      countsEl.innerHTML =
        "<div class=\"cf-stat\"><div class=\"v\">" + found.aaa.length + "</div><div class=\"k\">AAA (≥ 7:1)</div></div>" +
        "<div class=\"cf-stat\"><div class=\"v\">" + found.aa.length + "</div><div class=\"k\">AA (4.5–7:1)</div></div>" +
        "<div class=\"cf-stat\"><div class=\"v\">" + found.largeOnly.length + "</div><div class=\"k\">Large text only (3–4.5:1)</div></div>" +
        "<div class=\"cf-stat\"><div class=\"v\">" + found.fail.length + "</div><div class=\"k\">Fail (&lt; 3:1)</div></div>";
    }

    var aaaEl = $("cfAaa");
    if (aaaEl) aaaEl.innerHTML = found.aaa.length
      ? found.aaa.map(rowHTML).join("")
      : "<tr><td colspan=\"3\">No AAA color in the palette for this background.</td></tr>";
    var aaEl = $("cfAa");
    if (aaEl) aaEl.innerHTML = found.aa.length
      ? found.aa.map(rowHTML).join("")
      : "<tr><td colspan=\"3\">No AA-only color in the palette for this background.</td></tr>";
    var largeEl = $("cfLarge");
    if (largeEl) largeEl.innerHTML = found.largeOnly.length
      ? found.largeOnly.map(rowHTML).join("")
      : "<tr><td colspan=\"3\">No large-text-only color in the palette for this background.</td></tr>";

    var brandEl = $("cfBrand");
    if (brandEl) {
      var br = contrastRatio(brand, bg);
      if (br === null) {
        brandEl.innerHTML = "Enter a valid brand hex color to check it.";
      } else if (br >= 4.5) {
        brandEl.innerHTML = swatch(brand) + "<strong>" + brand.toUpperCase() + "</strong> already passes: " + fmt(br) +
          " (" + (br >= 7 ? "AAA" : "AA") + ") — no change needed.";
      } else {
        var alt = nearestPassing(brand, bg, 4.5);
        brandEl.innerHTML = swatch(brand) + "<strong>" + brand.toUpperCase() + "</strong> fails at " + fmt(br) +
          (alt
            ? " — closest passing alternative: " + swatch(alt.hex) + "<strong>" + alt.name + " " + alt.hex + "</strong> at " + fmt(alt.ratio) + " (AA)."
            : " — and nothing in the palette reaches AA on this background.");
      }
    }

    var pv = $("cfPreview");
    if (pv) pv.style.background = bg;
    var pt = $("cfPreviewText");
    if (pt && best) pt.style.color = best.hex;
    if (note) {
      note.textContent = found.aaa.length
        ? "AAA colors exist for this background — use one for body text and you never have to think about large-text exceptions."
        : (found.aa.length
          ? "No AAA color in the palette for this background, but AA options exist — fine for normal text, just not the enhanced level."
          : "Nothing in the palette reaches AA on this background. The background is too close to every text color — move it lighter or darker.");
    }
  }

  function syncBg() {
    var p = $("cfBg"), x = $("cfBgHex");
    if (p && x) x.value = p.value;
  }
  function applyBg() {
    var p = $("cfBg"), x = $("cfBgHex");
    var rgb = hexToRgb(x.value);
    if (rgb && p) p.value = toHex(rgb);
  }
  function syncBrand() {
    var p = $("cfBrand"), x = $("cfBrandHex");
    if (p && x) x.value = p.value;
  }
  function applyBrand() {
    var p = $("cfBrand"), x = $("cfBrandHex");
    var rgb = hexToRgb(x.value);
    if (rgb && p) p.value = toHex(rgb);
  }

  var bgP = $("cfBg"), bgX = $("cfBgHex");
  if (bgP) bgP.addEventListener("input", function () { syncBg(); render(); });
  if (bgX) bgX.addEventListener("input", function () { applyBg(); render(); });
  var brP = $("cfBrand"), brX = $("cfBrandHex");
  if (brP) brP.addEventListener("input", function () { syncBrand(); render(); });
  if (brX) brX.addEventListener("input", function () { applyBrand(); render(); });

  Array.prototype.forEach.call(document.querySelectorAll(".cf-preset"), function (btn) {
    btn.addEventListener("click", function () {
      var g = btn.getAttribute("data-g");
      if (g) {
        $("cfBg").value = g; $("cfBgHex").value = g;
        render();
      }
    });
  });

  render();
})(typeof self !== "undefined" ? self : this);
