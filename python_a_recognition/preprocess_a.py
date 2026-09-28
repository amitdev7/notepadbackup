"""
Preprocessing module for handwritten uppercase Letter 'A' stroke recognition.
Handles stroke validation, deduplication, smoothing, resampling,
bounding-box normalization, anti-aliased rasterization, and geometric feature extraction.
"""

import math
from typing import List, Tuple, Dict, Any, Optional

Point = Tuple[float, float]
Stroke = List[Point]

def validate_and_clean_strokes(raw_strokes: Any) -> List[Stroke]:
    """
    Validates stroke input and filters out invalid points (NaN, Inf, non-numbers),
    zero-length strokes, and duplicate points.
    """
    if not isinstance(raw_strokes, (list, tuple)):
        return []
    
    cleaned_strokes: List[Stroke] = []
    for stroke in raw_strokes:
        if not isinstance(stroke, (list, tuple)) or len(stroke) == 0:
            continue
        cleaned_pts: List[Point] = []
        for pt in stroke:
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                continue
            x, y = pt[0], pt[1]
            try:
                xf, yf = float(x), float(y)
            except (ValueError, TypeError):
                continue
            if math.isnan(xf) or math.isnan(yf) or math.isinf(xf) or math.isinf(yf):
                continue
            # Remove immediate duplicate points
            if cleaned_pts:
                px, py = cleaned_pts[-1]
                if abs(xf - px) < 1e-6 and abs(yf - py) < 1e-6:
                    continue
            cleaned_pts.append((xf, yf))
        
        # Check if stroke has meaningful length
        if len(cleaned_pts) >= 2:
            total_len = 0.0
            for i in range(1, len(cleaned_pts)):
                dx = cleaned_pts[i][0] - cleaned_pts[i-1][0]
                dy = cleaned_pts[i][1] - cleaned_pts[i-1][1]
                total_len += math.hypot(dx, dy)
            if total_len > 1e-3:
                cleaned_strokes.append(cleaned_pts)
        elif len(cleaned_pts) == 1:
            # Single-point stroke kept for diagnostics but flagged in feature extraction
            cleaned_strokes.append(cleaned_pts)
            
    return cleaned_strokes

def compute_bounds(strokes: List[Stroke]) -> Dict[str, float]:
    """Computes axis-aligned bounding box for strokes."""
    all_pts = [pt for stroke in strokes for pt in stroke]
    if not all_pts:
        return {"x": 0.0, "y": 0.0, "w": 0.0, "h": 0.0, "cx": 0.0, "cy": 0.0}
    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    w = max(1e-4, max_x - min_x)
    h = max(1e-4, max_y - min_y)
    return {
        "x": min_x,
        "y": min_y,
        "w": w,
        "h": h,
        "cx": min_x + w / 2.0,
        "cy": min_y + h / 2.0
    }

def resample_stroke(stroke: Stroke, num_points: int = 32) -> Stroke:
    """Equidistantly resamples a single stroke along its cumulative arc length."""
    if len(stroke) < 2:
        return stroke * num_points if stroke else []
    
    # Compute arc lengths
    dists = [0.0]
    for i in range(1, len(stroke)):
        d = math.hypot(stroke[i][0] - stroke[i-1][0], stroke[i][1] - stroke[i-1][1])
        dists.append(dists[-1] + d)
    
    total_len = dists[-1]
    if total_len <= 1e-6:
        return [stroke[0]] * num_points
    
    step = total_len / (num_points - 1)
    resampled: Stroke = [stroke[0]]
    curr_idx = 0
    
    for i in range(1, num_points - 1):
        target_d = i * step
        while curr_idx < len(dists) - 2 and dists[curr_idx + 1] < target_d:
            curr_idx += 1
        d0 = dists[curr_idx]
        d1 = dists[curr_idx + 1]
        seg_len = max(1e-6, d1 - d0)
        t = (target_d - d0) / seg_len
        p0 = stroke[curr_idx]
        p1 = stroke[curr_idx + 1]
        rx = p0[0] + (p1[0] - p0[0]) * t
        ry = p0[1] + (p1[1] - p0[1]) * t
        resampled.append((rx, ry))
        
    resampled.append(stroke[-1])
    return resampled

def smooth_stroke(stroke: Stroke, window: int = 3) -> Stroke:
    """Applies moving-average smoothing to reduce stroke jitter."""
    if len(stroke) <= window:
        return stroke
    smoothed: Stroke = [stroke[0]]
    half = window // 2
    for i in range(1, len(stroke) - 1):
        start = max(0, i - half)
        end = min(len(stroke), i + half + 1)
        pts = stroke[start:end]
        avg_x = sum(p[0] for p in pts) / len(pts)
        avg_y = sum(p[1] for p in pts) / len(pts)
        smoothed.append((avg_x, avg_y))
    smoothed.append(stroke[-1])
    return smoothed

def normalize_strokes(strokes: List[Stroke], target_size: float = 1.0, preserve_aspect: bool = True) -> List[Stroke]:
    """
    Normalizes strokes into canonical [0, target_size] coordinates,
    centered inside the unit box.
    """
    bounds = compute_bounds(strokes)
    w, h = bounds["w"], bounds["h"]
    if w <= 1e-6 or h <= 1e-6:
        return strokes
    
    scale = target_size / max(w, h) if preserve_aspect else 1.0
    scale_x = scale if preserve_aspect else (target_size / w)
    scale_y = scale if preserve_aspect else (target_size / h)
    
    offset_x = (target_size - w * scale_x) / 2.0
    offset_y = (target_size - h * scale_y) / 2.0
    
    normalized: List[Stroke] = []
    for stroke in strokes:
        norm_stroke: Stroke = []
        for x, y in stroke:
            nx = (x - bounds["x"]) * scale_x + offset_x
            ny = (y - bounds["y"]) * scale_y + offset_y
            norm_stroke.append((nx, ny))
        normalized.append(norm_stroke)
    return normalized

def rasterize_strokes(strokes: List[Stroke], grid_size: int = 28, stroke_radius: float = 1.2) -> List[List[float]]:
    """
    Renders stroke lines into an anti-aliased 2D float grid of dimensions grid_size x grid_size.
    Uses subpixel distance to segments for clean anti-aliasing.
    """
    grid = [[0.0 for _ in range(grid_size)] for _ in range(grid_size)]
    if not strokes:
        return grid
    
    bounds = compute_bounds(strokes)
    if bounds["w"] <= 1e-4 or bounds["h"] <= 1e-4:
        return grid
    
    padding = 3.0
    scale = (grid_size - 2 * padding) / max(bounds["w"], bounds["h"])
    offset_x = padding + ((grid_size - 2 * padding) - bounds["w"] * scale) / 2.0 - bounds["x"] * scale
    offset_y = padding + ((grid_size - 2 * padding) - bounds["h"] * scale) / 2.0 - bounds["y"] * scale
    
    # Collect all line segments in grid coordinates
    segments = []
    for stroke in strokes:
        if len(stroke) == 1:
            gx = stroke[0][0] * scale + offset_x
            gy = stroke[0][1] * scale + offset_y
            segments.append(((gx, gy), (gx, gy)))
        for i in range(len(stroke) - 1):
            gx0 = stroke[i][0] * scale + offset_x
            gy0 = stroke[i][1] * scale + offset_y
            gx1 = stroke[i+1][0] * scale + offset_x
            gy1 = stroke[i+1][1] * scale + offset_y
            segments.append(((gx0, gy0), (gx1, gy1)))
            
    # Rasterize segments onto grid
    for ((x0, y0), (x1, y1)) in segments:
        min_gx = max(0, int(math.floor(min(x0, x1) - stroke_radius * 2)))
        max_gx = min(grid_size - 1, int(math.ceil(max(x0, x1) + stroke_radius * 2)))
        min_gy = max(0, int(math.floor(min(y0, y1) - stroke_radius * 2)))
        max_gy = min(grid_size - 1, int(math.ceil(max(y0, y1) + stroke_radius * 2)))
        
        dx = x1 - x0
        dy = y1 - y0
        seg_len_sq = dx * dx + dy * dy
        
        for r in range(min_gy, max_gy + 1):
            for c in range(min_gx, max_gx + 1):
                px = c + 0.5
                py = r + 0.5
                if seg_len_sq <= 1e-6:
                    dist = math.hypot(px - x0, py - y0)
                else:
                    t = max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / seg_len_sq))
                    proj_x = x0 + t * dx
                    proj_y = y0 + t * dy
                    dist = math.hypot(px - proj_x, py - proj_y)
                
                if dist < stroke_radius * 2.0:
                    intensity = math.exp(-0.5 * (dist / stroke_radius) ** 2)
                    grid[r][c] = max(grid[r][c], min(1.0, intensity))
                    
    return grid

def extract_letter_a_features(raw_strokes: List[Stroke]) -> Dict[str, Any]:
    """
    Extracts high-precision topological, directional, and geometric features
    specifically for uppercase Letter 'A' validation vs rejection.
    """
    cleaned = validate_and_clean_strokes(raw_strokes)
    if not cleaned:
        return {
            "valid_input": False,
            "stroke_count": 0,
            "aspect_ratio": 0.0,
            "apex_convergence": 1.0,
            "bottom_leg_span": 0.0,
            "has_crossbar": False,
            "has_bottom_closure": False,
            "crossbar_y_ratio": 0.0,
            "symmetry_score": 0.0,
            "is_inverted_v": False,
            "reason": "Empty or malformed input"
        }
    
    bounds = compute_bounds(cleaned)
    w, h = bounds["w"], bounds["h"]
    aspect_ratio = w / h
    
    # Reject extreme aspect ratios (lines or flat strips)
    if aspect_ratio < 0.20 or aspect_ratio > 1.80:
        return {
            "valid_input": True,
            "stroke_count": len(cleaned),
            "aspect_ratio": aspect_ratio,
            "apex_convergence": 1.0,
            "bottom_leg_span": 0.0,
            "has_crossbar": False,
            "has_bottom_closure": False,
            "crossbar_y_ratio": 0.0,
            "symmetry_score": 0.0,
            "is_inverted_v": False,
            "reason": f"Extreme aspect ratio ({aspect_ratio:.2f})"
        }
    
    all_pts = [pt for stroke in cleaned for pt in stroke]
    min_x, min_y = bounds["x"], bounds["y"]
    
    # Normalize coordinates locally to [0, 1] relative to bounds
    rel_pts = [((p[0] - min_x) / w, (p[1] - min_y) / h) for p in all_pts]
    
    # Slice points into vertical zones:
    # Apex zone: y in [0.0, 0.22]
    # Mid zone: y in [0.30, 0.75]
    # Bottom zone: y in [0.75, 1.00]
    apex_pts = [p for p in rel_pts if p[1] <= 0.22]
    mid_pts = [p for p in rel_pts if 0.30 <= p[1] <= 0.75]
    bottom_pts = [p for p in rel_pts if p[1] >= 0.75]
    
    apex_span = (max(p[0] for p in apex_pts) - min(p[0] for p in apex_pts)) if len(apex_pts) >= 2 else 0.0
    bottom_span = (max(p[0] for p in bottom_pts) - min(p[0] for p in bottom_pts)) if len(bottom_pts) >= 2 else 0.0
    
    # Apex convergence: apex span should be significantly smaller than bottom span
    apex_convergence_ratio = apex_span / max(0.20, bottom_span)
    has_apex_convergence = apex_convergence_ratio <= 0.48 and bottom_span >= 0.45
    
    # Analyze strokes for horizontal crossbar vs bottom base closure
    has_mid_crossbar = False
    crossbar_y_ratio = 0.0
    has_bottom_closure = False
    
    # 1. Check dedicated strokes
    for stroke in cleaned:
        if len(stroke) < 2:
            continue
        sb = compute_bounds([stroke])
        sw, sh = sb["w"], sb["h"]
        rel_cy = (sb["cy"] - min_y) / h
        rel_sw = sw / w
        
        # Dedicated horizontal crossbar stroke in mid zone [0.25, 0.82]
        if 0.25 <= rel_cy <= 0.82 and rel_sw >= 0.22 and (sw >= sh * 1.1 or sh / h <= 0.22):
            has_mid_crossbar = True
            crossbar_y_ratio = rel_cy
            
        # Dedicated bottom base stroke (Triangle): rel_cy >= 0.82, rel_sw >= 0.40
        if rel_cy >= 0.82 and rel_sw >= 0.40 and (sw >= sh * 1.1 or sh / h <= 0.20):
            has_bottom_closure = True

    # 2. Check sub-paths for continuous 1-stroke or 2-stroke compositions
    for stroke in cleaned:
        if len(stroke) < 3:
            continue
        rel_stroke = [((p[0] - min_x) / w, (p[1] - min_y) / h) for p in stroke]
        n_pts = len(rel_stroke)
        
        # Search for horizontal sub-path in mid zone [0.25, 0.82]
        if not has_mid_crossbar:
            for i in range(n_pts):
                if not (0.24 <= rel_stroke[i][1] <= 0.82):
                    continue
                for j in range(i + 2, n_pts):
                    sub = rel_stroke[i:j+1]
                    sub_min_y = min(p[1] for p in sub)
                    sub_max_y = max(p[1] for p in sub)
                    if sub_min_y < 0.22 or sub_max_y > 0.85:
                        break # left the mid zone
                    sub_dx = abs(rel_stroke[j][0] - rel_stroke[i][0])
                    sub_dy = sub_max_y - sub_min_y
                    px_dx = sub_dx * w
                    px_dy = sub_dy * h
                    if sub_dx >= 0.20 and (px_dx >= px_dy * 1.3 or sub_dy <= 0.12) and sub_dy <= 0.25:
                        has_mid_crossbar = True
                        crossbar_y_ratio = (sub_min_y + sub_max_y) / 2.0
                        break
                if has_mid_crossbar:
                    break
                    
        # Search for bottom base closure (horizontal path at y >= 0.82 spanning bottom legs)
        for i in range(n_pts):
            if rel_stroke[i][1] < 0.80:
                continue
            for j in range(i + 2, n_pts):
                sub = rel_stroke[i:j+1]
                sub_min_y = min(p[1] for p in sub)
                if sub_min_y < 0.78:
                    break
                sub_dx = abs(rel_stroke[j][0] - rel_stroke[i][0])
                if sub_dx >= 0.45:
                    has_bottom_closure = True
                    break
            if has_bottom_closure:
                break

    # Vertical symmetry around center x
    left_pts = [p for p in rel_pts if p[0] < 0.50]
    right_pts = [p for p in rel_pts if p[0] > 0.50]
    symmetry_score = 1.0 - abs(len(left_pts) - len(right_pts)) / max(1, len(rel_pts))
    
    return {
        "valid_input": True,
        "stroke_count": len(cleaned),
        "aspect_ratio": aspect_ratio,
        "apex_span": apex_span,
        "bottom_span": bottom_span,
        "apex_convergence": apex_convergence_ratio,
        "has_apex_convergence": has_apex_convergence,
        "has_crossbar": has_mid_crossbar,
        "crossbar_y_ratio": crossbar_y_ratio,
        "has_bottom_closure": has_bottom_closure,
        "symmetry_score": symmetry_score,
        "bounds": bounds
    }
