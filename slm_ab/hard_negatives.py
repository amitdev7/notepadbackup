"""
Zenithsui A/B SLM — Hard Negatives Dataset Generator
Generates precise synthetic vector strokes for confusable characters, shapes, and noise:
Triangle, V, Lambda, H, X, 4, P, R, D, 8, scribbles, zigzags, and stray noise.
"""

import math
import random
from typing import List, Tuple

Point = Tuple[float, float]
Stroke = List[Point]
Strokes = List[Stroke]

def make_line(x1: float, y1: float, x2: float, y2: float, steps: int = 8) -> Stroke:
    return [(x1 + (x2 - x1) * (i / steps), y1 + (y2 - y1) * (i / steps)) for i in range(steps + 1)]

def make_arc(cx: float, cy: float, rx: float, ry: float, start_th: float, end_th: float, steps: int = 12) -> Stroke:
    return [
        (cx + rx * math.cos(start_th + (end_th - start_th) * (i / steps)),
         cy + ry * math.sin(start_th + (end_th - start_th) * (i / steps)))
        for i in range(steps + 1)
    ]

def get_hard_negatives(seed: int = 42) -> List[Tuple[str, Strokes]]:
    """Returns a list of (negative_type, strokes) covering all required hard negatives."""
    rng = random.Random(seed)
    negatives: List[Tuple[str, Strokes]] = []

    # 1. TRIANGLE (closed bottom base)
    # Style 1: 3-stroke closed triangle
    negatives.append(("triangle", [
        make_line(25, 5, 5, 55),
        make_line(5, 55, 45, 55),
        make_line(45, 55, 25, 5),
    ]))
    # Style 2: 1-stroke continuous closed triangle
    negatives.append(("triangle", [
        make_line(25, 5, 5, 55) + make_line(5, 55, 45, 55) + make_line(45, 55, 25, 5)
    ]))

    # 2. V (converging at bottom, open top, NO crossbar)
    # Style 1: 2-stroke V
    negatives.append(("V", [
        make_line(5, 5, 25, 55),
        make_line(25, 55, 45, 5),
    ]))
    # Style 2: 1-stroke continuous V
    negatives.append(("V", [
        make_line(5, 5, 25, 55) + make_line(25, 55, 45, 5),
    ]))

    # 3. LAMBDA (no crossbar, diagonal with leaning leg)
    negatives.append(("lambda", [
        make_line(15, 5, 45, 55),
        make_line(30, 30, 5, 55),
    ]))

    # 4. H (two parallel vertical stems, horizontal crossbar)
    negatives.append(("H", [
        make_line(8, 5, 8, 55),
        make_line(42, 5, 42, 55),
        make_line(8, 30, 42, 30),
    ]))

    # 5. X (two crossing diagonals)
    negatives.append(("X", [
        make_line(5, 5, 45, 55),
        make_line(45, 5, 5, 55),
    ]))

    # 6. DIGIT 4
    negatives.append(("4", [
        make_line(35, 5, 10, 38) + make_line(10, 38, 45, 38),
        make_line(35, 15, 35, 55),
    ]))

    # 7. LETTER P (top loop only, open bottom stem - NO lower loop)
    negatives.append(("P", [
        make_line(8, 5, 8, 55),
        make_line(8, 5, 25, 5) + make_arc(25, 18, 16, 13, -math.pi / 2, math.pi / 2) + make_line(25, 31, 8, 31),
    ]))

    # 8. LETTER R (top loop + open diagonal right leg - NO lower closed loop)
    negatives.append(("R", [
        make_line(8, 5, 8, 55),
        make_line(8, 5, 25, 5) + make_arc(25, 18, 16, 13, -math.pi / 2, math.pi / 2) + make_line(25, 31, 8, 31),
        make_line(25, 31, 44, 55),
    ]))

    # 9. LETTER D (single giant loop, NO middle waist indentation)
    negatives.append(("D", [
        make_line(8, 5, 8, 55),
        make_line(8, 5, 20, 5) + make_arc(20, 30, 22, 25, -math.pi / 2, math.pi / 2) + make_line(20, 55, 8, 55),
    ]))

    # 10. DIGIT 8 (figure-eight loops, NO straight vertical left stem)
    negatives.append(("8", [
        make_arc(25, 18, 16, 13, 0, math.pi * 2) +
        make_arc(25, 42, 19, 14, 0, math.pi * 2)
    ]))

    # 11. ZIGZAGS & SCRIBBLES
    zigzag = []
    curr_x, curr_y = 5.0, 30.0
    for i in range(10):
        curr_x += 4.0
        curr_y = 10.0 if i % 2 == 0 else 50.0
        zigzag.append((curr_x, curr_y))
    negatives.append(("zigzag", [zigzag]))

    # 12. CIRCLE
    negatives.append(("circle", [make_arc(25, 30, 20, 25, 0, math.pi * 2, steps=18)]))

    # 13. STRAY NOISE / SCRIBBLING
    scribble = []
    cx, cy = 25.0, 30.0
    for i in range(20):
        th = i * 0.8
        r = 15.0 + rng.uniform(-4, 4)
        scribble.append((cx + r * math.cos(th), cy + r * math.sin(th)))
    negatives.append(("scribble", [scribble]))

    # 14. HORIZONTAL LINE
    negatives.append(("line", [make_line(5, 30, 45, 30)]))

    # 15. VERTICAL LINE
    negatives.append(("line_v", [make_line(25, 5, 25, 55)]))

    return negatives
