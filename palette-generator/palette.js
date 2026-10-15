/* ContrastLab Accessible Palette Generator.
   All math runs locally: hex<->rgb, rgb<->hsl, sRGB mixing,
   WCAG relative luminance + contrast ratio. */

(function () {
  'use strict';

  var picker = document.getElementById('pgPicker');
  var hexInput = document.getElementById('pgColor');
  var tintsEl = document.getElementById('pgTintsShades');
  var harmonyEl = document.getElementById('pgHarmonies');

  function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }

  function hexToRgb(hex) {
    hex = (hex || '').trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex.split('').map(function (c) { return c + c; }).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    ];
  }

  function rgbToHex(r, g, b) {
    function c(v) { var h = clamp255(v).toString(16); return h.length === 1 ? '0' + h : h; }
    return '#' + c(r) + c(g) + c(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    var r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [clamp255(r * 255), clamp255(g * 255), clamp255(b * 255)];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function mix(rgb, target, amt) { /* amt 0..1 toward target */
    return rgb.map(function (c, i) { return clamp255(c + (target[i] - c) * amt); });
  }

  function luminance(rgb) {
    function lin(c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }

  function ratio(a, b) {
    var l1 = luminance(a), l2 = luminance(b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }

  var WHITE = [255, 255, 255], BLACK = [0, 0, 0];

  function badge(r) {
    if (r >= 7) return '<span class="pg-badge pg-aaa">AAA</span>';
    if (r >= 4.5) return '<span class="pg-badge pg-aa">AA</span>';
    if (r >= 3) return '<span class="pg-badge pg-la">3:1 large</span>';
    return '<span class="pg-badge pg-no">fail</span>';
  }

  function swatchCard(name, rgb) {
    var hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    var rw = ratio(rgb, WHITE), rb = ratio(rgb, BLACK);
    return '<div class="pg-swatch">' +
      '<div class="pg-color" style="background:' + hex + '"></div>' +
      '<div class="pg-info">' +
      '<div class="pg-name">' + name + '</div>' +
      '<div class="pg-hex" data-hex="' + hex + '" title="Click to copy">' + hex + '</div>' +
      '<div class="pg-ratio">vs white <strong>' + rw.toFixed(2) + ':1</strong> ' + badge(rw) + '</div>' +
      '<div class="pg-ratio">vs black <strong>' + rb.toFixed(2) + ':1</strong> ' + badge(rb) + '</div>' +
      '</div></div>';
  }

  function buildPalette(rgb) {
    var steps = [75, 50, 25, 10];
    var cards = steps.map(function (s) {
      return swatchCard('Tint ' + s + '%', mix(rgb, WHITE, s / 100));
    });
    cards.push(swatchCard('Base', rgb));
    steps.reverse().forEach(function (s) {
      cards.push(swatchCard('Shade ' + s + '%', mix(rgb, BLACK, s / 100)));
    });
    return cards.join('');
  }

  function buildHarmonies(rgb) {
    var hsl = rgbToHsl(rgb[0], rgb[1], rgb[2]);
    var cards = [];
    cards.push(swatchCard('Analogous −30°', hslToRgb(hsl[0] - 30, hsl[1], hsl[2])));
    cards.push(swatchCard('Base', rgb));
    cards.push(swatchCard('Analogous +30°', hslToRgb(hsl[0] + 30, hsl[1], hsl[2])));
    cards.push(swatchCard('Complementary', hslToRgb(hsl[0] + 180, hsl[1], hsl[2])));
    return cards.join('');
  }

  function render() {
    var rgb = hexToRgb(hexInput.value);
    if (!rgb) return;
    tintsEl.innerHTML = buildPalette(rgb);
    harmonyEl.innerHTML = buildHarmonies(rgb);
    attachCopy(tintsEl);
    attachCopy(harmonyEl);
  }

  function attachCopy(root) {
    var els = root.querySelectorAll('.pg-hex');
    for (var i = 0; i < els.length; i++) {
      els[i].onclick = function () {
        var hex = this.getAttribute('data-hex');
        var self = this;
        function done() {
          var orig = self.textContent;
          self.textContent = 'copied!';
          setTimeout(function () { self.textContent = orig; }, 900);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(hex).then(done, done);
        } else { done(); }
      };
    }
  }

  function syncFromPicker() {
    hexInput.value = picker.value;
    render();
  }

  function syncFromText() {
    var rgb = hexToRgb(hexInput.value);
    if (rgb) {
      picker.value = rgbToHex(rgb[0], rgb[1], rgb[2]);
      render();
    } else {
      hexInput.classList.add('invalid');
      setTimeout(function () { hexInput.classList.remove('invalid'); }, 600);
    }
  }

  picker.addEventListener('input', syncFromPicker);
  hexInput.addEventListener('change', syncFromText);
  hexInput.addEventListener('input', function () {
    var rgb = hexToRgb(hexInput.value);
    if (rgb) { picker.value = rgbToHex(rgb[0], rgb[1], rgb[2]); render(); }
  });

  render();
})();
