/* Non-Text Contrast Checker — WCAG 2.1 Success Criterion 1.4.11.
   UI components and graphical objects need at least 3:1 against adjacent
   colors. The ratio is the standard WCAG 2.1 contrast ratio; only the
   threshold (3:1 instead of 4.5:1) is different from the text checker.
   Pure functions are exported for node verification (verify_nontext.js);
   the DOM code only runs in browser. */
(function (root) {
  "use strict";

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

  // WCAG 1.4.11 verdict: 3:1 against adjacent colors. The boundary is
  // inclusive (3.00 passes). Margin is the ratio divided by the 3:1 line.
  function nonTextVerdict(ratio) {
    if (ratio === null || ratio === undefined || isNaN(ratio)) return null;
    var pass = ratio >= 3;
    return {
      pass: pass,
      label: pass ? "Pass" : "Fail",
      margin: ratio / 3,
      shortfall: pass ? 0 : 3 - ratio
    };
  }

  var api = {
    hexToRgb: hexToRgb,
    toHex: toHex,
    relLum: relLum,
    contrastRatio: contrastRatio,
    nonTextVerdict: nonTextVerdict
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NonTextCalc = api;

  if (typeof document === "undefined") return;

  function $(id) { return document.getElementById(id); }

  function fmt(r) { return r === null ? "–" : r.toFixed(2) + ":1"; }

  function render() {
    var fg = $("ntFgHex").value, bg = $("ntBgHex").value;
    var ratio = contrastRatio(fg, bg);
    var v = nonTextVerdict(ratio);
    $("ntRatio").textContent = fmt(ratio);
    $("ntVerdict").textContent = v ? v.label + " — 3:1" : "–";
    $("ntVerdict").style.color = v ? (v.pass ? "#15803d" : "#b91c1c") : "";
    $("ntMargin").textContent = v
      ? (v.pass
          ? v.margin.toFixed(2) + "× the 3:1 line"
          : "needs " + v.shortfall.toFixed(2) + " more to reach 3:1")
      : "–";
    var rows = ["ntIcon", "ntBorder", "ntFocus", "ntChart"];
    rows.forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.textContent = v ? v.label : "–";
      el.className = v ? (v.pass ? "nt-pass" : "nt-fail") : "";
    });
    var pv = $("ntPreview");
    if (pv) pv.style.background = bg;
    var icon = $("ntPreviewIcon");
    if (icon) icon.style.color = fg;
    var input = $("ntPreviewInput");
    if (input) { input.style.borderColor = fg; input.style.background = bg; input.style.color = fg; }
    var btn = $("ntPreviewBtn");
    if (btn) { btn.style.borderColor = fg; btn.style.background = bg; btn.style.color = fg; }
    var focus = $("ntPreviewFocus");
    if (focus) { focus.style.background = bg; focus.style.color = fg; focus.style.outlineColor = fg; }
    var note = $("ntNote");
    if (note) {
      note.textContent = ratio === null
        ? "Enter two valid hex colors."
        : (v.pass
            ? "Passes WCAG 1.4.11 (3:1). Remember: a focus ring must pass against both neighbors — check it against the control's fill too."
            : "Below 3:1 — this component would fail WCAG 1.4.11. Darken or lighten the component color until the ratio reaches 3:1.");
    }
  }

  function sync(which) {
    var p = $(which === "f" ? "ntFg" : "ntBg"),
        x = $(which === "f" ? "ntFgHex" : "ntBgHex");
    if (p && x) x.value = p.value;
  }

  function apply(which) {
    var p = $(which === "f" ? "ntFg" : "ntBg"),
        x = $(which === "f" ? "ntFgHex" : "ntBgHex");
    var rgb = hexToRgb(x.value);
    if (rgb && p) p.value = toHex(rgb);
  }

  ["f", "b"].forEach(function (w) {
    var p = $(w === "f" ? "ntFg" : "ntBg"),
        x = $(w === "f" ? "ntFgHex" : "ntBgHex");
    if (p) p.addEventListener("input", function () { sync(w); render(); });
    if (x) x.addEventListener("input", function () { apply(w); render(); });
  });

  var swap = $("ntSwap");
  if (swap) swap.addEventListener("click", function () {
    var fp = $("ntFg"), fx = $("ntFgHex"), bp = $("ntBg"), bx = $("ntBgHex");
    var tmpP = fp.value, tmpX = fx.value;
    fp.value = bp.value; fx.value = bx.value;
    bp.value = tmpP; bx.value = tmpX;
    render();
  });

  Array.prototype.forEach.call(document.querySelectorAll(".nt-preset"), function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-f"), b = btn.getAttribute("data-b");
      if (f && b) {
        $("ntFg").value = f; $("ntFgHex").value = f;
        $("ntBg").value = b; $("ntBgHex").value = b;
        render();
      }
    });
  });

  render();
})(typeof self !== "undefined" ? self : this);
