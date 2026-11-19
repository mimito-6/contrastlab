/* Link Text Contrast Checker — WCAG 1.4.1 (Use of Color) + 1.4.3 (Contrast).
   A link inside a paragraph must pass TWO independent tests:
   (1) link vs background >= 4.5:1 (AA, normal text) — WCAG 1.4.3;
   (2) link vs surrounding body text >= 3:1, OR the link carries a
       non-color cue (underline, bold, icon) — WCAG 1.4.1, technique G183.
   The two rules pull in opposite directions: a light link passes (2)
   but fails (1); a dark link passes (1) but often fails (2). That tension
   is the honest point of this tool — it is why browsers underline links
   by default. Pure functions are exported for node verification
   (verify_linktext.js); the DOM code only runs in browser. */
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

  // Text contrast verdict (WCAG 1.4.3): AAA >= 7, AA >= 4.5,
  // large-text-only >= 3, else fail. Boundaries are inclusive.
  function textVerdict(ratio) {
    if (ratio === null || ratio === undefined || isNaN(ratio)) return null;
    if (ratio >= 7) return { level: "AAA", pass: true };
    if (ratio >= 4.5) return { level: "AA", pass: true };
    if (ratio >= 3) return { level: "AA large text only", pass: false };
    return { level: "Fail", pass: false };
  }

  // Link-vs-body verdict (WCAG 1.4.1 / G183): 3:1, inclusive boundary.
  function linkBodyVerdict(ratio) {
    if (ratio === null || ratio === undefined || isNaN(ratio)) return null;
    return { pass: ratio >= 3, label: ratio >= 3 ? "Pass" : "Fail" };
  }

  // Overall verdict. A link passes when its color is readable against the
  // background (AA) AND it is distinguishable from the surrounding text —
  // either by a 3:1 color difference or by a non-color cue (underline).
  // Returns { pass, reason } where reason names the failing check(s).
  function linkOverall(linkBgRatio, linkBodyRatio, underlined) {
    if (linkBgRatio === null || linkBodyRatio === null) return null;
    var bgOk = linkBgRatio >= 4.5;
    var distinctOk = underlined ? true : linkBodyRatio >= 3;
    var fails = [];
    if (!bgOk) fails.push("link vs background is below 4.5:1 (AA)");
    if (!distinctOk) fails.push("link vs body text is below 3:1 and the link has no underline");
    return {
      pass: bgOk && distinctOk,
      bgOk: bgOk,
      distinctOk: distinctOk,
      fails: fails
    };
  }

  var api = {
    hexToRgb: hexToRgb,
    toHex: toHex,
    relLum: relLum,
    contrastRatio: contrastRatio,
    textVerdict: textVerdict,
    linkBodyVerdict: linkBodyVerdict,
    linkOverall: linkOverall
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LinkTextCalc = api;

  if (typeof document === "undefined") return;

  function $(id) { return document.getElementById(id); }

  function fmt(r) { return r === null ? "–" : r.toFixed(2) + ":1"; }

  function setVerdict(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.className = ok === null ? "" : (ok ? "lt-pass" : "lt-fail");
  }

  function render() {
    var link = $("ltLinkHex").value,
        body = $("ltBodyHex").value,
        bg = $("ltBgHex").value;
    var underlined = $("ltUnderline") ? $("ltUnderline").checked : false;
    var rLinkBg = contrastRatio(link, bg);
    var rBodyBg = contrastRatio(body, bg);
    var rLinkBody = contrastRatio(link, body);
    var vLinkBg = textVerdict(rLinkBg);
    var vBodyBg = textVerdict(rBodyBg);
    var vLinkBody = linkBodyVerdict(rLinkBody);
    var overall = linkOverall(rLinkBg, rLinkBody, underlined);

    $("ltRatioLinkBg").textContent = fmt(rLinkBg);
    $("ltRatioBodyBg").textContent = fmt(rBodyBg);
    $("ltRatioLinkBody").textContent = fmt(rLinkBody);
    setVerdict($("ltVerdictLinkBg"),
      vLinkBg ? (vLinkBg.pass ? "Pass — " + vLinkBg.level : vLinkBg.level) : "–",
      vLinkBg ? vLinkBg.pass : null);
    setVerdict($("ltVerdictBodyBg"),
      vBodyBg ? (vBodyBg.pass ? "Pass — " + vBodyBg.level : vBodyBg.level) : "–",
      vBodyBg ? vBodyBg.pass : null);
    setVerdict($("ltVerdictLinkBody"),
      vLinkBody ? (vLinkBody.label + " — 3:1") : "–",
      vLinkBody ? vLinkBody.pass : null);

    var ov = $("ltOverall");
    if (ov) {
      if (!overall) { ov.textContent = "–"; ov.className = ""; }
      else if (overall.pass) {
        ov.textContent = "Pass — this link is readable and distinguishable";
        ov.className = "lt-pass";
      } else {
        ov.textContent = "Fail — " + overall.fails.join("; ");
        ov.className = "lt-fail";
      }
    }

    var pv = $("ltPreview");
    if (pv) pv.style.background = bg;
    var ptext = $("ltPreviewText");
    if (ptext) ptext.style.color = body;
    var plink = $("ltPreviewLink");
    if (plink) {
      plink.style.color = link;
      plink.style.textDecoration = underlined ? "underline" : "none";
    }

    var note = $("ltNote");
    if (note) {
      if (rLinkBg === null || rBodyBg === null || rLinkBody === null) {
        note.textContent = "Enter three valid hex colors.";
      } else if (overall.pass && !underlined && rLinkBody < 4.5) {
        note.textContent = "Passes — but only just on the 3:1 line. An underline still costs nothing and removes all doubt.";
      } else if (overall.pass) {
        note.textContent = "Passes both WCAG checks. The link is readable against the background and stands out from the body text.";
      } else if (!overall.bgOk && overall.distinctOk) {
        note.textContent = "The link stands out from the body text, but it is too faint against the background — darken it (or lighten the background) until link vs background reaches 4.5:1.";
      } else if (overall.bgOk && !overall.distinctOk) {
        note.textContent = "The link is readable, but a color-blind reader cannot tell it apart from the body text. Underline it — or darken the body text until link vs body reaches 3:1.";
      } else {
        note.textContent = "Fails both checks. Fix the background contrast first, then the link-vs-body distinction (underline is the cheapest fix).";
      }
    }
  }

  function sync(which) {
    var map = { l: ["ltLink", "ltLinkHex"], b: ["ltBody", "ltBodyHex"], g: ["ltBg", "ltBgHex"] };
    var p = $(map[which][0]), x = $(map[which][1]);
    if (p && x) x.value = p.value;
  }

  function apply(which) {
    var map = { l: ["ltLink", "ltLinkHex"], b: ["ltBody", "ltBodyHex"], g: ["ltBg", "ltBgHex"] };
    var p = $(map[which][0]), x = $(map[which][1]);
    var rgb = hexToRgb(x.value);
    if (rgb && p) p.value = toHex(rgb);
  }

  ["l", "b", "g"].forEach(function (w) {
    var map = { l: ["ltLink", "ltLinkHex"], b: ["ltBody", "ltBodyHex"], g: ["ltBg", "ltBgHex"] };
    var p = $(map[w][0]), x = $(map[w][1]);
    if (p) p.addEventListener("input", function () { sync(w); render(); });
    if (x) x.addEventListener("input", function () { apply(w); render(); });
  });

  var swap = $("ltSwap");
  if (swap) swap.addEventListener("click", function () {
    var lp = $("ltLink"), lx = $("ltLinkHex"), bp = $("ltBody"), bx = $("ltBodyHex");
    var tmpP = lp.value, tmpX = lx.value;
    lp.value = bp.value; lx.value = bx.value;
    bp.value = tmpP; bx.value = tmpX;
    render();
  });

  var underline = $("ltUnderline");
  if (underline) underline.addEventListener("change", render);

  Array.prototype.forEach.call(document.querySelectorAll(".lt-preset"), function (btn) {
    btn.addEventListener("click", function () {
      var l = btn.getAttribute("data-l"), b = btn.getAttribute("data-b"), g = btn.getAttribute("data-g");
      if (l && b && g) {
        $("ltLink").value = l; $("ltLinkHex").value = l;
        $("ltBody").value = b; $("ltBodyHex").value = b;
        $("ltBg").value = g; $("ltBgHex").value = g;
        render();
      }
    });
  });

  render();
})(typeof self !== "undefined" ? self : this);
