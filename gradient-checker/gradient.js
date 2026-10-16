/* Gradient Contrast Checker — samples a linear sRGB gradient and scores
   WCAG contrast of a text color against every stop. Formulas mirror
   verify_gradient.py (all vectors PASS): hexToRgb -> mix -> luminance -> ratio. */
(function () {
  "use strict";

  var STOPS = 41; // sampling resolution

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

  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function luminance(rgb) {
    var ch = rgb.map(function (c) {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  function ratio(l1, l2) {
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  var $ = function (id) { return document.getElementById(id); };

  function syncHex(pickerId, textId) {
    var p = $(pickerId), t = $(textId);
    t.value = p.value;
  }

  function applyHex(pickerId, textId) {
    var p = $(pickerId), t = $(textId);
    var rgb = hexToRgb(t.value);
    if (rgb) p.value = toHex(rgb);
  }

  function fmt(n) { return n.toFixed(2) + ":1"; }

  function badge(el, pass) {
    el.className = "g-badge " + (pass ? "pass" : "fail");
    el.textContent = pass ? "Pass" : "Fail";
  }

  function update() {
    var c1 = hexToRgb($("gcStartText").value) || hexToRgb($("gcStart").value);
    var c2 = hexToRgb($("gcEndText").value) || hexToRgb($("gcEnd").value);
    var ct = hexToRgb($("gcTextText").value) || hexToRgb($("gcText").value);
    if (!c1 || !c2 || !ct) return;

    var lt = luminance(ct);
    var rows = [];
    for (var i = 0; i < STOPS; i++) {
      var t = i / (STOPS - 1);
      var stop = mix(c1, c2, t);
      rows.push({ t: t, hex: toHex(stop), r: ratio(luminance(stop), lt) });
    }

    var worst = rows[0], best = rows[0], sum = 0;
    rows.forEach(function (r) {
      if (r.r < worst.r) worst = r;
      if (r.r > best.r) best = r;
      sum += r.r;
    });
    var avg = sum / rows.length;

    // summary
    $("gcMinVal").textContent = fmt(worst.r);
    $("gcMinPos").textContent = "at " + Math.round(worst.t * 100) + "% of the gradient (" + worst.hex + ")";
    $("gcMaxVal").textContent = fmt(best.r);
    $("gcAvgVal").textContent = fmt(avg);
    badge($("gcAA"), worst.r >= 4.5);
    badge($("gcAALarge"), worst.r >= 3.0);
    badge($("gcAAA"), worst.r >= 7.0);

    // preview banner
    var banner = $("gcBanner");
    banner.style.background = "linear-gradient(90deg, " + toHex(c1) + ", " + toHex(c2) + ")";
    banner.style.color = toHex(ct);
    $("gcBannerHex").textContent = toHex(c1) + " → " + toHex(c2);

    // stop strip (show 21 of the 41 stops for readability)
    var strip = $("gcStrip");
    strip.innerHTML = "";
    for (var j = 0; j < rows.length; j += 2) {
      (function (r) {
        var cell = document.createElement("div");
        cell.className = "gc-cell";
        cell.style.background = r.hex;
        var label = document.createElement("span");
        label.className = "gc-cell-r";
        label.textContent = r.r.toFixed(1);
        // label legibility: pick black or white text per cell contrast
        var lab = luminance(hexToRgb(r.hex));
        label.style.color = ratio(lab, 1.0) >= ratio(lab, 0.0) ? "#fff" : "#000";
        cell.appendChild(label);
        cell.title = r.hex + " — contrast vs text: " + fmt(r.r) + " at " + Math.round(r.t * 100) + "%";
        strip.appendChild(cell);
      })(rows[j]);
    }

    // worst-stop note
    $("gcWorstNote").textContent =
      worst.r >= 4.5
        ? "Your text color passes AA everywhere along this gradient."
        : "At its weakest point the text only reaches " + fmt(worst.r) + " — below AA. " +
          "Try a darker/lighter text color, or darken the low-contrast end of the gradient.";
  }

  ["gcStart", "gcEnd", "gcText"].forEach(function (pid) {
    var tid = pid + "Text";
    $(pid).addEventListener("input", function () { syncHex(pid, tid); update(); });
    $(tid).addEventListener("input", function () { applyHex(pid, tid); update(); });
  });
  $("gcWhite").addEventListener("click", function () { $("gcText").value = "#ffffff"; syncHex("gcText", "gcTextText"); update(); });
  $("gcBlack").addEventListener("click", function () { $("gcText").value = "#000000"; syncHex("gcText", "gcTextText"); update(); });
  $("gcSwap").addEventListener("click", function () {
    var s = $("gcStart").value;
    $("gcStart").value = $("gcEnd").value;
    $("gcEnd").value = s;
    syncHex("gcStart", "gcStartText"); syncHex("gcEnd", "gcEndText");
    update();
  });

  update();
})();
