"""
Zenithsui A/B SLM — Feature Extraction Engine
Extracts 48 normalized geometric, topological, projection, and stroke features
specifically tuned for discriminating uppercase 'A', 'B', and rejecting 'UNKNOWN'.
"""

import math
from typing import List, Tuple, Dict, Any
from .preprocess import normalize_strokes, resample_stroke, stroke_length, get_strokes_bounds

Point = Tuple[float, float]
Stroke = List[Point]
Strokes = List[Stroke]

FEATURE_NAMES = [
    # 0..7: Geometric & bounding metrics
    "aspect_ratio",
    "stroke_count",
    "total_length",
    "stroke_density",
    "centroid_x",
    "centroid_y",
    "extent_x",
    "extent_y",

    # 8..15: Letter A specific topological descriptors
    "apex_convergence",       # How closely top points converge at top-center
    "apex_y",                 # Y coordinate of highest point
    "crossbar_presence",      # Presence of horizontal segment in middle band
    "crossbar_y",             # Relative Y position of crossbar
    "crossbar_span",          # Horizontal span of crossbar
    "bottom_openness",        # Horizontal distance between bottom feet
    "bottom_closure_base",    # Closed line at bottom (Triangle vs A)
    "a_geometric_score",      # Composite A structural score

    # 16..25: Letter B specific topological descriptors
    "left_stem_straightness", # Straightness of left vertical boundary
    "left_stem_span_y",       # Vertical extent of left stem
    "upper_loop_area",        # Convexity & area of upper right loop (y: 0.10..0.50)
    "lower_loop_area",        # Convexity & area of lower right loop (y: 0.50..0.90)
    "waist_indentation",      # Inward waist indentation ratio at y ~ 0.50 (B vs D)
    "double_loop_ratio",      # Ratio of upper to lower loop sizes
    "right_curvature",        # Mean curvature of right half
    "d_loop_singularity",     # Indicator of single giant loop (D vs B)
    "p_bottom_emptiness",     # Emptiness of lower-right region (P vs B)
    "b_geometric_score",      # Composite B structural score

    # 26..33: Horizontal projection profile (8 bins along Y axis)
    "proj_y_0", "proj_y_1", "proj_y_2", "proj_y_3",
    "proj_y_4", "proj_y_5", "proj_y_6", "proj_y_7",

    # 34..41: Vertical projection profile (8 bins along X axis)
    "proj_x_0", "proj_x_1", "proj_x_2", "proj_x_3",
    "proj_x_4", "proj_x_5", "proj_x_6", "proj_x_7",

    # 42..47: Directional / curvature dynamics
    "horizontal_stroke_ratio", # Proportion of horizontal stroke motion
    "vertical_stroke_ratio",   # Proportion of vertical stroke motion
    "diagonal_stroke_ratio",   # Proportion of diagonal stroke motion
    "curvature_variance",      # Variance in turning angles
    "endpoints_distance",      # Start-to-end distance across primary stroke
    "symmetry_x",              # Left-right reflectional symmetry score
]

NUM_FEATURES = len(FEATURE_NAMES)

def extract_features(raw_strokes: Strokes) -> List[float]:
    """Extracts the 48-element normalized feature vector from raw strokes."""
    norm_strokes, orig_bounds = normalize_strokes(raw_strokes, target_size=1.0, margin=0.05)
    all_pts = [p for s in norm_strokes for p in s]
    if not all_pts:
        return [0.0] * NUM_FEATURES

    # Basic metrics
    w = max(orig_bounds["w"], 1e-6)
    h = max(orig_bounds["h"], 1e-6)
    aspect_ratio = min(w / h, 3.0)
    stroke_count = len(norm_strokes)
    total_len = sum(stroke_length(s) for s in norm_strokes)
    stroke_density = total_len / max(w * h, 1e-4)

    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]
    cx = sum(xs) / len(xs)
    cy = sum(ys) / len(ys)
    extent_x = max(xs) - min(xs)
    extent_y = max(ys) - min(ys)

    # --- LETTER A SPECIFIC FEATURES ---
    # Find points in top region (y < 0.25)
    top_pts = [p for p in all_pts if p[1] <= min(ys) + extent_y * 0.25]
    if top_pts:
        top_xs = [p[0] for p in top_pts]
        top_spread = max(top_xs) - min(top_xs)
        apex_convergence = max(0.0, 1.0 - (top_spread / max(extent_x, 1e-3)) * 2.0)
        apex_y = min(ys)
    else:
        apex_convergence = 0.0
        apex_y = min(ys)

    # Crossbar detection in vertical middle band [0.35, 0.75]
    crossbar_presence = 0.0
    crossbar_y = 0.5
    crossbar_span = 0.0

    for s in norm_strokes:
        if len(s) < 2:
            continue
        resampled = resample_stroke(s, 24)
        for i in range(len(resampled) - 3):
            sub = resampled[i:i + 4]
            sub_xs = [p[0] for p in sub]
            sub_ys = [p[1] for p in sub]
            dx = max(sub_xs) - min(sub_xs)
            dy = max(sub_ys) - min(sub_ys)
            avg_y = sum(sub_ys) / len(sub_ys)
            if 0.32 <= avg_y <= 0.78 and dx > dy * 1.5:
                # Spanning across center
                bridges_mid = min(sub_xs) <= 0.48 and max(sub_xs) >= 0.52
                if bridges_mid or dx >= 0.20:
                    crossbar_presence = 1.0
                    crossbar_y = avg_y
                    crossbar_span = max(crossbar_span, dx)

    # Bottom openness vs bottom closure (A vs Triangle)
    bottom_pts = [p for p in all_pts if p[1] >= max(ys) - extent_y * 0.25]
    bottom_openness = 0.0
    bottom_closure_base = 0.0

    if bottom_pts:
        b_xs = [p[0] for p in bottom_pts]
        b_span = max(b_xs) - min(b_xs)
        bottom_openness = min(b_span / max(extent_x, 1e-3), 1.0)

        # Check for contiguous stroke segment running horizontally along the bottom (Triangle base indicator)
        bot_thresh_y = max(ys) - extent_y * 0.18
        for s in norm_strokes:
            run = []
            for p in s:
                if p[1] >= bot_thresh_y:
                    run.append(p)
                else:
                    if len(run) >= 2:
                        r_xs = [pt[0] for pt in run]
                        if max(r_xs) - min(r_xs) >= extent_x * 0.32:
                            bottom_closure_base = 1.0
                            break
                    run = []
            if len(run) >= 2:
                r_xs = [pt[0] for pt in run]
                if max(r_xs) - min(r_xs) >= extent_x * 0.32:
                    bottom_closure_base = 1.0
                    break

    # Composite A geometric score
    a_geometric_score = (
        apex_convergence * 0.35 +
        crossbar_presence * 0.40 +
        bottom_openness * 0.25 -
        bottom_closure_base * 0.60
    )
    a_geometric_score = max(0.0, min(1.0, a_geometric_score))

    # --- LETTER B SPECIFIC FEATURES ---
    # Left stem straightness: points in x in [min_x, min_x + extent_x * 0.30]
    left_pts = [p for p in all_pts if p[0] <= min(xs) + extent_x * 0.30]
    left_stem_straightness = 0.0
    left_stem_span_y = 0.0

    if len(left_pts) >= 4:
        l_ys = [p[1] for p in left_pts]
        left_stem_span_y = (max(l_ys) - min(l_ys)) / max(extent_y, 1e-3)
        l_xs = [p[0] for p in left_pts]
        x_variance = max(l_xs) - min(l_xs)
        left_stem_straightness = max(0.0, 1.0 - (x_variance / max(extent_x * 0.35, 1e-3)))

    # Upper loop and Lower loop on right side
    upper_right_pts = [p for p in all_pts if p[0] >= min(xs) + extent_x * 0.35 and 0.10 <= p[1] <= 0.55]
    lower_right_pts = [p for p in all_pts if p[0] >= min(xs) + extent_x * 0.35 and 0.48 <= p[1] <= 0.95]

    upper_loop_area = min(len(upper_right_pts) / max(len(all_pts) * 0.45, 1), 1.0)
    lower_loop_area = min(len(lower_right_pts) / max(len(all_pts) * 0.45, 1), 1.0)

    # Waist indentation at y ~ 0.50 (B has two lobes with inward waist, D has single convex lobe)
    top_bump_pts = [p[0] for p in all_pts if 0.10 <= p[1] <= 0.40 and p[0] >= cx]
    bot_bump_pts = [p[0] for p in all_pts if 0.60 <= p[1] <= 0.90 and p[0] >= cx]
    waist_band_pts = [p[0] for p in all_pts if 0.44 <= p[1] <= 0.54 and p[0] >= cx]

    waist_indentation = 0.0
    d_loop_singularity = 0.0
    if top_bump_pts and bot_bump_pts and waist_band_pts:
        x_top = max(top_bump_pts)
        x_bot = max(bot_bump_pts)
        x_waist = max(waist_band_pts)
        # True B waist indents inward from top bump and bottom bump
        indent = min(x_top - x_waist, x_bot - x_waist)
        waist_indentation = max(0.0, min(1.0, indent / max(extent_x * 0.25, 1e-3)))
        # Single D loop bulges outward at waist
        if x_waist >= x_top and x_waist >= x_bot:
            d_loop_singularity = 1.0

    double_loop_ratio = 0.0
    if upper_loop_area > 0 and lower_loop_area > 0:
        double_loop_ratio = min(upper_loop_area, lower_loop_area) / max(max(upper_loop_area, lower_loop_area), 1e-3)

    # Right curvature
    right_pts = [p for p in all_pts if p[0] >= cx]
    right_curvature = min(len(right_pts) / max(len(all_pts) * 0.5, 1), 1.0)

    # P vs B: Lower loop emptiness
    p_bottom_emptiness = 1.0 if (upper_loop_area > 0.25 and lower_loop_area < 0.10) else 0.0

    # Composite B structural score
    b_geometric_score = (
        left_stem_straightness * 0.30 +
        left_stem_span_y * 0.20 +
        upper_loop_area * 0.20 +
        lower_loop_area * 0.20 +
        waist_indentation * 0.30 -
        d_loop_singularity * 0.50 -
        p_bottom_emptiness * 0.60
    )
    b_geometric_score = max(0.0, min(1.0, b_geometric_score))

    # --- PROJECTION PROFILES (8 BINS Y, 8 BINS X) ---
    proj_y = [0.0] * 8
    proj_x = [0.0] * 8
    for p in all_pts:
        bin_y = min(7, max(0, int(p[1] * 8)))
        bin_x = min(7, max(0, int(p[0] * 8)))
        proj_y[bin_y] += 1.0
        proj_x[bin_x] += 1.0

    sum_y = max(sum(proj_y), 1.0)
    sum_x = max(sum(proj_x), 1.0)
    proj_y = [v / sum_y for v in proj_y]
    proj_x = [v / sum_x for v in proj_x]

    # --- DIRECTIONAL / DYNAMICS METRICS ---
    dx_sum, dy_sum, diag_sum = 0.0, 0.0, 0.0
    turn_angles = []

    for s in norm_strokes:
        if len(s) < 2:
            continue
        for i in range(1, len(s)):
            dx = abs(s[i][0] - s[i - 1][0])
            dy = abs(s[i][1] - s[i - 1][1])
            if dx > dy * 1.5:
                dx_sum += dx
            elif dy > dx * 1.5:
                dy_sum += dy
            else:
                diag_sum += math.hypot(dx, dy)

        if len(s) >= 3:
            for i in range(1, len(s) - 1):
                v1 = (s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1])
                v2 = (s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1])
                dot = v1[0] * v2[0] + v1[1] * v2[1]
                m1 = math.hypot(v1[0], v1[1])
                m2 = math.hypot(v2[0], v2[1])
                if m1 > 1e-4 and m2 > 1e-4:
                    cos_th = max(-1.0, min(1.0, dot / (m1 * m2)))
                    turn_angles.append(math.acos(cos_th))

    dir_total = max(dx_sum + dy_sum + diag_sum, 1e-6)
    horizontal_stroke_ratio = dx_sum / dir_total
    vertical_stroke_ratio = dy_sum / dir_total
    diagonal_stroke_ratio = diag_sum / dir_total

    curvature_variance = 0.0
    if len(turn_angles) >= 2:
        mean_angle = sum(turn_angles) / len(turn_angles)
        curvature_variance = sum((a - mean_angle) ** 2 for a in turn_angles) / len(turn_angles)

    primary_stroke = norm_strokes[0]
    endpoints_distance = math.hypot(
        primary_stroke[-1][0] - primary_stroke[0][0],
        primary_stroke[-1][1] - primary_stroke[0][1]
    )

    # Left-Right reflectional symmetry about cx
    sym_diff = 0.0
    left_count = sum(1 for p in all_pts if p[0] < cx)
    right_count = len(all_pts) - left_count
    symmetry_x = 1.0 - abs(left_count - right_count) / max(len(all_pts), 1)

    return [
        aspect_ratio,
        float(stroke_count),
        total_len,
        stroke_density,
        cx,
        cy,
        extent_x,
        extent_y,
        apex_convergence,
        apex_y,
        crossbar_presence,
        crossbar_y,
        crossbar_span,
        bottom_openness,
        bottom_closure_base,
        a_geometric_score,
        left_stem_straightness,
        left_stem_span_y,
        upper_loop_area,
        lower_loop_area,
        waist_indentation,
        double_loop_ratio,
        right_curvature,
        d_loop_singularity,
        p_bottom_emptiness,
        b_geometric_score,
        proj_y[0], proj_y[1], proj_y[2], proj_y[3],
        proj_y[4], proj_y[5], proj_y[6], proj_y[7],
        proj_x[0], proj_x[1], proj_x[2], proj_x[3],
        proj_x[4], proj_x[5], proj_x[6], proj_x[7],
        horizontal_stroke_ratio,
        vertical_stroke_ratio,
        diagonal_stroke_ratio,
        curvature_variance,
        endpoints_distance,
        symmetry_x,
    ]
