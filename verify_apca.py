#!/usr/bin/env python3
"""Independent Python mirror of the APCA 0.98G implementation in
apca-calculator/apca.js. Run standalone: python3 verify_apca.py
Asserts the same reference values verify_apca.js checks in node, so the
two implementations must agree before a page ships.
Reference anchors: black on white Lc ~106.0, white on black Lc ~-107.9
(published APCA values), same color = 0."""
import math

NORM_BG, NORM_TXT, REV_TXT, REV_BG = 0.56, 0.57, 0.62, 0.65
BLK_THRS, BLK_CLMP = 0.022, 1.414
SCALE_BOW = SCALE_WOB = 1.14
LO_CLIP, LO_BOW_OFFSET, DELTA_Y_MIN = 0.1, 0.027, 0.0005


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def srgb_to_y(rgb):
    return 0.2126729 * lin(rgb[0]) + 0.7151522 * lin(rgb[1]) + 0.0721750 * lin(rgb[2])


def apca(txt_rgb, bg_rgb):
    y_txt, y_bg = srgb_to_y(txt_rgb), srgb_to_y(bg_rgb)
    if y_bg <= BLK_THRS:
        y_bg += (BLK_THRS - y_bg) ** BLK_CLMP
    if y_txt <= BLK_THRS:
        y_txt += (BLK_THRS - y_txt) ** BLK_CLMP
    if abs(y_bg - y_txt) < DELTA_Y_MIN:
        sapc = 0.0
    elif y_bg > y_txt:
        sapc = (y_bg ** NORM_BG - y_txt ** NORM_TXT) * SCALE_BOW
        sapc = 0.0 if sapc < LO_CLIP else sapc - LO_BOW_OFFSET
    else:
        sapc = (y_bg ** REV_BG - y_txt ** REV_TXT) * SCALE_WOB
        sapc = 0.0 if sapc > -LO_CLIP else sapc + LO_BOW_OFFSET
    return sapc * 100


def hx(s):
    s = s.lstrip("#")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


CASES = [
    ("#000000", "#FFFFFF", 106.04),
    ("#FFFFFF", "#000000", -107.88),
    ("#767676", "#FFFFFF", 68.25),
    ("#595959", "#FFFFFF", 80.63),
    ("#FFFFFF", "#0055CC", -84.38),
    ("#FFFFFF", "#1A7F37", -77.12),
    ("#9CA3AF", "#121212", -52.87),
    ("#6B7280", "#121212", -29.60),
    ("#E53935", "#FFFFFF", 65.95),
    ("#F59E0B", "#FFFFFF", 40.00),
    ("#60A5FA", "#121212", -52.81),
    ("#FFFFFF", "#2563EB", -77.63),
    ("#333333", "#FFFFFF", 94.96),
    ("#AAAAAA", "#FFFFFF", 43.49),
]


def main():
    for t, b, expected in CASES:
        got = apca(hx(t), hx(b))
        assert abs(got - expected) <= 0.05, f"{t} on {b}: expected {expected}, got {got:.2f}"
    assert apca(hx("#FFFFFF"), hx("#FFFFFF")) == 0
    assert apca(hx("#808080"), hx("#808080")) == 0
    print(f"verify_apca.py: {len(CASES) + 2} assertions passed")


if __name__ == "__main__":
    main()
