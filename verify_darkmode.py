#!/usr/bin/env python3
"""Verify every ratio printed on the dark-mode guide against the WCAG 2.1 formula."""
import re, sys

def lum(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    def f(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

def blend(fg, bg, alpha):
    f = [int(fg[i:i+2], 16) for i in (1, 3, 5)]
    b = [int(bg[i:i+2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(alpha * x + (1 - alpha) * y):02X}' for x, y in zip(f, b))

page = open('dark-mode-contrast-guide/index.html').read()
fails = []
def check(cond, label):
    if not cond:
        fails.append(label)

# every (text, bg) pair printed on the page, expected 2dp value
pairs = [
    ("#9CA3AF", "#FFFFFF", "2.54"), ("#9CA3AF", "#121212", "7.38"),
    ("#6B7280", "#FFFFFF", "4.83"), ("#6B7280", "#121212", "3.88"),
    ("#FFFFFF", "#121212", "18.73"), ("#E5E7EB", "#121212", "15.13"),
    ("#52525B", "#121212", "2.42"),
    ("#FFFFFF", "#1E1E1E", "16.67"), ("#9CA3AF", "#1E1E1E", "6.57"),
    ("#6B7280", "#1E1E1E", "3.45"), ("#D1D5DB", "#1E1E1E", "11.31"),
    ("#9CA3AF", "#0F172A", "7.03"), ("#6B7280", "#0F172A", "3.69"),
    ("#60A5FA", "#121212", "7.37"), ("#60A5FA", "#FFFFFF", "2.54"),
    ("#38BDF8", "#121212", "8.74"), ("#38BDF8", "#FFFFFF", "2.14"),
    ("#A78BFA", "#121212", "6.88"), ("#A78BFA", "#FFFFFF", "2.72"),
    ("#F472B6", "#121212", "7.07"), ("#F472B6", "#FFFFFF", "2.65"),
    ("#FBBF24", "#121212", "11.22"), ("#FBBF24", "#FFFFFF", "1.67"),
    ("#34D399", "#121212", "9.74"), ("#34D399", "#FFFFFF", "1.92"),
]
for t, bg, want in pairs:
    got = f"{ratio(t, bg):.2f}"
    check(got == want, f"ratio {t} on {bg}: computed {got} != printed {want}")
    check(f"{want}:1" in page, f"page missing {want}:1 for {t} on {bg}")

# opacity blends
for alpha, want_hex, want_ratio in [(0.87, "#E0E0E0", "14.19"), (0.60, "#A0A0A0", "7.16"), (0.38, "#6C6C6C", "3.57")]:
    got_hex = blend("#FFFFFF", "#121212", alpha)
    check(got_hex == want_hex, f"blend {alpha}: {got_hex} != {want_hex}")
    check(f"{ratio(got_hex, '#121212'):.2f}" == want_ratio, f"blend ratio {alpha}")
    check(want_hex.lower() in page.lower() and f"{want_ratio}:1" in page, f"page missing blend {want_hex} {want_ratio}")
got = blend("#FFFFFF", "#1E1E1E", 0.60)
check(got == "#A5A5A5" and f"{ratio(got, '#1E1E1E'):.2f}" == "6.77", "card 60% blend")
check(len(re.findall(r"<h1", page)) == 1, "h1 count != 1")
check("https://contrast.mimito6.uk/dark-mode-contrast-guide" in page, "canonical missing")

if fails:
    print("FAIL"); [print(" -", f) for f in fails]; sys.exit(1)
print(f"PASS: {len(pairs)} ratios + 4 blends + h1/canonical verified")
