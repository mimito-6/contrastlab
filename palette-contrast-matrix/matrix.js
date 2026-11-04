/* Palette Contrast Matrix — every text/background pair of a palette scored
   with the WCAG 2.1 contrast formula. Pure functions are exported for
   node verification (verify_matrix.js); the DOM code only runs in browser. */
(function (root) {
  "use strict";

  function hexToRgb(h) {
    h = String(h || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map(function (c) { return c + c; }).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  }

  function toHex(rgb) {
    return "#" + rgb.map(function (c) {
      var v = Math.max(0, Math.min(255, Math.round(c * 255)));
      return v.toString(16).padStart(2, "0");
    }).join("");
  }

  function luminance(rgb) {
    var ch = rgb.map(function (c) {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function ratio(hexA, hexB) {
    var a = hexToRgb(hexA), b = hexToRgb(hexB);
    if (!a || !b) return null;
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // WCAG verdict for a ratio: AAA >= 7, AA >= 4.5, AA-large >= 3, else fail.
  function verdict(r) {
    if (r === null) return null;
    if (r >= 7) return "AAA";
    if (r >= 4.5) return "AA";
    if (r >= 3) return "AA large";
    return "Fail";
  }

  // Ordered pairs (text, bg) with text != bg. Returns summary counts + best/worst.
  function summarize(hexes) {
    var valid = hexes.filter(function (h) { return hexToRgb(h) !== null; });
    var pairs = [];
    for (var i = 0; i < valid.length; i++) {
      for (var j = 0; j < valid.length; j++) {
        if (i === j) continue;
        var r = ratio(valid[i], valid[j]);
        pairs.push({ text: valid[i], bg: valid[j], ratio: r, verdict: verdict(r) });
      }
    }
    var counts = { AAA: 0, AA: 0, "AA large": 0, Fail: 0 };
    var best = null, worst = null;
    pairs.forEach(function (p) {
      counts[p.verdict]++;
      if (!best || p.ratio > best.ratio) best = p;
      if (!worst || p.ratio < worst.ratio) worst = p;
    });
    return { colors: valid, pairs: pairs, counts: counts, best: best, worst: worst };
  }

  var api = {
    hexToRgb: hexToRgb, toHex: toHex, luminance: luminance,
    ratio: ratio, verdict: verdict, summarize: summarize
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PaletteMatrix = api;

  if (typeof document === "undefined") return;

  var $ = function (id) { return document.getElementById(id); };
  var SLOTS = 6;

  function readColors() {
    var out = [];
    for (var i = 0; i < SLOTS; i++) {
      var t = $("mxText" + i);
      var v = t ? t.value.trim() : "";
      if (v) out.push(v);
    }
    return out;
  }

  function fmt(n) { return n.toFixed(2) + ":1"; }

  function render() {
    var colors = readColors();
    var note = $("mxNote");
    var tableWrap = $("mxTableWrap");
    if (colors.length < 2 || colors.some(function (c) { return !hexToRgb(c); })) {
      note.textContent = colors.length < 2
        ? "Enter at least two valid hex colors to build the matrix."
        : "One of the colors is not a valid hex value — check the highlighted field.";
      tableWrap.innerHTML = "";
      ["mxTotal", "mxAAA", "mxAA", "mxLarge", "mxFail", "mxBest", "mxWorst"].forEach(function (id) { $(id).textContent = "–"; });
      return;
    }
    note.textContent = "";
    var s = summarize(colors);

    $("mxTotal").textContent = s.pairs.length;
    $("mxAAA").textContent = s.counts.AAA;
    $("mxAA").textContent = s.counts.AA;
    $("mxLarge").textContent = s.counts["AA large"];
    $("mxFail").textContent = s.counts.Fail;
    $("mxBest").textContent = s.best ? fmt(s.best.ratio) + " (" + s.best.text + " on " + s.best.bg + ")" : "–";
    $("mxWorst").textContent = s.worst ? fmt(s.worst.ratio) + " (" + s.worst.text + " on " + s.worst.bg + ")" : "–";

    var html = "<table class=\"mx-table\"><thead><tr><th>text \\ bg</th>";
    s.colors.forEach(function (c) {
      html += "<th><span class=\"mx-swatch\" style=\"background:" + c + "\"></span>" + c + "</th>";
    });
    html += "</tr></thead><tbody>";
    s.colors.forEach(function (t) {
      html += "<tr><th><span class=\"mx-swatch\" style=\"background:" + t + "\"></span>" + t + "</th>";
      s.colors.forEach(function (b) {
        if (t.toLowerCase() === b.toLowerCase()) {
          html += "<td class=\"mx-diag\">—</td>";
        } else {
          var r = ratio(t, b), v = verdict(r);
          var cls = v === "Fail" ? "mx-fail" : (v === "AAA" ? "mx-aaa" : "mx-aa");
          html += "<td class=\"" + cls + "\" title=\"" + t + " text on " + b + " background\">" + r.toFixed(2) + "<br><span>" + v + "</span></td>";
        }
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    tableWrap.innerHTML = html;
  }

  function sync(i) {
    var p = $("mxPick" + i), t = $("mxText" + i);
    if (p && t) t.value = p.value;
  }

  function apply(i) {
    var p = $("mxPick" + i), t = $("mxText" + i);
    var rgb = hexToRgb(t.value);
    if (rgb && p) p.value = toHex(rgb);
  }

  for (var k = 0; k < SLOTS; k++) {
    (function (i) {
      var p = $("mxPick" + i), t = $("mxText" + i);
      if (p) p.addEventListener("input", function () { sync(i); render(); });
      if (t) t.addEventListener("input", function () { apply(i); render(); });
    })(k);
  }
  var preset = $("mxPreset");
  if (preset) preset.addEventListener("click", function () {
    var defs = ["#0f172a", "#ffffff", "#3b82f6", "#f59e0b", "#10b981", "#ef4444"];
    defs.forEach(function (d, i) {
      $("mxPick" + i).value = d;
      $("mxText" + i).value = d;
    });
    render();
  });
  render();
})(typeof self !== "undefined" ? self : this);
