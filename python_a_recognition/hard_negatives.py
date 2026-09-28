"""
Hard negative dataset generator for Letter 'A' recognition.
Explicitly synthesizes confusable geometric and character shapes that must NEVER
be falsely recognized as Letter 'A':
- Triangle (closed bottom base)
- Inverted Triangle (apex down)
- Caret / Inverted V (no crossbar)
- Letter V (apex down)
- Letter H (parallel vertical legs)
- Digit 4 (orthogonal vertical/horizontal stem)
- Letter X (crossing diagonals)
- Lambda (slanted leg, no crossbar)
- Chaotic scribbles, zigzags, wavy curves
- Single lines and disconnected strokes
"""

import math
import random
from typing import List, Tuple, Dict, Any
from .dataset_a import interpolate_line, apply_tilt, Stroke, Point

def generate_triangle_3stroke(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates 3-stroke triangle with bottom base (confusable with A, but closed bottom!)."""
    half_w = w / 2.0
    half_h = h / 2.0
    p_bl = (cx - half_w, cy + half_h)
    p_apex = (cx, cy - half_h)
    p_br = (cx + half_w, cy + half_h)
    
    leg1 = interpolate_line(p_bl, p_apex, steps=14, jitter=jitter)
    leg2 = interpolate_line(p_apex, p_br, steps=14, jitter=jitter)
    # Bottom base connects the bottom tips directly (NO mid crossbar)
    base = interpolate_line(p_bl, p_br, steps=14, jitter=jitter)
    return [leg1, leg2, base]

def generate_triangle_1stroke(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates continuous closed 1-stroke triangle."""
    half_w = w / 2.0
    half_h = h / 2.0
    p_bl = (cx - half_w, cy + half_h)
    p_apex = (cx, cy - half_h)
    p_br = (cx + half_w, cy + half_h)
    
    s1 = interpolate_line(p_bl, p_apex, steps=12, jitter=jitter)
    s2 = interpolate_line(p_apex, p_br, steps=12, jitter=jitter)
    s3 = interpolate_line(p_br, p_bl, steps=12, jitter=jitter)
    return [s1 + s2[1:] + s3[1:]]

def generate_caret_inverted_v(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates Inverted V / Caret (two legs converging at apex, but NO crossbar!)."""
    half_w = w / 2.0
    half_h = h / 2.0
    p_bl = (cx - half_w, cy + half_h)
    p_apex = (cx, cy - half_h)
    p_br = (cx + half_w, cy + half_h)
    
    if random.random() < 0.5:
        # 2-stroke
        return [
            interpolate_line(p_bl, p_apex, steps=14, jitter=jitter),
            interpolate_line(p_apex, p_br, steps=14, jitter=jitter)
        ]
    else:
        # 1-stroke continuous caret
        s1 = interpolate_line(p_bl, p_apex, steps=14, jitter=jitter)
        s2 = interpolate_line(p_apex, p_br, steps=14, jitter=jitter)
        return [s1 + s2[1:]]

def generate_letter_v(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates Letter V (apex at the bottom, opening at the top)."""
    half_w = w / 2.0
    half_h = h / 2.0
    p_tl = (cx - half_w, cy - half_h)
    p_bottom = (cx, cy + half_h)
    p_tr = (cx + half_w, cy - half_h)
    
    s1 = interpolate_line(p_tl, p_bottom, steps=14, jitter=jitter)
    s2 = interpolate_line(p_bottom, p_tr, steps=14, jitter=jitter)
    return [s1 + s2[1:]] if random.random() < 0.5 else [s1, s2]

def generate_letter_h(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates Letter H (parallel vertical legs + horizontal crossbar)."""
    half_w = w / 2.0
    half_h = h / 2.0
    left_x = cx - half_w
    right_x = cx + half_w
    
    leg1 = interpolate_line((left_x, cy - half_h), (left_x, cy + half_h), steps=14, jitter=jitter)
    leg2 = interpolate_line((right_x, cy - half_h), (right_x, cy + half_h), steps=14, jitter=jitter)
    bar = interpolate_line((left_x, cy), (right_x, cy), steps=10, jitter=jitter)
    return [leg1, leg2, bar]

def generate_digit_4(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates Digit 4 (down-right diagonal/vertical, horizontal bar, vertical stem)."""
    half_w = w / 2.0
    half_h = h / 2.0
    
    p_top_l = (cx - half_w * 0.6, cy - half_h)
    p_mid_l = (cx - half_w * 0.8, cy + half_h * 0.2)
    p_mid_r = (cx + half_w, cy + half_h * 0.2)
    
    # 2-stroke 4
    s1 = interpolate_line(p_top_l, p_mid_l, steps=12, jitter=jitter)
    s2 = interpolate_line(p_mid_l, p_mid_r, steps=12, jitter=jitter)
    continuous_hook = s1 + s2[1:]
    
    stem_x = cx + half_w * 0.3
    stem = interpolate_line((stem_x, cy - half_h * 0.8), (stem_x, cy + half_h), steps=14, jitter=jitter)
    return [continuous_hook, stem]

def generate_letter_x(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates Letter X (two diagonal crossing strokes)."""
    half_w = w / 2.0
    half_h = h / 2.0
    diag1 = interpolate_line((cx - half_w, cy - half_h), (cx + half_w, cy + half_h), steps=14, jitter=jitter)
    diag2 = interpolate_line((cx + half_w, cy - half_h), (cx - half_w, cy + half_h), steps=14, jitter=jitter)
    return [diag1, diag2]

def generate_lambda(cx: float, cy: float, w: float, h: float, jitter: float = 0.5) -> List[Stroke]:
    """Generates Lambda symbol (long diagonal stroke + leaning branch, no crossbar)."""
    half_w = w / 2.0
    half_h = h / 2.0
    main_diag = interpolate_line((cx + half_w, cy - half_h), (cx - half_w, cy + half_h), steps=16, jitter=jitter)
    branch_start = (cx + half_w * 0.1, cy - half_h * 0.1)
    branch_end = (cx + half_w, cy + half_h)
    branch = interpolate_line(branch_start, branch_end, steps=12, jitter=jitter)
    return [main_diag, branch]

def generate_scribble(cx: float, cy: float, w: float, h: float) -> List[Stroke]:
    """Generates chaotic zigzag or random scribble."""
    pts: Stroke = []
    num_pts = random.randint(15, 30)
    for i in range(num_pts):
        px = cx - w / 2.0 + random.uniform(0, w)
        py = cy - h / 2.0 + random.uniform(0, h)
        pts.append((px, py))
    return [pts]

def generate_single_line(cx: float, cy: float, length: float = 100.0) -> List[Stroke]:
    """Generates a single straight or diagonal line."""
    angle = random.uniform(0, math.pi * 2)
    dx = math.cos(angle) * (length / 2.0)
    dy = math.sin(angle) * (length / 2.0)
    return [interpolate_line((cx - dx, cy - dy), (cx + dx, cy + dy), steps=12)]

def create_hard_negatives_dataset(num_samples: int = 500, seed: int = 123) -> List[Dict[str, Any]]:
    """
    Creates a comprehensive dataset of hard negatives and confusable shapes.
    Every sample here MUST be rejected (prediction: None / accepted: False).
    """
    random.seed(seed)
    generators = [
        ("triangle_3stroke", generate_triangle_3stroke),
        ("triangle_1stroke", generate_triangle_1stroke),
        ("caret_no_bar", generate_caret_inverted_v),
        ("letter_v", generate_letter_v),
        ("letter_h", generate_letter_h),
        ("digit_4", generate_digit_4),
        ("letter_x", generate_letter_x),
        ("lambda", generate_lambda),
        ("scribble", lambda cx, cy, w, h, j: generate_scribble(cx, cy, w, h)),
        ("single_line", lambda cx, cy, w, h, j: generate_single_line(cx, cy, max(w, h))),
    ]
    
    samples: List[Dict[str, Any]] = []
    for i in range(num_samples):
        gen_type, gen_fn = generators[i % len(generators)]
        cx = random.uniform(100.0, 300.0)
        cy = random.uniform(100.0, 300.0)
        h = random.uniform(60.0, 180.0)
        w = h * random.uniform(0.5, 1.1)
        jitter = random.uniform(0.2, 1.2)
        
        strokes = gen_fn(cx, cy, w, h, jitter)
        samples.append({
            "id": f"hard_negative_{i:04d}",
            "label": "NOT_A",
            "negative_type": gen_type,
            "is_a": False,
            "strokes": strokes,
            "metadata": {
                "type": gen_type,
                "width": w,
                "height": h
            }
        })
        
    return samples
