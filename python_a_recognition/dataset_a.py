"""
Dataset generation module for uppercase handwritten Letter 'A'.
Generates canonical and natural handwritten stroke variations of 'A'
spanning different stroke counts (1, 2, 3), stroke directions, aspect ratios,
and writing styles.
"""

import math
import random
from typing import List, Tuple, Dict, Any

Point = Tuple[float, float]
Stroke = List[Point]

def interpolate_line(p1: Point, p2: Point, steps: int = 15, jitter: float = 0.0) -> Stroke:
    """Interpolates points between p1 and p2 with optional natural jitter."""
    pts: Stroke = []
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    for i in range(steps + 1):
        t = i / float(steps)
        # Add slight natural curvature/jitter
        jx = random.gauss(0, jitter) if jitter > 0 else 0.0
        jy = random.gauss(0, jitter) if jitter > 0 else 0.0
        pts.append((p1[0] + dx * t + jx, p1[1] + dy * t + jy))
    return pts

def generate_letter_a_classic_3stroke(
    cx: float = 150.0, cy: float = 150.0,
    w: float = 80.0, h: float = 120.0,
    tilt: float = 0.0,
    apex_gap: float = 0.0,
    bar_y_ratio: float = 0.55,
    jitter: float = 0.5
) -> List[Stroke]:
    """Generates standard 3-stroke A: up-left, down-right, horizontal crossbar."""
    half_w = w / 2.0
    half_h = h / 2.0
    
    # Base points before rotation
    p_bl = (cx - half_w, cy + half_h)
    p_br = (cx + half_w, cy + half_h)
    p_apex_l = (cx - apex_gap / 2.0, cy - half_h)
    p_apex_r = (cx + apex_gap / 2.0, cy - half_h)
    
    # Left leg
    leg1 = interpolate_line(p_bl, p_apex_l, steps=16, jitter=jitter)
    # Right leg
    leg2 = interpolate_line(p_apex_r, p_br, steps=16, jitter=jitter)
    
    # Crossbar
    bar_y = cy - half_h + h * bar_y_ratio
    t_bar = bar_y_ratio
    bar_x_left = p_bl[0] + (p_apex_l[0] - p_bl[0]) * (1.0 - t_bar) - random.uniform(0, 4.0)
    bar_x_right = p_br[0] + (p_apex_r[0] - p_br[0]) * (1.0 - t_bar) + random.uniform(0, 4.0)
    crossbar = interpolate_line((bar_x_left, bar_y), (bar_x_right, bar_y), steps=10, jitter=jitter)
    
    strokes = [leg1, leg2, crossbar]
    if abs(tilt) > 1e-4:
        strokes = apply_tilt(strokes, cx, cy, tilt)
    return strokes

def generate_letter_a_2stroke(
    cx: float = 150.0, cy: float = 150.0,
    w: float = 80.0, h: float = 120.0,
    style: str = "inverted_v_plus_bar",
    jitter: float = 0.5
) -> List[Stroke]:
    """Generates 2-stroke A variations."""
    half_w = w / 2.0
    half_h = h / 2.0
    p_bl = (cx - half_w, cy + half_h)
    p_apex = (cx, cy - half_h)
    p_br = (cx + half_w, cy + half_h)
    
    if style == "inverted_v_plus_bar":
        # Continuous inverted V + separate crossbar
        leg1 = interpolate_line(p_bl, p_apex, steps=14, jitter=jitter)
        leg2 = interpolate_line(p_apex, p_br, steps=14, jitter=jitter)
        inverted_v = leg1 + leg2[1:]
        
        bar_y = cy + h * 0.05
        bar_x1 = cx - half_w * 0.55
        bar_x2 = cx + half_w * 0.55
        bar = interpolate_line((bar_x1, bar_y), (bar_x2, bar_y), steps=10, jitter=jitter)
        return [inverted_v, bar]
    else:
        # Left leg + continuous right leg & crossbar
        leg1 = interpolate_line(p_bl, p_apex, steps=14, jitter=jitter)
        leg2 = interpolate_line(p_apex, p_br, steps=14, jitter=jitter)
        bar_start = (cx + half_w * 0.52, cy + h * 0.05)
        bar_dest = (cx - half_w * 0.52, cy + h * 0.05)
        retrace = interpolate_line(p_br, bar_start, steps=8, jitter=jitter)
        bar = interpolate_line(bar_start, bar_dest, steps=10, jitter=jitter)
        stroke2 = leg2 + retrace[1:] + bar[1:]
        return [leg1, stroke2]

def generate_letter_a_1stroke(
    cx: float = 150.0, cy: float = 150.0,
    w: float = 80.0, h: float = 120.0,
    jitter: float = 0.5
) -> List[Stroke]:
    """Generates 1-stroke continuous handwritten A (up left, down right, retrace up to crossbar, cross left)."""
    half_w = w / 2.0
    half_h = h / 2.0
    p_bl = (cx - half_w, cy + half_h)
    p_apex = (cx, cy - half_h)
    p_br = (cx + half_w, cy + half_h)
    bar_start = (cx + half_w * 0.52, cy + h * 0.05)
    bar_dest = (cx - half_w * 0.52, cy + h * 0.05)
    
    leg1 = interpolate_line(p_bl, p_apex, steps=14, jitter=jitter)
    leg2 = interpolate_line(p_apex, p_br, steps=14, jitter=jitter)
    retrace = interpolate_line(p_br, bar_start, steps=8, jitter=jitter)
    bar = interpolate_line(bar_start, bar_dest, steps=10, jitter=jitter)
    
    continuous = leg1 + leg2[1:] + retrace[1:] + bar[1:]
    return [continuous]

def apply_tilt(strokes: List[Stroke], cx: float, cy: float, angle_rad: float) -> List[Stroke]:
    """Rotates/shears strokes around center (cx, cy)."""
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    tilted: List[Stroke] = []
    for stroke in strokes:
        t_stroke: Stroke = []
        for x, y in stroke:
            dx = x - cx
            dy = y - cy
            nx = cx + dx * cos_a - dy * sin_a
            ny = cy + dx * sin_a + dy * cos_a
            t_stroke.append((nx, ny))
        tilted.append(t_stroke)
    return tilted

def create_letter_a_dataset(num_samples: int = 500, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Creates a comprehensive, balanced dataset of valid uppercase Letter 'A' variations.
    Includes clean, rough, narrow, wide, tilted, 1-stroke, 2-stroke, 3-stroke samples.
    """
    random.seed(seed)
    samples: List[Dict[str, Any]] = []
    
    for i in range(num_samples):
        # Choose archetype
        archetype_choice = random.random()
        cx = random.uniform(100.0, 300.0)
        cy = random.uniform(100.0, 300.0)
        h = random.uniform(60.0, 180.0)
        
        # Vary aspect ratio (narrow: 0.45, normal: 0.65, wide: 0.95)
        ar = random.uniform(0.42, 1.05)
        w = h * ar
        
        # Tilt / slant
        tilt = random.uniform(-0.25, 0.25) if random.random() < 0.4 else 0.0
        jitter = random.uniform(0.2, 1.2)
        bar_y_ratio = random.uniform(0.45, 0.68)
        apex_gap = random.uniform(0.0, w * 0.12) if random.random() < 0.3 else 0.0
        
        if archetype_choice < 0.50:
            # 3-stroke A (50%)
            strokes = generate_letter_a_classic_3stroke(
                cx=cx, cy=cy, w=w, h=h,
                tilt=tilt, apex_gap=apex_gap,
                bar_y_ratio=bar_y_ratio, jitter=jitter
            )
            stroke_mode = "3-stroke"
        elif archetype_choice < 0.80:
            # 2-stroke A (30%)
            substyle = "inverted_v_plus_bar" if random.random() < 0.6 else "leg_plus_continuous_bar"
            strokes = generate_letter_a_2stroke(cx=cx, cy=cy, w=w, h=h, style=substyle, jitter=jitter)
            if abs(tilt) > 1e-4:
                strokes = apply_tilt(strokes, cx, cy, tilt)
            stroke_mode = f"2-stroke ({substyle})"
        else:
            # 1-stroke continuous A (20%)
            strokes = generate_letter_a_1stroke(cx=cx, cy=cy, w=w, h=h, jitter=jitter)
            if abs(tilt) > 1e-4:
                strokes = apply_tilt(strokes, cx, cy, tilt)
            stroke_mode = "1-stroke continuous"
            
        samples.append({
            "id": f"positive_a_{i:04d}",
            "label": "A",
            "is_a": True,
            "strokes": strokes,
            "metadata": {
                "stroke_mode": stroke_mode,
                "aspect_ratio": ar,
                "width": w,
                "height": h,
                "tilt": tilt,
                "jitter": jitter
            }
        })
        
    return samples
