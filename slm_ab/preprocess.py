"""
Zenithsui A/B SLM — Preprocessing & Stroke Normalization
"""

import math
from typing import List, Tuple, Dict, Any, Optional

Point = Tuple[float, float]
Stroke = List[Point]
Strokes = List[Stroke]

def clean_stroke(stroke: Stroke, min_dist: float = 0.001) -> Stroke:
    """Removes duplicate and near-identical consecutive points, filters out NaN/Inf."""
    if not stroke:
        return []
    cleaned: Stroke = []
    for p in stroke:
        if len(p) < 2:
            continue
        x, y = float(p[0]), float(p[1])
        if math.isnan(x) or math.isnan(y) or math.isinf(x) or math.isinf(y):
            continue
        if not cleaned:
            cleaned.append((x, y))
        else:
            prev_x, prev_y = cleaned[-1]
            if math.hypot(x - prev_x, y - prev_y) >= min_dist:
                cleaned.append((x, y))
    return cleaned

def clean_strokes(strokes: Strokes) -> Strokes:
    """Cleans all strokes and removes empty or trivial 1-point strokes."""
    result: Strokes = []
    for s in strokes:
        cs = clean_stroke(s)
        if len(cs) >= 2:
            result.append(cs)
    return result

def stroke_length(stroke: Stroke) -> float:
    """Computes total path arc-length of a stroke."""
    length = 0.0
    for i in range(1, len(stroke)):
        dx = stroke[i][0] - stroke[i - 1][0]
        dy = stroke[i][1] - stroke[i - 1][1]
        length += math.hypot(dx, dy)
    return length

def resample_stroke(stroke: Stroke, num_points: int = 32) -> Stroke:
    """Resamples a stroke to exactly `num_points` equidistant points along its arc-length."""
    cleaned = clean_stroke(stroke)
    if len(cleaned) < 2:
        if not cleaned:
            return [(0.0, 0.0)] * num_points
        return [cleaned[0]] * num_points

    total_len = stroke_length(cleaned)
    if total_len < 1e-6:
        return [cleaned[0]] * num_points

    step = total_len / (num_points - 1)
    resampled: Stroke = [cleaned[0]]
    curr_dist = 0.0
    accum_dist = 0.0
    src_idx = 0

    for i in range(1, num_points - 1):
        target_dist = i * step
        while src_idx < len(cleaned) - 1:
            p1 = cleaned[src_idx]
            p2 = cleaned[src_idx + 1]
            seg_len = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            if accum_dist + seg_len >= target_dist:
                t = (target_dist - accum_dist) / max(seg_len, 1e-9)
                t = max(0.0, min(1.0, t))
                rx = p1[0] + (p2[0] - p1[0]) * t
                ry = p1[1] + (p2[1] - p1[1]) * t
                resampled.append((rx, ry))
                break
            else:
                accum_dist += seg_len
                src_idx += 1

    resampled.append(cleaned[-1])
    return resampled

def get_strokes_bounds(strokes: Strokes) -> Dict[str, float]:
    """Computes bounding box (min_x, min_y, max_x, max_y, w, h) of strokes."""
    all_pts = [p for s in strokes for p in s]
    if not all_pts:
        return {"min_x": 0.0, "min_y": 0.0, "max_x": 1.0, "max_y": 1.0, "w": 1.0, "h": 1.0, "cx": 0.5, "cy": 0.5}
    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max(max_x - min_x, 1e-6)
    h = max(max_y - min_y, 1e-6)
    return {
        "min_x": min_x,
        "min_y": min_y,
        "max_x": max_x,
        "max_y": max_y,
        "w": w,
        "h": h,
        "cx": min_x + w / 2.0,
        "cy": min_y + h / 2.0,
    }

def normalize_strokes(strokes: Strokes, target_size: float = 1.0, margin: float = 0.05) -> Tuple[Strokes, Dict[str, float]]:
    """
    Normalizes strokes into coordinate box [margin, target_size - margin] while preserving aspect ratio.
    Returns (normalized_strokes, original_bounds).
    """
    cleaned = clean_strokes(strokes)
    bounds = get_strokes_bounds(cleaned)
    max_dim = max(bounds["w"], bounds["h"])
    if max_dim < 1e-6:
        max_dim = 1.0

    usable_size = target_size - 2 * margin
    scale = usable_size / max_dim

    # Center within [margin, target_size - margin]
    norm_w = bounds["w"] * scale
    norm_h = bounds["h"] * scale
    offset_x = margin + (usable_size - norm_w) / 2.0 - bounds["min_x"] * scale
    offset_y = margin + (usable_size - norm_h) / 2.0 - bounds["min_y"] * scale

    normalized: Strokes = []
    for s in cleaned:
        ns = [(p[0] * scale + offset_x, p[1] * scale + offset_y) for p in s]
        normalized.append(ns)

    return normalized, bounds

def validate_sample_quality(strokes: Strokes, min_points: int = 6, min_dim: float = 6.0) -> Tuple[bool, str]:
    """
    Quality control for input drawings before inference or training.
    Rejects empty, too short, corrupted, out-of-bounds, or NaN drawings.
    """
    if not strokes:
        return False, "Empty stroke list"

    cleaned = clean_strokes(strokes)
    if not cleaned:
        return False, "No valid strokes after cleaning"

    total_points = sum(len(s) for s in cleaned)
    if total_points < min_points:
        return False, f"Too few points ({total_points} < {min_points})"

    bounds = get_strokes_bounds(cleaned)
    if bounds["w"] < min_dim and bounds["h"] < min_dim:
        return False, f"Stroke dimensions too small ({bounds['w']:.1f}x{bounds['h']:.1f} < {min_dim})"

    # Check for NaN / Infinity
    for s in cleaned:
        for p in s:
            if math.isnan(p[0]) or math.isnan(p[1]) or math.isinf(p[0]) or math.isinf(p[1]):
                return False, "Corrupted point coordinates (NaN/Inf)"

    return True, "Valid"
