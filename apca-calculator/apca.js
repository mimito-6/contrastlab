/* APCA Contrast Calculator — Accessible Perceptual Contrast Algorithm 0.98G
   (W3 APCA draft, the contrast method proposed for WCAG 3).
   Pure functions are exported for node verification (verify_apca.js);
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

  // sRGB channel (0-255) -> linear light, APCA linearization (0.04045 / 12.92).
  function lin(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  // Relative luminance Y with the APCA coefficients.
  function srgbToY(rgb) {
    return 0.2126729 * lin(rgb[0]) + 0.7151522 * lin(rgb[1]) + 0.0721750 * lin(rgb[2]);
  }

  // APCA 0.98G constants (W3 APCA / Myndex).
  var NORM_BG = 0.56, NORM_TXT = 0.57, REV_TXT = 0.62, REV_BG = 0.65;
  var BLK_THRS = 0.022, BLK_CLMP = 1.414;
  var SCALE_BOW = 1.14, SCALE_WOB = 1.14;
  var LO_CLIP = 0.1, LO_BOW_OFFSET = 0.027, DELTA_Y_MIN = 0.0005;

  // Signed APCA lightness contrast (Lc). Positive = dark text on a light
  // background, negative = light text on a dark background. Returns null
  // for invalid input.
  function apcaContrast(textHex, bgHex) {
    var t = hexToRgb(textHex), b = hexToRgb(bgHex);
    if (!t || !b) return null;
    var yTxt = srgbToY(t), yBg = srgbToY(b);
    if (yBg <= BLK_THRS) yBg += Math.pow(BLK_THRS - yBg, BLK_CLMP);
    if (yTxt <= BLK_THRS) yTxt += Math.pow(BLK_THRS - yTxt, BLK_CLMP);
    var sapc;
    if (Math.abs(yBg - yTxt) < DELTA_Y_MIN) {
      sapc = 0;
    } else if (yBg > yTxt) {
      sapc = (Math.pow(yBg, NORM_BG) - Math.pow(yTxt, NORM_TXT)) * SCALE_BOW;
      sapc = sapc < LO_CLIP ? 0 : sapc - LO_BOW_OFFSET;
    } else {
      sapc = (Math.pow(yBg, REV_BG) - Math.pow(yTxt, REV_TXT)) * SCALE_WOB;
      sapc = sapc > -LO_CLIP ? 0 : sapc + LO_BOW_OFFSET;
    }
    return sapc * 100;
  }

  // WCAG 2.1 ratio for the same pair, side by side (site-wide convention:
  // 0.03928 threshold, same as matrix.js / app.js).
  function wcagLuminance(rgb) {
    var ch = rgb.map(function (c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function wcagRatio(textHex, bgHex) {
    var t = hexToRgb(textHex), b = hexToRgb(bgHex);
    if (!t || !b) return null;
    var la = wcagLuminance(t), lb = wcagLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // APCA 0.98G draft guidance thresholds (absolute Lc).
  // body: 75 minimum (90 preferred), large text 24px+: 60,
  // large bold: 45, non-text UI (icons/borders): 30.
  var THRESHOLDS = [
    { key: "body", label: "Body text", need: 75, note: "minimum; 90 preferred" },
    { key: "large", label: "Large text (24px+)", need: 60, note: "headings" },
    { key: "bold", label: "Large bold text", need: 45, note: "24px+ bold" },
    { key: "nontext", label: "Non-text UI", need: 30, note: "icons, borders, focus rings" }
  ];

  function verdicts(lc) {
    var mag = Math.abs(lc);
    return THRESHOLDS.map(function (t) {
      return { key: t.key, label: t.label, need: t.need, note: t.note, pass: mag >= t.need };
    });
  }

  function polarity(lc) {
    if (lc === null) return null;
    if (lc === 0) return "no contrast";
    return lc > 0 ? "dark text on light background" : "light text on dark background";
  }

  var api = {
    hexToRgb: hexToRgb, toHex: toHex, lin: lin, srgbToY: srgbToY,
    apcaContrast: apcaContrast, wcagRatio: wcagRatio,
    thresholds: THRESHOLDS, verdicts: verdicts, polarity: polarity
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ApcaCalc = api;

  if (typeof document === "undefined") return;

  var $ = function (id) { return document.getElementById(id); };

  function fmtLc(lc) {
    if (lc === null) return "–";
    return (lc > 0 ? "+" : "") + lc.toFixed(1);
  }

  function render() {
    var tEl = $("apTextHex"), bEl = $("apBgHex");
    var t = tEl ? tEl.value.trim() : "", b = bEl ? bEl.value.trim() : "";
    var lc = apcaContrast(t, b), r = wcagRatio(t, b);
    var note = $("apNote");
    if (lc === null) {
      note.textContent = "Enter two valid hex colors to calculate APCA contrast.";
      ["apLc", "apMag", "apPolarity", "apWcag"].forEach(function (id) { $(id).textContent = "–"; });
      ["apBody", "apLarge", "apBold", "apNontext"].forEach(function (id) { $(id).textContent = "–"; });
      var pv = $("apPreview");
      if (pv) pv.style.background = "#fff";
      return;
    }
    note.textContent = "";
    var mag = Math.abs(lc);
    $("apLc").textContent = "Lc " + fmtLc(lc);
    $("apMag").textContent = mag.toFixed(1);
    $("apPolarity").textContent = polarity(lc);
    $("apWcag").textContent = r.toFixed(2) + ":1";
    verdicts(lc).forEach(function (v) {
      var el = $("ap" + v.key.charAt(0).toUpperCase() + v.key.slice(1));
      if (el) {
        el.textContent = v.pass ? "Pass" : "Fail";
        el.className = v.pass ? "ap-pass" : "ap-fail";
      }
    });
    var pv2 = $("apPreview");
    if (pv2) {
      pv2.style.background = b;
      pv2.style.color = t;
    }
    var pw = $("apPreviewWcag");
    if (pw) pw.textContent = "WCAG 2.1 ratio for this pair: " + r.toFixed(2) + ":1" +
      (r >= 7 ? " (AAA)" : r >= 4.5 ? " (AA)" : r >= 3 ? " (AA large only)" : " (fails AA)");
  }

  function sync(which) {
    var p = $(which === "t" ? "apText" : "apBg"),
        x = $(which === "t" ? "apTextHex" : "apBgHex");
    if (p && x) x.value = p.value;
  }

  function apply(which) {
    var p = $(which === "t" ? "apText" : "apBg"),
        x = $(which === "t" ? "apTextHex" : "apBgHex");
    var rgb = hexToRgb(x.value);
    if (rgb && p) p.value = toHex(rgb);
  }

  ["t", "b"].forEach(function (w) {
    var p = $(w === "t" ? "apText" : "apBg"),
        x = $(w === "t" ? "apTextHex" : "apBgHex");
    if (p) p.addEventListener("input", function () { sync(w); render(); });
    if (x) x.addEventListener("input", function () { apply(w); render(); });
  });

  var swap = $("apSwap");
  if (swap) swap.addEventListener("click", function () {
    var tp = $("apText"), tx = $("apTextHex"), bp = $("apBg"), bx = $("apBgHex");
    var tmpP = tp.value, tmpX = tx.value;
    tp.value = bp.value; tx.value = bx.value;
    bp.value = tmpP; bx.value = tmpX;
    render();
  });

  Array.prototype.forEach.call(document.querySelectorAll(".ap-preset"), function (btn) {
    btn.addEventListener("click", function () {
      var t = btn.getAttribute("data-t"), b = btn.getAttribute("data-b");
      if (t && b) {
        $("apText").value = t; $("apTextHex").value = t;
        $("apBg").value = b; $("apBgHex").value = b;
        render();
      }
    });
  });

  render();
})(typeof self !== "undefined" ? self : this);
