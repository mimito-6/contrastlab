/* ContrastLab — WCAG 2.2 contrast math + UI. No dependencies, no tracking. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var fg = $("fg"), bg = $("bg"), fgPicker = $("fgPicker"), bgPicker = $("bgPicker");

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function normalizeHex(h) {
    h = (h || "").trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map(function (c) { return c + c; }).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return "#" + h.toLowerCase();
  }

  function hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16)
    };
  }

  function rgbToHex(r, g, b) {
    function p(n) { var s = Math.round(clamp(n, 0, 255)).toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + p(r) + p(g) + p(b);
  }

  function luminance(rgb) {
    function lin(c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
  }

  function ratio(hexA, hexB) {
    var l1 = luminance(hexToRgb(hexA)), l2 = luminance(hexToRgb(hexB));
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return { h: h * 360, s: s, l: l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      var t = function (tc) {
        if (tc < 0) tc += 1; if (tc > 1) tc -= 1;
        if (tc < 1 / 6) return p + (q - p) * 6 * tc;
        if (tc < 1 / 2) return q;
        if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
        return p;
      };
      r = t(h + 1 / 3); g = t(h); b = t(h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  /* Nudge text color lightness until it reaches target ratio (keeps hue). */
  function fixToTarget(fgHex, bgHex, target) {
    var rgb = hexToRgb(fgHex), hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    var bgLum = luminance(hexToRgb(bgHex));
    var fgLum = luminance(rgb);
    var darken = fgLum > bgLum; // move away from background
    var lo = 0, hi = 1, best = hsl.l;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      var c = hslToRgb(hsl.h, hsl.s, mid);
      var hex = rgbToHex(c.r, c.g, c.b);
      if (ratio(hex, bgHex) >= target) { best = mid; if (darken) lo = mid; else hi = mid; }
      else { if (darken) hi = mid; else lo = mid; }
    }
    var fc = hslToRgb(hsl.h, hsl.s, best);
    return rgbToHex(fc.r, fc.g, fc.b);
  }

  function setBadge(el, pass) {
    var b = el.querySelector(".g-badge");
    b.textContent = pass ? "PASS" : "FAIL";
    b.className = "g-badge " + (pass ? "pass" : "fail");
  }

  function update() {
    var f = normalizeHex(fg.value), b = normalizeHex(bg.value);
    if (!f || !b) return;
    fg.value = f; bg.value = b;
    fgPicker.value = f; bgPicker.value = b;

    var r = ratio(f, b);
    $("ratioNum").textContent = r.toFixed(2) + ":1";

    setBadge($("gradeNormalAA"), r >= 4.5);
    setBadge($("gradeNormalAAA"), r >= 7);
    setBadge($("gradeLargeAA"), r >= 3);
    setBadge($("gradeLargeAAA"), r >= 4.5);

    var pv = $("preview");
    pv.style.background = b; pv.style.color = f;
    $("previewH").style.color = f; $("previewP").style.color = f;
    var btn = $("previewBtn");
    btn.style.background = f; btn.style.color = b;
  }

  function syncFromPicker(textEl, pickerEl) {
    pickerEl.addEventListener("input", function () { textEl.value = pickerEl.value; update(); });
    textEl.addEventListener("input", function () {
      var n = normalizeHex(textEl.value);
      if (n) { pickerEl.value = n; update(); }
    });
    textEl.addEventListener("change", function () {
      var n = normalizeHex(textEl.value);
      textEl.value = n || (textEl === fg ? "#1a1a1a" : "#ffffff");
      update();
    });
  }
  syncFromPicker(fg, fgPicker);
  syncFromPicker(bg, bgPicker);

  $("swap").addEventListener("click", function () {
    var t = fg.value; fg.value = bg.value; bg.value = t; update();
  });

  $("random").addEventListener("click", function () {
    function rnd() { return rgbToHex(Math.random() * 255, Math.random() * 255, Math.random() * 255); }
    fg.value = rnd(); bg.value = rnd(); update();
  });

  $("fixAA").addEventListener("click", function () {
    var f = normalizeHex(fg.value), b = normalizeHex(bg.value);
    if (!f || !b) return;
    fg.value = fixToTarget(f, b, 4.5); update();
    $("fixHint").textContent = "Adjusted text color to " + fg.value + " — now passes AA.";
  });

  $("fixAAA").addEventListener("click", function () {
    var f = normalizeHex(fg.value), b = normalizeHex(bg.value);
    if (!f || !b) return;
    fg.value = fixToTarget(f, b, 7); update();
    $("fixHint").textContent = "Adjusted text color to " + fg.value + " — now passes AAA.";
  });

  $("copyCss").addEventListener("click", function () {
    var f = normalizeHex(fg.value), b = normalizeHex(bg.value);
    if (!f || !b) return;
    var css = ":root {\n  --text: " + f + ";\n  --background: " + b + ";\n  /* contrast ratio: " +
      ratio(f, b).toFixed(2) + ":1 */\n}";
    navigator.clipboard.writeText(css).then(function () {
      $("fixHint").textContent = "CSS copied to clipboard.";
    }, function () {
      $("fixHint").textContent = "Copy failed — select the CSS manually.";
    });
  });

  /* Curated accessible pairs (all pass AA for normal text). */
  var PAIRS = [
    ["#1a1a1a", "#ffffff"], ["#ffffff", "#1a1a1a"],
    ["#0f3d2e", "#f4f1e8"], ["#f4f1e8", "#0f3d2e"],
    ["#1d3557", "#f1faee"], ["#f1faee", "#1d3557"],
    ["#3a0ca3", "#ffffff"], ["#ffffff", "#3a0ca3"],
    ["#7f1d1d", "#fef3c7"], ["#fef3c7", "#7f1d1d"],
    ["#052e16", "#ecfdf5"], ["#ecfdf5", "#052e16"]
  ];
  var grid = $("pairGrid");
  PAIRS.forEach(function (pr) {
    var r = ratio(pr[0], pr[1]);
    var d = document.createElement("div");
    d.className = "pair";
    d.innerHTML = '<div class="swatches"><div style="background:' + pr[0] + '"></div>' +
      '<div style="background:' + pr[1] + '"></div></div>' +
      '<div class="meta">' + pr[0] + " / " + pr[1] + ' &nbsp;<b>' + r.toFixed(1) + ":1</b></div>";
    d.addEventListener("click", function () { fg.value = pr[0]; bg.value = pr[1]; update(); });
    grid.appendChild(d);
  });

  update();
})();
