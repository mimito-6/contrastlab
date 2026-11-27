/* Focus Indicator Contrast Checker — WCAG 2.2 Success Criterion 2.4.13
   (Focus Appearance, AA). A focus indicator must (a) reach at least 3:1
   against its adjacent colors — BOTH the component it surrounds and the
   page behind it — and (b) cover an area at least as large as a 2 CSS px
   thick perimeter of the component. The ratio is the standard WCAG 2.1
   contrast ratio; the area is the area of a t px outline drawn just
   outside a W x H rectangle: (W+2t)(H+2t) - W*H = 2t(W+H) + 4t^2.
   The required area is that same formula at t = 2: 4(W+H) + 16.
   Pure functions are exported for node verification (verify_focus.js);
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

  // WCAG 2.4.13 color rule: 3:1 against an adjacent color. Boundary is
  // inclusive (3.00 passes).
  function focusVerdict(ratio) {
    if (ratio === null || ratio === undefined || isNaN(ratio)) return null;
    var pass = ratio >= 3;
    return {
      pass: pass,
      label: pass ? "Pass" : "Fail",
      margin: ratio / 3,
      shortfall: pass ? 0 : 3 - ratio
    };
  }

  function numOk(n) {
    return typeof n === "number" && isFinite(n);
  }

  // Area (px^2) of a t px outline drawn just outside a W x H rectangle.
  // Returns null for invalid dimensions (W/H must be > 0, t must be >= 0).
  function indicatorArea(w, h, t) {
    if (!numOk(w) || !numOk(h) || !numOk(t)) return null;
    if (w <= 0 || h <= 0 || t < 0) return null;
    return 2 * t * (w + h) + 4 * t * t;
  }

  // Area (px^2) of a 2 px perimeter of a W x H component: the WCAG 2.4.13
  // minimum. Returns null for invalid dimensions.
  function requiredArea(w, h) {
    if (!numOk(w) || !numOk(h)) return null;
    if (w <= 0 || h <= 0) return null;
    return 4 * (w + h) + 16;
  }

  // WCAG 2.4.13 area rule: indicator area must be >= the 2 px perimeter
  // area. Boundary is inclusive (exactly equal passes).
  function areaVerdict(area, required) {
    if (area === null || required === null) return null;
    var pass = area >= required;
    return {
      pass: pass,
      label: pass ? "Pass" : "Fail",
      deficit: pass ? 0 : required - area
    };
  }

  // Overall verdict: both 3:1 color checks AND the area check must pass.
  function overallVerdict(ratioComp, ratioPage, area, required) {
    var vc = focusVerdict(ratioComp);
    var vp = focusVerdict(ratioPage);
    var va = areaVerdict(area, required);
    if (!vc || !vp || !va) return null;
    var pass = vc.pass && vp.pass && va.pass;
    var failing = [];
    if (!vc.pass) failing.push("ring vs component");
    if (!vp.pass) failing.push("ring vs page");
    if (!va.pass) failing.push("indicator area");
    return { pass: pass, label: pass ? "Pass" : "Fail", failing: failing };
  }

  // Text color (near-black or white) that contrasts best with a fill, for
  // the live preview label. Returns null for an invalid fill.
  function pickTextColor(fillHex) {
    var f = hexToRgb(fillHex);
    if (!f) return null;
    var dark = contrastRatio(fillHex, "#111827");
    var light = contrastRatio(fillHex, "#FFFFFF");
    return dark >= light ? "#111827" : "#FFFFFF";
  }

  var api = {
    hexToRgb: hexToRgb,
    toHex: toHex,
    relLum: relLum,
    contrastRatio: contrastRatio,
    focusVerdict: focusVerdict,
    indicatorArea: indicatorArea,
    requiredArea: requiredArea,
    areaVerdict: areaVerdict,
    overallVerdict: overallVerdict,
    pickTextColor: pickTextColor
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FocusCalc = api;

  if (typeof document === "undefined") return;

  function $(id) { return document.getElementById(id); }

  function fmt(r) { return r === null ? "–" : r.toFixed(2) + ":1"; }

  function readNum(id) {
    var el = $(id);
    if (!el) return null;
    var v = parseFloat(el.value);
    return isNaN(v) ? null : v;
  }

  function render() {
    var ring = $("fcRingHex").value,
        comp = $("fcCompHex").value,
        page = $("fcPageHex").value;
    var w = readNum("fcWidth"), h = readNum("fcHeight"), t = readNum("fcThick");
    var rComp = contrastRatio(ring, comp);
    var rPage = contrastRatio(ring, page);
    var vComp = focusVerdict(rComp);
    var vPage = focusVerdict(rPage);
    var area = (w !== null && h !== null && t !== null) ? indicatorArea(w, h, t) : null;
    var req = (w !== null && h !== null) ? requiredArea(w, h) : null;
    var vArea = areaVerdict(area, req);
    var vAll = overallVerdict(rComp, rPage, area, req);

    $("fcRatioComp").textContent = fmt(rComp);
    var el = $("fcVerdictComp");
    el.textContent = vComp ? vComp.label + " — 3:1" : "–";
    el.style.color = vComp ? (vComp.pass ? "#15803d" : "#b91c1c") : "";
    $("fcRatioPage").textContent = fmt(rPage);
    el = $("fcVerdictPage");
    el.textContent = vPage ? vPage.label + " — 3:1" : "–";
    el.style.color = vPage ? (vPage.pass ? "#15803d" : "#b91c1c") : "";
    $("fcArea").textContent = area === null ? "–" : Math.round(area).toLocaleString("en-US") + " px²";
    $("fcRequired").textContent = req === null ? "–" : Math.round(req).toLocaleString("en-US") + " px²";
    el = $("fcAreaVerdict");
    el.textContent = vArea ? vArea.label + (vArea.pass ? "" : " — short by " + Math.round(vArea.deficit).toLocaleString("en-US") + " px²") : "–";
    el.style.color = vArea ? (vArea.pass ? "#15803d" : "#b91c1c") : "";
    el = $("fcOverall");
    el.textContent = vAll ? (vAll.pass ? "Pass — WCAG 2.4.13" : "Fail — " + vAll.failing.join(" + ")) : "–";
    el.style.color = vAll ? (vAll.pass ? "#15803d" : "#b91c1c") : "";

    var note = $("fcNote");
    if (note) {
      note.textContent = (rComp === null || rPage === null)
        ? "Enter three valid hex colors."
        : (!vAll ? "Enter a valid component size and ring thickness."
        : (vAll.pass
            ? "Passes WCAG 2.4.13 Focus Appearance: 3:1 against both neighbors and at least a 2 px perimeter of area. Remember 2.4.11 too — the focused control must stay at least partly visible, not covered by a sticky header."
            : "Fails on: " + vAll.failing.join("; ") + ". Fix the failing side — a double ring (white + dark) fixes most color failures, and 2 px fixes most area failures."));
    }

    var pv = $("fcPreview");
    if (pv) pv.style.background = page;
    var btn = $("fcPreviewBtn");
    if (btn) {
      btn.style.background = comp;
      var tc = pickTextColor(comp);
      if (tc) btn.style.color = tc;
      btn.style.outlineStyle = "solid";
      btn.style.outlineColor = ring;
      btn.style.outlineWidth = (t === null ? 2 : t) + "px";
      btn.style.outlineOffset = "2px";
    }
  }

  function syncColor(which) {
    var p = $(which === "r" ? "fcRing" : which === "c" ? "fcComp" : "fcPage"),
        x = $(which === "r" ? "fcRingHex" : which === "c" ? "fcCompHex" : "fcPageHex");
    if (p && x) x.value = p.value;
  }

  function applyColor(which) {
    var p = $(which === "r" ? "fcRing" : which === "c" ? "fcComp" : "fcPage"),
        x = $(which === "r" ? "fcRingHex" : which === "c" ? "fcCompHex" : "fcPageHex");
    var rgb = hexToRgb(x.value);
    if (rgb && p) p.value = toHex(rgb);
  }

  ["r", "c", "p"].forEach(function (w) {
    var p = $(w === "r" ? "fcRing" : w === "c" ? "fcComp" : "fcPage"),
        x = $(w === "r" ? "fcRingHex" : w === "c" ? "fcCompHex" : w === "p" ? "fcPageHex" : null);
    if (p) p.addEventListener("input", function () { syncColor(w); render(); });
    if (x) x.addEventListener("input", function () { applyColor(w); render(); });
  });

  ["fcWidth", "fcHeight", "fcThick"].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener("input", render);
  });

  var swap = $("fcSwap");
  if (swap) swap.addEventListener("click", function () {
    var rp = $("fcRing"), rx = $("fcRingHex"), cp = $("fcComp"), cx = $("fcCompHex");
    var tmpP = rp.value, tmpX = rx.value;
    rp.value = cp.value; rx.value = cx.value;
    cp.value = tmpP; cx.value = tmpX;
    render();
  });

  Array.prototype.forEach.call(document.querySelectorAll(".fc-preset"), function (btn) {
    btn.addEventListener("click", function () {
      var r = btn.getAttribute("data-r"), c = btn.getAttribute("data-c"),
          p = btn.getAttribute("data-p"), t = btn.getAttribute("data-t");
      if (r) { $("fcRing").value = r; $("fcRingHex").value = r; }
      if (c) { $("fcComp").value = c; $("fcCompHex").value = c; }
      if (p) { $("fcPage").value = p; $("fcPageHex").value = p; }
      if (t) { $("fcThick").value = t; }
      render();
    });
  });

  render();
})(typeof self !== "undefined" ? self : this);
