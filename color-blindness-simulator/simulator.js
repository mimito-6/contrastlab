/* ContrastLab Color Blindness Simulator
 * Simulation model: published 3x3 CVD transformation matrices from
 * Machado, Oliveira & Fernandes (2009), "A Physiologically-based Model
 * for Simulation of Color Vision Deficiency", IEEE TVCG 15(6).
 * Standard simplified approximation used by most educational simulators.
 * Outputs are clamped to [0,255]. Achromatopsia uses Rec. 601 luminance.
 */
"use strict";

const MATRICES = {
  protanopia: [
    [0.152286,  1.052583, -0.204868],
    [0.114503,  0.786281,  0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322,  0.860646, -0.227968],
    [0.280085,  0.672501,  0.047413],
    [-0.011820, 0.042940,  0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809,  0.147602],
    [0.004733,  0.691367,  0.303900],
  ],
};

const VISIONS = [
  { key: "normal", name: "Normal vision", tag: "reference", prev: "—",
    desc: "How the color looks with typical trichromatic vision." },
  { key: "protanopia", name: "Protanopia", tag: "red-blind", prev: "~1.0% of men",
    desc: "Missing L (red) cones. Reds look dark; red–green confusion." },
  { key: "deuteranopia", name: "Deuteranopia", tag: "green-blind", prev: "~1.1% of men",
    desc: "Missing M (green) cones. Red–green confusion; greens shift yellowish." },
  { key: "tritanopia", name: "Tritanopia", tag: "blue-blind", prev: "~0.002% of men",
    desc: "Missing S (blue) cones. Blue–yellow confusion; very rare." },
  { key: "achromatopsia", name: "Achromatopsia", tag: "no color", prev: "~1 in 33,000",
    desc: "Total color blindness. Vision built from luminance only." },
];

const PRESETS = [
  ["Red", "#e53935"], ["Orange", "#fb8c00"], ["Yellow", "#fdd835"], ["Green", "#43a047"],
  ["Teal", "#00acc1"], ["Blue", "#1e88e5"], ["Purple", "#8e24aa"], ["Gray", "#9e9e9e"],
];

const $ = (id) => document.getElementById(id);

function hexToRgb(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return ("#" + c(r) + c(g) + c(b)).toUpperCase();
}
// WCAG relative luminance (for choosing readable sample text)
function luminance([r, g, b]) {
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function simulate(rgb, key, severity) {
  const s = severity / 100;
  if (key === "normal" || s === 0) return rgb.slice();
  let out;
  if (key === "achromatopsia") {
    const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
    out = [lum, lum, lum];
  } else {
    const M = MATRICES[key];
    out = [0, 1, 2].map((i) => M[i][0] * rgb[0] + M[i][1] * rgb[1] + M[i][2] * rgb[2]);
  }
  // severity: interpolate between original and full simulation
  return out.map((v, i) => rgb[i] * (1 - s) + v * s);
}

function currentColor() {
  return hexToRgb($("simColor").value) || [229, 57, 53];
}
function currentSeverity() {
  return parseInt($("severity").value, 10);
}

function renderSimCards() {
  const rgb = currentColor(), sev = currentSeverity();
  $("simGrid").innerHTML = VISIONS.map((v) => {
    const sim = simulate(rgb, v.key, sev);
    const hex = rgbToHex(sim);
    const fg = luminance(sim) > 0.35 ? "#111" : "#fff";
    return `<div class="sim-card">
      <div class="sim-swatch" style="background:${hex};color:${fg}">
        <span class="sim-aa">Aa</span>
        <span class="sim-hex">${hex}</span>
      </div>
      <div class="sim-name">${v.name} <span class="sim-tag">${v.tag}</span></div>
      <div class="sim-prev">${v.prev}</div>
      <div class="sim-desc">${v.desc}</div>
    </div>`;
  }).join("");
}

function renderPalette() {
  const sev = currentSeverity();
  const cols = VISIONS.map((v) => `<div class="pt-head" role="columnheader">${v.name}</div>`).join("");
  const rows = PRESETS.map(([name, hex]) => {
    const rgb = hexToRgb(hex);
    const cells = VISIONS.map((v) => {
      const h = rgbToHex(simulate(rgb, v.key, sev));
      return `<div class="pt-cell" role="cell" title="${name} under ${v.name}: ${h}">
        <span class="pt-dot" style="background:${h}"></span><span class="pt-hex">${h}</span></div>`;
    }).join("");
    return `<div class="pt-row" role="row">
      <button class="pt-name" role="cell" data-hex="${hex}" title="Use ${name} (${hex}) as the test color">${name}</button>${cells}</div>`;
  }).join("");
  $("paletteTable").innerHTML =
    `<div class="pt-row pt-header" role="row"><div class="pt-name" role="columnheader">Color</div>${cols}</div>${rows}`;
  document.querySelectorAll(".pt-name[data-hex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("simColor").value = btn.dataset.hex;
      $("simPicker").value = btn.dataset.hex;
      renderAll();
    });
  });
}

let activeVision = "deuteranopia";
function renderTabs() {
  $("visionTabs").innerHTML = VISIONS.map((v) =>
    `<button role="tab" aria-selected="${v.key === activeVision}" class="${v.key === activeVision ? "on" : ""}" data-v="${v.key}">${v.name}</button>`
  ).join("");
  document.querySelectorAll("#visionTabs button").forEach((b) => {
    b.addEventListener("click", () => { activeVision = b.dataset.v; renderTabs(); renderPreview(); });
  });
}

function renderPreview() {
  const sev = currentSeverity();
  const sim = (hex) => rgbToHex(simulate(hexToRgb(hex), activeVision, sev));
  const ui = {
    heading: sim("#1a1a2e"), body: sim("#5b5b72"),
    success: sim("#16a34a"), error: sim("#dc2626"), warning: sim("#d97706"),
    primary: sim("#4f46e5"), cardBg: sim("#ffffff"), cardLine: sim("#e6e6f0"),
  };
  const bars = ["#e53935", "#fb8c00", "#fdd835", "#43a047", "#1e88e5"].map(sim);
  const v = VISIONS.find((x) => x.key === activeVision);
  const onPrimary = luminance(hexToRgb(ui.primary)) > 0.35 ? "#111" : "#fff";
  $("uiPreview").innerHTML = `
    <div class="ui-card" style="background:${ui.cardBg};border-color:${ui.cardLine}">
      <div class="ui-head" style="color:${ui.heading}">Quarterly report</div>
      <p class="ui-body" style="color:${ui.body}">Revenue is up this quarter. Failed jobs need attention.</p>
      <div class="ui-badges">
        <span class="ui-badge" style="background:${ui.success};color:#fff">✓ Success</span>
        <span class="ui-badge" style="background:${ui.error};color:#fff">✕ Failed</span>
        <span class="ui-badge" style="background:${ui.warning};color:#fff">! Warning</span>
      </div>
      <button class="ui-btn" style="background:${ui.primary};color:${onPrimary}">View details</button>
      <div class="ui-bars">${bars.map((c, i) => `<div class="ui-bar" style="background:${c}" title="Series ${"ABCDE"[i]}"></div>`).join("")}</div>
      <div class="ui-bar-labels">${"ABCDE".split("").map((l) => `<span>${l}</span>`).join("")}</div>
    </div>
    <p class="hint">Previewing as: <strong>${v.name}</strong> — ${v.desc}</p>`;
}

function renderAll() { renderSimCards(); renderPalette(); renderPreview(); }

$("simColor").addEventListener("input", () => {
  const rgb = hexToRgb($("simColor").value);
  if (rgb) $("simPicker").value = rgbToHex(rgb).toLowerCase();
  renderAll();
});
$("simPicker").addEventListener("input", () => {
  $("simColor").value = $("simPicker").value.toUpperCase();
  renderAll();
});
$("severity").addEventListener("input", () => {
  $("sevVal").textContent = $("severity").value + "%";
  renderAll();
});

renderTabs();
renderAll();
